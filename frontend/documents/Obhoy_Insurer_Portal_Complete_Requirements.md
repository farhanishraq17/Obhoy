# Obhoy — Insurer Portal Complete Frontend Specification

## Purpose

This document specifies the complete **Insurer Portal** for the Obhoy frontend-only prototype.

The prototype does not implement real Hyperledger Fabric, insurer APIs, HSMs, NID services, bKash/Nagad/Rocket APIs, or real blockchain transactions. It simulates their observable behavior so the BCOLBD demonstration can show the complete workflow.

The insurer-side lifecycle is:

```text
CLOSED_ELIGIBLE EVENT
        ↓
Review
        ↓
Entitlement / Adjudication
        ↓
AUTHORIZE or DENY
        ↓
Settlement
        ↓
MFS Payment
        ↓
CONFIRMED / UNKNOWN
        ↓
Reconciliation when required
        ↓
Transparency / Analytics
```

The whitepaper separates the real-world event from the insurer-specific entitlement. It also defines the claim path as event assertion, independent attestation, 2-of-3 quorum, entitlement authorization, off-ledger disbursement, and transparency publication. fileciteturn26file10

---

# 1. Existing Insurer Navigation

Keep the current sidebar:

```text
PORTAL NAVIGATION

▥ Insurer Dashboard
≡ Eligible Events Queue
▣ Settlement Processing
▦ Provider Analytics
```

Do **not** add adjudication as a permanent sidebar item.

Adjudication should be a detail page/modal opened from the Eligible Events Queue.

Recommended routes:

```text
/insurer/dashboard
/insurer/events
/insurer/events/:eventId
/insurer/entitlements/:entitlementId
/insurer/settlements
/insurer/settlements/:settlementId
/insurer/providers
```

---

# 2. Critical Domain Distinction

The UI must never treat an Event and an Entitlement as the same object.

## Event

```text
EVT-8187
```

Represents:

> The real-world insurable episode.

## Entitlement

```text
ENT-9592
```

Represents:

> A particular policy's financial entitlement against that event.

Example:

```text
EVT-8187
    │
    ├── ENT-9592
    │     Policy: POL-1001
    │     Amount: BDT 50,000
    │
    └── ENT-9641
          Policy: POL-2001
          Amount: BDT 20,000
```

This is important because settlement consumes the entitlement while the event can remain open for another legitimate policy. fileciteturn26file10

---

# 3. Shared Frontend Simulation State

All insurer pages must read and modify one shared simulation state.

Recommended:

```text
simulationStore
├── events
├── entitlements
├── settlements
├── providers
├── attestations
├── appeals
├── transparencyRecords
└── timeline
```

Example:

```text
Provider creates event
        ↓
Insurer queue updates
        ↓
Insurer authorizes
        ↓
Settlement page updates
        ↓
Dashboard KPIs update
        ↓
Analytics update
```

Do not hardcode independent data into every page.

---

# 4. Event State Machine

```text
OPEN
  ↓
ATTESTATIONS
  ↓
CLOSED_ELIGIBLE
```

Exceptional states:

```text
DUPLICATE_REJECTED
TRANSFERRED
```

---

# 5. Entitlement State Machine

```text
OPEN
  ├──→ AUTHORIZED
  │       ↓
  │   SETTLEMENT_PENDING
  │       ↓
  │   PAYMENT_PROCESSING
  │       ↓
  │     SETTLED
  │
  └──→ DENIED
          ↓
       APPEALED
```

---

# 6. Payment State Machine

Normal path:

```text
READY
  ↓
SUBMITTED
  ↓
PROCESSING
  ↓
CONFIRMED
```

Scenario 7:

```text
PROCESSING
     ↓
   UNKNOWN
     ↓
RECONCILING
     ↓
CONFIRMED / FAILED
```

---

# 7. Page 1 — Insurer Dashboard

## Purpose

The dashboard is the insurer's command center.

It should answer:

> What needs my attention right now?

It should provide overview information, not every claim detail.

---

## 7.1 Header

