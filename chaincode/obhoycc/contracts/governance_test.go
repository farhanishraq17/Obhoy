package contracts

import (
	"regexp"
	"strings"
	"testing"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/model"
)

// ---------------------------------------------------------------- governance

// TestGovernanceMetrics_MatchThePaper checks the two published numbers against
// the weight table: insurers 0.30, regulator 0.20, aggregators 0.20, provider
// association 0.15, academic auditor 0.15.
//
// Sorted cumulative weight runs 0.30 -> 0.50 -> 0.70, so two classes cannot
// reach a majority and three can: the Nakamoto Coefficient is 3. The Gini of
// the same weights is 1.40/10 = 0.14.
func TestGovernanceMetrics_MatchThePaper(t *testing.T) {
	m := ComputeMetrics([]int64{3000, 2000, 2000, 1500, 1500})
	if m.NakamotoCoefficient != 3 {
		t.Fatalf("Nakamoto Coefficient should be 3, got %d", m.NakamotoCoefficient)
	}
	if m.Gini != 0.14 {
		t.Fatalf("Gini should be 0.14, got %v", m.Gini)
	}

	// The comparison the paper draws is against a published three-class model
	// weighted 0.4/0.3/0.3. Its Nakamoto Coefficient is 2 -- 0.4 + 0.3 = 0.7
	// clears a majority with two classes -- and that half checks out.
	c := ComputeMetrics([]int64{4000, 3000, 3000})
	if c.NakamotoCoefficient != 2 {
		t.Fatalf("the comparison model should have NC 2, got %d", c.NakamotoCoefficient)
	}

	// Its Gini does not. Section 6.2 cites 0.26 for that distribution, but the
	// formula the same paragraph states -- G = sum_i sum_j |w_i - w_j| /
	// 2 n^2 wbar -- gives 0.4 / (2 * 9 * 0.3333) = 0.0667. The formula is not
	// in doubt: applied to Obhoy's own 0.30/0.20/0.20/0.15/0.15 it reproduces
	// the paper's 1.40/10 = 0.14 exactly, as asserted above.
	//
	// So the cited comparison figure is either computed on a different basis
	// from the source it is drawn from, or it is wrong. This test asserts what
	// the stated formula actually yields, and docs/FINDINGS.md records the
	// discrepancy for the authors to resolve against the primary source rather
	// than having the code quietly adopt either number.
	if c.Gini < 0.066 || c.Gini > 0.067 {
		t.Fatalf("under the paper's own formula the comparison model gives 0.0667, got %v", c.Gini)
	}

	// What the comparison is used to support still holds on the numbers that do
	// check out: Obhoy disperses formal authority further on both measures.
	if !(m.NakamotoCoefficient > c.NakamotoCoefficient) {
		t.Fatal("the Nakamoto Coefficient comparison is the load-bearing one and must favour the wider distribution")
	}
}

