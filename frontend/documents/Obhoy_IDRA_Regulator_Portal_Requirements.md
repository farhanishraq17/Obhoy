# Obhoy — IDRA Regulator Portal Requirements
## Complete Frontend Prototype Specification

> **Scope:** Frontend-only prototype for the BCOLBD demonstration.  
> No real Fabric network, regulator API, insurer API, or production audit system is required. Every interaction should simulate the observable behavior of the architecture using shared frontend state.

---

# 1. Regulator Portal Purpose

The IDRA portal is the **supervisory control view** of Obhoy.

The regulator is not an insurer and should not behave like one.

The portal should let IDRA answer:

```text
Is the network operating correctly?
Are insurers paying and settling within SLA?
Are providers behaving normally?
Are claims being denied unusually often?
Are appeals reversing insurer decisions?
Is governance still decentralized?
Can the audit/transparency history be verified?
Are there compliance or operational anomalies?
```

The whitepaper makes IDRA a first-class network member with continuous oversight access. IDRA operates an orderer and endorsing peer and has read access to the audit channel. The regulator therefore observes network state rather than waiting for periodic self-reported reports.

---

# 2. Current Regulator Navigation

Keep the existing navigation:

```text
PORTAL NAVIGATION

⚖ IDRA Overview
▥ Insurer Monitoring
▦ Provider Monitoring
♢ Appeals Tribunal
▤ Audit Channel Logs
```

The two pages already implemented are:

```text
/ regulator/overview
/ regulator/appeals
```

The remaining pages are:

```text
/ regulator/insurers
/ regulator/providers
/ regulator/audit
```

The Appeals Tribunal page should additionally have:

```text
Active Appeals
Resolved Appeals
```

as tabs.

---

# 3. IMPORTANT: What Happens to a Handled Appeal?

Do NOT leave a resolved appeal inside the active tribunal queue.

The lifecycle should be:

```text
DENIED
   ↓
APPEAL SUBMITTED
   ↓
UNDER REVIEW
   ↓
TRIBUNAL DECISION
   ↓
RESOLVED
```

When the tribunal handles the appeal:

```text
ACTIVE APPEALS
        ↓
        X
        ↓
RESOLVED APPEALS
```

The active queue should only contain:

```text
SUBMITTED
UNDER_REVIEW
AWAITING_DECISION
```

The resolved section should contain:

```text
UPHELD
OVERTURNED
```

This gives the regulator a clean distinction between:

> cases requiring action

and:

> decisions that have already been completed.

---

# 4. Appeals Tribunal — Updated Structure

Keep the existing page but add tabs at the top:

```text
APPEALS TRIBUNAL

[ Active Appeals (1) ] [ Resolved Appeals (8) ]
```

## Active Appeals

Example:

```text
APL-5008
UNDER REVIEW

Entitlement
ENT-9821

Claimant
Policyholder #•••472

Insurer
Green Delta Insurance PLC

Original Decision
DENIED

Appeal Deadline
3 days remaining

[ Review Appeal ]
```

---

# 5. Appeal Review Page / Drawer

Click:

```text
[ Review Appeal ]
```

Show:

```text
APPEAL REVIEW

APL-5008

Entitlement
ENT-9821

Original insurer decision
DENIED

Denial code
PRE_EXISTING_CONDITION

Grounds for appeal
Clinical evidence indicates acute onset.
```

Then:

```text
TRIBUNAL PANEL

Panel composition
✓ Independent Clinician
✓ Consumer Representative
✓ IDRA Representative

Conflict check
✓ No member affiliated with denying insurer
```

The whitepaper specifies an independent panel drawn from clinicians and consumer representatives, excluding anyone affiliated with the denying insurer. Panel composition, decision, and reasoning are recorded.

---

# 6. Tribunal Decision

Provide:

```text
DECISION

○ Uphold insurer denial
○ Overturn insurer denial
```

Reason:

```text
Decision reasoning
[ ______________________________ ]

[ Record Decision ]
```

---

