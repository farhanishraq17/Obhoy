package contracts

import (
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/invariants"
	"github.com/obhoy/obhoycc/model"
)

// ClaimSettlement holds entitlements and the coordination-of-benefits bound.
//
// It is a separate contract from EventRegistry on purpose: the two objects
// have different uniqueness rules. An event is unique per subject per window.
// An entitlement is unique per (event, policy) pair -- and several entitlements
// against one event are often legitimate, which is exactly why settlement
// consumes the entitlement and never the event.
type ClaimSettlement struct {
	contractapi.Contract
}

// CreateEntitlement claims cover against an eligible event under one policy.
//
// Equation (8) is enforced by the key space itself: the entitlement identifier
// is derived from the pair, so a second entitlement on the same (event, policy)
// cannot be created even by a caller that skips the check.
func (c *ClaimSettlement) CreateEntitlement(ctx contractapi.TransactionContextInterface, eventID, policyID string) (string, error) {
	msp, _, err := requireClass(ctx, model.ClassInsurer)
	if err != nil {
		return "", err
	}
	er := &EventRegistry{}
	ev, err := er.GetEvent(ctx, eventID)
	if err != nil {
		return "", err
	}
	pr := &PolicyRegistry{}
	pol, err := pr.GetPolicy(ctx, policyID)
	if err != nil {
		return "", err
	}
	// An insurer adjudicates only its own policies.
	if pol.InsurerMSP != msp {
		return "", fmt.Errorf("policy %s belongs to %s; %s may not claim against it", policyID, pol.InsurerMSP, msp)
	}
	if pol.SubjectCommitment != ev.SubjectCommitment {
		return "", fmt.Errorf("policy %s covers a different subject than event %s", policyID, eventID)
	}
	entID := model.EntitlementKey(eventID, policyID)
	existing, err := getRaw(ctx, model.ObjEntByPair, []string{eventID, policyID})
	if err != nil {
		return "", err
	}
	if res := invariants.SingleEntitlementPerPair(existing); !res.OK {
		return "", res.Error()
	}
	now, err := txTime(ctx)
	if err != nil {
		return "", err
	}
	ent := model.Entitlement{
		EntitlementID: entID,
		EventID:       eventID,
		PolicyID:      policyID,
		InsurerMSP:    msp,
		PoolID:        pol.PoolID,
		Type:          pol.Type,
		State:         model.EntCreated,
		CreatedTS:     now,
	}
	if err := putJSON(ctx, model.ObjEntitlement, []string{entID}, ent); err != nil {
		return "", err
	}
	if err := putRaw(ctx, model.ObjEntByPair, []string{eventID, policyID}, entID); err != nil {
		return "", err
	}
	if err := putRaw(ctx, model.ObjEntByEvent, []string{eventID, entID}, entID); err != nil {
		return "", err
	}
	tl := &TransparencyLedger{}
	if err := tl.accrueReceived(ctx, pol.PoolID); err != nil {
		return "", err
	}
	if err := emit(ctx, "EntitlementCreated", ent); err != nil {
		return "", err
	}
	return entID, nil
}

// Adjudicate sets the amount from the published benefit schedule.
//
// The amount comes from the schedule version the event was opened under, keyed
// by category code -- never from a document the claimant wrote. That is how
// Failure 3 closes on the amount by construction. What remains attackable is
// the category code itself, and the design says so.
func (c *ClaimSettlement) Adjudicate(ctx contractapi.TransactionContextInterface, entitlementID string) (int64, error) {
	msp, _, err := requireClass(ctx, model.ClassInsurer)
	if err != nil {
		return 0, err
	}
	ent, err := c.GetEntitlement(ctx, entitlementID)
	if err != nil {
		return 0, err
	}
	if ent.InsurerMSP != msp {
		return 0, fmt.Errorf("entitlement %s belongs to %s", entitlementID, ent.InsurerMSP)
	}
	if ent.State != model.EntCreated && ent.State != model.EntAppealed {
		return 0, fmt.Errorf("entitlement %s is %s and cannot be adjudicated", entitlementID, ent.State)
	}
	er := &EventRegistry{}
	ev, err := er.GetEvent(ctx, ent.EventID)
	if err != nil {
		return 0, err
	}
	if ev.State != model.EventClosedEligible {
		return 0, fmt.Errorf("event %s is %s; adjudication needs CLOSED_ELIGIBLE", ev.EventID, ev.State)
	}
	sched := &BenefitScheduleContract{}
	amount, err := sched.GetBenefit(ctx, ev.ScheduleVersion, ev.CategoryCode)
	if err != nil {
		return 0, err
	}
	pr := &PolicyRegistry{}
	pol, err := pr.GetPolicy(ctx, ent.PolicyID)
	if err != nil {
		return 0, err
	}
	if pol.BenefitCap > 0 && amount > pol.BenefitCap {
		amount = pol.BenefitCap
	}
	now, err := txTime(ctx)
	if err != nil {
		return 0, err
	}
	ent.Amount = amount
	ent.State = model.EntAdjudicated
	ent.AdjudicatedTS = now
	if err := putJSON(ctx, model.ObjEntitlement, []string{entitlementID}, ent); err != nil {
		return 0, err
	}
	if err := emit(ctx, "EntitlementAdjudicated", ent); err != nil {
		return 0, err
	}
	return amount, nil
}