```text
INSURER DASHBOARD

Green Delta Insurance PLC

Claims & settlement overview
September 2026

● Operational
```

---

## 7.2 KPI Cards

Show:

```text
Eligible Events       24
Pending Review         8
Authorized            12
Settled                9
Denied                 3
Payment Issues         1
```

Each card should be clickable and lead to the relevant queue.

---

# 8. Dashboard Graph 1 — Claim Lifecycle

Use a horizontal bar/funnel visualization:

```text
EVENTS
120
 ↓
CLOSED_ELIGIBLE
94
 ↓
ADJUDICATED
82
 ↓
AUTHORIZED
70
 ↓
SETTLED
66
```

Title:

```text
Claim Lifecycle
```

Purpose:

Show where claims move through the insurer workflow and where they stop.

---

# 9. Dashboard Graph 2 — Settlement Trend

Use a line chart.

X-axis:

```text
Mar Apr May Jun Jul Aug Sep
```

Y-axis:

```text
Settlements
```

Add filters:

```text
7D | 30D | 90D
```

Purpose:

Show settlement activity over time.

---

# 10. Dashboard Graph 3 — Entitlement Outcomes

Use a donut chart:

```text
AUTHORIZED
DENIED
PENDING
```

Example mock values:

```text
Authorized   70%
Denied       18%
Pending      12%
```

These must be clearly treated as prototype data.

---

# 11. Dashboard — Needs Attention

Below the charts:

```text
NEEDS ATTENTION

ENT-9592
Pending adjudication
BDT 50,000
[ Review ]

SET-9415
Payment outcome unknown
BDT 50,000
[ Reconcile ]

ENT-9587
Appeal submitted
[ Review ]
```

---

# 12. Page 2 — Eligible Events Queue

This is the insurer's main work queue.

Your current implementation is close, but change:

```text
[ Authorize BDT 50,000 ]
```

to:

```text
[ Review Claim ]
```

The insurer should review/adjudicate before authorization.

---

# 13. Eligible Event Card

Each card should show:

```text
ENT-9592

PENDING ADJUDICATION

Event
EVT-8187

Policy
POL-1001

Benefit
Hospitalization

Eligible Benefit
BDT 50,000

Verification
2 / 3 ✓

Event
CLOSED_ELIGIBLE ✓

[ Review Claim ]
```

---

# 14. Queue Filters

Add:

```text
Status
[ All ▼ ]

Coverage
[ All ▼ ]

Date
[ Last 30 days ▼ ]

Amount
[ All ▼ ]
```

Status options:

```text
PENDING
AUTHORIZED
DENIED
SETTLED
APPEALED
```

---

# 15. Queue Search

Add:

```text
Search Event / Entitlement / Policy ID
[ __________________________ ]
```

Do not make raw NID searchable here.

---

# 16. Page 3 — Entitlement Review / Adjudication

Click:

```text
[ Review Claim ]
```

Open:

```text
/insurer/entitlements/ENT-9592
```

This is the most important missing insurer page.

---

# 17. Adjudication Header

```text
ENTITLEMENT REVIEW

ENT-9592

PENDING ADJUDICATION

Event
EVT-8187

Policy
POL-1001
```

---

# 18. Event Verification Summary

Show:

```text
EVENT VERIFICATION

Event status
CLOSED_ELIGIBLE ✓

Provider
ABC Upazila Health Complex

Provider accreditation
ACTIVE ✓

ATTESTATIONS

Provider           ✓
Clinical Verifier  ✓
Field Verifier     —

Quorum
2 / 3 ✓

Non-payee class
✓
```

The whitepaper specifies a 2-of-3 quorum among Provider, Clinical Verifier and Field Verifier, with at least one non-payee class. fileciteturn26file10

---

# 19. Verification Timeline

Create a reusable component:

```text
✓ Event asserted
      ↓
✓ Provider authenticated
      ↓
✓ Uniqueness checked
      ↓
✓ Provider attestation
      ↓
✓ Clinical attestation
      ↓
✓ 2-of-3 quorum
      ↓
✓ Event CLOSED_ELIGIBLE
```

