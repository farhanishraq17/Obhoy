package contracts

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/invariants"
	"github.com/obhoy/obhoycc/model"
)

// EventRegistry defines the protocol's one primitive: an insurable event as a
// non-transferable, single-use on-chain asset.
//
// The whole point of tokenising the event rather than the claim is refusal at
// commit instead of detection afterwards. A second assertion against a subject
// who already has an open event does not get written and then flagged -- it
// fails endorsement and never reaches the ledger.
//
// There is no transfer function here either. An event is bound to the subject
// commitment that authorised it and cannot be sold, assigned or repointed.
type EventRegistry struct {
	contractapi.Contract
}

// ------------------------------------------------------------ domain profiles

// RegisterDomainProfile supplies the three parameters that change between
// lines of business: the uniqueness key, the attesting classes, and the
// settlement basis. Nothing else in this chaincode reads the line name, which
// is the generalisation claim made checkable rather than asserted.
func (c *EventRegistry) RegisterDomainProfile(
	ctx contractapi.TransactionContextInterface,
	line, uniquenessKey, attesterClassesJSON string,
	quorumSize int, payeeClass, settlementBasis string, continuationWindowSeconds int64,
) error {
	if _, _, err := requireClass(ctx, model.ClassOversight); err != nil {
		return err
	}
	var classes []model.AttesterClass
	if err := json.Unmarshal([]byte(attesterClassesJSON), &classes); err != nil {
		return fmt.Errorf("attesterClasses must be a JSON array of class names: %w", err)
	}
	if quorumSize < 2 {
		return fmt.Errorf("a quorum of fewer than two classes is not a quorum")
	}
	if len(classes) < quorumSize {
		return fmt.Errorf("profile lists %d attesting classes but requires a quorum of %d", len(classes), quorumSize)
	}
	p := model.DomainProfile{
		Line: line, UniquenessKey: uniquenessKey, AttesterClasses: classes,
		QuorumSize: quorumSize, PayeeClass: model.AttesterClass(payeeClass),
		SettlementBasis: settlementBasis, ContinuationWindowSeconds: continuationWindowSeconds,
	}
	return putJSON(ctx, model.ObjProfile, []string{line}, p)
}

// GetDomainProfile returns the three parameters for a line.
func (c *EventRegistry) GetDomainProfile(ctx contractapi.TransactionContextInterface, line string) (*model.DomainProfile, error) {
	var p model.DomainProfile
	found, err := getJSON(ctx, model.ObjProfile, []string{line}, &p)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, notFound("domain profile", line)
	}
	return &p, nil
}

// ListDomainProfiles returns every configured line.
func (c *EventRegistry) ListDomainProfiles(ctx contractapi.TransactionContextInterface) ([]model.DomainProfile, error) {
	out := []model.DomainProfile{}
	err := listByPartial(ctx, model.ObjProfile, []string{}, func(raw []byte) error {
		var p model.DomainProfile
		if err := jsonUnmarshal(raw, &p); err != nil {
			return err
		}
		out = append(out, p)
		return nil
	})
	return out, err
}

// ------------------------------------------------------------------- opening

