package scenarios

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/contracts"
	"github.com/obhoy/obhoycc/model"
)

// Scenario is one entry in the harness.
type Scenario struct {
	ID        string
	Title     string
	Criterion string
	Claim     string
	Run       func(r *Runner) Result
}

// All returns the harness in demonstration order.
func All() []Scenario {
	return []Scenario{
		{"S1", "Happy path: a claim settles", "Problem & Solution",
			"The whole claim path works: assert, corroborate across classes, close, adjudicate against a published schedule, authorise payment.", s1},
		{"S2", "Cross-insurer duplicate refused at commit", "Problem & Solution",
			"Two facilities answering to two insurers who cannot see each other. The second assertion is refused before it is written -- which is the thing no single-party database can do.", s2},
		{"S3", "Second entitlement on the same policy refused", "Problem & Solution",
			"An entitlement is consumed once. The same policy cannot claim twice against one event.", s3},
		{"S4", "Genuine dual cover pays", "Problem & Solution",
			"An employer indemnity scheme and an MFI hospital-cash policy both settle on one hospitalisation. Blocking the second would deny valid cover.", s4},
		{"S5", "Transfer between facilities settles once", "Problem & Solution",
			"Upazila to district. Two admissions, one clinical episode, one benefit -- and no refusal at the worst possible moment.", s5},
		{"S6", "Readmission inside the window links", "Problem & Solution",
			"A readmission attaches to the same event and is judged against a single benefit ceiling.", s6},
		{"S7", "Payee cannot corroborate itself", "Architecture",
			"The facility that gets paid cannot reach eligibility on its own signatures, however many of its sites sign.", s7},
		{"S8", "De-accredited provider cannot re-register clean", "Governance",
			"Revocation is permanent and visible, and the history survives it.", s8},
		{"S9", "Denying insurer cannot decide the appeal", "Governance",
			"The conflict rule is in chaincode, not in a policy document.", s9},
		{"S10", "Period anchored; tampering detected", "Problem & Solution",
			"Published totals are committed to a Merkle root. Altering a figure afterwards no longer verifies.", s10},
		{"S11", "Access control and the world state", "Privacy & Security",
			"Classes cannot act outside their role, and the entire ledger contains no identifier.", s11},
		{"S12", "Payout instructions are payload-bound", "Architecture",
			"The ledger authorises payment; it does not execute it. Every instruction carries a request identifier bound to its payload.", s12},
		{"G1", "Governance caps bind, not describe", "Governance",
			"An admission that would breach the concentration limits is refused before any vote is taken.", g1},
	}
}

// RunAll executes the whole harness.
func RunAll() []Result {
	out := []Result{}
	for _, sc := range All() {
		out = append(out, sc.Run(NewRunner()))
	}
	return out
}

// RunOne executes a single scenario by identifier.
func RunOne(id string) (Result, error) {
	for _, sc := range All() {
		if strings.EqualFold(sc.ID, id) {
			return sc.Run(NewRunner()), nil
		}
	}
	return Result{}, fmt.Errorf("no scenario %q; try one of S1..S12 or G1", id)
}

// ------------------------------------------------------------------------ S1

func s1(r *Runner) Result {
	subj := r.subject(3)
	id := r.openEvent("ProviderMSP", subj, "2026-03-04T07:10Z", "HOSP-UPAZILA-KLG", "H-CARD-01", 5000000, 5000000, Accepted)
	r.note("the admitting facility asserts the event; that assertion is itself one attesting class")
	r.attest("ClinicalMSP", id, "DIAG-CENTRE-KLG", Accepted)
	r.note("an independent diagnostic centre corroborates -- a second class, and not the payee")
	r.closeEvent("ProviderMSP", id, Accepted)
	r.note("two classes including one non-payee: the event is now CLOSED_ELIGIBLE")

	ent := r.createEntitlement("InsurerAMSP", id, "POL-A-0003", Accepted)
	amount := r.adjudicate("InsurerAMSP", ent, Accepted)
	r.note("the amount comes from the published schedule, not from any document the claimant wrote")
	r.settle("InsurerAMSP", ent, "MFS-REQ-S1-0001", Accepted)

	r.check("InsurerAMSP", "benefit matches the published schedule", amount == 3000000,
		fmt.Sprintf("adjudicated at %d minor units against schedule entry H-CARD-01", amount))
	return r.result("S1", "Happy path: a claim settles", "Problem & Solution",
		"Assert, corroborate, close, adjudicate, authorise.",
		fmt.Sprintf("Settled %d minor units on event %s.", amount, short(id)))
}