Button:

```text
[ View Technical Details ]
```

This opens a drawer explaining the simulated protocol state.

---

# 20. Policy Information

Show:

```text
POLICY

Policy ID
POL-1001

Status
ACTIVE ✓

Coverage
Hospitalization

Benefit Schedule
Version 1.2

Maximum Benefit
BDT 50,000
```

---

# 21. Eligibility Result

Prominent card:

```text
ELIGIBILITY CHECK

✓ Policy active
✓ Covered category
✓ Event verified
✓ Quorum satisfied
✓ Benefit schedule found

Eligible Amount

BDT 50,000
```

Important:

> Being verified does not automatically mean the insurer pays. The insurer still performs adjudication.

---

# 22. Adjudication Decision

Show:

```text
ADJUDICATION

Decision

○ Authorize entitlement
○ Deny entitlement
```

If authorize:

```text
Eligible Amount
BDT 50,000

[ Authorize BDT 50,000 ]
```

If deny:

```text
Denial Reason
[ Select reason ▼ ]

Explanation
[ __________________________ ]

[ Deny Entitlement ]
```

---

# 23. Authorization Result

After authorization:

```text
ENTITLEMENT AUTHORIZED ✓

ENT-9592

Amount
BDT 50,000

Policy
POL-1001

Settlement
PENDING

[ Process Settlement ]
```

Update shared simulation state so:

```text
Pending Review
↓
Authorized
```

and Settlement Processing immediately sees the new settlement.

---

# 24. Denial Result

After denial:

```text
ENTITLEMENT DENIED

ENT-9592

Reason
Policy exclusion

Status
DENIED

Policyholder notification
✓ Simulated

[ View Claim ]
[ Request Appeal ]
```

The denial remains in history. It is not deleted.

The existing Obhoy flow includes denial and appeal as explicit scenarios. fileciteturn26file0

---

# 25. Page 4 — Settlement Processing

Your current implementation is structurally correct.

Expand it to show the complete payment state.

---

## 25.1 Settlement Header

```text
MFS PAYMENT RAIL EXECUTION

Mobile Disbursement

Settlement ID
SET-9415

Entitlement
ENT-9592

Event
EVT-8187
```

---

# 26. Settlement Details

```text
Recipient Mobile
+880 1712-345678

Disbursement Amount
BDT 50,000

Payment Rail
bKash

Status
READY
```

Label this clearly as:

```text
DEMO / SIMULATED
```

---

# 27. Idempotency Section

Add:

```text
PAYMENT SAFETY

Idempotency Key
IDEMP-ENT-9592

Purpose
Prevents duplicate disbursement when
the same payment request is retried.
```

Do not expose real cryptographic secrets.

---

# 28. Payment State Stepper

Normal:

```text
AUTHORIZED ✓
     ↓
SUBMITTED ✓
     ↓
PROCESSING ✓
     ↓
CONFIRMED ✓
```

Scenario 7:

```text
AUTHORIZED ✓
     ↓
SUBMITTED ✓
     ↓
PROCESSING ✓
     ↓
UNKNOWN ⚠
     ↓
RECONCILIATION
     ↓
CONFIRMED ✓
```

---

# 29. Successful Payment

Button:

```text
[ Execute bKash Disbursement ]
```

After click:

```text
PAYMENT REQUEST SUBMITTED ✓

Settlement
SET-9415

Gateway
bKash

Status
PROCESSING
```

Then:

```text
PAYMENT CONFIRMED ✓

Transaction Reference
TXN-849221

Amount
BDT 50,000

Recipient
+880 1712-345678

Status
SETTLED
```

---

# 30. Scenario 7 — Payment Outcome Unknown

Scenario 7 is:

```text
Insurer authorizes
        ↓
Payment request sent
        ↓
Gateway times out
        ↓
System cannot determine
whether payment succeeded
```

This is NOT the same as:

```text
Payment failed
```

The correct UI is:

```text
PAYMENT OUTCOME UNKNOWN ⚠

Settlement
SET-9415

Request
Submitted ✓

Gateway response
TIMEOUT

Payment state
UNKNOWN

⚠ DO NOT RETRY BLINDLY
```