# 7. Overturned Appeal

After clicking:

```text
[ Record Decision ]
```

show:

```text
APPEAL RESOLVED

APL-5008

Decision
OVERTURNED

Entitlement
REINSTATED

Reason
Independent panel found sufficient evidence
that the event satisfied the policy condition.

Recorded
✓ Tribunal decision
✓ Panel composition
✓ Reasoning
✓ Timestamp
```

Then the appeal automatically disappears from:

```text
Active Appeals
```

and appears under:

```text
Resolved Appeals
```

---

# 8. Resolved Appeals

The new tab should look like:

```text
RESOLVED APPEALS

APL-4992    OVERTURNED
ENT-9592
Green Delta Insurance PLC
Resolved 01 Sep 2026
[ View Decision ]

APL-4988    UPHELD
ENT-9511
ABC Insurance Ltd
Resolved 30 Aug 2026
[ View Decision ]
```

---

# 9. Resolved Appeal Detail

Click:

```text
[ View Decision ]
```

Show:

```text
APPEAL DECISION

APL-4992

Original Decision
DENIED

Tribunal Decision
OVERTURNED

Outcome
ENTITLEMENT RE-INSTATED

Panel
Independent Clinician
Consumer Representative
IDRA Representative

Decision Reason
...

Recorded At
2026-09-01 14:32

Ledger Record
APL-4992-DECISION
```

Add:

```text
[ View Audit Record ]
```

This links the appeal to the Audit Channel Logs.

---

# 10. Insurer Monitoring

Route:

```text
/regulator/insurers
```

Purpose:

> Let IDRA monitor the operational and claims behavior of every participating insurer.

---

# 11. Insurer Monitoring Header

```text
INSURER MONITORING

Supervisory view of participating insurers

Network-wide performance
September 2026

[ Last 30 Days ▼ ]
```

---

# 12. Insurer Monitoring KPI Cards

Show:

```text
Insurers
12

Active Policies
42,821

Claims Received
5,218

Settled
4,891

Denied
327

Settlement Ratio
93.7%

Average Settlement Time
2.4 days

SLA Breaches
17
```

These are simulated values.

---

# 13. Insurer Monitoring Graph 1 — Claims Lifecycle

Use a funnel or horizontal bar chart:

```text
Claims Received       5,218
        ↓
Eligible              4,930
        ↓
Authorized            4,700
        ↓
Settled               4,891
```

Prefer a more logically consistent dataset in the actual prototype so the numbers do not contradict each other.

Title:

```text
Claims Lifecycle
```

Purpose:

Show how claims move through the system.

---

# 14. Insurer Monitoring Graph 2 — Settlement Ratio

Use a horizontal bar chart:

```text
Settlement Ratio by Insurer

Green Delta       ███████████████████  94.2%
ABC Insurance     ██████████████████   91.8%
XYZ Insurance     █████████████████    89.7%
Delta Mutual      ███████████████████  95.1%
```

Use:

```text
Target / Network Average
```

as a reference marker.

---

# 15. Insurer Monitoring Graph 3 — Settlement Time

Use a line chart:

```text
Average Settlement Time

Days
5 |                 ●
4 |        ●     ●
3 |  ●  ●     ●
2 |
1 |
  +----------------------
    A    B    C    D
```

Title:

```text
Average Settlement Time by Insurer
```

Highlight insurers exceeding the configured SLA.

---

# 16. Insurer Monitoring Graph 4 — Denial Rate

Use a bar chart:

```text
Denial Rate

Insurer A   ███       8.2%
Insurer B   ███████   16.4%
Insurer C   ██        5.1%
Insurer D   █████     12.3%
```

Title:

```text
Denial Rate by Insurer
```

Do not automatically label high denial as misconduct.

Instead:

```text
REVIEW SIGNAL
```

---

# 17. Insurer Monitoring Graph 5 — Denial Reasons

Use a stacked bar or donut chart:

```text
Denial Reasons

Policy exclusion
Waiting period
Inactive policy
Benefit exhausted
Other
```