// ------------------------------------------------------------------------ S2

func s2(r *Runner) Result {
	subj := r.subject(2)

	first := r.openEvent("ProviderMSP", subj, "2026-03-05T09:00Z", "HOSP-UPAZILA-KLG", "H-SURG-03", 5000000, 5000000, Accepted)
	r.note("insurer A's facility admits the patient")

	// A different facility, a different insurer's book, minutes later.
	r.openEvent("ProviderMSP", subj, "2026-03-05T09:40Z", "HOSP-PRIVATE-SVR", "H-SURG-03", 5000000, 5000000, Refused)
	r.note("refused at commit under equation (4), not detected afterwards by reconciliation")

	blocks := r.Blocks()
	last := blocks[len(blocks)-1]
	r.check("network", "the refused transaction wrote nothing", len(last.Writes) == 0 && !last.Success,
		"the refusal produced a failed transaction with an empty write set")

	// The uniqueness index is readable, so the second facility could have seen
	// the block before attempting it.
	var open string
	_ = r.srv.Invoke("ProviderMSP", "findOpenEventForSubject", func(ctx contractapi.TransactionContextInterface) error {
		var err error
		open, err = r.srv.Event().FindOpenEventForSubject(ctx, subj)
		return err
	})
	r.check("HOSP-PRIVATE-SVR", "the open event is visible before the attempt", open == first,
		"the second facility can see that "+short(first)+" is already open on this subject")

	return r.result("S2", "Cross-insurer duplicate refused at commit", "Problem & Solution",
		"Refusal at commit across insurers who cannot see each other.",
		"The second assertion never reached the ledger.")
}

// ------------------------------------------------------------------------ S3

func s3(r *Runner) Result {
	id := r.eligible(r.subject(4), "2026-03-06T11:00Z", "H-RESP-02", 4000000, 4000000)
	r.createEntitlement("InsurerAMSP", id, "POL-A-0004", Accepted)
	r.createEntitlement("InsurerAMSP", id, "POL-A-0004", Refused)
	r.note("equation (8): at most one entitlement per (event, policy) pair")
	return r.result("S3", "Second entitlement on the same policy refused", "Problem & Solution",
		"One entitlement per (event, policy).", "The duplicate claim was refused.")
}

// ------------------------------------------------------------------------ S4

func s4(r *Runner) Result {
	subj := r.subject(1)
	id := r.eligible(subj, "2026-03-07T06:30Z", "H-CARD-01", 5000000, 5000000)

	r.settleFully("InsurerAMSP", id, "POL-A-0001", "MFS-REQ-S4-EMP")
	r.note("the employer indemnity scheme pays")

	// Before settling, the second insurer can see what the first already paid.
	var view *contracts.CoverageView
	_ = r.srv.Invoke("InsurerBMSP", "getCoverageView", func(ctx contractapi.TransactionContextInterface) error {
		var err error
		view, err = r.srv.Settlement().GetCoverageView(ctx, id)
		return err
	})
	r.check("InsurerBMSP", "the second insurer can see the first insurer's payment",
		view != nil && view.PaidIndemnity == 3000000,
		"coverage view shows "+jsonCompact(map[string]int64{"paidIndemnity": view.PaidIndemnity, "paidFixed": view.PaidFixed}))
	r.note("today no insurer in this market can see this at any price")

	r.settleFully("InsurerBMSP", id, "POL-B-0001", "MFS-REQ-S4-MFI")
	r.note("the MFI hospital-cash policy pays too -- this MUST NOT be refused")

	return r.result("S4", "Genuine dual cover pays", "Problem & Solution",
		"Indemnity and fixed-benefit bounds are held apart.",
		"Both policies settled, and the second insurer saw the first before it did.")
}

// ------------------------------------------------------------------------ S5

