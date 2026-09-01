// Package model carries the on-chain object model.
//
// Two objects, not one. An *event* is the occurrence: this subject, this
// window. It is unique by construction. An *entitlement* is a claim of cover
// against that event under one policy. The relation is many-to-one, and it has
// to be -- several entitlements against one event are often legitimate
// (whitepaper section 4.3). Settlement consumes the entitlement, never the
// event, which is why the event has no settlement state of its own.
package model

// EventState is the lifecycle of the occurrence itself.
//
// Deliberately does NOT contain SETTLED/DENIED/APPEALED. Those belong to the
// entitlement. An event reaches CLOSED_ELIGIBLE once and stays there, so a
// second legitimate entitlement can still settle against it later.
type EventState string

const (
	EventOpen           EventState = "OPEN"
	EventClosedEligible EventState = "CLOSED_ELIGIBLE"
	EventExpired        EventState = "EXPIRED"
)

// EntitlementState is what settlement actually moves. Apart from an upheld
// denial, SETTLED is the only terminal state.
type EntitlementState string

const (
	EntCreated      EntitlementState = "CREATED"
	EntAdjudicated  EntitlementState = "ADJUDICATED"
	EntSettled      EntitlementState = "SETTLED"
	EntDenied       EntitlementState = "DENIED"
	EntAppealed     EntitlementState = "APPEALED"
	EntDeniedUpheld EntitlementState = "DENIED_UPHELD"
)

// AttesterClass is a stakeholder class with its own interests. The quorum in
// Mechanism 2 spans classes, not individuals: two signatures from one class
// are one class.
type AttesterClass string

const (
	ClassProvider AttesterClass = "PROVIDER" // asserting facility -- the payee in health
	ClassClinical AttesterClass = "CLINICAL" // independent clinician or diagnostic centre
	ClassField    AttesterClass = "FIELD"    // MFI/NGO field agent at the bedside
	ClassInsurer  AttesterClass = "INSURER"  // pays; signs as payer, never as an attesting class
	ClassOversight AttesterClass = "OVERSIGHT"
)

// PolicyType decides which side of the coordination-of-benefits bound a
// settlement is counted against.
type PolicyType string

const (
	PolicyIndemnity PolicyType = "INDEMNITY"
	PolicyFixed     PolicyType = "FIXED"
)

type PolicyState string

const (
	PolicyActive    PolicyState = "ACTIVE"
	PolicySuspended PolicyState = "SUSPENDED"
	PolicyLapsed    PolicyState = "LAPSED"
)

type ProviderState string

const (
	ProviderAccredited   ProviderState = "ACCREDITED"
	ProviderDeaccredited ProviderState = "DEACCREDITED"
)

// SegmentKind distinguishes the three ways a provider can touch one event.
// Only INITIAL opens it; the other two are continuations, which is what stops
// the uniqueness invariant refusing legitimate care.
type SegmentKind string

const (
	SegmentInitial     SegmentKind = "INITIAL"
	SegmentTransfer    SegmentKind = "TRANSFER"
	SegmentReadmission SegmentKind = "READMISSION"
)

// DomainProfile is the whole generalisation claim of the paper, made
// executable: supply the three parameters and the line runs on the protocol
// unchanged. Nothing else in the chaincode reads the line name.
type DomainProfile struct {
	Line            string          `json:"line"`            // HEALTH | CROP | MOTOR | PROPERTY
	UniquenessKey   string          `json:"uniquenessKey"`   // human-readable spec of the key
	AttesterClasses []AttesterClass `json:"attesterClasses"` // who may corroborate
	QuorumSize      int             `json:"quorumSize"`      // distinct classes required (2)
	PayeeClass      AttesterClass   `json:"payeeClass"`      // which class must not fill the quorum alone
	SettlementBasis string          `json:"settlementBasis"` // DEFINED_BENEFIT | PARAMETRIC | SCHEDULED
	ContinuationWindowSeconds int64 `json:"continuationWindowSeconds"`
}

// SubjectCommitment is how a person appears on-chain. Never an NID, never a
// name. The commitment is a keyed PRF computed off-chain under threshold
// custody; chaincode sees only the output and the key version.
type SubjectCommitment struct {
	Commitment   string `json:"commitment"`
	KeyVersion   int    `json:"keyVersion"`
	AggregatorID string `json:"aggregatorId"`
	Context      string `json:"context"` // domain separation: "event" or "policy"
	RegisteredTS int64  `json:"registeredTs"`
	Retired      bool   `json:"retired"` // set when its key version is retired
}