This directly demonstrates the whitepaper's requirement that denial reasons be published by category.

---

# 18. Insurer Monitoring Table

Below the charts:

```text
INSURER PERFORMANCE

Insurer
Green Delta Insurance PLC

Claims Received
1,248

Settled
1,173

Denied
75

Settlement Ratio
94.0%

Avg Settlement
2.1 days

SLA Breaches
2

Appeals
21

Appeals Overturned
4

Status
NORMAL

[ View Insurer ]
```

---

# 19. Insurer Detail

Click:

```text
[ View Insurer ]
```

Show:

```text
INSURER SUPERVISORY PROFILE

Green Delta Insurance PLC

License
IDRA-INS-001

Status
ACTIVE

Policies
12,821

Claims
1,248

Settled
1,173

Denied
75
```

Then sections:

```text
PERFORMANCE
CLAIMS
SETTLEMENT
DENIALS
APPEALS
TRANSPARENCY
```

---

# 20. Insurer Appeal Statistics

Show:

```text
APPEAL PERFORMANCE

Appeals Received
21

Resolved
18

Upheld
14

Overturned
4

Overturn Rate
22.2%
```

Purpose:

Detect persistent over-denial patterns.

The whitepaper explicitly uses independent appeals and published denial statistics as the mechanism against insurer over-denial.

---

# 21. Insurer SLA Monitoring

Show:

```text
SETTLEMENT SLA

Target
≤ 3 days

Current Average
2.1 days

Breaches
2

Status
✓ Within SLA
```

For a bad insurer:

```text
Target
≤ 3 days

Current Average
5.4 days

Breaches
19

Status
⚠ SLA BREACH
```

The breach should appear in the insurer's supervisory record.

---

# 22. Provider Monitoring

Route:

```text
/regulator/providers
```

Purpose:

> Monitor provider accreditation, event activity, attestation behavior, duplicate attempts, and anomaly signals.

The whitepaper describes provider accreditation as a revocable credential with permanent visible history.

---

# 23. Provider Monitoring Header

```text
PROVIDER MONITORING

Provider accreditation & behavioral oversight

[ All Providers ▼ ]

[ Normal | Elevated | High ]
```

---

# 24. Provider KPI Cards

```text
Accredited Providers
482

Active Providers
467

Suspended
8

De-accredited
7

Events Asserted
5,218

Duplicate Attempts
37

Anomaly Flags
12
```

---

# 25. Provider Graph 1 — Event Volume

Horizontal bar chart:

```text
EVENT VOLUME BY PROVIDER

ABC Upazila Health Complex   █████████████████ 428
XYZ District Hospital       ███████████████   391
DEF Medical Centre          █████████          212
GHI Hospital                ███████            174
```

Allow:

```text
Top 5
Top 10
All
```

---

# 26. Provider Graph 2 — Duplicate Attempt Rate

Bar chart:

```text
DUPLICATE ATTEMPT RATE

Provider A   ███████  3.2%
Provider B   ██       1.1%
Provider C   █        0.7%
Provider D   █        0.5%
```

Important:

This is a **review signal**, not a fraud verdict.

---

# 27. Provider Graph 3 — Verification Outcomes

Use a stacked bar chart:

```text
VERIFICATION OUTCOMES

Provider A
████████████████████████
Verified | Rejected | Pending

Provider B
██████████████████████
Verified | Rejected | Pending
```

Purpose:

Identify unusual verification/rejection patterns.

---

# 28. Provider Graph 4 — Provider/Verifier Pairing

Use a heatmap or matrix:

```text
PROVIDER × VERIFIER ACTIVITY

              V-01  V-02  V-03  V-04
Provider A     82    11     4     2
Provider B      3    77    15     1
Provider C     45     1     2     0
```

This is particularly valuable because the whitepaper identifies provider–verifier collusion as the main residual fraud risk.

The purpose is to identify suspiciously concentrated pairings.

---

# 29. Provider Graph 5 — Failed Attestation Trend