// AuthoriseSettlement consumes the entitlement and authorises a payout.
//
// It does not execute one. Disbursement crosses a boundary the ledger does not
// control, so what leaves here is an instruction carrying a payload-bound
// request identifier; the MFS adapter is responsible for rejecting a repeat
// request with a different payload and returning the original receipt for a
// valid retry. The ledger authorises payment; it does not execute it.
func (c *ClaimSettlement) AuthoriseSettlement(ctx contractapi.TransactionContextInterface, entitlementID, settlementRef string) error {
	msp, _, err := requireClass(ctx, model.ClassInsurer)
	if err != nil {
		return err
	}
	ent, err := c.GetEntitlement(ctx, entitlementID)
	if err != nil {
		return err
	}
	if ent.InsurerMSP != msp {
		return fmt.Errorf("entitlement %s belongs to %s", entitlementID, ent.InsurerMSP)
	}
	er := &EventRegistry{}
	ev, err := er.GetEvent(ctx, ent.EventID)
	if err != nil {
		return err
	}
	pr := &PolicyRegistry{}
	pol, err := pr.GetPolicy(ctx, ent.PolicyID)
	if err != nil {
		return err
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	// Equation (9): eligible event, valid policy, nothing re-opened.
	if res := invariants.SettlementPreconditions(ev, pol, ent, now); !res.OK {
		return res.Error()
	}
	// Equation (2): coordination of benefits. This is the check that lets
	// genuine dual cover pay while stopping the same loss being recovered
	// twice -- and it needs to see every insurer's entitlements on the event,
	// which is why it can only run here and not in any single insurer's system.
	siblings, err := c.ListEntitlementsForEvent(ctx, ent.EventID)
	if err != nil {
		return err
	}
	if res := invariants.CoordinationOfBenefits(ev, siblings, ent, ent.Amount); !res.OK {
		return res.Error()
	}
	if settlementRef == "" {
		return fmt.Errorf("a settlement reference is required so the payout instruction is payload-bound")
	}
	ent.State = model.EntSettled
	ent.SettledTS = now
	ent.SettlementRef = settlementRef
	if err := putJSON(ctx, model.ObjEntitlement, []string{entitlementID}, ent); err != nil {
		return err
	}
	tl := &TransparencyLedger{}
	if err := tl.accrueSettled(ctx, ent.PoolID, ent.Amount, ev.OpenTS, now); err != nil {
		return err
	}
	return emit(ctx, "SettlementAuthorised", map[string]interface{}{
		"entitlementId": entitlementID,
		"eventId":       ent.EventID,
		"policyId":      ent.PolicyID,
		"amount":        ent.Amount,
		"settlementRef": settlementRef,
		"insurerMsp":    msp,
	})
}

// Deny records a refusal with a coded reason.
//
// Denial stays a human judgement -- no ledger can force an insurer to accept
// that an event qualifies. What the ledger does is make the denial and its
// reason permanent, countable, and visible in the period totals.
func (c *ClaimSettlement) Deny(ctx contractapi.TransactionContextInterface, entitlementID, denialCode string) error {
	msp, _, err := requireClass(ctx, model.ClassInsurer)
	if err != nil {
		return err
	}
	if denialCode == "" {
		return fmt.Errorf("a denial without a coded reason cannot be counted or appealed")
	}
	ent, err := c.GetEntitlement(ctx, entitlementID)
	if err != nil {
		return err
	}
	if ent.InsurerMSP != msp {
		return fmt.Errorf("entitlement %s belongs to %s", entitlementID, ent.InsurerMSP)
	}
	if ent.State == model.EntSettled {
		return fmt.Errorf("entitlement %s is already settled", entitlementID)
	}
	ent.State = model.EntDenied
	ent.DenialCode = denialCode
	ent.DeniedByMSP = msp
	if err := putJSON(ctx, model.ObjEntitlement, []string{entitlementID}, ent); err != nil {
		return err
	}
	tl := &TransparencyLedger{}
	if err := tl.accrueDenied(ctx, ent.PoolID, denialCode); err != nil {
		return err
	}
	return emit(ctx, "EntitlementDenied", map[string]string{
		"entitlementId": entitlementID, "denialCode": denialCode, "insurerMsp": msp,
	})
}

// Appeal sends a denial to the independent panel.
func (c *ClaimSettlement) Appeal(ctx contractapi.TransactionContextInterface, entitlementID string) error {
	if _, _, err := requireClass(ctx, model.ClassField, model.ClassProvider, model.ClassOversight); err != nil {
		return err
	}
	ent, err := c.GetEntitlement(ctx, entitlementID)
	if err != nil {
		return err
	}
	if ent.State != model.EntDenied {
		return fmt.Errorf("only a denied entitlement can be appealed; %s is %s", entitlementID, ent.State)
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	ent.State = model.EntAppealed
	ent.AppealTS = now
	if err := putJSON(ctx, model.ObjEntitlement, []string{entitlementID}, ent); err != nil {
		return err
	}
	return emit(ctx, "EntitlementAppealed", map[string]string{"entitlementId": entitlementID})
}

// PanelDecision records the independent panel's ruling.
//
// The conflict rule is enforced here rather than in a policy document: an
// insurer may not help validate an appeal against its own denial. A panel
// whose membership and decisions are themselves on-chain is a bounded limit of
// the technology, not a hidden one.
func (c *ClaimSettlement) PanelDecision(ctx contractapi.TransactionContextInterface, entitlementID string, upheld bool, note string) error {
	msp, _, err := requireClass(ctx, model.ClassOversight)
	if err != nil {
		return err
	}
	ent, err := c.GetEntitlement(ctx, entitlementID)
	if err != nil {
		return err
	}
	if ent.State != model.EntAppealed {
		return fmt.Errorf("entitlement %s is %s; no appeal is pending", entitlementID, ent.State)
	}
	if msp == ent.DeniedByMSP {
		return fmt.Errorf(
			"conflict of interest: %s denied this entitlement and may not decide the appeal against its own denial",
			msp)
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	ent.PanelMSP = msp
	if upheld {
		ent.State = model.EntDeniedUpheld
		ent.PanelDecision = "UPHELD: " + note
	} else {
		// Overturned. The entitlement goes back for adjudication rather than
		// being settled by the panel, because the panel does not price claims.
		ent.State = model.EntCreated
		ent.PanelDecision = "OVERTURNED: " + note
		ent.DenialCode = ""
	}
	_ = now
	if err := putJSON(ctx, model.ObjEntitlement, []string{entitlementID}, ent); err != nil {
		return err
	}
	return emit(ctx, "AppealDecided", map[string]interface{}{
		"entitlementId": entitlementID, "upheld": upheld, "panelMsp": msp,
	})
}

// --------------------------------------------------------------------- reads

// GetEntitlement returns one entitlement.
func (c *ClaimSettlement) GetEntitlement(ctx contractapi.TransactionContextInterface, entitlementID string) (*model.Entitlement, error) {
	var ent model.Entitlement
	found, err := getJSON(ctx, model.ObjEntitlement, []string{entitlementID}, &ent)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, notFound("entitlement", entitlementID)
	}
	return &ent, nil
}

// ListEntitlementsForEvent is what coordination of benefits reads. Today no
// insurer can see another insurer's claim on the same loss at any price; this
// function is the difference.
func (c *ClaimSettlement) ListEntitlementsForEvent(ctx contractapi.TransactionContextInterface, eventID string) ([]model.Entitlement, error) {
	out := []model.Entitlement{}
	err := listByPartial(ctx, model.ObjEntByEvent, []string{eventID}, func(raw []byte) error {
		ent, err := c.GetEntitlement(ctx, string(raw))
		if err != nil {
			return err
		}
		out = append(out, *ent)
		return nil
	})
	return out, err
}

// ListEntitlements returns every entitlement, for the dashboards.
func (c *ClaimSettlement) ListEntitlements(ctx contractapi.TransactionContextInterface) ([]model.Entitlement, error) {
	out := []model.Entitlement{}
	err := listByPartial(ctx, model.ObjEntitlement, []string{}, func(raw []byte) error {
		var ent model.Entitlement
		if err := jsonUnmarshal(raw, &ent); err != nil {
			return err
		}
		out = append(out, ent)
		return nil
	})
	return out, err
}

// CoverageView is what an insurer sees before it settles: every entitlement on
// the event, whoever holds it, with the headroom left under each bound.
type CoverageView struct {
	EventID             string              `json:"eventId"`
	AssessedLoss        int64               `json:"assessedLoss"`
	BenefitCapAggregate int64               `json:"benefitCapAggregate"`
	PaidIndemnity       int64               `json:"paidIndemnity"`
	PaidFixed           int64               `json:"paidFixed"`
	IndemnityHeadroom   int64               `json:"indemnityHeadroom"`
	FixedHeadroom       int64               `json:"fixedHeadroom"`
	Entitlements        []model.Entitlement `json:"entitlements"`
}

// GetCoverageView answers the question no insurer in this market can answer
// today: has anyone else already paid on this loss?
func (c *ClaimSettlement) GetCoverageView(ctx contractapi.TransactionContextInterface, eventID string) (*CoverageView, error) {
	er := &EventRegistry{}
	ev, err := er.GetEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}
	ents, err := c.ListEntitlementsForEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}
	view := &CoverageView{
		EventID:             eventID,
		AssessedLoss:        ev.AssessedLoss,
		BenefitCapAggregate: ev.BenefitCapAggregate,
		Entitlements:        ents,
	}
	for _, e := range ents {
		if e.State != model.EntSettled {
			continue
		}
		if e.Type == model.PolicyIndemnity {
			view.PaidIndemnity += e.Amount
		} else {
			view.PaidFixed += e.Amount
		}
	}
	view.IndemnityHeadroom = ev.AssessedLoss - view.PaidIndemnity
	view.FixedHeadroom = ev.BenefitCapAggregate - view.PaidFixed
	return view, nil
}