Then:

```text
[ Reconcile Payment ]
```

The existing website-flow specification describes exactly this Scenario 7: unknown payment outcome followed by reconciliation, rather than an immediate blind retry. fileciteturn26file0

---

# 31. Scenario 7 — Reconciliation

Click:

```text
[ Reconcile Payment ]
```

Show:

```text
PAYMENT RECONCILIATION

Settlement ID
SET-9415

Idempotency Key
IDEMP-ENT-9592

Original Amount
BDT 50,000

Checking gateway state...
```

Then simulate:

```text
GATEWAY RECORD FOUND ✓

Transaction Reference
TXN-849221

Amount
BDT 50,000

Gateway Status
SUCCESS
```

Finally:

```text
SETTLEMENT CONFIRMED ✓

No duplicate payment was created.
```

---

# 32. Scenario 7 — Alternative Outcome

Also implement an optional alternative:

```text
Gateway Record
NOT FOUND

Payment
NOT CONFIRMED
```

Then:

```text
SETTLEMENT FAILED

Safe retry permitted.

[ Retry Payment ]
```

This makes the reason for reconciliation obvious.

---

# 33. Payment History

Show a timeline:

```text
09:31:02
Request created

09:31:04
Submitted to bKash

09:31:34
Gateway timeout

09:32:11
Reconciliation initiated

09:32:13
Transaction found

09:32:13
SETTLED
```

Reuse the same timeline component used in the adjudication page.

---

# 34. Page 5 — Provider Analytics

This page demonstrates the whitepaper's **off-chain anomaly scoring**.

The whitepaper places anomaly scoring outside the blockchain layer. fileciteturn26file10

Purpose:

> Identify unusual provider patterns that deserve human review.

Do NOT make the analytics page declare fraud automatically.

---

# 35. Provider Analytics Header

```text
PROVIDER ANALYTICS

Monitor provider activity,
verification patterns and anomalies.

Period
[ Last 30 days ▼ ]
```

---

# 36. Provider KPI Cards

```text
Providers Monitored
128

Events Asserted
5,218

Events Verified
4,891

Duplicate Attempts
37

Anomaly Flags
12

Average Settlement Time
2.4 days
```

---

# 37. Graph 1 — Event Volume by Provider

Use a horizontal bar chart.

Example:

```text
Event Volume

ABC Upazila Health Complex  █████████████████ 428
XYZ District Hospital      ███████████████   391
DEF Medical Centre         █████████          212
GHI Hospital               ███████            174
```

Title:

```text
Event Volume by Provider
```

Filter:

```text
Top 5 | Top 10 | All
```

---

# 38. Graph 2 — Duplicate Attempt Rate

Use a bar chart.

Example:

```text
Duplicate Attempts / 100 Events

ABC Hospital       ███████  3.2%
XYZ Hospital       ██       1.1%
DEF Hospital       █        0.7%
GHI Hospital       █        0.5%
```

Title:

```text
Duplicate Attempt Rate
```

Important wording:

```text
Duplicate attempt
```

NOT:

```text
Fraud
```

---

# 39. Graph 3 — Verification Outcomes

Use a stacked bar chart.

For each provider:

```text
Provider A
████████████████████████
Verified | Denied | Pending

Provider B
██████████████████
Verified | Denied | Pending
```

Title:

```text
Verification Outcomes by Provider
```

---

# 40. Graph 4 — Settlement Time Distribution

Use a histogram.

X-axis:

```text
<1 day
1–2 days
2–3 days
3–5 days
>5 days
```

Y-axis:

```text
Number of Entitlements
```

Title:

```text
Settlement Time Distribution
```

Purpose:

Show whether settlement is generally fast or becoming delayed.

---

# 41. Graph 5 — Events vs Eligible Events Over Time

Use a two-series line chart:

```text
Events Asserted
Events Becoming Eligible
```

Title:

```text
Event-to-Eligibility Pipeline
```