Line chart:

```text
FAILED ATTESTATIONS OVER TIME

Provider A
Jan → Feb → Mar → Apr → May
 2     3     5     9     12
```

Purpose:

Show whether a provider's verification quality is deteriorating.

---

# 30. Provider Graph 6 — Accreditation Status

Donut chart:

```text
ACCREDITATION STATUS

Active
Suspended
De-accredited
```

---

# 31. Provider Monitoring Table

```text
PROVIDER RISK SIGNALS

Provider
ABC Upazila Health Complex

Accreditation
ACTIVE

Events
428

Verified
412

Duplicate Attempts
14

Duplicate Rate
3.27%

Failed Attestations
9

Verifier Concentration
HIGH

Anomaly
ELEVATED

[ Review Provider ]
```

---

# 32. Provider Detail

Click:

```text
[ Review Provider ]
```

Show:

```text
PROVIDER SUPERVISORY PROFILE

ABC Upazila Health Complex

Provider ID
PRV-00142

DGHS Registration
DGHS-XXXX

Accreditation
ACTIVE

Accredited Since
2026-01-12

Events Asserted
428

Events Verified
412

Duplicate Attempts
14

Failed Attestations
9
```

Then:

```text
ACTIVITY TREND
```

```text
ATTESTATION QUALITY
```

```text
VERIFIER PAIRING
```

```text
APPEAL / REJECTION HISTORY
```

---

# 33. Provider Anomaly Review

Show:

```text
ANOMALY REVIEW

Signal
Unusually concentrated provider–verifier pairing

Observed
Verifier V-03 participated in 61%
of this provider's attestations.

Network baseline
18%

Signal
HIGH
```

Then:

```text
Recommended supervisory action

○ No action
○ Monitor
○ Request audit sample
○ Suspend pending review
```

The prototype does not automatically de-accredit a provider merely because an anomaly score is high.

---

# 34. Provider Accreditation Action

For a sufficiently serious simulated case:

```text
ACCREDITATION STATUS

ACTIVE
```

Button:

```text
[ Suspend Provider ]
```

Confirmation modal:

```text
SUSPEND PROVIDER?

This prevents new endorsements while
preserving historical records.

Reason
[ __________________ ]

[ Confirm Suspension ]
```

After confirmation:

```text
PROVIDER SUSPENDED ✓

New endorsements
BLOCKED

Historical records
PRESERVED
```

The whitepaper states that suspension revokes the member credential without deleting historical signatures, and that de-accreditation history is permanent.

---

# 35. Audit Channel Logs

Route:

```text
/regulator/audit
```

Purpose:

> Give IDRA a chronological supervisory view of important network events.

This should NOT be a raw blockchain explorer.

It should be a readable regulatory audit timeline.

---

# 36. Audit Channel Header

```text
AUDIT CHANNEL LOGS

Immutable supervisory event history

Channel
audit-channel

Current anchor
VERIFIED ✓

Last update
2026-09-03 18:21:04
```

---

# 37. Audit Filters

Add:

```text
Event Type
[ All ▼ ]

Stakeholder
[ All ▼ ]

Date
[ All ▼ ]

Status
[ All ▼ ]
```

Event types:

```text
EVENT_CREATED
ATTESTATION_RECORDED
QUORUM_REACHED
ENTITLEMENT_AUTHORIZED
ENTITLEMENT_DENIED
SETTLEMENT_CONFIRMED
APPEAL_SUBMITTED
APPEAL_RESOLVED
PROVIDER_SUSPENDED
PROVIDER_DEACCREDITED
ANCHOR_PUBLISHED
SLA_BREACH
```

---

# 38. Audit Timeline

Example:

```text
18:21:04

ANCHOR_PUBLISHED

Transparency period
2026-09

Merkle Root
0x7a8c...91ef

Status
✓ Published
```

Then:

```text
18:18:32

APPEAL_RESOLVED

APL-4992

Decision
OVERTURNED

Entitlement
ENT-9592
```

