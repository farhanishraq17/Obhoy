// Package scenarios is the adversarial harness.
//
// Each scenario is a scripted run with an asserted outcome, and most of them
// exist to produce a refusal rather than a success. Together they are three
// things at once: the regression suite, the evidence a reviewer reads, and the
// script the demonstration video follows.
//
// Every scenario runs against a freshly bootstrapped ledger, so none of them
// depends on the order the others ran in.
package scenarios

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/internal/httpapi"
	"github.com/obhoy/obhoycc/internal/ledgerstub"
	"github.com/obhoy/obhoycc/model"
)

// Outcome is what a step was expected to do.
type Outcome string

const (
	Accepted Outcome = "accepted"
	Refused  Outcome = "refused"
)

// Step is one transaction and its verdict.
type Step struct {
	N       int     `json:"n"`
	Actor   string  `json:"actor"`
	Action  string  `json:"action"`
	Expect  Outcome `json:"expect"`
	Got     Outcome `json:"got"`
	Detail  string  `json:"detail"`
	OK      bool    `json:"ok"`
	Comment string  `json:"comment,omitempty"`
}

// Result is one scenario's transcript.
type Result struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Criterion string `json:"criterion"`
	Claim     string `json:"claim"`
	Steps     []Step `json:"steps"`
	Passed    bool   `json:"passed"`
	Summary   string `json:"summary"`
}

// Runner drives one scenario against its own ledger.
type Runner struct {
	srv    *httpapi.Server
	steps  []Step
	failed bool
}

// NewRunner bootstraps a fresh network.
func NewRunner() *Runner {
	srv := httpapi.New()
	srv.Bootstrap()
	return &Runner{srv: srv}
}

// Server exposes the underlying node, for the ledger and world-state views.
func (r *Runner) Server() *httpapi.Server { return r.srv }

// do runs one transaction as one organisation and records the verdict.
func (r *Runner) do(actor, action string, expect Outcome, body func(ctx contractapi.TransactionContextInterface) error) error {
	err := r.srv.Invoke(actor, action, body)
	got := Accepted
	detail := "committed"
	if err != nil {
		got = Refused
		detail = err.Error()
	}
	step := Step{
		N: len(r.steps) + 1, Actor: actor, Action: action,
		Expect: expect, Got: got, Detail: detail, OK: got == expect,
	}
	if !step.OK {
		r.failed = true
	}
	r.steps = append(r.steps, step)
	return err
}

// note attaches a comment to the last recorded step.
func (r *Runner) note(comment string) {
	if len(r.steps) > 0 {
		r.steps[len(r.steps)-1].Comment = comment
	}
}

// check records a plain assertion that is not a transaction.
func (r *Runner) check(actor, action string, ok bool, detail string) {
	got := Accepted
	if !ok {
		got = Refused
		r.failed = true
	}
	r.steps = append(r.steps, Step{
		N: len(r.steps) + 1, Actor: actor, Action: action,
		Expect: Accepted, Got: got, Detail: detail, OK: ok,
	})
}

// ------------------------------------------------------------------ helpers

func (r *Runner) subject(n int) string { return httpapi.DemoSubject(n) }

func (r *Runner) openEvent(actor, subject, window, asserter, category string, loss, capAgg int64, expect Outcome) string {
	var id string
	_ = r.do(actor, "openEvent", expect, func(ctx contractapi.TransactionContextInterface) error {
		var err error
		id, err = r.srv.Event().OpenEvent(ctx, "HEALTH", subject, window, asserter, category, loss, capAgg)
		return err
	})
	return id
}

func (r *Runner) attest(actor, eventID, attesterID string, expect Outcome) {
	_ = r.do(actor, "attestEvent", expect, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Event().AttestEvent(ctx, eventID, attesterID, "sig-"+attesterID)
	})
}

func (r *Runner) closeEvent(actor, eventID string, expect Outcome) {
	_ = r.do(actor, "closeEvent", expect, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Event().CloseEvent(ctx, eventID)
	})
}

func (r *Runner) continueEvent(actor, eventID, providerID, kind, attestedBy string, expect Outcome) {
	_ = r.do(actor, "continueEvent", expect, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Event().ContinueEvent(ctx, eventID, providerID, kind, attestedBy)
	})
}

func (r *Runner) createEntitlement(actor, eventID, policyID string, expect Outcome) string {
	var id string
	_ = r.do(actor, "createEntitlement", expect, func(ctx contractapi.TransactionContextInterface) error {
		var err error
		id, err = r.srv.Settlement().CreateEntitlement(ctx, eventID, policyID)
		return err
	})
	if id == "" {
		id = model.EntitlementKey(eventID, policyID)
	}
	return id
}

func (r *Runner) adjudicate(actor, entID string, expect Outcome) int64 {
	var amount int64
	_ = r.do(actor, "adjudicate", expect, func(ctx contractapi.TransactionContextInterface) error {
		var err error
		amount, err = r.srv.Settlement().Adjudicate(ctx, entID)
		return err
	})
	return amount
}

func (r *Runner) settle(actor, entID, ref string, expect Outcome) {
	_ = r.do(actor, "authoriseSettlement", expect, func(ctx contractapi.TransactionContextInterface) error {
		return r.srv.Settlement().AuthoriseSettlement(ctx, entID, ref)
	})
}

// settleFully runs the full claim path and expects every step to succeed.
func (r *Runner) settleFully(actor, eventID, policyID, ref string) string {
	entID := r.createEntitlement(actor, eventID, policyID, Accepted)
	r.adjudicate(actor, entID, Accepted)
	r.settle(actor, entID, ref, Accepted)
	return entID
}

// eligible opens an event and corroborates it with an independent class.
func (r *Runner) eligible(subject, window, category string, loss, capAgg int64) string {
	id := r.openEvent("ProviderMSP", subject, window, "HOSP-UPAZILA-KLG", category, loss, capAgg, Accepted)
	r.attest("ClinicalMSP", id, "DIAG-CENTRE-KLG", Accepted)
	r.closeEvent("ProviderMSP", id, Accepted)
	return id
}

func (r *Runner) result(id, title, criterion, claim, summary string) Result {
	return Result{
		ID: id, Title: title, Criterion: criterion, Claim: claim,
		Steps: r.steps, Passed: !r.failed, Summary: summary,
	}
}

// Blocks exposes the transaction log the scenario produced.
func (r *Runner) Blocks() []ledgerstub.Block { return r.srv.Ledger.Blocks() }

func jsonCompact(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

var (
	_ = fmt.Sprintf
	_ = strings.Contains
)