This demonstrates the relationship between provider assertions and successful verification/quorum.

---

# 42. Graph 6 — Denial Reasons

Use a donut or horizontal bar chart:

```text
Denial Reasons

Policy exclusion        42%
Inactive coverage       27%
Benefit exhausted       18%
Other                   13%
```

Title:

```text
Entitlement Denial Reasons
```

All values are mock prototype values.

---

# 43. Provider Anomaly Table

Below the graphs:

```text
PROVIDER RISK SIGNALS

Provider
ABC Upazila Health Complex

Events
428

Duplicate Attempts
14

Duplicate Rate
3.27%

Verification Rate
94.2%

Median Settlement
2.1 days

Anomaly
ELEVATED

[ Review Provider ]
```

Second example:

```text
XYZ District Hospital

Events
391

Duplicate Attempts
2

Duplicate Rate
0.51%

Anomaly
NORMAL
```

---

# 44. Anomaly Review

Click:

```text
[ Review Provider ]
```

Show:

```text
ANOMALY REVIEW

ABC Upazila Health Complex

Signal
Higher-than-baseline duplicate attempts

Observed
3.27%

Network baseline
0.84%

Signal strength
ELEVATED

Interpretation

Activity differs significantly from
the network baseline and may require
human review.

This is an automated signal,
not a fraud determination.
```

---

# 45. Provider Detail

Show:

```text
PROVIDER PROFILE

ABC Upazila Health Complex

Provider ID
PRV-00142

Accreditation
ACTIVE ✓

Events Asserted
428

Events Verified
412

Duplicate Attempts
14

Entitlements
391

Settlements
374
```

Then:

```text
ACTIVITY OVER TIME
```

Line chart.

And:

```text
EVENT OUTCOMES
```

Bar/donut chart.

---

# 46. Provider Comparison

Allow:

```text
Compare Providers

[ ABC Hospital ▼ ]

vs

[ XYZ Hospital ▼ ]
```

Table:

| Metric | Provider A | Provider B |
|---|---:|---:|
| Events | 428 | 391 |
| Verified | 412 | 376 |
| Duplicate attempts | 14 | 2 |
| Duplicate rate | 3.27% | 0.51% |
| Median settlement | 2.1 days | 2.4 days |

This makes the analytics page useful during the BCOLBD demonstration.

---

# 47. Analytics Disclaimer

Keep this visible:

```text
Analytics shown here are simulated prototype
signals intended for operational review.

They do not constitute a fraud determination.
```

---

# 48. Shared "Why?" Drawer

Create a reusable:

```text
WhyDrawer
```

Examples:

### Why is this event eligible?

```text
WHY?

The event reached CLOSED_ELIGIBLE because
the required 2-of-3 attestation quorum was met.

Provider       ✓
Clinical       ✓
Field          —

At least one non-payee class participated.
```

### Why is payment being reconciled?

```text
WHY?

The MFS gateway did not provide a definitive
response.

Retrying immediately could create a duplicate
payment.

The system checks the existing payment state
before retrying.
```

### Why was this provider flagged?

```text
WHY?

The provider's observed activity differs from
the network baseline.

This is an anomaly signal, not a fraud verdict.
```

---

# 49. Loading States

Important transitions should not happen instantly.

Examples:

```text
Checking event registry...
```

then:

```text
✓ Event verified
```

Payment:

```text
Contacting MFS gateway...
```

then:

```text
Gateway timeout
```

Analytics:

```text
Calculating provider signals...
```

then:

```text
Analysis complete
```

---

# 50. Notifications

Implement simulated toasts:

```text
✓ Entitlement authorized
```

```text
✓ Settlement submitted
```

```text
⚠ Payment outcome unknown
```

```text
✓ Payment reconciled
```

```text
✓ Entitlement denied
```

```text
⚠ Provider anomaly detected
```

---

# 51. Empty States

Eligible queue:

```text
NO ELIGIBLE EVENTS

All eligible events have been processed.

✓ Nothing requires attention
```

Settlement:

```text
NO PENDING SETTLEMENTS

There are currently no settlements
waiting for payment.
```