Then:

```text
18:12:09

SLA_BREACH

Insurer
ABC Insurance

Settlement delay
5.8 days

Threshold
3 days
```

---

# 39. Audit Record Detail

Click an audit record:

```text
AUDIT RECORD

Record ID
AUD-88291

Type
APPEAL_RESOLVED

Entity
APL-4992

Actor Class
Independent Tribunal

Timestamp
2026-09-03 18:18:32

Previous State
UNDER_REVIEW

New State
OVERTURNED

Evidence Hash
0x91ab...73fe
```

Sensitive clinical evidence should not be displayed here.

The architecture keeps sensitive evidence off-chain and records hashes/access envelopes rather than protected health information.

---

# 40. Transparency Anchor Section

At the top or bottom of Audit Channel Logs:

```text
PUBLIC ANCHOR

Period
September 2026

Merkle Root
0x7a8c...91ef

Published
✓

External Anchor
Polygon / OpenTimestamps
SIMULATED

Verification
✓ MATCH
```

Button:

```text
[ Verify Anchor ]
```

Then:

```text
ANCHOR VERIFIED ✓

The published aggregate root matches
the simulated audit-period record.

This demonstrates external anchoring,
not a live blockchain transaction.
```

---

# 41. Audit Graph — Events Over Time

Use a line/area chart:

```text
NETWORK EVENTS

Events
|
|       ●
|    ●     ●
|  ●         ●
|●
+----------------
 Jan Feb Mar Apr
```

Purpose:

Give IDRA a high-level view of network activity.

---

# 42. Audit Graph — Event Types

Use a bar chart:

```text
AUDIT EVENTS BY TYPE

Attestations          ███████████████████
Events                 ███████████
Settlements            █████████
Appeals                ███
SLA Breaches           ██
Provider Actions       █
```

---

# 43. Regulator Overview — Improve Existing Page

Your current Overview page already has:

```text
Minimum Consensus Class Quorum
3

Authority Dispersion Index
0.14

Consortium Validator Nodes
5 / 5
```

Keep these.

Add a second row of operational KPIs:

```text
ACTIVE INSURERS
12

ACTIVE PROVIDERS
467

OPEN EVENTS
38

ELIGIBLE ENTITLEMENTS
24

PENDING APPEALS
1

SLA BREACHES
7
```

---

# 44. Overview Graph 1 — Network Health

Use a simple status chart:

```text
NETWORK HEALTH

Validator Nodes       5 / 5       ✓
Audit Channel         Online      ✓
Anchor Status         Verified    ✓
API Connections       18 / 18     ✓
SLA Compliance        96.4%       ✓
```

---

# 45. Overview Graph 2 — Network Claims Trend

Line chart:

```text
CLAIMS ACTIVITY

Claims Received
Claims Settled
Claims Denied
```

Use one chart with three series.

---

# 46. Overview Graph 3 — Stakeholder Governance Weights

Use a donut/bar visualization based on the whitepaper:

```text
Insurers collectively       30%
IDRA                         20%
MFI / NGO                    20%
Provider Association         15%
Academic Auditor             15%
```

The existing page already presents these weights.

Also display:

```text
Nakamoto Coefficient
3

Gini Coefficient
0.14
```

---

# 47. Governance Interpretation Card

Add:

```text
DECENTRALIZATION BOUND MET ✓

No stakeholder class exceeds the 30% cap.

At least three distinct stakeholder classes
are required to reach a majority of validation
weight.

Current simulated values:
Nakamoto Coefficient = 3
Gini Coefficient = 0.14
```

This makes the numbers understandable instead of merely decorative.

---

# 48. Regulator Alert Center

Place a small alert panel on Overview:

```text
SUPERVISORY ALERTS

⚠ 3 insurers exceeded settlement SLA

⚠ 2 providers have elevated anomaly signals

⚠ 1 appeal awaiting decision

✓ September anchor verified

✓ Validator nodes operational
```

Clicking an alert navigates to the appropriate page.

