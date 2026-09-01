package contracts

import (
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/model"
)

// ProviderRegistry holds accreditation as a revocable credential whose history
// survives revocation (Mechanism 3).
//
// A hospital, workshop or assessor with a pattern of failed attestations is
// flagged and can be de-accredited on-chain, permanently and visibly. The
// point of keeping the history is that a de-accredited facility cannot
// re-register clean to shed the record -- so Accredit refuses to overwrite a
// de-accreditation, and Reinstate exists instead and is itself recorded.
type ProviderRegistry struct {
	contractapi.Contract
}

// Accredit registers a facility, clinician or field agent. In production this
// requires DGHS registration plus an on-site assessment by the provider
// association and one independent member; the second signature is carried by
// the endorsement policy rather than by this function.
func (c *ProviderRegistry) Accredit(
	ctx contractapi.TransactionContextInterface,
	providerID, msp, class, dghsRef string,
) error {
	caller, _, err := requireClass(ctx, model.ClassProvider, model.ClassOversight)
	if err != nil {
		return err
	}
	if providerID == "" {
		return fmt.Errorf("providerId is required")
	}
	cl := model.AttesterClass(class)
	switch cl {
	case model.ClassProvider, model.ClassClinical, model.ClassField:
	default:
		return fmt.Errorf("accredited class must be PROVIDER, CLINICAL or FIELD, got %q", class)
	}
	var existing model.Provider
	found, err := getJSON(ctx, model.ObjProvider, []string{providerID}, &existing)
	if err != nil {
		return err
	}
	if found {
		// This is Mechanism 3. A party that has been de-accredited cannot come
		// back in through the front door with a clean record.
		if existing.State == model.ProviderDeaccredited {
			return fmt.Errorf(
				"provider %s was de-accredited on %d for %q and cannot re-register; a council vote must reinstate it",
				providerID, existing.DeaccreditedTS, existing.DeaccreditedReason)
		}
		return fmt.Errorf("provider %s is already accredited", providerID)
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	p := model.Provider{
		ProviderID:   providerID,
		MSP:          msp,
		Class:        cl,
		DGHSRef:      dghsRef,
		State:        model.ProviderAccredited,
		AccreditedTS: now,
		History:      []string{fmt.Sprintf("%d ACCREDITED by %s", now, caller)},
	}
	if err := putJSON(ctx, model.ObjProvider, []string{providerID}, p); err != nil {
		return err
	}
	return emit(ctx, "ProviderAccredited", p)
}

// GetProvider returns the accreditation record, history included.
func (c *ProviderRegistry) GetProvider(ctx contractapi.TransactionContextInterface, providerID string) (*model.Provider, error) {
	var p model.Provider
	found, err := getJSON(ctx, model.ObjProvider, []string{providerID}, &p)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, notFound("provider", providerID)
	}
	return &p, nil
}

// ListProviders returns the whole roster. Accreditation is public within the
// network by design: a policyholder is entitled to know which facilities can
// open an event against them.
func (c *ProviderRegistry) ListProviders(ctx contractapi.TransactionContextInterface) ([]model.Provider, error) {
	out := []model.Provider{}
	err := listByPartial(ctx, model.ObjProvider, []string{}, func(raw []byte) error {
		var p model.Provider
		if err := jsonUnmarshal(raw, &p); err != nil {
			return err
		}
		out = append(out, p)
		return nil
	})
	return out, err
}

// IsAccredited is the check openEvent and attestEvent run before they will
// accept anything from a party.
func (c *ProviderRegistry) IsAccredited(ctx contractapi.TransactionContextInterface, providerID string) (bool, error) {
	p, err := c.GetProvider(ctx, providerID)
	if err != nil {
		return false, err
	}
	return p.State == model.ProviderAccredited, nil
}

// RecordAttestationOutcome accumulates the counters that trigger automatic
// suspension. Hitting a set threshold of failed attestations suspends a member
// without a vote.
func (c *ProviderRegistry) RecordAttestationOutcome(ctx contractapi.TransactionContextInterface, providerID string, upheld bool) error {
	if _, _, err := requireClass(ctx, model.ClassInsurer, model.ClassOversight); err != nil {
		return err
	}
	p, err := c.GetProvider(ctx, providerID)
	if err != nil {
		return err
	}
	p.AttestationsTotal++
	if !upheld {
		p.AttestationsFailed++
	}
	return putJSON(ctx, model.ObjProvider, []string{providerID}, p)
}