Analytics:

```text
NO ANOMALIES DETECTED

No provider activity currently exceeds
the configured review threshold.
```

---

# 52. React Component Structure

Recommended:

```text
src/
├── pages/
│   └── insurer/
│       ├── InsurerDashboard.tsx
│       ├── EligibleEvents.tsx
│       ├── EntitlementReview.tsx
│       ├── SettlementProcessing.tsx
│       ├── PaymentReconciliation.tsx
│       ├── ProviderAnalytics.tsx
│       └── ProviderDetail.tsx
│
├── components/
│   ├── insurer/
│   │   ├── ClaimQueueCard.tsx
│   │   ├── EntitlementSummary.tsx
│   │   ├── AdjudicationPanel.tsx
│   │   ├── SettlementCard.tsx
│   │   ├── PaymentStateStepper.tsx
│   │   ├── ReconciliationPanel.tsx
│   │   ├── ProviderAnalyticsTable.tsx
│   │   └── ProviderAnomalyCard.tsx
│   │
│   ├── charts/
│   │   ├── ClaimLifecycleChart.tsx
│   │   ├── SettlementTrendChart.tsx
│   │   ├── EntitlementOutcomeChart.tsx
│   │   ├── ProviderVolumeChart.tsx
│   │   ├── DuplicateRateChart.tsx
│   │   ├── SettlementTimeChart.tsx
│   │   └── DenialReasonChart.tsx
│   │
│   └── shared/
│       ├── StatusBadge.tsx
│       ├── VerificationTimeline.tsx
│       ├── WhyDrawer.tsx
│       ├── LoadingState.tsx
│       └── EmptyState.tsx
│
├── simulation/
│   ├── store.ts
│   ├── mockData.ts
│   ├── eventEngine.ts
│   ├── entitlementEngine.ts
│   ├── settlementEngine.ts
│   └── analyticsEngine.ts
│
└── types/
    └── insurer.ts
```

The existing implementation plan recommends a reusable simulation engine with functions such as `createEntitlement()`, `authorizeSettlement()`, `processPayment()`, `reconcilePayment()`, `denyEntitlement()`, and `publishTransparency()`. fileciteturn26file8

---

# 53. TypeScript Models

## Entitlement

```typescript
type EntitlementStatus =
  | "OPEN"
  | "AUTHORIZED"
  | "DENIED"
  | "SETTLEMENT_PENDING"
  | "SETTLED"
  | "APPEALED";

type Entitlement = {
  id: string;
  eventId: string;
  policyId: string;
  insurerId: string;

  benefitCategory: string;
  eligibleAmount: number;

  status: EntitlementStatus;

  denialReason?: string;

  createdAt: string;
  updatedAt: string;
};
```

## Settlement

```typescript
type PaymentStatus =
  | "READY"
  | "SUBMITTED"
  | "PROCESSING"
  | "UNKNOWN"
  | "RECONCILING"
  | "CONFIRMED"
  | "FAILED";

type Settlement = {
  id: string;
  entitlementId: string;

  amount: number;

  recipientMobile: string;
  paymentRail: "BKASH" | "NAGAD" | "ROCKET";

  idempotencyKey: string;

  status: PaymentStatus;

  transactionReference?: string;

  history: SettlementTimelineEntry[];
};
```

## Provider Analytics

```typescript
type ProviderAnomalyLevel =
  | "NORMAL"
  | "ELEVATED"
  | "HIGH";

type ProviderAnalytics = {
  providerId: string;

  eventsAsserted: number;
  eventsVerified: number;

  duplicateAttempts: number;
  duplicateRate: number;

  medianSettlementDays: number;

  anomalyLevel: ProviderAnomalyLevel;
};
```

---

# 54. Chart Library

Use a React chart library such as:

```text
Recharts
```

Recommended:

```text
LineChart
BarChart
PieChart
AreaChart
```

Use charts for information that benefits from visual comparison.

Do not turn every metric into a chart.

---

# 55. Mock Data Requirements

Seed enough data to make the dashboard and analytics believable:

