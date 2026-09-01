// Package httpapi exposes the contracts over HTTP against the in-process
// ledger.
//
// This is the local node. It runs the SAME contract functions a Fabric peer
// executes -- not a reimplementation of them -- so the scenario harness and
// the web application exercise real chaincode without Docker. What it does not
// provide is the half of the design that only a real network can: endorsement,
// ordering, MSP validation, and private-data confidentiality. Section
// "Limitations" of the README says so in the terms a reviewer needs.
package httpapi

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/contracts"
	"github.com/obhoy/obhoycc/internal/ledgerstub"
	"github.com/obhoy/obhoycc/model"
)

// Server holds the ledger and one instance of each contract.
type Server struct {
	Ledger *ledgerstub.Ledger

	identity     *contracts.IdentityRegistry
	policy       *contracts.PolicyRegistry
	provider     *contracts.ProviderRegistry
	schedule     *contracts.BenefitScheduleContract
	event        *contracts.EventRegistry
	settlement   *contracts.ClaimSettlement
	transparency *contracts.TransparencyLedger
	governance   *contracts.GovernanceCouncil

	clock int64 // when non-zero, pins transaction time for scenario replay
}

// New builds a server over a fresh ledger.
func New() *Server {
	contracts.ResolveMSP = func(ctx contractapi.TransactionContextInterface) (string, error) {
		raw, err := ctx.GetStub().GetCreator()
		if err != nil {
			return "", err
		}
		if len(raw) == 0 {
			return "", fmt.Errorf("no organisation on the request; set the X-Obhoy-MSP header")
		}
		return string(raw), nil
	}
	contracts.ResolveClient = contracts.ClientResolver(contracts.ResolveMSP)
	contracts.RegisterMSPClass("PanelMSP", model.ClassOversight)

	return &Server{
		Ledger:       ledgerstub.NewLedger(),
		identity:     new(contracts.IdentityRegistry),
		policy:       new(contracts.PolicyRegistry),
		provider:     new(contracts.ProviderRegistry),
		schedule:     new(contracts.BenefitScheduleContract),
		event:        new(contracts.EventRegistry),
		settlement:   new(contracts.ClaimSettlement),
		transparency: new(contracts.TransparencyLedger),
		governance:   new(contracts.GovernanceCouncil),
	}
}

// ------------------------------------------------------------ transaction

type txFunc func(ctx contractapi.TransactionContextInterface, msp string) (interface{}, error)

func (s *Server) run(r *http.Request, fn string, body txFunc) (interface{}, []ledgerstub.ChaincodeEvent, error) {
	msp := r.Header.Get("X-Obhoy-MSP")
	if msp == "" {
		msp = "AcademicMSP" // read-only default: the auditor sees totals and nothing else
	}
	stub := s.Ledger.NewStub(msp, fn)
	if s.clock > 0 {
		stub.SetTime(s.clock)
	}
	ctx := new(contractapi.TransactionContext)
	ctx.SetStub(stub)

	out, err := body(ctx, msp)
	msg := ""
	if err != nil {
		msg = err.Error()
	}
	stub.Commit(err == nil, msg)
	return out, stub.Events(), err
}

func (s *Server) handle(fn string, body txFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		out, events, err := s.run(r, fn, body)
		if err != nil {
			// A refusal is a normal, expected outcome here -- most of the
			// scenarios exist to produce one -- so it is reported as a
			// structured result rather than a server fault.
			writeJSON(w, http.StatusUnprocessableEntity, map[string]interface{}{
				"ok":       false,
				"function": fn,
				"error":    err.Error(),
			})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"ok":       true,
			"function": fn,
			"result":   out,
			"events":   events,
		})
	}
}

func writeJSON(w http.ResponseWriter, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Obhoy-MSP")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func decode(r *http.Request, out interface{}) error {
	if r.Body == nil {
		return fmt.Errorf("request body is required")
	}
	if err := json.NewDecoder(r.Body).Decode(out); err != nil {
		return fmt.Errorf("malformed request body: %w", err)
	}
	return nil
}

func q(r *http.Request, name string) string { return r.URL.Query().Get(name) }