// OpenEvent asserts that an insurable event occurred.
//
// The event identifier is derived here, not supplied: eventKey =
// H(subjectCommitment || admissionWindow). A caller cannot mint a "different"
// event for the same occurrence by choosing its own key, and because diagnosis
// and provider are absent from the input, changing either cannot evade the
// invariant.
//
// Refusals, in order: the asserter must be an accredited provider; the subject
// must be enrolled; some policy must have been live at the time; the exact
// event key must not already exist in any state (nothing re-opens a consumed
// key); and the subject must not already have an open event -- equation (4).
func (c *EventRegistry) OpenEvent(
	ctx contractapi.TransactionContextInterface,
	line, subjectCommitment, admissionWindow, asserterID, categoryCode string,
	assessedLoss, benefitCapAggregate int64,
) (string, error) {
	msp, _, err := requireClass(ctx, model.ClassProvider)
	if err != nil {
		return "", err
	}
	profile, err := c.GetDomainProfile(ctx, line)
	if err != nil {
		return "", err
	}
	if subjectCommitment == "" || admissionWindow == "" {
		return "", fmt.Errorf("subjectCommitment and admissionWindow are required")
	}

	// The asserting party must hold a live accreditation.
	var prov model.Provider
	ok, err := getJSON(ctx, model.ObjProvider, []string{asserterID}, &prov)
	if err != nil {
		return "", err
	}
	if !ok {
		return "", fmt.Errorf("asserter %s is not an accredited party", asserterID)
	}
	if prov.State != model.ProviderAccredited {
		return "", fmt.Errorf("asserter %s was de-accredited on %d and may not open events",
			asserterID, prov.DeaccreditedTS)
	}
	if prov.Class != model.ClassProvider {
		return "", fmt.Errorf("asserter %s holds class %s; only a PROVIDER may assert an event", asserterID, prov.Class)
	}

	// The subject must be enrolled. Chaincode cannot discharge A2 -- two
	// identities for one person defeat the invariant before this code runs --
	// but it can refuse an event against a commitment nobody enrolled.
	var subj model.SubjectCommitment
	ok, err = getJSON(ctx, model.ObjSubject, []string{subjectCommitment}, &subj)
	if err != nil {
		return "", err
	}
	if !ok {
		return "", fmt.Errorf("subject commitment %s is not enrolled", subjectCommitment)
	}

	now, err := txTime(ctx)
	if err != nil {
		return "", err
	}

	// Some cover must have been live. Which policies respond is settled later,
	// per entitlement; this only refuses an assertion against a subject with no
	// cover at all.
	pr := &PolicyRegistry{}
	policies, err := pr.ListPoliciesForSubject(ctx, subjectCommitment)
	if err != nil {
		return "", err
	}
	live := false
	for _, p := range policies {
		if p.State == model.PolicyActive && now >= p.EffectiveFrom &&
			(p.ExpiresAt == 0 || now <= p.ExpiresAt) && now >= p.WaitingPeriodEnd {
			live = true
			break
		}
	}
	if !live {
		return "", fmt.Errorf("subject has no active policy at %d; nothing would respond to this event", now)
	}

	eventID := model.EventKey(subjectCommitment, admissionWindow)

	// Nothing re-opens a consumed key. This is the half of the burn property
	// that lives on the event rather than on the entitlement.
	var dup model.Event
	exists, err := getJSON(ctx, model.ObjEvent, []string{eventID}, &dup)
	if err != nil {
		return "", err
	}
	if exists {
		return "", fmt.Errorf("event %s already exists in state %s; a consumed key is never re-opened", eventID, dup.State)
	}

	// Equation (4). In health this mirrors physical reality: a person cannot be
	// admitted to two hospitals at once, so the second assertion is refused at
	// commit rather than caught after payment. This is the check that no single
	// insurer's database can perform, because no insurer can see the others'.
	openID, err := getRaw(ctx, model.ObjOpenSubject, []string{subjectCommitment})
	if err != nil {
		return "", err
	}
	if res := invariants.SingleOpenEvent(openID, eventID); !res.OK {
		return "", res.Error()
	}

	sched := &BenefitScheduleContract{}
	version, err := sched.CurrentVersion(ctx)
	if err != nil {
		return "", err
	}
	if version == 0 {
		return "", fmt.Errorf("no benefit schedule has been published; nothing could be settled")
	}
	s, err := sched.GetSchedule(ctx, version)
	if err != nil {
		return "", err
	}
	if _, covered := s.Entries[categoryCode]; !covered {
		return "", fmt.Errorf("category %q is not covered under schedule version %d", categoryCode, version)
	}

	ev := model.Event{
		EventID:           eventID,
		Line:              line,
		SubjectCommitment: subjectCommitment,
		AdmissionWindow:   admissionWindow,
		AsserterID:        asserterID,
		AsserterMSP:       msp,
		CategoryCode:      categoryCode,
		OpenTS:            now,
		State:             model.EventOpen,
		// The assertion IS the admitting facility's attestation -- it is one of
		// the three classes in the table, not a step outside the quorum. It is
		// recorded as such so the arithmetic in closeEvent is honest: a
		// provider that opens an event has supplied exactly one class, and one
		// class is not a quorum.
		Attestations: []model.Attestation{{
			AttesterID: asserterID,
			Class:      model.ClassProvider,
			MSP:        msp,
			TS:         now,
			SigRef:     "assertion",
		}},
		Segments: []model.AdmissionSegment{{
			ProviderID: asserterID,
			Kind:       model.SegmentInitial,
			AdmitTS:    now,
		}},
		ScheduleVersion:     version,
		ScheduleVersionHash: s.Hash,
		PayeeClass:          profile.PayeeClass,
		QuorumSize:          profile.QuorumSize,
		AssessedLoss:        assessedLoss,
		BenefitCapAggregate: benefitCapAggregate,
	}
	if err := putJSON(ctx, model.ObjEvent, []string{eventID}, ev); err != nil {
		return "", err
	}
	if err := putRaw(ctx, model.ObjOpenSubject, []string{subjectCommitment}, eventID); err != nil {
		return "", err
	}
	if err := emit(ctx, "EventOpened", ev); err != nil {
		return "", err
	}
	return eventID, nil
}