func s5(r *Runner) Result {
	subj := r.subject(5)
	id := r.openEvent("ProviderMSP", subj, "2026-03-08T02:15Z", "HOSP-UPAZILA-KLG", "H-INJ-05", 4000000, 4000000, Accepted)
	r.note("the patient is stabilised at an upazila health complex")

	r.continueEvent("ProviderMSP", id, "HOSP-DISTRICT-GZP", "TRANSFER", "HOSP-UPAZILA-KLG", Accepted)
	r.note("the district hospital adds a segment instead of opening a second event")

	var ev *model.Event
	_ = r.srv.Invoke("RegulatorMSP", "getEvent", func(ctx contractapi.TransactionContextInterface) error {
		var err error
		ev, err = r.srv.Event().GetEvent(ctx, id)
		return err
	})
	r.check("network", "one event, two admission segments", ev != nil && len(ev.Segments) == 2,
		fmt.Sprintf("event carries %d segments and remains a single episode", len(ev.Segments)))

	r.attest("FieldMSP", id, "MFI-AGENT-NORTH", Accepted)
	r.closeEvent("ProviderMSP", id, Accepted)
	r.settleFully("InsurerAMSP", id, "POL-A-0005", "MFS-REQ-S5")

	return r.result("S5", "Transfer between facilities settles once", "Problem & Solution",
		"The invariant blocks duplicate payment, not repeated contact with the health system.",
		"A transferred episode settled once, on one benefit.")
}

// ------------------------------------------------------------------------ S6

func s6(r *Runner) Result {
	subj := r.subject(7)
	id := r.eligible(subj, "2026-03-09T05:00Z", "H-RESP-02", 4000000, 4000000)
	r.note("the first admission reaches CLOSED_ELIGIBLE")

	r.continueEvent("ProviderMSP", id, "HOSP-UPAZILA-KLG", "READMISSION", "", Accepted)
	r.note("a readmission inside the window re-opens the same event rather than minting a new one")
	r.closeEvent("ProviderMSP", id, Accepted)

	ent := r.settleFully("InsurerAMSP", id, "POL-A-0007", "MFS-REQ-S6")

	var ents []model.Entitlement
	_ = r.srv.Invoke("RegulatorMSP", "listEntitlementsForEvent", func(ctx contractapi.TransactionContextInterface) error {
		var err error
		ents, err = r.srv.Settlement().ListEntitlementsForEvent(ctx, id)
		return err
	})
	r.check("network", "one entitlement despite two admissions", len(ents) == 1,
		fmt.Sprintf("event carries %d entitlement(s); entitlement %s", len(ents), short(ent)))

	return r.result("S6", "Readmission inside the window links", "Problem & Solution",
		"One benefit ceiling per episode.", "The readmission did not create a second claim.")
}

// ------------------------------------------------------------------------ S7

func s7(r *Runner) Result {
	subj := r.subject(6)
	id := r.openEvent("ProviderMSP", subj, "2026-03-10T04:00Z", "HOSP-UPAZILA-KLG", "H-CARD-01", 5000000, 5000000, Accepted)

	r.attest("ProviderMSP", id, "HOSP-DISTRICT-GZP", Refused)
	r.note("a second facility of the payee's own class adds no class to the set")

	r.closeEvent("ProviderMSP", id, Refused)
	r.note("equation (6): one class is not a quorum, however many times it signs")

	r.attest("FieldMSP", id, "MFI-AGENT-SOUTH", Accepted)
	r.note("an MFI field agent at the bedside supplies an independent class")
	r.closeEvent("ProviderMSP", id, Accepted)

	return r.result("S7", "Payee cannot corroborate itself", "Architecture",
		"Nobody is paid on the payee's word.",
		"Eligibility required a class that is not getting paid.")
}

// ------------------------------------------------------------------------ S8

func s8(r *Runner) Result {
	_ = r.do("RegulatorMSP", "deAccredit", Accepted, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Provider().DeAccredit(ctx, "HOSP-PRIVATE-SVR", "upheld appeals above threshold")
	})

	r.openEvent("ProviderMSP", r.subject(8), "2026-03-11T08:00Z", "HOSP-PRIVATE-SVR", "H-CARD-01", 5000000, 5000000, Refused)
	r.note("a de-accredited facility cannot assert an event")

	_ = r.do("RegulatorMSP", "accredit (re-registration)", Refused, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Provider().Accredit(ctx, "HOSP-PRIVATE-SVR", "ProviderMSP", "PROVIDER", "DGHS-DEMO-NEW")
	})
	r.note("Mechanism 3: it cannot re-enter clean, because the history survives revocation")

	var p *model.Provider
	_ = r.srv.Invoke("AcademicMSP", "getProvider", func(ctx contractapi.TransactionContextInterface) error {
		var err error
		p, err = r.srv.Provider().GetProvider(ctx, "HOSP-PRIVATE-SVR")
		return err
	})
	r.check("AcademicMSP", "the accreditation history is intact and public", p != nil && len(p.History) >= 2,
		strings.Join(p.History, " | "))

	return r.result("S8", "De-accredited provider cannot re-register clean", "Governance",
		"Revocation is permanent, visible, and survives in the record.",
		"Both the assertion and the re-registration were refused.")
}