---

# 49. Regulator Dashboard Cross-Portal Flow

The regulator pages should consume the same simulation state as the other portals.

Example:

```text
PROVIDER PORTAL
     ↓
Event created
     ↓
VERIFIER PORTAL
     ↓
2-of-3 quorum
     ↓
INSURER PORTAL
     ↓
Entitlement denied
     ↓
POLICYHOLDER
     ↓
Appeal submitted
     ↓
REGULATOR PORTAL
     ↓
Appeals Tribunal
     ↓
Appeal overturned
     ↓
RESOLVED APPEALS
     ↓
AUDIT CHANNEL LOG
     ↓
Insurer statistics update
```

This is essential for the prototype.

The regulator should appear to be observing the same network, not a separate fake database.

---

# 50. Shared State Updates

When an insurer denies:

```text
entitlement.status = DENIED
```

Regulator should automatically show:

```text
Insurer Monitoring
+1 denial
```

When a policyholder appeals:

```text
appeal.status = SUBMITTED
```

Regulator should show:

```text
Appeals Tribunal
+1 active appeal
```

When tribunal resolves:

```text
appeal.status = OVERTURNED
```

Regulator should show:

```text
Active Appeals
-1

Resolved Appeals
+1

Insurer overturned count
+1

Audit logs
+1 APPEAL_RESOLVED
```

If overturned:

```text
entitlement.status = REINSTATED
```

and the insurer can continue toward settlement.

---

# 51. Data Visibility Rules

The regulator should NOT become a page where every clinical record is visible.

Show:

```text
IDs
Statuses
Timestamps
Aggregate statistics
Attestation classes
Provider accreditation
Denial codes
Settlement information
Appeal decisions
Hashes
Audit records
```

Do NOT show:

```text
Clinical notes
Medical images
Detailed diagnosis documents
Biometric templates
Raw NID
Private medical evidence
```

The architecture explicitly keeps protected health information off the ledger.

---

# 52. React Page Structure

Recommended:

```text
src/
├── pages/
│   └── regulator/
│       ├── IDRAOverview.tsx
│       ├── InsurerMonitoring.tsx
│       ├── InsurerDetail.tsx
│       ├── ProviderMonitoring.tsx
│       ├── ProviderDetail.tsx
│       ├── AppealsTribunal.tsx
│       ├── AppealReview.tsx
│       ├── ResolvedAppeals.tsx
│       └── AuditChannelLogs.tsx
│
├── components/
│   ├── regulator/
│   │   ├── RegulatoryKPI.tsx
│   │   ├── SupervisoryAlert.tsx
│   │   ├── InsurerPerformanceTable.tsx
│   │   ├── ProviderRiskTable.tsx
│   │   ├── AppealCard.tsx
│   │   ├── AppealDecisionPanel.tsx
│   │   ├── AuditTimeline.tsx
│   │   ├── AuditRecord.tsx
│   │   ├── AnchorStatus.tsx
│   │   └── GovernanceCard.tsx
│   │
│   └── charts/
│       ├── ClaimsLifecycleChart.tsx
│       ├── SettlementRatioChart.tsx
│       ├── SettlementTimeChart.tsx
│       ├── DenialRateChart.tsx
│       ├── DenialReasonChart.tsx
│       ├── ProviderVolumeChart.tsx
│       ├── DuplicateRateChart.tsx
│       ├── VerificationOutcomeChart.tsx
│       ├── ProviderVerifierHeatmap.tsx
│       ├── NetworkClaimsTrend.tsx
│       └── GovernanceWeightChart.tsx
```

---

# 53. Simulation Functions

The existing shared simulation engine should expose:

```typescript
resolveAppeal()
suspendProvider()
deaccreditProvider()
publishTransparency()
verifyAnchor()
recordAuditEvent()
```

Existing functions should remain:

```typescript
openEvent()
continueEvent()
attestEvent()
checkQuorum()
createEntitlement()
authorizeSettlement()
processPayment()
reconcilePayment()
denyEntitlement()
submitAppeal()
```