// ----------------------------------------------------------------- attesting

// AttestEvent records corroboration from one stakeholder class.
//
// A class that has already attested is refused, so a payee cannot fill the
// quorum alone by signing repeatedly. The attester's own accreditation is
// checked, and the class it claims must match the class its organisation and
// its accreditation record both say it holds -- three sources that have to
// agree.
func (c *EventRegistry) AttestEvent(
	ctx contractapi.TransactionContextInterface,
	eventID, attesterID, sigRef string,
) error {
	msp, callerClass, err := requireClass(ctx, model.ClassProvider, model.ClassClinical, model.ClassField)
	if err != nil {
		return err
	}
	ev, err := c.GetEvent(ctx, eventID)
	if err != nil {
		return err
	}
	if ev.State != model.EventOpen {
		return fmt.Errorf("event %s is %s; only an OPEN event can be attested", eventID, ev.State)
	}
	var prov model.Provider
	ok, err := getJSON(ctx, model.ObjProvider, []string{attesterID}, &prov)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("attester %s is not an accredited party", attesterID)
	}
	if prov.State != model.ProviderAccredited {
		return fmt.Errorf("attester %s was de-accredited on %d and its attestations are not accepted",
			attesterID, prov.DeaccreditedTS)
	}
	if prov.Class != callerClass {
		return fmt.Errorf("attester %s is accredited as %s but is submitting through a %s organisation",
			attesterID, prov.Class, callerClass)
	}
	if res := invariants.DistinctClassNotAlreadyPresent(ev.Attestations, callerClass); !res.OK {
		return res.Error()
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	ev.Attestations = append(ev.Attestations, model.Attestation{
		AttesterID: attesterID, Class: callerClass, MSP: msp, TS: now, SigRef: sigRef,
	})
	if err := putJSON(ctx, model.ObjEvent, []string{eventID}, ev); err != nil {
		return err
	}
	return emit(ctx, "EventAttested", map[string]interface{}{
		"eventId": eventID, "class": callerClass, "attesterId": attesterID,
	})
}

