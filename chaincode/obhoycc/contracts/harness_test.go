package contracts

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/internal/ledgerstub"
	"github.com/obhoy/obhoycc/model"
)

// The contracts resolve the caller's organisation through a seam so the same
// code can run under a Fabric peer and under the in-process ledger. Here the
// organisation is whatever the test said it was; on a real network Fabric has
// already validated an X.509 identity before chaincode is entered.
func init() {
	ResolveMSP = func(ctx contractapi.TransactionContextInterface) (string, error) {
		raw, err := ctx.GetStub().GetCreator()
		if err != nil {
			return "", err
		}
		return string(raw), nil
	}
	ResolveClient = func(ctx contractapi.TransactionContextInterface) (string, error) {
		return ResolveMSP(ctx)
	}
}

const (
	mspProvider  = "ProviderMSP"
	mspClinical  = "ClinicalMSP"
	mspField     = "FieldMSP"
	mspInsurerA  = "InsurerAMSP"
	mspInsurerB  = "InsurerBMSP"
	mspRegulator = "RegulatorMSP"
	mspAcademic  = "AcademicMSP"
)

// Synthetic throughout. A commitment is a 32-byte digest; no test in this file
// contains anything resembling a national identity number, a name or a
// diagnosis, and TestWorldState_HoldsNoIdentifiers checks that the ledger
// agrees.
var (
	subjAlpha = strings.Repeat("a1", 32)
	subjBeta  = strings.Repeat("b2", 32)
)

type fixture struct {
	t      *testing.T
	ledger *ledgerstub.Ledger
	now    int64

	identity     *IdentityRegistry
	policy       *PolicyRegistry
	provider     *ProviderRegistry
	schedule     *BenefitScheduleContract
	event        *EventRegistry
	settlement   *ClaimSettlement
	transparency *TransparencyLedger
	governance   *GovernanceCouncil
}

func newFixture(t *testing.T) *fixture {
	t.Helper()
	return &fixture{
		t:            t,
		ledger:       ledgerstub.NewLedger(),
		now:          time.Now().Unix(),
		identity:     new(IdentityRegistry),
		policy:       new(PolicyRegistry),
		provider:     new(ProviderRegistry),
		schedule:     new(BenefitScheduleContract),
		event:        new(EventRegistry),
		settlement:   new(ClaimSettlement),
		transparency: new(TransparencyLedger),
		governance:   new(GovernanceCouncil),
	}
}

// tx runs one transaction. A body that returns an error commits nothing, which
// is what "refused at commit" means: the write set is discarded and the ledger
// is untouched.
func (f *fixture) tx(msp, fn string, body func(ctx contractapi.TransactionContextInterface) error) error {
	f.t.Helper()
	stub := f.ledger.NewStub(msp, fn)
	stub.SetTime(f.now)
	ctx := new(contractapi.TransactionContext)
	ctx.SetStub(stub)
	err := body(ctx)
	msg := ""
	if err != nil {
		msg = err.Error()
	}
	stub.Commit(err == nil, msg)
	return err
}

// txAt runs one transaction with the clock moved, for the cases where a policy
// must have lapsed or a continuation window must have closed.
func (f *fixture) txAt(msp, fn string, at int64, body func(ctx contractapi.TransactionContextInterface) error) error {
	f.t.Helper()
	saved := f.now
	f.now = at
	defer func() { f.now = saved }()
	return f.tx(msp, fn, body)
}

func (f *fixture) must(err error, what string) {
	f.t.Helper()
	if err != nil {
		f.t.Fatalf("%s: unexpected refusal: %v", what, err)
	}
}

// refuses asserts that a transaction was refused, and that the refusal names
// the invariant it was refused under. A test that only checks "some error
// happened" would pass for the wrong reason.
func (f *fixture) refuses(err error, eq, what string) {
	f.t.Helper()
	if err == nil {
		f.t.Fatalf("%s: expected refusal under invariant %s, but the transaction succeeded", what, eq)
	}
	if eq != "" && !strings.Contains(err.Error(), eq) {
		f.t.Fatalf("%s: expected a refusal citing %s, got: %v", what, eq, err)
	}
}

// ------------------------------------------------------------------ seeding

const scheduleEntries = `{"H-CARD-01":30000,"H-RESP-02":18000,"H-SURG-03":45000}`

// councilSpec is the weight table from the paper: insurers 0.30, regulator
// 0.20, aggregators 0.20, provider association 0.15, academic auditor 0.15.
const councilSpec = `[
  {"class":"INSURERS","msp":"InsurerAMSP","weightBp":3000},
  {"class":"REGULATOR","msp":"RegulatorMSP","weightBp":2000},
  {"class":"AGGREGATORS","msp":"FieldMSP","weightBp":2000},
  {"class":"PROVIDERS","msp":"ProviderMSP","weightBp":1500},
  {"class":"ACADEMIC","msp":"AcademicMSP","weightBp":1500}
]`

