package httpapi

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/internal/ledgerstub"
)

// Everything below is synthetic and is meant to be recognisably so.
//
// Subject commitments are derived from a fixed demo string, not from any
// national identity number, real or invented. Facility names are placeholders.
// No value in this file, and nothing the harness generates, is a real person,
// a real hospital or a real policy. The privacy test in the chaincode suite
// checks the ledger for identifier-shaped data on every run.
const demoSubjectSalt = "obhoy-demo-subject/not-a-real-identity/"

// DemoSubject returns the nth synthetic subject commitment.
func DemoSubject(n int) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s%d", demoSubjectSalt, n)))
	return hex.EncodeToString(sum[:])
}

// as runs one seeding transaction and stops the world if it fails: a network
// that cannot be bootstrapped is not something to carry on past.
func (s *Server) as(msp, fn string, body func(ctx contractapi.TransactionContextInterface) error) {
	stub := s.Ledger.NewStub(msp, fn)
	if s.clock > 0 {
		stub.SetTime(s.clock)
	}
	ctx := new(contractapi.TransactionContext)
	ctx.SetStub(stub)
	err := body(ctx)
	msg := ""
	if err != nil {
		msg = err.Error()
	}
	stub.Commit(err == nil, msg)
	if err != nil {
		panic(fmt.Sprintf("seed %s as %s: %v", fn, msp, err))
	}
}

// The founding weight table from the whitepaper's governance section.
const seedCouncil = `[
  {"class":"INSURERS","msp":"InsurerAMSP","weightBp":3000},
  {"class":"REGULATOR","msp":"RegulatorMSP","weightBp":2000},
  {"class":"AGGREGATORS","msp":"FieldMSP","weightBp":2000},
  {"class":"PROVIDERS","msp":"ProviderMSP","weightBp":1500},
  {"class":"ACADEMIC","msp":"AcademicMSP","weightBp":1500}
]`

// A defined-benefit schedule, published in advance. These are the amounts
// settlement pays; none of them is a number a claimant supplied.
const seedSchedule = `{
  "H-CARD-01": 3000000,
  "H-RESP-02": 1800000,
  "H-SURG-03": 4500000,
  "H-OBST-04": 2200000,
  "H-INJ-05":  2600000
}`