---

# 54. Appeal State Model

Use:

```typescript
type AppealStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "AWAITING_DECISION"
  | "UPHELD"
  | "OVERTURNED";
```

Example:

```typescript
type Appeal = {
  id: string;
  entitlementId: string;
  insurerId: string;

  originalDecision: "DENIED";

  status: AppealStatus;

  grounds: string;

  panel: {
    clinician: boolean;
    consumerRepresentative: boolean;
    idraRepresentative: boolean;
  };

  decisionReason?: string;

  submittedAt: string;
  resolvedAt?: string;
};
```

---

# 55. Provider Risk Model

```typescript
type ProviderRiskLevel =
  | "NORMAL"
  | "ELEVATED"
  | "HIGH";

type ProviderAnalytics = {
  providerId: string;

  eventsAsserted: number;
  eventsVerified: number;

  duplicateAttempts: number;
  duplicateRate: number;

  failedAttestations: number;

  verifierConcentration: number;

  riskLevel: ProviderRiskLevel;
};
```

---

# 56. Audit Record Model

```typescript
type AuditRecord = {
  id: string;

  type:
    | "EVENT_CREATED"
    | "ATTESTATION_RECORDED"
    | "QUORUM_REACHED"
    | "ENTITLEMENT_AUTHORIZED"
    | "ENTITLEMENT_DENIED"
    | "SETTLEMENT_CONFIRMED"
    | "APPEAL_SUBMITTED"
    | "APPEAL_RESOLVED"
    | "PROVIDER_SUSPENDED"
    | "PROVIDER_DEACCREDITED"
    | "ANCHOR_PUBLISHED"
    | "SLA_BREACH";

  entityId: string;

  actorClass: string;

  timestamp: string;

  previousState?: string;
  newState?: string;

  evidenceHash?: string;
};
```

---

# 57. Important UI Principle

Do not make the regulator portal look like:

```text
BLOCKCHAIN EXPLORER
```

It should look like:

```text
REGULATORY CONTROL CENTER
```

The blockchain/audit mechanism should be visible underneath the operational interpretation.

For example:

Bad:

```text
0x7a8c9f3...
Block 812921
Tx 0x912...
```

Better:

```text
SEPTEMBER TRANSPARENCY ANCHOR

Status
✓ VERIFIED

Merkle Root
0x7a8c...91ef

Records Included
5,218

[ View Technical Proof ]
```

---

# 58. Complete Regulator Story

## Scene 1 — Network Overview

IDRA opens:

```text
IDRA Overview
```

Sees:

```text
5 / 5 validators
Nakamoto = 3
Gini = 0.14
```

Network healthy.

---

## Scene 2 — Insurer Problem

Dashboard reports:

```text
⚠ ABC Insurance
Settlement SLA breach
```

IDRA clicks:

```text
Insurer Monitoring
```

Then:

```text
ABC Insurance
Average settlement: 5.4 days
Target: ≤ 3 days
```

---

## Scene 3 — Provider Anomaly

IDRA notices:

```text
⚠ ABC Upazila Health Complex
Elevated anomaly
```

Clicks:

```text
Provider Monitoring
```

Sees:

```text
Duplicate attempts
Verifier concentration
Failed attestations
```

---

## Scene 4 — Denial

An insurer denies:

```text
ENT-9592
```

The denial appears in:

```text
Insurer Monitoring
```

and:

```text
Denial Statistics
```

---

## Scene 5 — Appeal

Policyholder submits:

```text
APL-4992
```

It appears under:

```text
Appeals Tribunal
→ Active Appeals
```

---

## Scene 6 — Tribunal Decision

IDRA opens:

```text
APL-4992
```

Reviews:

```text
Original denial
Appeal grounds
Panel
Conflict check
```

Then records:

```text
OVERTURNED
```

---

## Scene 7 — Appeal Moves

Immediately:

```text
Active Appeals
APL-4992 disappears
```

and:

```text
Resolved Appeals
APL-4992 appears
```

with:

```text
OVERTURNED
```

---

## Scene 8 — Audit Record

IDRA clicks:

```text
View Audit Record
```

and sees:

```text
APPEAL_RESOLVED
APL-4992
Previous: UNDER_REVIEW
New: OVERTURNED
Timestamp
Decision hash
```

---

## Scene 9 — Insurer Statistics Change

The insurer's monitoring page updates:

```text
Appeals
21

Overturned
4
```

and the insurer's published transparency statistics update accordingly.

---

## Scene 10 — Anchor

At the end of the period:

```text
Transparency aggregate
        ↓
Merkle root
        ↓
Public anchor
        ↓
IDRA verifies
```

The audit page shows:

```text
ANCHOR VERIFIED ✓
```

---

# 59. Final Page Map

The completed regulator portal should therefore be:

```text
IDRA REGULATOR PORTAL
│
├── IDRA Overview
│   ├── Governance KPIs
│   ├── Network KPIs
│   ├── Claims trend
│   ├── Governance weights
│   └── Supervisory alerts
│
├── Insurer Monitoring
│   ├── Network insurer KPIs
│   ├── Settlement ratio graph
│   ├── Settlement time graph
│   ├── Denial rate graph
│   ├── Denial reasons
│   ├── SLA monitoring
│   └── Insurer detail
│
├── Provider Monitoring
│   ├── Accreditation KPIs
│   ├── Event volume graph
│   ├── Duplicate rate graph
│   ├── Verification outcomes
│   ├── Provider/verifier heatmap
│   ├── Failed attestation trend
│   ├── Risk signals
│   └── Provider detail
│
├── Appeals Tribunal
│   ├── Active Appeals
│   ├── Appeal Review
│   ├── Tribunal Decision
│   └── Resolved Appeals
│
└── Audit Channel Logs
    ├── Audit timeline
    ├── Filters
    ├── Record details
    ├── Event-type analytics
    ├── Anchor status
    └── Verify Anchor
```

---

# 60. Definition of Done

## IDRA Overview

```text
✓ Existing governance cards
✓ Network KPIs
✓ Claims trend
✓ Governance weight graph
✓ Supervisory alerts
```

## Insurer Monitoring

```text
✓ Insurer table
✓ Settlement ratio graph
✓ Settlement time graph
✓ Denial rate graph
✓ Denial reason graph
✓ SLA monitoring
✓ Insurer detail
✓ Appeal statistics
```

## Provider Monitoring

```text
✓ Provider table
✓ Event volume graph
✓ Duplicate-rate graph
✓ Verification outcomes
✓ Provider/verifier heatmap
✓ Failed attestation trend
✓ Risk levels
✓ Provider detail
✓ Accreditation action
```

## Appeals

```text
✓ Active queue
✓ Appeal review
✓ Panel composition
✓ Conflict check
✓ Uphold
✓ Overturn
✓ Resolved Appeals tab
✓ Resolved decision detail
✓ Link to audit record
```

## Audit

```text
✓ Audit timeline
✓ Filters
✓ Audit record detail
✓ Anchor status
✓ Verify Anchor
✓ Event-type graph
✓ Network activity graph
```

---

# 61. Most Important Prototype Behavior

The regulator portal should visibly demonstrate this chain:

```text
OBSERVE
  ↓
DETECT
  ↓
INVESTIGATE
  ↓
ACT
  ↓
RECORD
  ↓
PUBLISH
  ↓
VERIFY
```

For example:

```text
Provider anomaly
      ↓
IDRA detects it
      ↓
Provider detail
      ↓
Supervisory action
      ↓
Action recorded
      ↓
Audit channel
      ↓
Transparency
```

And for appeals:

```text
Insurer denial
      ↓
Policyholder appeal
      ↓
Independent tribunal
      ↓
Decision
      ↓
Resolved Appeals
      ↓
Audit record
      ↓
Insurer transparency statistics
```

That is the regulator story the prototype should communicate.