// DeAccredit revokes the credential. The record is not deleted: past
// signatures stay valid history, and the de-accreditation itself is appended.
func (c *ProviderRegistry) DeAccredit(ctx contractapi.TransactionContextInterface, providerID, reason string) error {
	caller, _, err := requireClass(ctx, model.ClassOversight)
	if err != nil {
		return err
	}
	p, err := c.GetProvider(ctx, providerID)
	if err != nil {
		return err
	}
	if p.State == model.ProviderDeaccredited {
		return fmt.Errorf("provider %s is already de-accredited", providerID)
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	p.State = model.ProviderDeaccredited
	p.DeaccreditedTS = now
	p.DeaccreditedReason = reason
	p.History = append(p.History, fmt.Sprintf("%d DEACCREDITED by %s: %s", now, caller, reason))
	if err := putJSON(ctx, model.ObjProvider, []string{providerID}, p); err != nil {
		return err
	}
	return emit(ctx, "ProviderDeAccredited", map[string]interface{}{
		"providerId": providerID, "reason": reason, "ts": now,
	})
}

// Reinstate is the only way back, and it leaves the de-accreditation in the
// history where a buyer can still see it.
func (c *ProviderRegistry) Reinstate(ctx contractapi.TransactionContextInterface, providerID, proposalID string) error {
	caller, _, err := requireClass(ctx, model.ClassOversight)
	if err != nil {
		return err
	}
	p, err := c.GetProvider(ctx, providerID)
	if err != nil {
		return err
	}
	if p.State != model.ProviderDeaccredited {
		return fmt.Errorf("provider %s is not de-accredited", providerID)
	}
	var prop model.Proposal
	found, err := getJSON(ctx, model.ObjProposal, []string{proposalID}, &prop)
	if err != nil {
		return err
	}
	if !found || prop.State != model.ProposalPassed {
		return fmt.Errorf("reinstatement requires a passed council proposal; %s is not one", proposalID)
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	p.State = model.ProviderAccredited
	p.History = append(p.History, fmt.Sprintf("%d REINSTATED by %s under proposal %s", now, caller, proposalID))
	if err := putJSON(ctx, model.ObjProvider, []string{providerID}, p); err != nil {
		return err
	}
	return emit(ctx, "ProviderReinstated", map[string]string{"providerId": providerID, "proposalId": proposalID})
}

// RaiseAnomalyFlag is written by the off-chain pairing scorer. Payee-verifier
// collusion is the one row in the fraud taxonomy the paper calls the real
// residual risk; detection is statistical and lives off-chain, but the flag
// itself belongs on the ledger where it cannot be quietly dropped.
func (c *ProviderRegistry) RaiseAnomalyFlag(
	ctx contractapi.TransactionContextInterface,
	flagID, providerID, verifierID string, pairings int64, zScore float64, note string,
) error {
	if _, _, err := requireClass(ctx, model.ClassOversight); err != nil {
		return err
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	f := model.AnomalyFlag{
		FlagID: flagID, ProviderID: providerID, VerifierID: verifierID,
		Pairings: pairings, ZScore: zScore, RaisedTS: now, Note: note,
	}
	if err := putJSON(ctx, model.ObjAnomaly, []string{flagID}, f); err != nil {
		return err
	}
	return emit(ctx, "AnomalyFlagRaised", f)
}

// ListAnomalyFlags is read by the regulator dashboard.
func (c *ProviderRegistry) ListAnomalyFlags(ctx contractapi.TransactionContextInterface) ([]model.AnomalyFlag, error) {
	out := []model.AnomalyFlag{}
	err := listByPartial(ctx, model.ObjAnomaly, []string{}, func(raw []byte) error {
		var f model.AnomalyFlag
		if err := jsonUnmarshal(raw, &f); err != nil {
			return err
		}
		out = append(out, f)
		return nil
	})
	return out, err
}
