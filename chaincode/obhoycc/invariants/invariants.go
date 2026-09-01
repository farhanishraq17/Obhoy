// Package invariants is Appendix A of the whitepaper, in code.
//
// Every rule the chaincode enforces over events and entitlements lives here
// once, is called from exactly one place in the contracts, and is exercised
// directly by the test suite. Equation numbers below are the appendix's own.
//
// These hold only under assumptions A1-A4. In particular chaincode cannot
// enforce A2 (identity resolution): two identities for one person defeat
// equation (4) before any of this code runs.
package invariants

import (
	"fmt"

	"github.com/obhoy/obhoycc/model"
)

// Result is a decision plus the reason, so a refusal can be reported to a
// caller in the terms the paper uses rather than as a bare boolean.
type Result struct {
	OK     bool
	Eq     string
	Reason string
}

func ok() Result { return Result{OK: true} }

func fail(eq, format string, args ...interface{}) Result {
	return Result{OK: false, Eq: eq, Reason: fmt.Sprintf(format, args...)}
}

// Error renders a refusal for return to the client.
func (r Result) Error() error {
	if r.OK {
		return nil
	}
	return fmt.Errorf("invariant %s violated: %s", r.Eq, r.Reason)
}

// SingleOpenEvent is equation (4):
//
//	Open(e) AND Open(e') => Sub(e) != Sub(e')
//
// No two open events may share a subject commitment. In health this mirrors
// physical reality -- a person cannot be admitted to two hospitals at once --
// so a second assertion is refused at commit rather than caught after payment.
//
// existingOpenEventID is whatever the open-by-subject index holds for this
// commitment; empty means none.
func SingleOpenEvent(existingOpenEventID, candidateEventID string) Result {
	if existingOpenEventID == "" {
		return ok()
	}
	if existingOpenEventID == candidateEventID {
		return fail("(4)", "event %s is already open for this subject", candidateEventID)
	}
	return fail("(4)",
		"subject already has open event %s; use continueEvent for a transfer or readmission",
		existingOpenEventID)
}

// Continuation is equation (5):
//
//	Cont(e',e) => Sub(e') = Sub(e) AND NOT Setl(e')
//
// A continuation must be against the same subject and against an event that
// has not been consumed. Without this rule the uniqueness invariant would
// reject legitimate care: a patient stabilised at an upazila health complex
// and moved to a district hospital produces two admissions and one clinical
// episode.
func Continuation(parent *model.Event, subjectCommitment string, nowTS int64, windowSeconds int64) Result {
	if parent == nil {
		return fail("(5)", "no parent event to continue")
	}
	if parent.SubjectCommitment != subjectCommitment {
		return fail("(5)", "continuation subject does not match parent event subject")
	}
	if parent.State == model.EventExpired {
		return fail("(5)", "parent event has expired")
	}
	if windowSeconds > 0 && parent.OpenTS > 0 && nowTS-parent.OpenTS > windowSeconds {
		return fail("(5)", "continuation window of %ds has closed", windowSeconds)
	}
	return ok()
}

// QuorumSpansClasses is equation (6):
//
//	Elig(e) => |{cls(a)}| >= 2
//
// Settlement needs attestation from at least two of three stakeholder classes.
// Two signatures from one class are one class.
func QuorumSpansClasses(atts []model.Attestation, required int) Result {
	seen := map[model.AttesterClass]bool{}
	for _, a := range atts {
		seen[a.Class] = true
	}
	if len(seen) < required {
		return fail("(6)", "attestations span %d class(es), %d required", len(seen), required)
	}
	return ok()
}

// NonPayeeAttestation is equation (7):
//
//	Elig(e) => EXISTS a in Att(e) : cls(a) != Pay(e)
//
// Nobody is paid on the payee's word. At least one attesting class must not be
// getting paid. The endorsement policy carries the OutOf(2, ...) half of
// Mechanism 2; this half is runtime-dependent and so lives in chaincode.
func NonPayeeAttestation(atts []model.Attestation, payee model.AttesterClass) Result {
	for _, a := range atts {
		if a.Class != payee {
			return ok()
		}
	}
	return fail("(7)", "every attestation comes from the payee class %s", payee)
}

// SingleEntitlementPerPair is equation (8):
//
//	Ev(c) = Ev(c') => Pol(c) != Pol(c')
//
// At most one entitlement exists per (event, policy) pair. Note what this does
// NOT say: several entitlements against one event under DIFFERENT policies are
// legitimate and must settle.
func SingleEntitlementPerPair(existingEntitlementID string) Result {
	if existingEntitlementID != "" {
		return fail("(8)", "entitlement %s already exists for this (event, policy) pair", existingEntitlementID)
	}
	return ok()
}