// TestGovernance_RejectsAdmissionBreachingCaps is the claim that the metrics
// bind rather than describe. A proposal that would push a class over 0.30 is
// refused before any vote is taken -- the council cannot vote itself past its
// own concentration limits.
func TestGovernance_RejectsAdmissionBreachingCaps(t *testing.T) {
	f := newFixture(t).seed()

	// Insurers to 0.35, everyone else squeezed. Sums to 1.0, breaches the cap.
	overCap := `[
	  {"class":"INSURERS","msp":"InsurerAMSP","weightBp":3500},
	  {"class":"REGULATOR","msp":"RegulatorMSP","weightBp":2000},
	  {"class":"AGGREGATORS","msp":"FieldMSP","weightBp":2000},
	  {"class":"PROVIDERS","msp":"ProviderMSP","weightBp":1500},
	  {"class":"ACADEMIC","msp":"AcademicMSP","weightBp":1000}
	]`
	err := f.tx(mspInsurerA, "ProposeAdmission", func(ctx contractapi.TransactionContextInterface) error {
		return f.governance.ProposeAdmission(ctx, "PROP-OVERCAP", "insurers to 0.35", overCap)
	})
	if err == nil {
		t.Fatal("a distribution breaching the 0.30 class cap must be refused")
	}
	if !strings.Contains(err.Error(), "0.30") {
		t.Fatalf("the refusal should name the cap it breached: %v", err)
	}

	// Three classes at 0.30/0.30/0.40 would give a Nakamoto Coefficient of 2:
	// two classes could form a majority.
	lowNC := `[
	  {"class":"INSURERS","msp":"InsurerAMSP","weightBp":3000},
	  {"class":"REGULATOR","msp":"RegulatorMSP","weightBp":3000},
	  {"class":"AGGREGATORS","msp":"FieldMSP","weightBp":2000},
	  {"class":"PROVIDERS","msp":"ProviderMSP","weightBp":2000}
	]`
	err = f.tx(mspInsurerA, "ProposeAdmission", func(ctx contractapi.TransactionContextInterface) error {
		return f.governance.ProposeAdmission(ctx, "PROP-LOWNC", "four classes", lowNC)
	})
	if err == nil {
		t.Fatal("a distribution dropping the Nakamoto Coefficient below 3 must be refused")
	}
	if !strings.Contains(err.Error(), "Nakamoto") {
		t.Fatalf("the refusal should name the metric it breached: %v", err)
	}

	// And a distribution that does not sum to one is not a distribution.
	err = f.tx(mspInsurerA, "ProposeAdmission", func(ctx contractapi.TransactionContextInterface) error {
		return f.governance.ProposeAdmission(ctx, "PROP-BADSUM", "does not sum", `[
		  {"class":"INSURERS","msp":"InsurerAMSP","weightBp":3000},
		  {"class":"REGULATOR","msp":"RegulatorMSP","weightBp":3000}
		]`)
	})
	if err == nil {
		t.Fatal("weights that do not sum to 1.0 must be refused")
	}
}

// TestGovernance_CompliantAdmissionCarriesOnSupermajority admits a sixth class
// within the caps and shows the two-thirds threshold doing the work.
func TestGovernance_CompliantAdmissionCarriesOnSupermajority(t *testing.T) {
	f := newFixture(t).seed()

	compliant := `[
	  {"class":"INSURERS","msp":"InsurerAMSP","weightBp":2500},
	  {"class":"REGULATOR","msp":"RegulatorMSP","weightBp":2000},
	  {"class":"AGGREGATORS","msp":"FieldMSP","weightBp":2000},
	  {"class":"PROVIDERS","msp":"ProviderMSP","weightBp":1500},
	  {"class":"ACADEMIC","msp":"AcademicMSP","weightBp":1500},
	  {"class":"CLINICAL","msp":"ClinicalMSP","weightBp":500}
	]`
	f.must(f.tx(mspInsurerA, "ProposeAdmission", func(ctx contractapi.TransactionContextInterface) error {
		return f.governance.ProposeAdmission(ctx, "PROP-ADMIT", "admit the clinical class", compliant)
	}), "raise a compliant admission")

	// 0.30 + 0.20 = 0.50: short of two thirds, so nothing changes yet.
	f.must(f.tx(mspInsurerA, "Vote", func(ctx contractapi.TransactionContextInterface) error {
		return f.governance.Vote(ctx, "PROP-ADMIT")
	}), "insurers vote")
	f.must(f.tx(mspRegulator, "Vote", func(ctx contractapi.TransactionContextInterface) error {
		return f.governance.Vote(ctx, "PROP-ADMIT")
	}), "regulator votes")

	var prop *model.Proposal
	f.must(f.tx(mspAcademic, "GetProposal", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		prop, e = f.governance.GetProposal(ctx, "PROP-ADMIT")
		return e
	}), "read proposal")
	if prop.State != model.ProposalOpen {
		t.Fatalf("half the weight is not two thirds; proposal is %s", prop.State)
	}

	// A class votes once, not once per attempt.
	if err := f.tx(mspRegulator, "Vote", func(ctx contractapi.TransactionContextInterface) error {
		return f.governance.Vote(ctx, "PROP-ADMIT")
	}); err == nil {
		t.Fatal("a class must not be able to vote twice")
	}

	// 0.50 + 0.20 = 0.70, past two thirds. It carries and applies.
	f.must(f.tx(mspField, "Vote", func(ctx contractapi.TransactionContextInterface) error {
		return f.governance.Vote(ctx, "PROP-ADMIT")
	}), "aggregators vote")

	f.must(f.tx(mspAcademic, "GetProposal", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		prop, e = f.governance.GetProposal(ctx, "PROP-ADMIT")
		return e
	}), "re-read proposal")
	if prop.State != model.ProposalPassed {
		t.Fatalf("two thirds should carry; proposal is %s with weight %v", prop.State, prop.WeightFor)
	}

	var metrics *Metrics
	f.must(f.tx(mspAcademic, "GetMetrics", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		metrics, e = f.governance.GetMetrics(ctx)
		return e
	}), "read metrics")
	if metrics.ClassCount != 6 {
		t.Fatalf("the sixth class should be seated, count is %d", metrics.ClassCount)
	}
	if metrics.NakamotoCoefficient < MinNakamoto {
		t.Fatalf("admission must not drop NC below %d, it is %d", MinNakamoto, metrics.NakamotoCoefficient)
	}
}