```text
20–50 events
10–20 entitlements
10 settlements
5–10 providers
multiple dates
multiple statuses
at least 1 payment UNKNOWN
at least 1 denial
at least 1 provider anomaly
```

Use fictional data.

Do not present mock values as real insurer statistics.

---

# 56. Complete Insurer Happy Path

The main demonstration should be:

```text
Provider asserts event
        ↓
Verifiers attest
        ↓
2-of-3 quorum
        ↓
CLOSED_ELIGIBLE
        ↓
Insurer Dashboard
        ↓
Eligible Events Queue
        ↓
Review Claim
        ↓
Entitlement Review
        ↓
AUTHORIZE
        ↓
Settlement Processing
        ↓
Execute MFS
        ↓
CONFIRMED
        ↓
SETTLED
```

---

# 57. Complete Denial Path

```text
CLOSED_ELIGIBLE
        ↓
Insurer Review
        ↓
DENY
        ↓
ENTITLEMENT DENIED
        ↓
Appeal available
```

This demonstrates that a verified event is not automatically a paid claim.

---

# 58. Complete Scenario 7 Path

```text
AUTHORIZED
      ↓
PAYMENT REQUEST
      ↓
PROCESSING
      ↓
GATEWAY TIMEOUT
      ↓
UNKNOWN
      ↓
RECONCILIATION
      ↓
Check actual payment state
      ↓
CONFIRMED
      ↓
SETTLED
```

The key UI message:

```text
DO NOT RETRY BLINDLY
```

---

# 59. Provider Analytics Path

```text
Provider activity
      ↓
Off-chain analytics
      ↓
Network baseline comparison
      ↓
Anomaly signal
      ↓
Human review
```

Never:

```text
Anomaly
   ↓
Fraud confirmed
```

---

# 60. Cross-Portal Consistency

The insurer portal must use the same simulation state as the other portals.

Example:

```text
Provider
creates EVT-8187
        ↓
Insurer queue
shows EVT-8187
        ↓
Insurer authorizes ENT-9592
        ↓
Settlement page
shows SET-9415
        ↓
Payment confirmed
        ↓
Policyholder
sees payment receipt
```

Similarly:

```text
Provider duplicate attempt
        ↓
Provider analytics
updates duplicate count
```

This shared state is what makes the prototype feel like one real system.

---

# 61. Definition of Done

## Dashboard

```text
✓ KPI cards
✓ Claim lifecycle chart
✓ Settlement trend chart
✓ Entitlement outcome chart
✓ Needs-attention list
```

## Eligible Events Queue

```text
✓ CLOSED_ELIGIBLE events
✓ Search
✓ Filters
✓ Review action
```

## Adjudication

```text
✓ Event verification summary
✓ 2-of-3 quorum
✓ Policy information
✓ Benefit amount
✓ Authorize
✓ Deny
```

## Settlement

```text
✓ Settlement details
✓ Payment state
✓ Idempotency key
✓ MFS simulation
✓ Success state
```

## Scenario 7

```text
✓ Gateway timeout
✓ UNKNOWN state
✓ No blind retry warning
✓ Reconciliation
✓ Payment confirmed
```

## Provider Analytics

```text
✓ Provider KPIs
✓ Event volume chart
✓ Duplicate-rate chart
✓ Verification outcomes
✓ Settlement-time histogram
✓ Event/eligibility trend
✓ Denial-reason chart
✓ Provider anomaly table
✓ Provider comparison
✓ Anomaly explanation
```

---

# 62. Final Design Principle

The insurer portal should not feel like a generic admin dashboard.

Every screen should answer one of these questions:

```text
What events are ready?

Why is this event eligible?

Should this policy pay?

How much should it pay?

Did the payment actually happen?

If the payment is uncertain, what should we do?

Are provider behaviors showing unusual patterns?

Can every decision be explained?
```

The portal should make the whitepaper's core claim visible through interaction:

```text
Verified event
      ↓
Protocol state
      ↓
Insurer adjudication
      ↓
Controlled settlement
      ↓
Auditable outcome
```
