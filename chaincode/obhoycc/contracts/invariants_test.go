package contracts

import (
	"strings"
	"testing"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/invariants"
	"github.com/obhoy/obhoycc/model"
)

// This file is Appendix A of the whitepaper as a test suite. Each equation gets
// a test that shows it refusing what it should refuse, and the appendix's three
// "must not fail" cases get tests of their own -- because a uniqueness rule
// that also blocks a hospital transfer, a readmission or a second valid policy
// is not a stricter system, it is a broken one.

// ---------------------------------------------------------------- equation 4

// TestOpenEvent_RefusesDuplicateKey is the uniqueness invariant:
//
//	Open(e) AND Open(e') => Sub(e) != Sub(e')
//
// The second assertion is refused at commit. Nothing is written and then
// flagged; the transaction does not produce a ledger entry at all.
func TestOpenEvent_RefusesDuplicateKey(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)

	first, err := f.openEvent(subjAlpha, "2026-03-01T08:00Z", "HOSP-UPAZILA", "H-CARD-01", 50000, 50000)
	f.must(err, "first assertion")

	_, err = f.openEvent(subjAlpha, "2026-03-01T09:30Z", "HOSP-DISTRICT", "H-SURG-03", 50000, 50000)
	f.refuses(err, "(4)", "second open event on the same subject")

	if !strings.Contains(err.Error(), first) {
		t.Fatalf("the refusal should name the event already open, so the second facility can see what blocked it; got: %v", err)
	}
	if !strings.Contains(err.Error(), "continueEvent") {
		t.Fatalf("the refusal should point at the legitimate path for a transfer; got: %v", err)
	}
}

// TestOpenEvent_RefusesCrossInsurerDuplicate is the same invariant framed as
// the thing no database can do. The two facilities here answer to different
// insurers who cannot see each other's records at any price. The refusal
// happens anyway, because the ledger is shared and the event is the asset.
func TestOpenEvent_RefusesCrossInsurerDuplicate(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)
	f.issuePolicy(mspInsurerB, "POL-B1", subjAlpha, "POOL-B", "INDEMNITY", 30000)

	_, err := f.openEvent(subjAlpha, "2026-03-01T08:00Z", "HOSP-UPAZILA", "H-CARD-01", 50000, 50000)
	f.must(err, "insurer A's facility asserts")

	_, err = f.openEvent(subjAlpha, "2026-03-01T08:05Z", "HOSP-DISTRICT", "H-CARD-01", 50000, 50000)
	f.refuses(err, "(4)", "insurer B's facility asserts the same admission")

	// And nothing was written by the refused transaction.
	blocks := f.ledger.Blocks()
	last := blocks[len(blocks)-1]
	if last.Success {
		t.Fatal("the refused transaction should be recorded as failed")
	}
	if len(last.Writes) != 0 {
		t.Fatalf("a refused transaction must write nothing; it wrote %v", last.Writes)
	}
}

// TestOpenEvent_RefusesConsumedKey covers the other half: nothing re-opens a
// consumed key, even after the subject's index has been released.
func TestOpenEvent_RefusesConsumedKey(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)

	id := f.eligibleEvent(subjAlpha, "2026-03-01T08:00Z", "H-CARD-01", 50000, 50000)
	if f.getEvent(id).State != model.EventClosedEligible {
		t.Fatal("event should be CLOSED_ELIGIBLE")
	}
	// The subject is free to have a later, unrelated admission...
	_, err := f.openEvent(subjAlpha, "2026-06-01T08:00Z", "HOSP-UPAZILA", "H-RESP-02", 20000, 20000)
	f.must(err, "a later unrelated admission")

	// ...but the same key never comes back.
	_, err = f.openEvent(subjAlpha, "2026-03-01T08:00Z", "HOSP-UPAZILA", "H-CARD-01", 50000, 50000)
	if err == nil {
		t.Fatal("a consumed event key must never be re-opened")
	}
}