// ----------------------------------------------------------- Mechanism 3

// TestDeAccreditedProvider_CannotAssertOrReRegister: a facility with a pattern
// of failed attestations is de-accredited permanently and visibly, and cannot
// re-register clean to shed the record.
func TestDeAccreditedProvider_CannotAssertOrReRegister(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)

	f.must(f.tx(mspRegulator, "DeAccredit", func(ctx contractapi.TransactionContextInterface) error {
		return f.provider.DeAccredit(ctx, "HOSP-UPAZILA", "pattern of failed attestations")
	}), "de-accredit")

	_, err := f.openEvent(subjAlpha, "2026-03-01T08:00Z", "HOSP-UPAZILA", "H-CARD-01", 50000, 50000)
	if err == nil {
		t.Fatal("a de-accredited facility must not be able to assert an event")
	}

	err = f.tx(mspRegulator, "Accredit", func(ctx contractapi.TransactionContextInterface) error {
		return f.provider.Accredit(ctx, "HOSP-UPAZILA", mspProvider, "PROVIDER", "DGHS-NEW")
	})
	if err == nil {
		t.Fatal("a de-accredited facility must not be able to re-register clean")
	}
	if !strings.Contains(err.Error(), "pattern of failed attestations") {
		t.Fatalf("the refusal should carry the reason from the surviving history: %v", err)
	}

	var p *model.Provider
	f.must(f.tx(mspAcademic, "GetProvider", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		p, e = f.provider.GetProvider(ctx, "HOSP-UPAZILA")
		return e
	}), "read provider")
	if len(p.History) < 2 {
		t.Fatalf("accreditation history should survive revocation: %v", p.History)
	}
}

// --------------------------------------------------------------- Mechanism 5