// Policy is non-transferable and bound to a subject commitment. There is no
// transfer function anywhere in this chaincode.
type Policy struct {
	PolicyID          string      `json:"policyId"`
	SubjectCommitment string      `json:"subjectCommitment"`
	InsurerMSP        string      `json:"insurerMsp"`
	PoolID            string      `json:"poolId"`
	Type              PolicyType  `json:"type"`
	BenefitCap        int64       `json:"benefitCap"` // taka, minor units
	WaitingPeriodEnd  int64       `json:"waitingPeriodEnd"`
	EffectiveFrom     int64       `json:"effectiveFrom"`
	ExpiresAt         int64       `json:"expiresAt"`
	State             PolicyState `json:"state"`
	IssuedTS          int64       `json:"issuedTs"`
}

// Provider carries a revocable accreditation whose history survives
// revocation, so a de-accredited facility cannot re-enter clean (Mechanism 3).
type Provider struct {
	ProviderID         string        `json:"providerId"`
	MSP                string        `json:"msp"`
	Class              AttesterClass `json:"class"`
	DGHSRef            string        `json:"dghsRef"`
	State              ProviderState `json:"state"`
	AccreditedTS       int64         `json:"accreditedTs"`
	DeaccreditedTS     int64         `json:"deaccreditedTs"`
	DeaccreditedReason string        `json:"deaccreditedReason"`
	AttestationsTotal  int64         `json:"attestationsTotal"`
	AttestationsFailed int64         `json:"attestationsFailed"`
	History            []string      `json:"history"` // append-only, survives de-accreditation
}

// BenefitSchedule is published in advance and versioned. The event stores the
// hash of the version it was opened under, so a schedule cannot be rewritten
// under a claim after the fact.
type BenefitSchedule struct {
	Version       int              `json:"version"`
	EffectiveFrom int64            `json:"effectiveFrom"`
	Entries       map[string]int64 `json:"entries"` // categoryCode -> defined benefit
	Hash          string           `json:"hash"`
	PublishedTS   int64            `json:"publishedTs"`
}

// Attestation records the class, not just the signer. Anonymous attestation
// (Idemix, or the documented class-credential fallback) records a nullifier
// instead of an identity, so the same agent cannot attest twice.
type Attestation struct {
	AttesterID string        `json:"attesterId"`
	Class      AttesterClass `json:"class"`
	MSP        string        `json:"msp"`
	TS         int64         `json:"ts"`
	SigRef     string        `json:"sigRef"`
	Anonymous  bool          `json:"anonymous"`
	Nullifier  string        `json:"nullifier,omitempty"`
}

// AdmissionSegment is one contact with the health system inside one event.
// A transfer or a readmission adds a segment; it never opens a second event.
type AdmissionSegment struct {
	ProviderID  string      `json:"providerId"`
	Kind        SegmentKind `json:"kind"`
	AdmitTS     int64       `json:"admitTs"`
	DischargeTS int64       `json:"dischargeTs"`
	AttestedBy  string      `json:"attestedBy"` // transferring provider, for TRANSFER
}

// Event is a non-transferable, single-use on-chain asset. Its identifier is
// derived, not supplied: H(subjectCommitment || admissionWindow). The key
// leaves out diagnosis and provider on purpose, so changing either cannot mint
// a "different" event.
type Event struct {
	EventID             string             `json:"eventId"`
	Line                string             `json:"line"`
	SubjectCommitment   string             `json:"subjectCommitment"`
	AdmissionWindow     string             `json:"admissionWindow"`
	AsserterID          string             `json:"asserterId"`
	AsserterMSP         string             `json:"asserterMsp"`
	CategoryCode        string             `json:"categoryCode"`
	OpenTS              int64              `json:"openTs"`
	CloseTS             int64              `json:"closeTs"`
	State               EventState         `json:"state"`
	Attestations        []Attestation      `json:"attestations"`
	Segments            []AdmissionSegment `json:"segments"`
	ScheduleVersion     int                `json:"scheduleVersion"`
	ScheduleVersionHash string             `json:"scheduleVersionHash"`
	PayeeClass          AttesterClass      `json:"payeeClass"`
	QuorumSize          int                `json:"quorumSize"`
	// Bounds for coordination of benefits (equation 2). AssessedLoss caps the
	// indemnity side; BenefitCapAggregate caps the fixed-benefit side.
	AssessedLoss        int64 `json:"assessedLoss"`
	BenefitCapAggregate int64 `json:"benefitCapAggregate"`
}