// ------------------------------------------------------------------------ S9

func s9(r *Runner) Result {
	id := r.eligible(r.subject(4), "2026-03-12T09:00Z", "H-OBST-04", 4000000, 4000000)
	ent := r.createEntitlement("InsurerAMSP", id, "POL-A-0004", Accepted)

	_ = r.do("InsurerAMSP", "deny", Accepted, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Settlement().Deny(ctx, ent, "D-07-CATEGORY-NOT-COVERED")
	})
	r.note("denial stays a human judgement; what the ledger fixes is that it is coded, permanent and counted")

	_ = r.do("InsurerAMSP", "deny without a code", Refused, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Settlement().Deny(ctx, ent, "")
	})
	r.note("an uncoded denial could not be counted or appealed, so it is refused")

	_ = r.do("FieldMSP", "appeal", Accepted, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Settlement().Appeal(ctx, ent)
	})

	// The denying insurer tries to sit on its own appeal.
	contracts.RegisterMSPClass("InsurerAMSP", model.ClassOversight)
	_ = r.do("InsurerAMSP", "panelDecision on its own denial", Refused, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Settlement().PanelDecision(ctx, ent, true, "upheld")
	})
	contracts.RegisterMSPClass("InsurerAMSP", model.ClassInsurer)
	r.note("the conflict rule is in chaincode: an insurer may not validate an appeal against its own denial")

	_ = r.do("PanelMSP", "panelDecision (independent)", Accepted, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Settlement().PanelDecision(ctx, ent, false, "category was covered under schedule v1")
	})
	r.adjudicate("InsurerAMSP", ent, Accepted)
	r.settle("InsurerAMSP", ent, "MFS-REQ-S9-APPEAL", Accepted)
	r.note("an overturned denial returns for adjudication -- the panel does not price claims")

	return r.result("S9", "Denying insurer cannot decide the appeal", "Governance",
		"Conflict rules enforced in chaincode rather than in a policy document.",
		"The conflicted decision was refused; an independent panel overturned the denial.")
}

// ----------------------------------------------------------------------- S10

func s10(r *Runner) Result {
	id := r.eligible(r.subject(3), "2026-03-13T07:00Z", "H-CARD-01", 5000000, 5000000)
	r.settleFully("InsurerAMSP", id, "POL-A-0003", "MFS-REQ-S10")

	var root string
	_ = r.do("RegulatorMSP", "closePeriod", Accepted, func(ctx contractapi.TransactionContextInterface) error {
		var err error
		root, err = r.srv.Transparency().ClosePeriod(ctx, "2026Q1-POOL-A")
		return err
	})
	r.note("the totals are a by-product of the claim path, not a report somebody files")

	_ = r.do("RegulatorMSP", "recordAnchor", Accepted, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Transparency().RecordAnchor(ctx, "2026Q1-POOL-A", "hardhat-local", "0x"+root[:40], 1)
	})

	// A published figure verifies against the committed root.
	var proof *contracts.LeafProof
	_ = r.srv.Invoke("AcademicMSP", "getLeafProof", func(ctx contractapi.TransactionContextInterface) error {
		var err error
		proof, err = r.srv.Transparency().GetLeafProof(ctx, "2026Q1-POOL-A", "claimsSettled", 1)
		return err
	})
	r.check("public", "the published figure verifies against the anchored root",
		proof != nil && model.VerifyMerkleProof(proof.Leaf, proof.Proof, root),
		"claimsSettled=1 proved against root "+short(root))

	// A figure that was never committed cannot be proved. This is the tamper
	// case: restating a settled period after the fact no longer verifies.
	tampered := model.PeriodLeaf("claimsSettled", 9)
	r.check("public", "a restated figure does not verify",
		!model.VerifyMerkleProof(tampered, proof.Proof, root),
		"claimsSettled=9 fails against the same root and proof path")

	_ = r.do("RegulatorMSP", "closePeriod again", Refused, func(ctx contractapi.TransactionContextInterface) error {
		_, err := r.srv.Transparency().ClosePeriod(ctx, "2026Q1-POOL-A")
		return err
	})
	r.note("a closed period is not restated in place")

	return r.result("S10", "Period anchored; tampering detected", "Problem & Solution",
		"Confidentiality inside, immutability outside.",
		"Root "+short(root)+" committed; a restated figure fails verification.")
}