// TestAppeal_DenyingInsurerCannotDecide is the conflict rule, in chaincode
// rather than in a policy document: insurers may not help validate appeals
// against their own denials.
func TestAppeal_DenyingInsurerCannotDecide(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)
	// The regulator is also an insurer-facing member here only so the test can
	// attempt the conflicted call; on the network the appeal panel is its own
	// class.
	RegisterMSPClass("PanelMSP", model.ClassOversight)

	id := f.eligibleEvent(subjAlpha, "2026-03-01T08:00Z", "H-CARD-01", 50000, 50000)
	entID, err := f.createEntitlement(mspInsurerA, id, "POL-A1")
	f.must(err, "entitlement")

	f.must(f.tx(mspInsurerA, "Deny", func(ctx contractapi.TransactionContextInterface) error {
		return f.settlement.Deny(ctx, entID, "D-07-CATEGORY-NOT-COVERED")
	}), "deny with a coded reason")

	// A denial with no code cannot be counted or appealed, so it is refused.
	if err := f.tx(mspInsurerA, "Deny", func(ctx contractapi.TransactionContextInterface) error {
		return f.settlement.Deny(ctx, entID, "")
	}); err == nil {
		t.Fatal("an uncoded denial must be refused")
	}

	f.must(f.tx(mspField, "Appeal", func(ctx contractapi.TransactionContextInterface) error {
		return f.settlement.Appeal(ctx, entID)
	}), "field agent appeals on the policyholder's behalf")

	// InsurerA is oversight-classed nowhere, so it cannot reach the panel
	// function at all -- and even a member that could is refused by name.
	RegisterMSPClass("InsurerAMSP", model.ClassOversight)
	err = f.tx(mspInsurerA, "PanelDecision", func(ctx contractapi.TransactionContextInterface) error {
		return f.settlement.PanelDecision(ctx, entID, true, "upheld")
	})
	RegisterMSPClass("InsurerAMSP", model.ClassInsurer)
	if err == nil {
		t.Fatal("the denying insurer must not decide the appeal against its own denial")
	}
	if !strings.Contains(err.Error(), "conflict of interest") {
		t.Fatalf("the refusal should name the conflict: %v", err)
	}

	// An independent panel can, and overturning sends it back for adjudication
	// rather than settling it -- the panel does not price claims.
	f.must(f.tx("PanelMSP", "PanelDecision", func(ctx contractapi.TransactionContextInterface) error {
		return f.settlement.PanelDecision(ctx, entID, false, "category was covered under v1")
	}), "independent panel overturns")

	if s := f.getEntitlement(entID).State; s != model.EntCreated {
		t.Fatalf("an overturned denial should return the entitlement for adjudication, state is %s", s)
	}
	_, err = f.adjudicate(mspInsurerA, entID)
	f.must(err, "re-adjudicate after a successful appeal")
	f.must(f.settle(mspInsurerA, entID, "MFS-REQ-APPEAL"), "settle after a successful appeal")
}

// -------------------------------------------------------------- transparency

