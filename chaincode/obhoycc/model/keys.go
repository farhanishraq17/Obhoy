package model

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
)

// Composite-key object types. Every read and write in the chaincode goes
// through one of these, so the whole key space is enumerable from this file.
const (
	ObjEvent       = "event"
	ObjOpenSubject = "openbysubject" // the uniqueness index -- equation (4)
	ObjEntitlement = "entitlement"
	ObjEntByEvent  = "entbyevent"
	ObjEntByPair   = "entbypair" // (event, policy) -- equation (8)
	ObjPolicy      = "policy"
	ObjPolicyBySubject = "policybysubject"
	ObjProvider    = "provider"
	ObjSubject     = "subject"
	ObjSchedule    = "schedule"
	ObjScheduleTip = "scheduletip"
	ObjPeriod        = "period"
	ObjPeriodCurrent = "periodcurrent"
	ObjMember      = "member"
	ObjProposal    = "proposal"
	ObjProfile     = "domainprofile"
	ObjDisclosure  = "disclosure"
	ObjAnomaly     = "anomaly"
	ObjKeyVersion  = "keyversion"
)

// EventKey derives the event identifier. It is NOT supplied by the client:
// chaincode recomputes it from the subject commitment and the admission
// window, so a caller cannot mint a "different" event for the same occurrence
// by choosing its own key.
//
//	eventKey = H(NIDCommitment || admissionWindow)
//
// Diagnosis and provider are deliberately absent from the input.
func EventKey(subjectCommitment, admissionWindow string) string {
	sum := sha256.Sum256([]byte(subjectCommitment + "|" + admissionWindow))
	return hex.EncodeToString(sum[:])
}

// EntitlementKey is derived from the pair it belongs to, which makes
// "at most one entitlement per (event, policy)" a property of the key space
// rather than a check that could be forgotten.
func EntitlementKey(eventID, policyID string) string {
	sum := sha256.Sum256([]byte("ent|" + eventID + "|" + policyID))
	return hex.EncodeToString(sum[:])
}

// ScheduleHash is a canonical hash over a benefit schedule version. The event
// stores it at open time, so the schedule cannot be rewritten under a claim
// after the fact.
func ScheduleHash(version int, effectiveFrom int64, entries map[string]int64) string {
	codes := make([]string, 0, len(entries))
	for c := range entries {
		codes = append(codes, c)
	}
	sort.Strings(codes)
	h := sha256.New()
	fmt.Fprintf(h, "schedule|v%d|%d", version, effectiveFrom)
	for _, c := range codes {
		fmt.Fprintf(h, "|%s=%d", c, entries[c])
	}
	return hex.EncodeToString(h.Sum(nil))
}

// PeriodLeaf is one transparency total, hashed. The leaf set is what the
// Merkle root commits to, so what is anchored is exactly what is published.
func PeriodLeaf(name string, value int64) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s=%d", name, value)))
	return hex.EncodeToString(sum[:])
}

// Canonical returns deterministic JSON. Chaincode must never marshal with map
// iteration order leaking into the ledger, or two endorsing peers produce
// different write sets and the transaction fails validation for no good reason.
func Canonical(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}