func qint(r *http.Request, name string) int64 {
	v, _ := strconv.ParseInt(r.URL.Query().Get(name), 10, 64)
	return v
}

// ------------------------------------------------------------------ routes

// Routes returns the HTTP handler.
//
// Every route carries the caller's organisation in X-Obhoy-MSP and nothing
// else. There is no API key and no admin identity: what a caller may do is
// decided by the chaincode from the organisation it speaks for, which is the
// same rule a Fabric peer applies.
func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"ok": true,
			"result": map[string]interface{}{
				"node": "obhoy-local", "blocks": len(s.Ledger.Blocks()),
			},
		})
	})

	mux.HandleFunc("/api/admin/clock", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Unix int64 `json:"unix"`
		}
		if err := decode(r, &in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		s.clock = in.Unix
		writeJSON(w, http.StatusOK, map[string]interface{}{"ok": true, "clock": s.clock})
	})

	// ------------------------------------------------------------- profiles
	mux.HandleFunc("/api/profiles", s.handle("ListDomainProfiles", func(ctx contractapi.TransactionContextInterface, msp string) (interface{}, error) {
		return s.event.ListDomainProfiles(ctx)
	}))

	// ------------------------------------------------------------ providers
	mux.HandleFunc("/api/providers", s.handle("ListProviders", func(ctx contractapi.TransactionContextInterface, msp string) (interface{}, error) {
		return s.provider.ListProviders(ctx)
	}))
	s.postBody(mux, "/api/providers/accredit", "Accredit", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ ProviderID, MSP, Class, DGHSRef string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.provider.Accredit(ctx, in.ProviderID, in.MSP, in.Class, in.DGHSRef)
	})
	s.postBody(mux, "/api/providers/deaccredit", "DeAccredit", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ ProviderID, Reason string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.provider.DeAccredit(ctx, in.ProviderID, in.Reason)
	})
	s.postBody(mux, "/api/providers/reinstate", "Reinstate", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ ProviderID, ProposalID string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.provider.Reinstate(ctx, in.ProviderID, in.ProposalID)
	})

	// ------------------------------------------------------------- subjects
	s.postBody(mux, "/api/subjects", "RegisterSubjectCommitment", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct {
			Commitment   string `json:"commitment"`
			KeyVersion   int    `json:"keyVersion"`
			AggregatorID string `json:"aggregatorId"`
			Context      string `json:"context"`
		}
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.identity.RegisterSubjectCommitment(ctx, in.Commitment, in.KeyVersion, in.AggregatorID, in.Context)
	})
	mux.HandleFunc("/api/disclosures", s.handle("ListDisclosures", func(ctx contractapi.TransactionContextInterface, msp string) (interface{}, error) {
		return s.identity.ListDisclosures(ctx)
	}))
	s.postBody(mux, "/api/disclosures/log", "LogDisclosure", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ DisclosureID, Commitment, OrderRef string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.identity.LogDisclosure(ctx, in.DisclosureID, in.Commitment, in.OrderRef)
	})

	// ------------------------------------------------------------- policies
	mux.HandleFunc("/api/policies", s.handleReq("ListPoliciesForSubject", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		if sub := q(r, "subject"); sub != "" {
			return s.policy.ListPoliciesForSubject(ctx, sub)
		}
		if id := q(r, "id"); id != "" {
			return s.policy.GetPolicy(ctx, id)
		}
		return nil, fmt.Errorf("supply ?subject= or ?id=")
	}))
	s.postBody(mux, "/api/policies/issue", "IssuePolicy", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct {
			PolicyID          string `json:"policyId"`
			SubjectCommitment string `json:"subjectCommitment"`
			PoolID            string `json:"poolId"`
			Type              string `json:"type"`
			BenefitCap        int64  `json:"benefitCap"`
			WaitingPeriodEnd  int64  `json:"waitingPeriodEnd"`
			EffectiveFrom     int64  `json:"effectiveFrom"`
			ExpiresAt         int64  `json:"expiresAt"`
		}
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.policy.IssuePolicy(ctx, in.PolicyID, in.SubjectCommitment, in.PoolID, in.Type,
			in.BenefitCap, in.WaitingPeriodEnd, in.EffectiveFrom, in.ExpiresAt)
	})
	s.postBody(mux, "/api/policies/state", "SetPolicyState", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ PolicyID, State string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.policy.SetPolicyState(ctx, in.PolicyID, in.State)
	})

	// ------------------------------------------------------------ schedules
	mux.HandleFunc("/api/schedules", s.handle("ListSchedules", func(ctx contractapi.TransactionContextInterface, msp string) (interface{}, error) {
		return s.schedule.ListSchedules(ctx)
	}))

	// --------------------------------------------------------------- events
	mux.HandleFunc("/api/events", s.handleReq("ListEvents", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		if id := q(r, "id"); id != "" {
			return s.event.GetEvent(ctx, id)
		}
		return s.event.ListEvents(ctx)
	}))
	mux.HandleFunc("/api/events/history", s.handleReq("GetEventHistory", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		return s.event.GetEventHistory(ctx, q(r, "id"))
	}))
	mux.HandleFunc("/api/events/open-for-subject", s.handleReq("FindOpenEventForSubject", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		id, err := s.event.FindOpenEventForSubject(ctx, q(r, "subject"))
		return map[string]string{"eventId": id}, err
	}))
	s.postBody(mux, "/api/events/open", "OpenEvent", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct {
			Line                string `json:"line"`
			SubjectCommitment   string `json:"subjectCommitment"`
			AdmissionWindow     string `json:"admissionWindow"`
			AsserterID          string `json:"asserterId"`
			CategoryCode        string `json:"categoryCode"`
			AssessedLoss        int64  `json:"assessedLoss"`
			BenefitCapAggregate int64  `json:"benefitCapAggregate"`
		}
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		if in.Line == "" {
			in.Line = "HEALTH"
		}
		id, err := s.event.OpenEvent(ctx, in.Line, in.SubjectCommitment, in.AdmissionWindow,
			in.AsserterID, in.CategoryCode, in.AssessedLoss, in.BenefitCapAggregate)
		return map[string]string{"eventId": id}, err
	})
	s.postBody(mux, "/api/events/attest", "AttestEvent", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ EventID, AttesterID, SigRef string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.event.AttestEvent(ctx, in.EventID, in.AttesterID, in.SigRef)
	})
	s.postBody(mux, "/api/events/attest-anonymous", "AttestEventAnonymously", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ EventID, Nullifier, SigRef string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.event.AttestEventAnonymously(ctx, in.EventID, in.Nullifier, in.SigRef)
	})
	s.postBody(mux, "/api/events/continue", "ContinueEvent", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ EventID, ProviderID, Kind, AttestedBy string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.event.ContinueEvent(ctx, in.EventID, in.ProviderID, in.Kind, in.AttestedBy)
	})
	s.postBody(mux, "/api/events/close", "CloseEvent", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ EventID string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.event.CloseEvent(ctx, in.EventID)
	})
	s.postBody(mux, "/api/events/expire", "ExpireEvent", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ EventID string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.event.ExpireEvent(ctx, in.EventID)
	})

	// --------------------------------------------------------- entitlements
	mux.HandleFunc("/api/entitlements", s.handleReq("ListEntitlements", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		if ev := q(r, "event"); ev != "" {
			return s.settlement.ListEntitlementsForEvent(ctx, ev)
		}
		if id := q(r, "id"); id != "" {
			return s.settlement.GetEntitlement(ctx, id)
		}
		return s.settlement.ListEntitlements(ctx)
	}))
	mux.HandleFunc("/api/coverage", s.handleReq("GetCoverageView", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		return s.settlement.GetCoverageView(ctx, q(r, "event"))
	}))
	s.postBody(mux, "/api/entitlements/create", "CreateEntitlement", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ EventID, PolicyID string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		id, err := s.settlement.CreateEntitlement(ctx, in.EventID, in.PolicyID)
		return map[string]string{"entitlementId": id}, err
	})
	s.postBody(mux, "/api/entitlements/adjudicate", "Adjudicate", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ EntitlementID string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		amount, err := s.settlement.Adjudicate(ctx, in.EntitlementID)
		return map[string]int64{"amount": amount}, err
	})
	s.postBody(mux, "/api/entitlements/settle", "AuthoriseSettlement", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ EntitlementID, SettlementRef string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.settlement.AuthoriseSettlement(ctx, in.EntitlementID, in.SettlementRef)
	})
	s.postBody(mux, "/api/entitlements/deny", "Deny", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ EntitlementID, DenialCode string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.settlement.Deny(ctx, in.EntitlementID, in.DenialCode)
	})
	s.postBody(mux, "/api/entitlements/appeal", "Appeal", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ EntitlementID string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.settlement.Appeal(ctx, in.EntitlementID)
	})
	s.postBody(mux, "/api/entitlements/panel", "PanelDecision", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct {
			EntitlementID string `json:"entitlementId"`
			Upheld        bool   `json:"upheld"`
			Note          string `json:"note"`
		}
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.settlement.PanelDecision(ctx, in.EntitlementID, in.Upheld, in.Note)
	})

	// ---------------------------------------------------------- transparency
	mux.HandleFunc("/api/periods", s.handleReq("ListPeriods", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		if id := q(r, "id"); id != "" {
			return s.transparency.GetPeriod(ctx, id)
		}
		return s.transparency.ListPeriods(ctx)
	}))
	mux.HandleFunc("/api/periods/proof", s.handleReq("GetLeafProof", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		return s.transparency.GetLeafProof(ctx, q(r, "id"), q(r, "name"), qint(r, "value"))
	}))
	s.postBody(mux, "/api/periods/open", "OpenPeriod", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ PeriodID, PoolID string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.transparency.OpenPeriod(ctx, in.PeriodID, in.PoolID)
	})
	s.postBody(mux, "/api/periods/close", "ClosePeriod", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ PeriodID string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		root, err := s.transparency.ClosePeriod(ctx, in.PeriodID)
		return map[string]string{"merkleRoot": root}, err
	})
	s.postBody(mux, "/api/periods/anchor", "RecordAnchor", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct {
			PeriodID    string `json:"periodId"`
			Chain       string `json:"chain"`
			TxHash      string `json:"txHash"`
			BlockNumber int64  `json:"blockNumber"`
		}
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.transparency.RecordAnchor(ctx, in.PeriodID, in.Chain, in.TxHash, in.BlockNumber)
	})
	s.postBody(mux, "/api/periods/premium", "RecordPremium", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct {
			PoolID string `json:"poolId"`
			Amount int64  `json:"amount"`
		}
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.transparency.RecordPremium(ctx, in.PoolID, in.Amount)
	})
	s.postBody(mux, "/api/periods/reserve", "SetReserve", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct {
			PoolID string `json:"poolId"`
			Amount int64  `json:"amount"`
		}
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.transparency.SetReserve(ctx, in.PoolID, in.Amount)
	})

	// ----------------------------------------------------------- governance
	mux.HandleFunc("/api/governance/members", s.handle("ListMembers", func(ctx contractapi.TransactionContextInterface, msp string) (interface{}, error) {
		return s.governance.ListMembers(ctx)
	}))
	mux.HandleFunc("/api/governance/metrics", s.handle("GetMetrics", func(ctx contractapi.TransactionContextInterface, msp string) (interface{}, error) {
		return s.governance.GetMetrics(ctx)
	}))
	mux.HandleFunc("/api/governance/proposals", s.handleReq("ListProposals", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		if id := q(r, "id"); id != "" {
			return s.governance.GetProposal(ctx, id)
		}
		return s.governance.ListProposals(ctx)
	}))
	s.postBody(mux, "/api/governance/propose-admission", "ProposeAdmission", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct {
			ProposalID  string      `json:"proposalId"`
			Description string      `json:"description"`
			Spec        interface{} `json:"spec"`
		}
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		raw, _ := json.Marshal(in.Spec)
		return nil, s.governance.ProposeAdmission(ctx, in.ProposalID, in.Description, string(raw))
	})
	s.postBody(mux, "/api/governance/propose", "Propose", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ ProposalID, Kind, Description, Payload string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.governance.Propose(ctx, in.ProposalID, in.Kind, in.Description, in.Payload)
	})
	s.postBody(mux, "/api/governance/vote", "Vote", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct{ ProposalID string }
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.governance.Vote(ctx, in.ProposalID)
	})

	// -------------------------------------------------------------- anomaly
	mux.HandleFunc("/api/anomaly", s.handle("ListAnomalyFlags", func(ctx contractapi.TransactionContextInterface, msp string) (interface{}, error) {
		return s.provider.ListAnomalyFlags(ctx)
	}))
	s.postBody(mux, "/api/anomaly/raise", "RaiseAnomalyFlag", func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error) {
		var in struct {
			FlagID     string  `json:"flagId"`
			ProviderID string  `json:"providerId"`
			VerifierID string  `json:"verifierId"`
			Pairings   int64   `json:"pairings"`
			ZScore     float64 `json:"zScore"`
			Note       string  `json:"note"`
		}
		if err := decode(r, &in); err != nil {
			return nil, err
		}
		return nil, s.provider.RaiseAnomalyFlag(ctx, in.FlagID, in.ProviderID, in.VerifierID, in.Pairings, in.ZScore, in.Note)
	})

	// --------------------------------------------------------------- ledger
	mux.HandleFunc("/api/ledger/blocks", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]interface{}{"ok": true, "result": s.Ledger.Blocks()})
	})
	// The raw world state. This is the privacy demonstration: anyone can read
	// every byte the ledger holds and check for themselves that no national
	// identity number, name or diagnosis is in it.
	mux.HandleFunc("/api/ledger/state", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]interface{}{"ok": true, "result": s.Ledger.Dump()})
	})

	return withCORS(mux)
}

