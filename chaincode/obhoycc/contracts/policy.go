package contracts

import (
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/model"
)

// PolicyRegistry issues and revokes policy credentials.
//
// A policy credential is non-transferable and bound to a subject commitment.
// There is no transfer function in this contract, and adding one would break
// the model: a credential that could be sold, assigned or repointed to another
// policyholder is exactly the ghost-policy attack the design refuses.
type PolicyRegistry struct {
	contractapi.Contract
}

// IssuePolicy is called by the insurer carrying the risk. Enrolment is
// group-only in the field -- through MFIs, NGOs and employers -- which is what
// blocks adverse selection; the group channel is recorded as the pool.
func (c *PolicyRegistry) IssuePolicy(
	ctx contractapi.TransactionContextInterface,
	policyID, subjectCommitment, poolID, policyType string,
	benefitCap, waitingPeriodEnd, effectiveFrom, expiresAt int64,
) error {
	msp, _, err := requireClass(ctx, model.ClassInsurer)
	if err != nil {
		return err
	}
	if policyID == "" || subjectCommitment == "" {
		return fmt.Errorf("policyId and subjectCommitment are required")
	}
	pt := model.PolicyType(policyType)
	if pt != model.PolicyIndemnity && pt != model.PolicyFixed {
		return fmt.Errorf("policy type must be INDEMNITY or FIXED, got %q", policyType)
	}
	var existing model.Policy
	found, err := getJSON(ctx, model.ObjPolicy, []string{policyID}, &existing)
	if err != nil {
		return err
	}
	if found {
		return fmt.Errorf("policy %s already exists", policyID)
	}
	// The subject must be enrolled before cover can be issued against them.
	var subj model.SubjectCommitment
	ok, err := getJSON(ctx, model.ObjSubject, []string{subjectCommitment}, &subj)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("subject commitment %s is not enrolled", subjectCommitment)
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	pol := model.Policy{
		PolicyID:          policyID,
		SubjectCommitment: subjectCommitment,
		InsurerMSP:        msp,
		PoolID:            poolID,
		Type:              pt,
		BenefitCap:        benefitCap,
		WaitingPeriodEnd:  waitingPeriodEnd,
		EffectiveFrom:     effectiveFrom,
		ExpiresAt:         expiresAt,
		State:             model.PolicyActive,
		IssuedTS:          now,
	}
	if err := putJSON(ctx, model.ObjPolicy, []string{policyID}, pol); err != nil {
		return err
	}
	// Index by subject so an insurer adjudicating an event can find every
	// policy that might respond to it -- including a competitor's.
	if err := putRaw(ctx, model.ObjPolicyBySubject, []string{subjectCommitment, policyID}, policyID); err != nil {
		return err
	}
	return emit(ctx, "PolicyIssued", pol)
}

// GetPolicy returns one policy credential.
func (c *PolicyRegistry) GetPolicy(ctx contractapi.TransactionContextInterface, policyID string) (*model.Policy, error) {
	var pol model.Policy
	found, err := getJSON(ctx, model.ObjPolicy, []string{policyID}, &pol)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, notFound("policy", policyID)
	}
	return &pol, nil
}

// ListPoliciesForSubject is the function that makes coordination of benefits
// possible at all. Today no insurer can see another insurer's cover on the
// same person at any price; here every member can, because the alternative is
// either denying legitimate dual cover or paying the same loss twice.
func (c *PolicyRegistry) ListPoliciesForSubject(ctx contractapi.TransactionContextInterface, subjectCommitment string) ([]model.Policy, error) {
	out := []model.Policy{}
	err := listByPartial(ctx, model.ObjPolicyBySubject, []string{subjectCommitment}, func(raw []byte) error {
		pol, err := c.GetPolicy(ctx, string(raw))
		if err != nil {
			return err
		}
		out = append(out, *pol)
		return nil
	})
	return out, err
}

// SetPolicyState suspends, lapses or reinstates cover. Only the insurer that
// issued it may change it.
func (c *PolicyRegistry) SetPolicyState(ctx contractapi.TransactionContextInterface, policyID, state string) error {
	msp, _, err := requireClass(ctx, model.ClassInsurer)
	if err != nil {
		return err
	}
	pol, err := c.GetPolicy(ctx, policyID)
	if err != nil {
		return err
	}
	if pol.InsurerMSP != msp {
		return fmt.Errorf("policy %s belongs to %s; %s may not change it", policyID, pol.InsurerMSP, msp)
	}
	ns := model.PolicyState(state)
	switch ns {
	case model.PolicyActive, model.PolicySuspended, model.PolicyLapsed:
	default:
		return fmt.Errorf("state must be ACTIVE, SUSPENDED or LAPSED, got %q", state)
	}
	pol.State = ns
	if err := putJSON(ctx, model.ObjPolicy, []string{policyID}, pol); err != nil {
		return err
	}
	return emit(ctx, "PolicyStateChanged", map[string]string{"policyId": policyID, "state": state})
}

// IsActive reports whether a policy would respond to an event at the given
// time. Validity is judged at the moment of the event, not the moment of
// payment.
func (c *PolicyRegistry) IsActive(ctx contractapi.TransactionContextInterface, policyID string, atTS int64) (bool, error) {
	pol, err := c.GetPolicy(ctx, policyID)
	if err != nil {
		return false, err
	}
	if pol.State != model.PolicyActive {
		return false, nil
	}
	if atTS < pol.EffectiveFrom {
		return false, nil
	}
	if pol.ExpiresAt > 0 && atTS > pol.ExpiresAt {
		return false, nil
	}
	if pol.WaitingPeriodEnd > 0 && atTS < pol.WaitingPeriodEnd {
		return false, nil
	}
	return true, nil
}