// ---------------------------------------------------------------- equation 5

// TestContinueEvent_SameSubjectUnsettled checks the continuation rule:
//
//	Cont(e',e) => Sub(e') = Sub(e) AND NOT Setl(e')
func TestContinueEvent_SameSubjectUnsettled(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)

	id, err := f.openEvent(subjAlpha, "2026-03-01T08:00Z", "HOSP-UPAZILA", "H-CARD-01", 50000, 50000)
	f.must(err, "open")

	// A transfer must be attested by the facility handing the patient over.
	err = f.tx(mspProvider, "ContinueEvent", func(ctx contractapi.TransactionContextInterface) error {
		return f.event.ContinueEvent(ctx, id, "HOSP-DISTRICT", "TRANSFER", "")
	})
	if err == nil {
		t.Fatal("a transfer with no transferring provider should be refused")
	}

	// And by a facility that actually has a segment on the event.
	err = f.tx(mspProvider, "ContinueEvent", func(ctx contractapi.TransactionContextInterface) error {
		return f.event.ContinueEvent(ctx, id, "HOSP-DISTRICT", "TRANSFER", "DIAG-CENTRE")
	})
	if err == nil {
		t.Fatal("a transfer attested by a facility with no segment should be refused")
	}

	// Outside the continuation window it is a new episode, not a continuation.
	err = f.txAt(mspProvider, "ContinueEvent", f.now+40*24*3600, func(ctx contractapi.TransactionContextInterface) error {
		return f.event.ContinueEvent(ctx, id, "HOSP-DISTRICT", "READMISSION", "")
	})
	f.refuses(err, "(5)", "continuation after the window has closed")
}

// ---------------------------------------------------------------- equation 6

// TestCloseEvent_RefusesSingleClass:
//
//	Elig(e) => |{cls(a)}| >= 2
//
// The admitting hospital's assertion is one class. One class is not a quorum,
// however many times it signs.
func TestCloseEvent_RefusesSingleClass(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)

	id, err := f.openEvent(subjAlpha, "2026-03-01T08:00Z", "HOSP-UPAZILA", "H-CARD-01", 50000, 50000)
	f.must(err, "open")

	err = f.closeEvent(mspProvider, id)
	f.refuses(err, "(6)", "close with only the asserting class")

	// The payee cannot fill the quorum by attesting again through a second
	// accredited facility of its own class.
	err = f.attest(mspProvider, id, "HOSP-DISTRICT")
	f.refuses(err, "(6)", "a second attestation from a class already present")

	if got := len(f.getEvent(id).Attestations); got != 1 {
		t.Fatalf("event should still carry exactly one attestation, has %d", got)
	}
}

// ---------------------------------------------------------------- equation 7

// TestCloseEvent_PayeeCannotFillQuorumAlone is the integration half of
// equations (6) and (7): the facility that gets paid cannot corroborate itself
// into eligibility, however many of its own accredited sites sign.
func TestCloseEvent_PayeeCannotFillQuorumAlone(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)

	id, err := f.openEvent(subjAlpha, "2026-03-01T08:00Z", "HOSP-UPAZILA", "H-CARD-01", 50000, 50000)
	f.must(err, "open")

	// A second facility of the same class adds no class to the set.
	err = f.attest(mspProvider, id, "HOSP-DISTRICT")
	f.refuses(err, "(6)", "a second attestation from the payee's own class")

	err = f.closeEvent(mspProvider, id)
	f.refuses(err, "(6)", "close on the payee's word alone")

	// One independent class is enough to make it eligible.
	f.must(f.attest(mspClinical, id, "DIAG-CENTRE"), "independent clinical attestation")
	f.must(f.closeEvent(mspProvider, id), "close with an independent class present")
}