// AttestEventAnonymously records an attestation that proves class membership
// without naming the individual who acted.
//
// A field verifier should be able to corroborate without their employer
// learning which agent was at which bedside. The nullifier is what stops
// anonymity buying a second vote: it is unlinkable to an identity but unique
// per credential per event, so the same agent cannot attest twice.
//
// Idemix is the mechanism the paper names for this, and it is a client-side
// property only -- Fabric does not extend it to endorsement, so the peer
// signature is still an ordinary X.509 identity. Where a deployment cannot
// run Idemix, a class-level group credential produces the same on-chain
// record; the deviation is documented rather than hidden.
func (c *EventRegistry) AttestEventAnonymously(
	ctx contractapi.TransactionContextInterface,
	eventID, nullifier, sigRef string,
) error {
	msp, callerClass, err := requireClass(ctx, model.ClassClinical, model.ClassField)
	if err != nil {
		return err
	}
	if nullifier == "" {
		return fmt.Errorf("an anonymous attestation without a nullifier could be replayed")
	}
	ev, err := c.GetEvent(ctx, eventID)
	if err != nil {
		return err
	}
	if ev.State != model.EventOpen {
		return fmt.Errorf("event %s is %s; only an OPEN event can be attested", eventID, ev.State)
	}
	if res := invariants.NullifierUnused(ev.Attestations, nullifier); !res.OK {
		return res.Error()
	}
	if res := invariants.DistinctClassNotAlreadyPresent(ev.Attestations, callerClass); !res.OK {
		return res.Error()
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	ev.Attestations = append(ev.Attestations, model.Attestation{
		AttesterID: "", Class: callerClass, MSP: msp, TS: now,
		SigRef: sigRef, Anonymous: true, Nullifier: nullifier,
	})
	if err := putJSON(ctx, model.ObjEvent, []string{eventID}, ev); err != nil {
		return err
	}
	return emit(ctx, "EventAttested", map[string]interface{}{
		"eventId": eventID, "class": callerClass, "anonymous": true,
	})
}

// --------------------------------------------------------------- continuation

// ContinueEvent adds an admission segment to an open event.
//
// This is the function that stops the uniqueness invariant breaking the health
// deployment outright. A patient stabilised at an upazila health complex and
// then moved to a district hospital produces two admissions and one clinical
// episode. Without this, the receiving facility's assertion would collide with
// the open event and be refused, denying a valid claim at the worst possible
// moment. The invariant blocks duplicate payment, not repeated contact with
// the health system.
func (c *EventRegistry) ContinueEvent(
	ctx contractapi.TransactionContextInterface,
	parentEventID, providerID, kind, attestedBy string,
) error {
	_, _, err := requireClass(ctx, model.ClassProvider)
	if err != nil {
		return err
	}
	ev, err := c.GetEvent(ctx, parentEventID)
	if err != nil {
		return err
	}
	sk := model.SegmentKind(kind)
	if sk != model.SegmentTransfer && sk != model.SegmentReadmission {
		return fmt.Errorf("continuation kind must be TRANSFER or READMISSION, got %q", kind)
	}
	if ev.State != model.EventOpen && ev.State != model.EventClosedEligible {
		return fmt.Errorf("event %s is %s and cannot be continued", parentEventID, ev.State)
	}
	var prov model.Provider
	ok, err := getJSON(ctx, model.ObjProvider, []string{providerID}, &prov)
	if err != nil {
		return err
	}
	if !ok || prov.State != model.ProviderAccredited {
		return fmt.Errorf("receiving provider %s is not accredited", providerID)
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	profile, err := c.GetDomainProfile(ctx, ev.Line)
	if err != nil {
		return err
	}
	// Equation (5): same subject, event not consumed, inside the window.
	if res := invariants.Continuation(ev, ev.SubjectCommitment, now, profile.ContinuationWindowSeconds); !res.OK {
		return res.Error()
	}
	// A transfer is attested by the facility handing the patient over, which is
	// what distinguishes it from a second facility simply asserting an event.
	if sk == model.SegmentTransfer {
		if attestedBy == "" {
			return fmt.Errorf("a transfer must be attested by the transferring provider")
		}
		known := false
		for _, s := range ev.Segments {
			if s.ProviderID == attestedBy {
				known = true
				break
			}
		}
		if !known {
			return fmt.Errorf("transferring provider %s has no segment on event %s", attestedBy, parentEventID)
		}
	}
	// A readmission inside the window links to the same event and is judged
	// against a single benefit ceiling, rather than paying twice.
	if ev.State == model.EventClosedEligible {
		ev.State = model.EventOpen
		if err := putRaw(ctx, model.ObjOpenSubject, []string{ev.SubjectCommitment}, ev.EventID); err != nil {
			return err
		}
	}
	ev.Segments = append(ev.Segments, model.AdmissionSegment{
		ProviderID: providerID, Kind: sk, AdmitTS: now, AttestedBy: attestedBy,
	})
	if err := putJSON(ctx, model.ObjEvent, []string{parentEventID}, ev); err != nil {
		return err
	}
	return emit(ctx, "EventContinued", map[string]interface{}{
		"eventId": parentEventID, "providerId": providerID, "kind": kind,
	})
}

// ------------------------------------------------------------------- closing

// CloseEvent advances an event to CLOSED_ELIGIBLE.
//
// It refuses unless the attestations span at least two classes -- equation (6)
// -- and at least one of them is not the payee -- equation (7). The
// OutOf(2, ...) term in the endorsement policy carries the first half at
// protocol level; the non-payee rule is runtime-dependent and can only be
// enforced here.
//
// CLOSED_ELIGIBLE is reached once and stays. The event has no settlement state
// of its own, so a second legitimate entitlement can still settle against it
// later.
func (c *EventRegistry) CloseEvent(ctx contractapi.TransactionContextInterface, eventID string) error {
	if _, _, err := requireClass(ctx,
		model.ClassProvider, model.ClassClinical, model.ClassField, model.ClassInsurer); err != nil {
		return err
	}
	ev, err := c.GetEvent(ctx, eventID)
	if err != nil {
		return err
	}
	if ev.State != model.EventOpen {
		return fmt.Errorf("event %s is %s; only an OPEN event can be closed", eventID, ev.State)
	}
	if res := invariants.QuorumSpansClasses(ev.Attestations, ev.QuorumSize); !res.OK {
		return res.Error()
	}
	if res := invariants.NonPayeeAttestation(ev.Attestations, ev.PayeeClass); !res.OK {
		return res.Error()
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	ev.State = model.EventClosedEligible
	ev.CloseTS = now
	if err := putJSON(ctx, model.ObjEvent, []string{eventID}, ev); err != nil {
		return err
	}
	// The subject is free to have a future event. The event key itself is never
	// reusable, so releasing the index does not weaken equation (4).
	if err := delKey(ctx, model.ObjOpenSubject, ev.SubjectCommitment); err != nil {
		return err
	}
	return emit(ctx, "EventClosedEligible", ev)
}

// ExpireEvent closes an event that was never corroborated. An assertion that
// nobody independent would stand behind does not become a claim by sitting
// there.
func (c *EventRegistry) ExpireEvent(ctx contractapi.TransactionContextInterface, eventID string) error {
	if _, _, err := requireClass(ctx, model.ClassOversight, model.ClassInsurer); err != nil {
		return err
	}
	ev, err := c.GetEvent(ctx, eventID)
	if err != nil {
		return err
	}
	if ev.State != model.EventOpen {
		return fmt.Errorf("event %s is %s and cannot expire", eventID, ev.State)
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	ev.State = model.EventExpired
	ev.CloseTS = now
	if err := putJSON(ctx, model.ObjEvent, []string{eventID}, ev); err != nil {
		return err
	}
	if err := delKey(ctx, model.ObjOpenSubject, ev.SubjectCommitment); err != nil {
		return err
	}
	return emit(ctx, "EventExpired", map[string]string{"eventId": eventID})
}

// --------------------------------------------------------------------- reads

// GetEvent returns one event.
func (c *EventRegistry) GetEvent(ctx contractapi.TransactionContextInterface, eventID string) (*model.Event, error) {
	var ev model.Event
	found, err := getJSON(ctx, model.ObjEvent, []string{eventID}, &ev)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, notFound("event", eventID)
	}
	return &ev, nil
}

// FindOpenEventForSubject is the uniqueness index, exposed for reading. A
// provider about to admit a patient can see that another facility already has
// an open event on them -- which is the whole mechanism, visible before the
// refusal rather than after it.
func (c *EventRegistry) FindOpenEventForSubject(ctx contractapi.TransactionContextInterface, subjectCommitment string) (string, error) {
	return getRaw(ctx, model.ObjOpenSubject, []string{subjectCommitment})
}

// ListEvents returns every event. Used by the dashboards and the ledger view.
func (c *EventRegistry) ListEvents(ctx contractapi.TransactionContextInterface) ([]model.Event, error) {
	out := []model.Event{}
	err := listByPartial(ctx, model.ObjEvent, []string{}, func(raw []byte) error {
		var ev model.Event
		if err := jsonUnmarshal(raw, &ev); err != nil {
			return err
		}
		out = append(out, ev)
		return nil
	})
	return out, err
}

// HistoryEntry is one prior version of an event, straight from the ledger's
// own history rather than from an application audit log.
type HistoryEntry struct {
	TxID      string       `json:"txId"`
	Timestamp int64        `json:"timestamp"`
	IsDelete  bool         `json:"isDelete"`
	Value     *model.Event `json:"value,omitempty"`
}

// GetEventHistory returns every version of an event. Nothing here is an
// application-level audit trail: this is the ledger's own history, which is
// what makes "the insurer cannot revise the record" a property rather than a
// promise.
func (c *EventRegistry) GetEventHistory(ctx contractapi.TransactionContextInterface, eventID string) ([]HistoryEntry, error) {
	key, err := compositeKey(ctx, model.ObjEvent, eventID)
	if err != nil {
		return nil, err
	}
	it, err := ctx.GetStub().GetHistoryForKey(key)
	if err != nil {
		return nil, fmt.Errorf("read history for event %s: %w", eventID, err)
	}
	defer it.Close()
	out := []HistoryEntry{}
	for it.HasNext() {
		km, err := it.Next()
		if err != nil {
			return nil, err
		}
		entry := HistoryEntry{TxID: km.TxId, IsDelete: km.IsDelete}
		if km.Timestamp != nil {
			entry.Timestamp = km.Timestamp.AsTime().Unix()
		}
		if !km.IsDelete && len(km.Value) > 0 {
			var ev model.Event
			if err := jsonUnmarshal(km.Value, &ev); err == nil {
				entry.Value = &ev
			}
		}
		out = append(out, entry)
	}
	return out, nil
}