// Entitlement is what settlement consumes. At most one exists per
// (event, policy) pair.
type Entitlement struct {
	EntitlementID string           `json:"entitlementId"`
	EventID       string           `json:"eventId"`
	PolicyID      string           `json:"policyId"`
	InsurerMSP    string           `json:"insurerMsp"`
	PoolID        string           `json:"poolId"`
	Type          PolicyType       `json:"type"`
	State         EntitlementState `json:"state"`
	Amount        int64            `json:"amount"`
	DenialCode    string           `json:"denialCode,omitempty"`
	DeniedByMSP   string           `json:"deniedByMsp,omitempty"`
	SettlementRef string           `json:"settlementRef,omitempty"`
	CreatedTS     int64            `json:"createdTs"`
	AdjudicatedTS int64            `json:"adjudicatedTs"`
	SettledTS     int64            `json:"settledTs"`
	AppealTS      int64            `json:"appealTs"`
	PanelDecision string           `json:"panelDecision,omitempty"`
	PanelMSP      string           `json:"panelMsp,omitempty"`
}

// Period is what gets published and anchored. Everything here is an aggregate;
// nothing in it identifies a person.
type Period struct {
	PeriodID              string           `json:"periodId"`
	PoolID                string           `json:"poolId"`
	OpenedTS              int64            `json:"openedTs"`
	ClosedTS              int64            `json:"closedTs"`
	Closed                bool             `json:"closed"`
	WrittenPremium        int64            `json:"writtenPremium"`
	ClaimsReceived        int64            `json:"claimsReceived"`
	ClaimsSettled         int64            `json:"claimsSettled"`
	ClaimsDenied          int64            `json:"claimsDenied"`
	AmountSettled         int64            `json:"amountSettled"`
	DenialReasons         map[string]int64 `json:"denialReasons"`
	TotalSettlementSecs   int64            `json:"totalSettlementSecs"`
	MeanSettlementSeconds int64            `json:"meanSettlementSeconds"`
	ReservePosition       int64            `json:"reservePosition"`
	Leaves                []string         `json:"leaves"`
	MerkleRoot            string           `json:"merkleRoot"`
	NakamotoCoefficient   int              `json:"nakamotoCoefficient"`
	Gini                  float64          `json:"gini"`
	Anchor                *Anchor          `json:"anchor,omitempty"`
}

// Anchor binds integrity after inclusion, not completeness. A claim that never
// reached the ledger is absent from the tree, and the root commits faithfully
// to a record missing it.
type Anchor struct {
	Chain       string `json:"chain"`
	TxHash      string `json:"txHash"`
	BlockNumber int64  `json:"blockNumber"`
	AnchoredTS  int64  `json:"anchoredTs"`
	Root        string `json:"root"`
}

type MemberState string

const (
	MemberActive    MemberState = "ACTIVE"
	MemberSuspended MemberState = "SUSPENDED"
)

// CouncilMember holds formal authority over council votes -- charter
// amendments, upgrade approval, admission and off-boarding. It has no bearing
// on Fabric transaction validation, which runs on the endorsement policy.
type CouncilMember struct {
	MemberID  string      `json:"memberId"`
	Class     string      `json:"class"`
	MSP       string      `json:"msp"`
	Weight    float64     `json:"weight"`
	State     MemberState `json:"state"`
	AdmittedTS int64      `json:"admittedTs"`
}

type ProposalState string

const (
	ProposalOpen     ProposalState = "OPEN"
	ProposalPassed   ProposalState = "PASSED"
	ProposalRejected ProposalState = "REJECTED"
)

type Proposal struct {
	ProposalID  string             `json:"proposalId"`
	Kind        string             `json:"kind"` // ADMIT | SUSPEND | AMEND | UPGRADE
	Description string             `json:"description"`
	Payload     string             `json:"payload"`
	ProposedBy  string             `json:"proposedBy"`
	Votes       map[string]float64 `json:"votes"`
	WeightFor   float64            `json:"weightFor"`
	Threshold   float64            `json:"threshold"`
	State       ProposalState      `json:"state"`
	CreatedTS   int64              `json:"createdTs"`
	DecidedTS   int64              `json:"decidedTs"`
}

// DisclosureRecord logs THAT a disclosure happened and nothing about what.
type DisclosureRecord struct {
	DisclosureID string `json:"disclosureId"`
	Commitment   string `json:"commitment"`
	OrderRef     string `json:"orderRef"`
	RequestedBy  string `json:"requestedBy"`
	TS           int64  `json:"ts"`
}

// AnomalyFlag is written by the off-chain pairing scorer. Payee-verifier
// collusion is the residual risk the paper declines to claim as solved; this
// is the part of the response that lives on-chain.
type AnomalyFlag struct {
	FlagID     string  `json:"flagId"`
	ProviderID string  `json:"providerId"`
	VerifierID string  `json:"verifierId"`
	Pairings   int64   `json:"pairings"`
	ZScore     float64 `json:"zScore"`
	RaisedTS   int64   `json:"raisedTs"`
	Note       string  `json:"note"`
}