// TestInvariant_NonPayeeAttestationRequired exercises equation (7) directly:
//
//	Elig(e) => EXISTS a in Att(e) : cls(a) != Pay(e)
//
// A note on how this relates to equation (6). Under every domain profile in
// the paper exactly one class is the payee -- the hospital in health, the
// workshop in motor -- and attestEvent refuses a class that has already
// attested. Given both of those, an attestation set that spans two classes
// necessarily contains a non-payee one, so on these profiles (7) can never
// fire without (6) firing first: it is a redundant guard, not an unreachable
// one.
//
// It stops being redundant the moment a profile designates more than one
// payee-side class -- a hospital and a diagnostic centre under common
// ownership, say, which is exactly the pairing the collusion row of the fraud
// taxonomy is about. The check is kept and tested here on its own terms so
// that widening the profile cannot silently remove it.
func TestInvariant_NonPayeeAttestationRequired(t *testing.T) {
	payeeOnly := []model.Attestation{
		{AttesterID: "HOSP-UPAZILA", Class: model.ClassProvider},
		{AttesterID: "HOSP-DISTRICT", Class: model.ClassProvider},
	}
	if res := invariants.NonPayeeAttestation(payeeOnly, model.ClassProvider); res.OK {
		t.Fatal("an attestation set consisting only of the payee class must not confer eligibility")
	} else if res.Eq != "(7)" {
		t.Fatalf("refusal should cite equation (7), cites %s", res.Eq)
	}

	spanning := append(payeeOnly, model.Attestation{AttesterID: "MFI-AGENT", Class: model.ClassField})
	if res := invariants.NonPayeeAttestation(spanning, model.ClassProvider); !res.OK {
		t.Fatalf("a set containing a non-payee class must pass: %s", res.Reason)
	}

	// And the payee is a parameter, not a constant: on a profile where the
	// diagnostic centre is the payee, its attestation is the one that does not
	// count towards independence.
	if res := invariants.NonPayeeAttestation(
		[]model.Attestation{{Class: model.ClassClinical}}, model.ClassClinical); res.OK {
		t.Fatal("the payee class is per-profile and must be honoured as such")
	}
}

// ---------------------------------------------------------------- equation 8

// TestEntitlement_RefusesSecondOnSamePolicy:
//
//	Ev(c) = Ev(c') => Pol(c) != Pol(c')
func TestEntitlement_RefusesSecondOnSamePolicy(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)

	id := f.eligibleEvent(subjAlpha, "2026-03-01T08:00Z", "H-CARD-01", 50000, 50000)

	_, err := f.createEntitlement(mspInsurerA, id, "POL-A1")
	f.must(err, "first entitlement")

	_, err = f.createEntitlement(mspInsurerA, id, "POL-A1")
	f.refuses(err, "(8)", "second entitlement on the same (event, policy) pair")
}

// ---------------------------------------------------------------- equation 9