// ----------------------------------------------------------------------- S11

func s11(r *Runner) Result {
	id := r.eligible(r.subject(1), "2026-03-14T10:00Z", "H-CARD-01", 5000000, 5000000)
	r.settleFully("InsurerAMSP", id, "POL-A-0001", "MFS-REQ-S11")

	_ = r.do("ProviderMSP", "createEntitlement (as the payee)", Refused, func(ctx contractapi.TransactionContextInterface) error {
		_, err := r.srv.Settlement().CreateEntitlement(ctx, id, "POL-A-0001")
		return err
	})
	r.note("a provider opens and attests but cannot authorise its own payment")

	_ = r.do("FieldMSP", "openEvent (as a field agent)", Refused, func(ctx contractapi.TransactionContextInterface) error {
		_, err := r.srv.Event().OpenEvent(ctx, "HEALTH", r.subject(2), "2026-03-14T10:00Z", "MFI-AGENT-NORTH", "H-CARD-01", 1, 1)
		return err
	})
	r.note("field verifiers attest but never assert")

	_ = r.do("InsurerBMSP", "adjudicate a competitor's entitlement", Refused, func(ctx contractapi.TransactionContextInterface) error {
		_, err := r.srv.Settlement().Adjudicate(ctx, model.EntitlementKey(id, "POL-A-0001"))
		return err
	})
	r.note("insurers adjudicate only their own policies")

	_ = r.do("StrangerMSP", "openEvent (non-member)", Refused, func(ctx contractapi.TransactionContextInterface) error {
		_, err := r.srv.Event().OpenEvent(ctx, "HEALTH", r.subject(2), "2026-03-14T11:00Z", "HOSP-UPAZILA-KLG", "H-CARD-01", 1, 1)
		return err
	})

	// The whole world state, checked for identifiers.
	dump := r.srv.Ledger.Dump()
	nidLike := regexp.MustCompile(`"(\d{10}|\d{13}|\d{17})"`)
	offenders := []string{}
	for key, value := range dump {
		if m := nidLike.FindString(key + " " + value); m != "" {
			offenders = append(offenders, key+" -> "+m)
		}
		lower := strings.ToLower(key + " " + value)
		for _, w := range []string{"diagnosis", "patient", "surname", "myocardial"} {
			if strings.Contains(lower, w) {
				offenders = append(offenders, key+" -> "+w)
			}
		}
	}
	r.check("public", "the entire world state holds no identifier", len(offenders) == 0,
		fmt.Sprintf("%d keys scanned, %d identifier-shaped values found", len(dump), len(offenders)))

	return r.result("S11", "Access control and the world state", "Privacy & Security",
		"Roles are structural, and no on-chain field is protected health information on its own.",
		fmt.Sprintf("Four out-of-role calls refused; %d world-state keys scanned clean.", len(dump)))
}

// ----------------------------------------------------------------------- S12

func s12(r *Runner) Result {
	id := r.eligible(r.subject(2), "2026-03-15T08:00Z", "H-CARD-01", 5000000, 5000000)
	ent := r.createEntitlement("InsurerAMSP", id, "POL-A-0002", Accepted)
	r.adjudicate("InsurerAMSP", ent, Accepted)

	_ = r.do("InsurerAMSP", "settle without a request identifier", Refused, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Settlement().AuthoriseSettlement(ctx, ent, "")
	})
	r.note("an instruction that is not payload-bound cannot be safely retried, so it is refused")

	r.settle("InsurerAMSP", ent, "MFS-REQ-S12-0001", Accepted)
	r.note("the ledger authorises payment; the MFS adapter executes it against this request identifier")

	r.settle("InsurerAMSP", ent, "MFS-REQ-S12-0002", Refused)
	r.note("re-authorising a consumed entitlement is refused, whatever request identifier is offered")

	return r.result("S12", "Payout instructions are payload-bound", "Architecture",
		"Disbursement crosses a boundary the ledger does not control.",
		"Settlement carries a payload-bound reference and cannot be re-authorised.")
}