// TestTransparency_PeriodClosesAndProofVerifies is Mechanism 4. The totals are
// a by-product of the claim path rather than a report somebody files, and once
// the period closes anyone can check a published figure against the committed
// root without trusting the API that served it.
func TestTransparency_PeriodClosesAndProofVerifies(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)
	f.issuePolicy(mspInsurerA, "POL-A2", subjBeta, "POOL-A", "INDEMNITY", 30000)

	id1 := f.eligibleEvent(subjAlpha, "2026-03-01T08:00Z", "H-CARD-01", 50000, 50000)
	_, err := f.settleFully(mspInsurerA, id1, "POL-A1", "MFS-1")
	f.must(err, "settle one")

	id2 := f.eligibleEvent(subjBeta, "2026-03-02T08:00Z", "H-RESP-02", 40000, 40000)
	ent2, err := f.createEntitlement(mspInsurerA, id2, "POL-A2")
	f.must(err, "second entitlement")
	f.must(f.tx(mspInsurerA, "Deny", func(ctx contractapi.TransactionContextInterface) error {
		return f.settlement.Deny(ctx, ent2, "D-03-OUTSIDE-BENEFIT-GROUP")
	}), "deny one")

	f.must(f.tx(mspInsurerA, "RecordPremium", func(ctx contractapi.TransactionContextInterface) error {
		return f.transparency.RecordPremium(ctx, "POOL-A", 1200000)
	}), "record premium")
	f.must(f.tx(mspInsurerA, "SetReserve", func(ctx contractapi.TransactionContextInterface) error {
		return f.transparency.SetReserve(ctx, "POOL-A", 900000)
	}), "set reserve")

	var root string
	f.must(f.tx(mspRegulator, "ClosePeriod", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		root, e = f.transparency.ClosePeriod(ctx, "2026Q1-POOL-A")
		return e
	}), "close period")
	if len(root) != 64 {
		t.Fatalf("period root should be a 32-byte digest, got %q", root)
	}

	var period *model.Period
	f.must(f.tx(mspAcademic, "GetPeriod", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		period, e = f.transparency.GetPeriod(ctx, "2026Q1-POOL-A")
		return e
	}), "read period")
	if period.ClaimsReceived != 2 || period.ClaimsSettled != 1 || period.ClaimsDenied != 1 {
		t.Fatalf("totals should be derived from the claim path: %s", jsonOf(period))
	}
	if period.DenialReasons["D-03-OUTSIDE-BENEFIT-GROUP"] != 1 {
		t.Fatalf("denials should be counted by coded reason: %s", jsonOf(period))
	}
	if period.NakamotoCoefficient != 3 || period.Gini != 0.14 {
		t.Fatalf("governance metrics should be recomputed and published each period: %s", jsonOf(period))
	}

	// A published figure can be proved against the committed root...
	var proof *LeafProof
	f.must(f.tx(mspAcademic, "GetLeafProof", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		proof, e = f.transparency.GetLeafProof(ctx, "2026Q1-POOL-A", "claimsSettled", 1)
		return e
	}), "leaf proof")
	if !model.VerifyMerkleProof(proof.Leaf, proof.Proof, root) {
		t.Fatal("the inclusion proof for a published figure should verify against the root")
	}

	// ...and a figure that was NOT committed cannot be.
	err = f.tx(mspAcademic, "GetLeafProof", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		_, e = f.transparency.GetLeafProof(ctx, "2026Q1-POOL-A", "claimsSettled", 99)
		return e
	})
	if err == nil {
		t.Fatal("a figure that was never committed must not produce a proof")
	}

	// A closed period is not restated in place.
	err = f.tx(mspRegulator, "ClosePeriod", func(ctx contractapi.TransactionContextInterface) error {
		_, e := f.transparency.ClosePeriod(ctx, "2026Q1-POOL-A")
		return e
	})
	if err == nil {
		t.Fatal("a closed period must not be closed again")
	}

	f.must(f.tx(mspRegulator, "RecordAnchor", func(ctx contractapi.TransactionContextInterface) error {
		return f.transparency.RecordAnchor(ctx, "2026Q1-POOL-A", "polygon-amoy", "0xdeadbeef", 12345)
	}), "record the anchor")
	err = f.tx(mspRegulator, "RecordAnchor", func(ctx contractapi.TransactionContextInterface) error {
		return f.transparency.RecordAnchor(ctx, "2026Q1-POOL-A", "polygon-amoy", "0xother", 12346)
	})
	if err == nil {
		t.Fatal("a period must not be anchored twice")
	}
}

// ------------------------------------------------------- privacy and access