// SettlementPreconditions is equation (9):
//
//	Setl(c) => Elig(Ev(c)) AND Act(c) AND NOT Reop(c)
//
// Settlement requires an eligible event, a policy that was valid, and an
// entitlement that has not already been consumed. Nothing re-opens a consumed
// entitlement.
func SettlementPreconditions(ev *model.Event, pol *model.Policy, ent *model.Entitlement, nowTS int64) Result {
	if ev == nil || pol == nil || ent == nil {
		return fail("(9)", "missing event, policy or entitlement")
	}
	if ev.State != model.EventClosedEligible {
		return fail("(9)", "event is %s, not CLOSED_ELIGIBLE", ev.State)
	}
	if ent.State == model.EntSettled {
		return fail("(9)", "entitlement is already consumed and cannot be re-opened")
	}
	if ent.State == model.EntDeniedUpheld {
		return fail("(9)", "entitlement was denied and the denial was upheld on appeal")
	}
	if ent.State != model.EntAdjudicated {
		return fail("(9)", "entitlement is %s, must be ADJUDICATED before settlement", ent.State)
	}
	if pol.State != model.PolicyActive {
		return fail("(9)", "policy %s is %s", pol.PolicyID, pol.State)
	}
	// Validity is judged at the moment of the event, not the moment of payment,
	// so a policy that lapses during adjudication still pays for an event that
	// occurred while it was live.
	if ev.OpenTS < pol.EffectiveFrom {
		return fail("(9)", "event occurred before the policy took effect")
	}
	if pol.ExpiresAt > 0 && ev.OpenTS > pol.ExpiresAt {
		return fail("(9)", "event occurred after the policy expired")
	}
	if pol.WaitingPeriodEnd > 0 && ev.OpenTS < pol.WaitingPeriodEnd {
		return fail("(9)", "event occurred inside the waiting period")
	}
	return ok()
}

// CoordinationOfBenefits is equation (2):
//
//	SUM over indemnity entitlements paid <= loss(e)
//	SUM over fixed-benefit entitlements paid <= cap(e)
//
// This is what the mechanism really does. The ledger does not forbid the
// second claim -- it lets the second insurer see the first. Paying an employer
// scheme and an MFI-enrolled policy on the same hospitalisation is the
// contract, not a fraud; recovering the same economic loss twice is not.
//
// The two sums are held apart on purpose: a fixed-benefit hospital-cash
// product is designed to pay alongside an indemnity policy.
func CoordinationOfBenefits(ev *model.Event, siblings []model.Entitlement, adding *model.Entitlement, amount int64) Result {
	var paidIndemnity, paidFixed int64
	for _, s := range siblings {
		if s.State != model.EntSettled {
			continue
		}
		if s.EntitlementID == adding.EntitlementID {
			continue
		}
		if s.Type == model.PolicyIndemnity {
			paidIndemnity += s.Amount
		} else {
			paidFixed += s.Amount
		}
	}
	if adding.Type == model.PolicyIndemnity {
		if ev.AssessedLoss > 0 && paidIndemnity+amount > ev.AssessedLoss {
			return fail("(2)",
				"indemnity total %d would exceed the assessed loss %d on this event (already paid %d)",
				paidIndemnity+amount, ev.AssessedLoss, paidIndemnity)
		}
		return ok()
	}
	if ev.BenefitCapAggregate > 0 && paidFixed+amount > ev.BenefitCapAggregate {
		return fail("(2)",
			"fixed-benefit total %d would exceed the declared aggregate cap %d on this event (already paid %d)",
			paidFixed+amount, ev.BenefitCapAggregate, paidFixed)
	}
	return ok()
}

// DistinctClassNotAlreadyPresent stops a payee filling the quorum alone by
// attesting repeatedly. It is the write-time half of equation (6).
func DistinctClassNotAlreadyPresent(atts []model.Attestation, class model.AttesterClass) Result {
	for _, a := range atts {
		if a.Class == class {
			return fail("(6)", "class %s has already attested this event", class)
		}
	}
	return ok()
}

// NullifierUnused stops one anonymous agent attesting twice under a class
// credential. Anonymity must not buy a second vote.
func NullifierUnused(atts []model.Attestation, nullifier string) Result {
	if nullifier == "" {
		return ok()
	}
	for _, a := range atts {
		if a.Nullifier != "" && a.Nullifier == nullifier {
			return fail("(6)", "this anonymous credential has already attested the event")
		}
	}
	return ok()
}