// TestSettle_RefusesReopenedOrLapsed:
//
//	Setl(c) => Elig(Ev(c)) AND Act(c) AND NOT Reop(c)
func TestSettle_RefusesReopenedOrLapsed(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)
	f.issuePolicy(mspInsurerA, "POL-A2", subjBeta, "POOL-A", "INDEMNITY", 30000)

	// An entitlement is consumed exactly once.
	id := f.eligibleEvent(subjAlpha, "2026-03-01T08:00Z", "H-CARD-01", 50000, 50000)
	entID, err := f.settleFully(mspInsurerA, id, "POL-A1", "MFS-REQ-0001")
	f.must(err, "first settlement")
	if f.getEntitlement(entID).State != model.EntSettled {
		t.Fatal("entitlement should be SETTLED")
	}
	err = f.settle(mspInsurerA, entID, "MFS-REQ-0002")
	f.refuses(err, "(9)", "settling a consumed entitlement a second time")

	// A lapsed policy does not pay.
	id2 := f.eligibleEvent(subjBeta, "2026-03-02T08:00Z", "H-RESP-02", 40000, 40000)
	ent2, err := f.createEntitlement(mspInsurerA, id2, "POL-A2")
	f.must(err, "entitlement on beta")
	_, err = f.adjudicate(mspInsurerA, ent2)
	f.must(err, "adjudicate beta")
	f.must(f.tx(mspInsurerA, "SetPolicyState", func(ctx contractapi.TransactionContextInterface) error {
		return f.policy.SetPolicyState(ctx, "POL-A2", "LAPSED")
	}), "lapse policy")
	err = f.settle(mspInsurerA, ent2, "MFS-REQ-0003")
	f.refuses(err, "(9)", "settling against a lapsed policy")

	// An event that never reached CLOSED_ELIGIBLE does not settle either.
	f.issuePolicy(mspInsurerA, "POL-A3", subjAlpha, "POOL-A", "INDEMNITY", 30000)
	open, err := f.openEvent(subjAlpha, "2026-09-01T08:00Z", "HOSP-UPAZILA", "H-CARD-01", 50000, 50000)
	f.must(err, "open uncorroborated event")
	_, err = f.createEntitlement(mspInsurerA, open, "POL-A3")
	f.must(err, "entitlement against an open event may be created")
	_, err = f.adjudicate(mspInsurerA, model.EntitlementKey(open, "POL-A3"))
	if err == nil {
		t.Fatal("an uncorroborated event must not be adjudicated")
	}
}

// ---------------------------------------------------------------- equation 2

// TestCOB_CapsIndemnityAndFixedSeparately is coordination of benefits:
//
//	SUM indemnity paid <= loss(e)     SUM fixed paid <= cap(e)
//
// The two sums are held apart on purpose. A fixed-benefit hospital-cash product
// is designed to pay alongside an indemnity policy; what is fraudulent is
// recovering the same economic loss twice, which is an arithmetic condition
// over the entitlement set and is enforced as one.
func TestCOB_CapsIndemnityAndFixedSeparately(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)
	f.issuePolicy(mspInsurerB, "POL-B1", subjAlpha, "POOL-B", "INDEMNITY", 30000)

	// Assessed loss of 40,000 against two indemnity policies of 30,000 each.
	id := f.eligibleEvent(subjAlpha, "2026-03-01T08:00Z", "H-CARD-01", 40000, 40000)

	_, err := f.settleFully(mspInsurerA, id, "POL-A1", "MFS-REQ-A")
	f.must(err, "first indemnity settlement")

	_, err = f.settleFully(mspInsurerB, id, "POL-B1", "MFS-REQ-B")
	f.refuses(err, "(2)", "second indemnity settlement exceeding the assessed loss")

	if !strings.Contains(err.Error(), "60000") || !strings.Contains(err.Error(), "40000") {
		t.Fatalf("the refusal should show the arithmetic that produced it; got: %v", err)
	}
}

// --------------------------------------------- the cases that MUST NOT fail

// TestTransfer_Settles is the false positive that would break the health
// deployment outright. A patient stabilised at an upazila health complex and
// moved to a district hospital produces two admissions and one clinical
// episode. A naive invariant would refuse the receiving facility's assertion
// at the worst possible moment.
func TestTransfer_Settles(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)

	id, err := f.openEvent(subjAlpha, "2026-03-01T08:00Z", "HOSP-UPAZILA", "H-CARD-01", 50000, 50000)
	f.must(err, "upazila admission")

	f.must(f.tx(mspProvider, "ContinueEvent", func(ctx contractapi.TransactionContextInterface) error {
		return f.event.ContinueEvent(ctx, id, "HOSP-DISTRICT", "TRANSFER", "HOSP-UPAZILA")
	}), "transfer to the district hospital")

	ev := f.getEvent(id)
	if len(ev.Segments) != 2 {
		t.Fatalf("transfer should add an admission segment, event has %d", len(ev.Segments))
	}
	if ev.Segments[1].Kind != model.SegmentTransfer {
		t.Fatalf("second segment should be a TRANSFER, is %s", ev.Segments[1].Kind)
	}

	f.must(f.attest(mspField, id, "MFI-AGENT"), "field attestation")
	f.must(f.closeEvent(mspProvider, id), "close after transfer")
	_, err = f.settleFully(mspInsurerA, id, "POL-A1", "MFS-REQ-T")
	f.must(err, "settle a transferred episode")
}