// postBody registers a route whose handler needs the request body.
func (s *Server) postBody(mux *http.ServeMux, path, fn string,
	body func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error)) {
	mux.HandleFunc(path, s.handleReq(fn, body))
}

func (s *Server) handleReq(fn string,
	body func(ctx contractapi.TransactionContextInterface, msp string, r *http.Request) (interface{}, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			writeJSON(w, http.StatusNoContent, nil)
			return
		}
		out, events, err := s.run(r, fn, func(ctx contractapi.TransactionContextInterface, msp string) (interface{}, error) {
			return body(ctx, msp, r)
		})
		if err != nil {
			writeJSON(w, http.StatusUnprocessableEntity, map[string]interface{}{
				"ok": false, "function": fn, "error": err.Error(),
			})
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"ok": true, "function": fn, "result": out, "events": events,
		})
	}
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Obhoy-MSP")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Log prints a one-line summary of every committed transaction, so what the
// scenarios do to the ledger is visible in the terminal as it happens.
func (s *Server) Log(from int) int {
	blocks := s.Ledger.Blocks()
	for i := from; i < len(blocks); i++ {
		b := blocks[i]
		status := "OK "
		detail := strings.Join(b.Writes, " ")
		if !b.Success {
			status = "REFUSED"
			detail = b.Message
		}
		log.Printf("  [%03d] %-8s %-26s %-14s %s", b.Number, status, b.Function, b.MSP, detail)
	}
	return len(blocks)
}