// ------------------------------------------------------------------------ G1

func g1(r *Runner) Result {
	var before *contracts.Metrics
	_ = r.srv.Invoke("AcademicMSP", "getMetrics", func(ctx contractapi.TransactionContextInterface) error {
		var err error
		before, err = r.srv.Governance().GetMetrics(ctx)
		return err
	})
	r.check("AcademicMSP", "published metrics match the charter", before != nil && before.NakamotoCoefficient == 3 && before.Gini == 0.14,
		fmt.Sprintf("Nakamoto Coefficient %d, Gini %.4f", before.NakamotoCoefficient, before.Gini))

	overCap := `[
	  {"class":"INSURERS","msp":"InsurerAMSP","weightBp":3500},
	  {"class":"REGULATOR","msp":"RegulatorMSP","weightBp":2000},
	  {"class":"AGGREGATORS","msp":"FieldMSP","weightBp":2000},
	  {"class":"PROVIDERS","msp":"ProviderMSP","weightBp":1500},
	  {"class":"ACADEMIC","msp":"AcademicMSP","weightBp":1000}
	]`
	_ = r.do("InsurerAMSP", "proposeAdmission breaching the 0.30 cap", Refused, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Governance().ProposeAdmission(ctx, "PROP-OVERCAP", "insurers to 0.35", overCap)
	})
	r.note("refused before any vote: the council cannot vote itself past its own concentration limits")

	lowNC := `[
	  {"class":"INSURERS","msp":"InsurerAMSP","weightBp":3000},
	  {"class":"REGULATOR","msp":"RegulatorMSP","weightBp":3000},
	  {"class":"AGGREGATORS","msp":"FieldMSP","weightBp":2000},
	  {"class":"PROVIDERS","msp":"ProviderMSP","weightBp":2000}
	]`
	_ = r.do("InsurerAMSP", "proposeAdmission dropping the Nakamoto Coefficient to 2", Refused, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Governance().ProposeAdmission(ctx, "PROP-LOWNC", "four classes", lowNC)
	})

	compliant := `[
	  {"class":"INSURERS","msp":"InsurerAMSP","weightBp":2500},
	  {"class":"REGULATOR","msp":"RegulatorMSP","weightBp":2000},
	  {"class":"AGGREGATORS","msp":"FieldMSP","weightBp":2000},
	  {"class":"PROVIDERS","msp":"ProviderMSP","weightBp":1500},
	  {"class":"ACADEMIC","msp":"AcademicMSP","weightBp":1500},
	  {"class":"CLINICAL","msp":"ClinicalMSP","weightBp":500}
	]`
	_ = r.do("InsurerAMSP", "proposeAdmission within the caps", Accepted, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Governance().ProposeAdmission(ctx, "PROP-ADMIT", "seat the clinical class", compliant)
	})
	for _, voter := range []string{"InsurerAMSP", "RegulatorMSP", "FieldMSP"} {
		v := voter
		_ = r.do(v, "vote", Accepted, func(ctx contractapi.TransactionContextInterface) error {
			return r.srv.Governance().Vote(ctx, "PROP-ADMIT")
		})
	}
	r.note("0.30 + 0.20 + 0.20 = 0.70 clears the two-thirds threshold")

	var after *contracts.Metrics
	_ = r.srv.Invoke("AcademicMSP", "getMetrics", func(ctx contractapi.TransactionContextInterface) error {
		var err error
		after, err = r.srv.Governance().GetMetrics(ctx)
		return err
	})
	r.check("AcademicMSP", "the admitted council still satisfies the caps",
		after != nil && after.ClassCount == 6 && after.NakamotoCoefficient >= contracts.MinNakamoto,
		fmt.Sprintf("%d classes, Nakamoto Coefficient %d, Gini %.4f", after.ClassCount, after.NakamotoCoefficient, after.Gini))

	return r.result("G1", "Governance caps bind, not describe", "Governance",
		"Admission is gated on measured decentralisation, computed on-chain.",
		fmt.Sprintf("Two breaching proposals refused; a compliant one carried at NC %d.", after.NakamotoCoefficient))
}

func short(s string) string {
	if len(s) <= 12 {
		return s
	}
	return s[:12]
}