// TestReadmission_SettlesOnce: a readmission inside the window links to the
// same event and is judged against a single benefit ceiling, rather than
// paying twice or being refused.
func TestReadmission_SettlesOnce(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)

	id := f.eligibleEvent(subjAlpha, "2026-03-01T08:00Z", "H-CARD-01", 50000, 50000)

	f.must(f.txAt(mspProvider, "ContinueEvent", f.now+10*24*3600, func(ctx contractapi.TransactionContextInterface) error {
		return f.event.ContinueEvent(ctx, id, "HOSP-UPAZILA", "READMISSION", "")
	}), "readmission inside the window")

	ev := f.getEvent(id)
	if ev.State != model.EventOpen {
		t.Fatalf("a readmission should re-open the episode, state is %s", ev.State)
	}
	f.must(f.closeEvent(mspProvider, id), "close after readmission")

	entID, err := f.settleFully(mspInsurerA, id, "POL-A1", "MFS-REQ-R")
	f.must(err, "settle the readmitted episode")

	// One entitlement, one benefit ceiling, whatever the number of admissions.
	var ents []model.Entitlement
	f.must(f.tx(mspRegulator, "ListEntitlementsForEvent", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		ents, e = f.settlement.ListEntitlementsForEvent(ctx, id)
		return e
	}), "list entitlements")
	if len(ents) != 1 {
		t.Fatalf("a readmission must not create a second entitlement; found %d", len(ents))
	}
	if got := f.getEntitlement(entID).Amount; got != 30000 {
		t.Fatalf("benefit should be the single scheduled amount, got %d", got)
	}
}

// TestDualCover_BothPoliciesSettle: a garment worker covered by an employer
// scheme and enrolled through an MFI group holds two policies. A fixed-benefit
// hospital-cash product is designed to pay alongside an indemnity policy.
// Paying both is the contract, not a fraud -- and a protocol that blocked the
// second payment because the event was "already claimed" would be rejected by
// a regulator on first reading.
func TestDualCover_BothPoliciesSettle(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-EMPLOYER", subjAlpha, "POOL-A", "INDEMNITY", 30000)
	f.issuePolicy(mspInsurerB, "POL-MFI-CASH", subjAlpha, "POOL-B", "FIXED", 30000)

	id := f.eligibleEvent(subjAlpha, "2026-03-01T08:00Z", "H-CARD-01", 50000, 50000)

	entA, err := f.settleFully(mspInsurerA, id, "POL-EMPLOYER", "MFS-REQ-EMP")
	f.must(err, "employer indemnity settlement")

	entB, err := f.settleFully(mspInsurerB, id, "POL-MFI-CASH", "MFS-REQ-MFI")
	f.must(err, "MFI fixed-benefit settlement -- this must not be refused")

	if s := f.getEntitlement(entA).State; s != model.EntSettled {
		t.Fatalf("employer entitlement is %s", s)
	}
	if s := f.getEntitlement(entB).State; s != model.EntSettled {
		t.Fatalf("MFI entitlement is %s", s)
	}

	// And the second insurer could see the first one's payment before settling,
	// which is the thing no insurer in this market can do today.
	var view *CoverageView
	f.must(f.tx(mspInsurerB, "GetCoverageView", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		view, e = f.settlement.GetCoverageView(ctx, id)
		return e
	}), "coverage view")
	if view.PaidIndemnity != 30000 || view.PaidFixed != 30000 {
		t.Fatalf("coverage view should show both settlements: %s", jsonOf(view))
	}
	if len(view.Entitlements) != 2 {
		t.Fatalf("coverage view should list both entitlements: %s", jsonOf(view))
	}
}