// ---------------------------------------------------------------- accessors
//
// The scenario harness drives the contracts directly rather than over HTTP, so
// that a scenario transcript records the same refusals a peer would produce
// without a network round trip in between.

// Invoke runs one transaction as one organisation and commits it. A body that
// returns an error commits nothing, which is what "refused at commit" means.
func (s *Server) Invoke(msp, fn string, body func(ctx contractapi.TransactionContextInterface) error) error {
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
	return err
}

// SetClock pins transaction time, for scenarios that need a policy to have
// lapsed or a continuation window to have closed.
func (s *Server) SetClock(unix int64) { s.clock = unix }

func (s *Server) Identity() *contracts.IdentityRegistry        { return s.identity }
func (s *Server) Policy() *contracts.PolicyRegistry            { return s.policy }
func (s *Server) Provider() *contracts.ProviderRegistry        { return s.provider }
func (s *Server) Schedule() *contracts.BenefitScheduleContract { return s.schedule }
func (s *Server) Event() *contracts.EventRegistry              { return s.event }
func (s *Server) Settlement() *contracts.ClaimSettlement       { return s.settlement }
func (s *Server) Transparency() *contracts.TransparencyLedger  { return s.transparency }
func (s *Server) Governance() *contracts.GovernanceCouncil     { return s.governance }