// Bootstrap installs the demo network state.
func (s *Server) Bootstrap() {
	now := time.Now().Unix()
	day := int64(86400)

	s.as("RegulatorMSP", "SeedCouncil", func(ctx contractapi.TransactionContextInterface) error {
		return s.governance.SeedCouncil(ctx, seedCouncil)
	})

	// Two domain profiles, to show that only three parameters change between
	// lines of business. Nothing else in the chaincode reads the line name.
	s.as("RegulatorMSP", "RegisterDomainProfile", func(ctx contractapi.TransactionContextInterface) error {
		return s.event.RegisterDomainProfile(ctx, "HEALTH",
			"H(NIDCommitment || admissionWindow)",
			`["PROVIDER","CLINICAL","FIELD"]`, 2, "PROVIDER", "DEFINED_BENEFIT", 30*day)
	})
	s.as("RegulatorMSP", "RegisterDomainProfile", func(ctx contractapi.TransactionContextInterface) error {
		return s.event.RegisterDomainProfile(ctx, "CROP",
			"H(parcelID || season)",
			`["PROVIDER","CLINICAL","FIELD"]`, 2, "PROVIDER", "PARAMETRIC", 120*day)
	})

	type prov struct{ id, msp, class, ref string }
	for _, p := range []prov{
		{"HOSP-UPAZILA-KLG", "ProviderMSP", "PROVIDER", "DGHS-DEMO-1001"},
		{"HOSP-DISTRICT-GZP", "ProviderMSP", "PROVIDER", "DGHS-DEMO-1002"},
		{"HOSP-PRIVATE-SVR", "ProviderMSP", "PROVIDER", "DGHS-DEMO-1003"},
		{"DIAG-CENTRE-KLG", "ClinicalMSP", "CLINICAL", "DGHS-DEMO-2001"},
		{"DIAG-CENTRE-GZP", "ClinicalMSP", "CLINICAL", "DGHS-DEMO-2002"},
		{"MFI-AGENT-NORTH", "FieldMSP", "FIELD", "MRA-DEMO-3001"},
		{"MFI-AGENT-SOUTH", "FieldMSP", "FIELD", "MRA-DEMO-3002"},
	} {
		p := p
		s.as("RegulatorMSP", "Accredit", func(ctx contractapi.TransactionContextInterface) error {
			return s.provider.Accredit(ctx, p.id, p.msp, p.class, p.ref)
		})
	}

	s.as("InsurerAMSP", "PublishSchedule", func(ctx contractapi.TransactionContextInterface) error {
		_, err := s.schedule.PublishSchedule(ctx, 1, now-90*day, seedSchedule)
		return err
	})

	for i := 1; i <= 8; i++ {
		commitment := DemoSubject(i)
		s.as("FieldMSP", "RegisterSubjectCommitment", func(ctx contractapi.TransactionContextInterface) error {
			return s.identity.RegisterSubjectCommitment(ctx, commitment, 1, "MFI-AGENT-NORTH", "event")
		})
	}

	s.as("RegulatorMSP", "SetCurrentKeyVersion", func(ctx contractapi.TransactionContextInterface) error {
		return s.identity.SetCurrentKeyVersion(ctx, 1)
	})

	// Cover. Subject 1 deliberately holds two policies with different insurers
	// -- an employer indemnity scheme and an MFI hospital-cash product -- so
	// legitimate dual cover can be demonstrated rather than described.
	type pol struct {
		msp, id, subject, pool, kind string
		cap                          int64
	}
	policies := []pol{
		{"InsurerAMSP", "POL-A-0001", DemoSubject(1), "POOL-A", "INDEMNITY", 3000000},
		{"InsurerBMSP", "POL-B-0001", DemoSubject(1), "POOL-B", "FIXED", 1500000},
		{"InsurerAMSP", "POL-A-0002", DemoSubject(2), "POOL-A", "INDEMNITY", 3000000},
		{"InsurerBMSP", "POL-B-0002", DemoSubject(2), "POOL-B", "INDEMNITY", 3000000},
		{"InsurerAMSP", "POL-A-0003", DemoSubject(3), "POOL-A", "INDEMNITY", 3000000},
		{"InsurerAMSP", "POL-A-0004", DemoSubject(4), "POOL-A", "INDEMNITY", 3000000},
		{"InsurerAMSP", "POL-A-0005", DemoSubject(5), "POOL-A", "INDEMNITY", 3000000},
		{"InsurerBMSP", "POL-B-0006", DemoSubject(6), "POOL-B", "INDEMNITY", 3000000},
		{"InsurerAMSP", "POL-A-0007", DemoSubject(7), "POOL-A", "INDEMNITY", 3000000},
		{"InsurerAMSP", "POL-A-0008", DemoSubject(8), "POOL-A", "INDEMNITY", 3000000},
	}
	for _, p := range policies {
		p := p
		s.as(p.msp, "IssuePolicy", func(ctx contractapi.TransactionContextInterface) error {
			return s.policy.IssuePolicy(ctx, p.id, p.subject, p.pool, p.kind, p.cap, 0, now-60*day, now+300*day)
		})
	}

	for _, pool := range []struct{ msp, period, pool string }{
		{"InsurerAMSP", "2026Q1-POOL-A", "POOL-A"},
		{"InsurerBMSP", "2026Q1-POOL-B", "POOL-B"},
	} {
		pool := pool
		s.as(pool.msp, "OpenPeriod", func(ctx contractapi.TransactionContextInterface) error {
			return s.transparency.OpenPeriod(ctx, pool.period, pool.pool)
		})
	}

	s.as("InsurerAMSP", "RecordPremium", func(ctx contractapi.TransactionContextInterface) error {
		return s.transparency.RecordPremium(ctx, "POOL-A", 42000000)
	})
	s.as("InsurerAMSP", "SetReserve", func(ctx contractapi.TransactionContextInterface) error {
		return s.transparency.SetReserve(ctx, "POOL-A", 31500000)
	})
	s.as("InsurerBMSP", "RecordPremium", func(ctx contractapi.TransactionContextInterface) error {
		return s.transparency.RecordPremium(ctx, "POOL-B", 18000000)
	})
	s.as("InsurerBMSP", "SetReserve", func(ctx contractapi.TransactionContextInterface) error {
		return s.transparency.SetReserve(ctx, "POOL-B", 13000000)
	})
}

// BootstrapSummary is what the node prints on start-up.
func (s *Server) BootstrapSummary() []string {
	blocks := s.Ledger.Blocks()
	refused := 0
	for _, b := range blocks {
		if !b.Success {
			refused++
		}
	}
	return []string{
		fmt.Sprintf("%d transactions committed during bootstrap, %d refused", len(blocks)-refused, refused),
		fmt.Sprintf("subject 1 commitment: %s", DemoSubject(1)),
	}
}

var _ = ledgerstub.ChaincodeEvent{}