func (f *fixture) seed() *fixture {
	t := f.t
	t.Helper()

	f.must(f.tx(mspRegulator, "SeedCouncil", func(ctx contractapi.TransactionContextInterface) error {
		return f.governance.SeedCouncil(ctx, councilSpec)
	}), "seed council")

	f.must(f.tx(mspRegulator, "RegisterDomainProfile", func(ctx contractapi.TransactionContextInterface) error {
		return f.event.RegisterDomainProfile(ctx, "HEALTH",
			"H(NIDCommitment||admissionWindow)",
			`["PROVIDER","CLINICAL","FIELD"]`, 2, "PROVIDER", "DEFINED_BENEFIT", 30*24*3600)
	}), "register HEALTH profile")

	accredit := func(id, msp, class string) {
		f.must(f.tx(mspRegulator, "Accredit", func(ctx contractapi.TransactionContextInterface) error {
			return f.provider.Accredit(ctx, id, msp, class, "DGHS-"+id)
		}), "accredit "+id)
	}
	accredit("HOSP-UPAZILA", mspProvider, "PROVIDER")
	accredit("HOSP-DISTRICT", mspProvider, "PROVIDER")
	accredit("DIAG-CENTRE", mspClinical, "CLINICAL")
	accredit("MFI-AGENT", mspField, "FIELD")

	f.must(f.tx(mspInsurerA, "PublishSchedule", func(ctx contractapi.TransactionContextInterface) error {
		_, err := f.schedule.PublishSchedule(ctx, 1, f.now-86400*30, scheduleEntries)
		return err
	}), "publish schedule v1")

	for _, s := range []string{subjAlpha, subjBeta} {
		commitment := s
		f.must(f.tx(mspField, "RegisterSubjectCommitment", func(ctx contractapi.TransactionContextInterface) error {
			return f.identity.RegisterSubjectCommitment(ctx, commitment, 1, "MFI-AGENT", "event")
		}), "register subject")
	}

	f.must(f.tx(mspInsurerA, "OpenPeriod", func(ctx contractapi.TransactionContextInterface) error {
		return f.transparency.OpenPeriod(ctx, "2026Q1-POOL-A", "POOL-A")
	}), "open period A")
	f.must(f.tx(mspInsurerB, "OpenPeriod", func(ctx contractapi.TransactionContextInterface) error {
		return f.transparency.OpenPeriod(ctx, "2026Q1-POOL-B", "POOL-B")
	}), "open period B")

	return f
}

// issuePolicy issues cover and returns its identifier.
func (f *fixture) issuePolicy(msp, policyID, subject, pool, policyType string, cap int64) string {
	f.t.Helper()
	f.must(f.tx(msp, "IssuePolicy", func(ctx contractapi.TransactionContextInterface) error {
		return f.policy.IssuePolicy(ctx, policyID, subject, pool, policyType,
			cap, 0, f.now-86400*20, f.now+86400*300)
	}), "issue "+policyID)
	return policyID
}

// openEvent asserts an admission and returns the derived event key.
func (f *fixture) openEvent(subject, window, asserter, category string, loss, capAgg int64) (string, error) {
	var id string
	err := f.tx(mspProvider, "OpenEvent", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		id, e = f.event.OpenEvent(ctx, "HEALTH", subject, window, asserter, category, loss, capAgg)
		return e
	})
	return id, err
}

// attest records corroboration from one class.
func (f *fixture) attest(msp, eventID, attesterID string) error {
	return f.tx(msp, "AttestEvent", func(ctx contractapi.TransactionContextInterface) error {
		return f.event.AttestEvent(ctx, eventID, attesterID, "sig-"+attesterID)
	})
}

func (f *fixture) closeEvent(msp, eventID string) error {
	return f.tx(msp, "CloseEvent", func(ctx contractapi.TransactionContextInterface) error {
		return f.event.CloseEvent(ctx, eventID)
	})
}

func (f *fixture) createEntitlement(msp, eventID, policyID string) (string, error) {
	var id string
	err := f.tx(msp, "CreateEntitlement", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		id, e = f.settlement.CreateEntitlement(ctx, eventID, policyID)
		return e
	})
	return id, err
}

func (f *fixture) adjudicate(msp, entID string) (int64, error) {
	var amount int64
	err := f.tx(msp, "Adjudicate", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		amount, e = f.settlement.Adjudicate(ctx, entID)
		return e
	})
	return amount, err
}

func (f *fixture) settle(msp, entID, ref string) error {
	return f.tx(msp, "AuthoriseSettlement", func(ctx contractapi.TransactionContextInterface) error {
		return f.settlement.AuthoriseSettlement(ctx, entID, ref)
	})
}

// settleFully runs the whole claim path for one policy and returns the
// entitlement identifier.
func (f *fixture) settleFully(msp, eventID, policyID, ref string) (string, error) {
	entID, err := f.createEntitlement(msp, eventID, policyID)
	if err != nil {
		return "", err
	}
	if _, err := f.adjudicate(msp, entID); err != nil {
		return entID, err
	}
	return entID, f.settle(msp, entID, ref)
}

// eligibleEvent opens an event and corroborates it to CLOSED_ELIGIBLE.
func (f *fixture) eligibleEvent(subject, window, category string, loss, capAgg int64) string {
	f.t.Helper()
	id, err := f.openEvent(subject, window, "HOSP-UPAZILA", category, loss, capAgg)
	f.must(err, "open event")
	f.must(f.attest(mspClinical, id, "DIAG-CENTRE"), "clinical attestation")
	f.must(f.closeEvent(mspProvider, id), "close event")
	return id
}

func (f *fixture) getEvent(eventID string) *model.Event {
	f.t.Helper()
	var ev *model.Event
	err := f.tx(mspRegulator, "GetEvent", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		ev, e = f.event.GetEvent(ctx, eventID)
		return e
	})
	f.must(err, "read event")
	return ev
}

func (f *fixture) getEntitlement(entID string) *model.Entitlement {
	f.t.Helper()
	var ent *model.Entitlement
	err := f.tx(mspRegulator, "GetEntitlement", func(ctx contractapi.TransactionContextInterface) error {
		var e error
		ent, e = f.settlement.GetEntitlement(ctx, entID)
		return e
	})
	f.must(err, "read entitlement")
	return ent
}

func jsonOf(v interface{}) string {
	b, _ := json.MarshalIndent(v, "", "  ")
	return string(b)
}

var _ = fmt.Sprintf
