package contracts

import (
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/model"
)

// IdentityRegistry holds subject commitments and nothing else about a person.
//
// A policyholder appears on-chain as a keyed-PRF commitment, not a per-insurer
// salt. Independent salts would mint a different commitment per insurer for the
// same person, silently breaking the cross-insurer uniqueness invariant; one
// global salt would make NIDs guessable and every commitment linkable. The
// commitment is computed off-chain as HMAC_Kv(NID || context) with Kv under
// threshold custody split across institutional classes, so no single class can
// compute one alone. Chaincode never sees Kv and never sees an NID.
type IdentityRegistry struct {
	contractapi.Contract
}

// RegisterSubjectCommitment records a commitment produced by the commitment
// service. The caller is the enrolling aggregator or insurer; the mapping back
// to a real identity lives in a private data collection those two share, never
// here.
func (c *IdentityRegistry) RegisterSubjectCommitment(
	ctx contractapi.TransactionContextInterface,
	commitment string, keyVersion int, aggregatorID, context string,
) error {
	if _, _, err := requireClass(ctx, model.ClassField, model.ClassInsurer); err != nil {
		return err
	}
	if commitment == "" {
		return fmt.Errorf("commitment is required")
	}
	if len(commitment) != 64 {
		return fmt.Errorf("commitment must be a 32-byte hex digest; got %d characters", len(commitment))
	}
	if context != "event" && context != "policy" {
		return fmt.Errorf("context must be \"event\" or \"policy\" -- domain separation is not optional")
	}
	var existing model.SubjectCommitment
	found, err := getJSON(ctx, model.ObjSubject, []string{commitment}, &existing)
	if err != nil {
		return err
	}
	if found {
		return nil // idempotent: re-enrolment through the same channel is not an error
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	rec := model.SubjectCommitment{
		Commitment:   commitment,
		KeyVersion:   keyVersion,
		AggregatorID: aggregatorID,
		Context:      context,
		RegisteredTS: now,
	}
	return putJSON(ctx, model.ObjSubject, []string{commitment}, rec)
}

// GetSubjectCommitment returns the commitment record. There is deliberately no
// function that resolves a commitment back to a person: that mapping is not on
// this ledger at all.
func (c *IdentityRegistry) GetSubjectCommitment(ctx contractapi.TransactionContextInterface, commitment string) (*model.SubjectCommitment, error) {
	var rec model.SubjectCommitment
	found, err := getJSON(ctx, model.ObjSubject, []string{commitment}, &rec)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, notFound("subject commitment", commitment)
	}
	return &rec, nil
}

// SetCurrentKeyVersion records which PRF key version enrolment is issuing
// under. Key version travels with every commitment so a compromise can be
// scoped.
func (c *IdentityRegistry) SetCurrentKeyVersion(ctx contractapi.TransactionContextInterface, version int) error {
	if _, _, err := requireClass(ctx, model.ClassOversight); err != nil {
		return err
	}
	return putRaw(ctx, model.ObjKeyVersion, []string{"current"}, fmt.Sprintf("%d", version))
}

// CurrentKeyVersion reports the version enrolment is issuing under.
func (c *IdentityRegistry) CurrentKeyVersion(ctx contractapi.TransactionContextInterface) (string, error) {
	v, err := getRaw(ctx, model.ObjKeyVersion, []string{"current"})
	if err != nil {
		return "", err
	}
	if v == "" {
		return "1", nil
	}
	return v, nil
}

// RetireKeyVersion marks a commitment as needing re-issue under a new key.
// A suspected compromise of Kv retires it and forces re-commitment under
// Kv+1 through the enrolment path already used for custodial-key recovery.
func (c *IdentityRegistry) RetireKeyVersion(ctx contractapi.TransactionContextInterface, commitment string, newVersion int) error {
	if _, _, err := requireClass(ctx, model.ClassOversight); err != nil {
		return err
	}
	rec, err := c.GetSubjectCommitment(ctx, commitment)
	if err != nil {
		return err
	}
	if rec.KeyVersion >= newVersion {
		return fmt.Errorf("commitment is already at key version %d", rec.KeyVersion)
	}
	rec.Retired = true
	if err := putJSON(ctx, model.ObjSubject, []string{commitment}, rec); err != nil {
		return err
	}
	return emit(ctx, "KeyVersionRetired", map[string]interface{}{
		"commitment": commitment,
		"oldVersion": rec.KeyVersion,
		"newVersion": newVersion,
	})
}

// LogDisclosure records THAT a court-ordered disclosure happened against the
// off-chain store, and nothing about what was disclosed. The ledger is the
// audit trail for the disclosure, not a copy of it.
func (c *IdentityRegistry) LogDisclosure(ctx contractapi.TransactionContextInterface, disclosureID, commitment, orderRef string) error {
	msp, _, err := requireClass(ctx, model.ClassOversight, model.ClassInsurer)
	if err != nil {
		return err
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	rec := model.DisclosureRecord{
		DisclosureID: disclosureID,
		Commitment:   commitment,
		OrderRef:     orderRef,
		RequestedBy:  msp,
		TS:           now,
	}
	if err := putJSON(ctx, model.ObjDisclosure, []string{disclosureID}, rec); err != nil {
		return err
	}
	return emit(ctx, "DisclosureLogged", rec)
}

// ListDisclosures is readable by the regulator and the academic auditor. A
// disclosure that never appears here did not go through the defined process.
func (c *IdentityRegistry) ListDisclosures(ctx contractapi.TransactionContextInterface) ([]model.DisclosureRecord, error) {
	out := []model.DisclosureRecord{}
	err := listByPartial(ctx, model.ObjDisclosure, []string{}, func(raw []byte) error {
		var d model.DisclosureRecord
		if err := jsonUnmarshal(raw, &d); err != nil {
			return err
		}
		out = append(out, d)
		return nil
	})
	return out, err
}