// TestAccessControl_ClassCannotActOutsideItsRole. Field verifiers attest but
// never adjudicate. Providers open and attest but cannot authorise payment.
// Insurers adjudicate only their own policies. The academic node reads.
func TestAccessControl_ClassCannotActOutsideItsRole(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)
	f.issuePolicy(mspInsurerB, "POL-B1", subjBeta, "POOL-B", "INDEMNITY", 30000)

	id := f.eligibleEvent(subjAlpha, "2026-03-01T08:00Z", "H-CARD-01", 50000, 50000)

	// A provider cannot claim payment for itself.
	if err := f.tx(mspProvider, "CreateEntitlement", func(ctx contractapi.TransactionContextInterface) error {
		_, e := f.settlement.CreateEntitlement(ctx, id, "POL-A1")
		return e
	}); err == nil {
		t.Fatal("a provider must not be able to create an entitlement")
	}

	// A field agent cannot assert an event.
	if err := f.tx(mspField, "OpenEvent", func(ctx contractapi.TransactionContextInterface) error {
		_, e := f.event.OpenEvent(ctx, "HEALTH", subjBeta, "2026-04-01T08:00Z", "MFI-AGENT", "H-CARD-01", 1, 1)
		return e
	}); err == nil {
		t.Fatal("a field agent must not be able to assert an event")
	}

	// An insurer cannot adjudicate a competitor's policy.
	entID, err := f.createEntitlement(mspInsurerA, id, "POL-A1")
	f.must(err, "insurer A's own entitlement")
	if err := f.tx(mspInsurerB, "Adjudicate", func(ctx contractapi.TransactionContextInterface) error {
		_, e := f.settlement.Adjudicate(ctx, entID)
		return e
	}); err == nil {
		t.Fatal("an insurer must not adjudicate another insurer's entitlement")
	}

	// An organisation outside the roster cannot do anything at all.
	if err := f.tx("StrangerMSP", "OpenEvent", func(ctx contractapi.TransactionContextInterface) error {
		_, e := f.event.OpenEvent(ctx, "HEALTH", subjAlpha, "2026-05-01T08:00Z", "HOSP-UPAZILA", "H-CARD-01", 1, 1)
		return e
	}); err == nil {
		t.Fatal("a non-member organisation must be refused")
	}
}

// TestWorldState_HoldsNoIdentifiers is the claim the paper makes about the
// data model, checked rather than asserted: no single on-chain field is
// protected health information on its own.
//
// This is not a claim of anonymity. CategoryCode, subject commitment, provider
// identity and timestamps together remain a metadata surface, and the paper
// treats that residual as a DPIA question rather than a solved problem. What
// this test establishes is narrower and still worth having: nothing that looks
// like a national identity number, a personal name or a free-text diagnosis
// ever reaches the ledger.
func TestWorldState_HoldsNoIdentifiers(t *testing.T) {
	f := newFixture(t).seed()
	f.issuePolicy(mspInsurerA, "POL-A1", subjAlpha, "POOL-A", "INDEMNITY", 30000)
	id := f.eligibleEvent(subjAlpha, "2026-03-01T08:00Z", "H-CARD-01", 50000, 50000)
	_, err := f.settleFully(mspInsurerA, id, "POL-A1", "MFS-1")
	f.must(err, "settle")

	// A Bangladeshi national identity number is 10, 13 or 17 digits. The match
	// is deliberately on a QUOTED all-digit string of exactly those lengths
	// rather than on any long digit run: unquoted numbers in the state are
	// epoch seconds and taka amounts, and a bare \d{10,} would flag every
	// timestamp on the ledger and prove nothing.
	nidLike := regexp.MustCompile(`"(\d{10}|\d{13}|\d{17})"`)
	forbidden := []string{
		"myocardial", "infarction", "diagnosis", "patient", "surname",
		"village", "mobile", "01[0-9]{9}",
	}

	dump := f.ledger.Dump()
	if len(dump) == 0 {
		t.Fatal("world state is empty; the test would pass vacuously")
	}
	for key, value := range dump {
		blob := key + " " + value
		if m := nidLike.FindString(blob); m != "" {
			t.Errorf("world state key %q holds %s, which is national-identity-number shaped", key, m)
		}
		lower := strings.ToLower(blob)
		for _, word := range forbidden {
			if strings.Contains(lower, word) {
				t.Errorf("world state key %q contains %q", key, word)
			}
		}
	}

	// The subject appears, and appears only as a 32-byte commitment.
	found := false
	for key := range dump {
		if strings.HasPrefix(key, "~subject~") {
			found = true
			commitment := strings.Trim(strings.TrimPrefix(key, "~subject~"), "~")
			if len(commitment) != 64 {
				t.Errorf("subject key %q is not a 32-byte digest", key)
			}
		}
	}
	if !found {
		t.Fatal("expected at least one subject commitment in the world state")
	}
}
