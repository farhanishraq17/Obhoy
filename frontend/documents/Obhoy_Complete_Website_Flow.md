# Obhoy — Complete Website Flow & Story Demonstration

## Purpose

This document describes the entire frontend prototype as a **single story**.

The website is not a real blockchain implementation. It is a frontend simulation of the workflow proposed by Obhoy.

The same simulated Event, Policy, Entitlement, Settlement, Attestations and Transparency Record must remain consistent as the user moves between roles.

---

# 1. The main story

The central character is:

## Rahim

Rahim is enrolled through an MFI/group channel into an illustrative Obhoy health policy.

The complete story is:

```text
Discover Obhoy
      ↓
Compare insurer
      ↓
MFI/group enrolment
      ↓
Identity verification
      ↓
Policy activation
      ↓
Hospital admission
      ↓
Provider asserts event
      ↓
Event uniqueness check
      ↓
Independent verification
      ↓
2-of-3 quorum
      ↓
Event becomes CLOSED_ELIGIBLE
      ↓
Insurer creates/authorizes entitlement
      ↓
Payment
      ↓
Policyholder receipt
      ↓
Transparency aggregation
      ↓
Public anchor
      ↓
Public verification
```

---

# 2. Public entry

## Page: `/`

### User sees

```text
OBHOY

Insurance you can verify.

Independent verification.
Duplicate-event protection.
Transparent insurer performance.

[ Start Demo ]
[ Explore Coverage ]
[ Compare Insurers ]
```

### User action

Click:

> Start Demo

### System

Start the default:

> Rahim's Hospitalization Journey

---

# 3. How Obhoy works

## Page: `/how-it-works`

Show:

```text
1. Enrol
      ↓
2. An insurable event happens
      ↓
3. Provider asserts it
      ↓
4. Obhoy checks uniqueness
      ↓
5. Independent parties attest
      ↓
6. Quorum is satisfied
      ↓
7. Insurer adjudicates
      ↓
8. Entitlement is settled
      ↓
9. Performance enters transparency record
```

The user can click any stage.

---

# 4. Insurance product

## Page: `/products`

Example:

```text
Hospitalization Protection

Illustrative prototype benefit:
BDT 50,000

Policy:
ACTIVE

Benefit schedule:
Version 1.2

[ Enrol ]
```

Important:

> Product values shown in the prototype are illustrative and should not be presented as deployed insurance pricing.

---

# 5. Insurer comparison

## Page: `/transparency`

User sees:

```text
INSURER A

Settlement ratio      92%
Denial ratio           8%
Median settlement    2.1 days

Transparency anchor
✓ Verified
```

and:

```text
INSURER B

Settlement ratio      78%
Denial ratio          22%
Median settlement    4.7 days

Transparency anchor
✓ Verified
```

User chooses Insurer A.

---

# 6. Enrollment

## Page: `/enroll`

Rahim enters through:

```text
MFI:
ABC MFI

Group:
Mirpur Group 12

Product:
Hospitalization Protection
```

Click:

> Continue

---

# 7. Identity verification

## Page: `/enroll/identity`

```text
Verify identity

NID number
[ ************ ]

Date of birth
[ DD/MM/YYYY ]

[ Verify ]
```

The prototype simulates the national identity service.

After success:

```text
✓ Identity verified
```

No real NID service is called.

---

# 8. Consent

## Page: `/enroll/consent`

```text
Your coverage

Insurer:
Insurer A

Product:
Hospitalization Protection

Benefit:
BDT 50,000

Schedule:
Version 1.2

[ I agree ]
```

---

# 9. Premium payment

## Page: `/enroll/payment`

```text
Premium

BDT 1,200

Payment method

○ bKash
○ Nagad
○ Rocket
○ MFI account

[ Pay ]
```

Prototype behavior:

```text
Payment successful ✓
```

This is a simulated payment rail.

---

# 10. Policy activated

## Page: `/policy`

```text
✓ POLICY ACTIVE

Policy ID
POL-1001

Holder
Rahim

Insurer
Insurer A

Coverage
Hospitalization

Benefit
BDT 50,000

Schedule
Version 1.2
```

---

# 11. Policyholder dashboard

## Page: `/policyholder`

```text
Good morning, Rahim

Coverage
ACTIVE ✓

Benefit
BDT 50,000

Current events
None

Benefits received
BDT 0
```

Then the story jumps forward.

---

# 12. A real-world event happens

Three months later:

```text
Rahim is admitted to
ABC Upazila Health Complex.
```

This is not something Rahim manually creates.

The provider starts the event.

---

# 13. Provider login

## Page: `/provider`

```text
ABC Upazila Health Complex

Provider status
ACCREDITED ✓

[ Find Patient ]
```

---

# 14. Patient lookup

## Page: `/provider/patient`

Provider searches:

```text
Patient
Rahim

[ Search ]
```

System finds:

```text
Rahim
Policy:
POL-1001

Status:
ACTIVE ✓

Coverage:
Hospitalization
```

---

# 15. Provider asserts event

## Page: `/provider/events/new`

```text
START EVENT

Patient:
Rahim

Facility:
ABC Upazila Health Complex

Admission:
01 Sep 2026
10:32 AM

[ ASSERT EVENT ]
```

Provider clicks:

> Assert Event

---

# 16. Event uniqueness check

The UI should visibly pause for a moment:

```text
Checking network-wide event registry...

✓ Identity commitment matched
✓ Admission window calculated
✓ Existing event search complete

No open event found.
```

Then:

```text
EVENT CREATED

EVT-1001

Status:
OPEN
```

The prototype simulates the proposed `openEvent()` invariant.

---

# 17. Event detail

## Page: `/provider/events/EVT-1001`

```text
EVENT EVT-1001

Status
OPEN

Patient
Rahim

Provider
ABC Upazila Health Complex

Admission
01 Sep 2026

Attestations

Provider       ✓
Clinical       —
Field          —
```

---

# 18. Clinical verification

Switch role:

```text
Viewing as:
Clinical Verifier
```

## Page: `/verifier`

```text
VERIFICATION QUEUE

EVT-1001
ABC Upazila Health Complex

[ Review ]
```

---

# 19. Clinical verifier reviews

```text
EVENT VERIFICATION

Event:
EVT-1001

Facility:
ABC Upazila Health Complex

Evidence:
HMIS reference HMIS-1001

Does the record support the event?

○ No
● Yes

[ Submit Attestation ]
```

Click:

> Submit Attestation

---

# 20. Clinical attestation recorded

```text
✓ ATTESTATION RECORDED

Clinical Verifier
Event EVT-1001

Current quorum:

1 / 3
```

The event remains open.

---

# 21. Field verifier

Switch role:

```text
Field Verifier
```

## Page: `/verifier`

```text
ASSIGNED EVENT

EVT-1001

Beneficiary:
Rahim

Confirm:

□ Beneficiary identity
□ Presence
□ Event consistency

[ ATTEST ]
```

Field verifier submits.

---

# 22. Quorum

System evaluates:

```text
Provider           ✓
Clinical Verifier  ✓
Field Verifier     ✓

2 / 3 required
```

Then:

```text
QUORUM SATISFIED ✓
```

Important:

The prototype should explain:

> Two of the three attesting classes are sufficient. The provider/payee does not count as the only independent basis for settlement.

---

# 23. Event becomes eligible

```text
EVT-1001

OPEN
  ↓
ATTESTATIONS
  ↓
2-of-3 QUORUM
  ↓
CLOSED_ELIGIBLE ✓
```

This is an **event state**, not a payment state.

---

# 24. Insurer sees entitlement

Switch role:

```text
Insurer A
```

## Page: `/insurer/events`

```text
ELIGIBLE EVENTS

EVT-1001

Policy:
POL-1001

Status:
CLOSED_ELIGIBLE

Benefit:
BDT 50,000

[ Review ]
```

---

# 25. Insurer adjudication

## Page: `/insurer/entitlements/ENT-1001`

```text
ENTITLEMENT

ENT-1001

Event:
EVT-1001

Policy:
POL-1001

Policy status:
ACTIVE ✓

Quorum:
2-of-3 ✓

Benefit schedule:
Version 1.2

Eligible amount:
BDT 50,000

Decision:

[ AUTHORIZE ]
[ DENY ]
```

---

# 26. Authorization

Click:

> AUTHORIZE

Show:

```text
ENTITLEMENT AUTHORIZED ✓

ENT-1001

Amount:
BDT 50,000

Settlement:
PENDING
```

The prototype then moves to the settlement simulation.

---

# 27. Payment

```text
SETTLEMENT

Entitlement:
ENT-1001

Amount:
BDT 50,000

Rail:
bKash

Status:
PROCESSING
```

Then:

```text
✓ PAYMENT COMPLETE

Reference:
PAY-1001
```

---

# 28. Policyholder receives receipt

Switch role:

```text
Policyholder
```

## Page: `/policyholder/events/EVT-1001`

```text
HOSPITALIZATION EVENT

EVT-1001

✓ Event verified
✓ Quorum satisfied
✓ Entitlement authorized
✓ Payment completed

Benefit received:
BDT 50,000
```

---

# 29. Verification timeline

Every role should be able to open:

> Why was this paid?

Show:

```text
✓ Identity verified
      ↓
✓ Provider accredited
      ↓
✓ Event uniqueness checked
      ↓
✓ Hospital assertion
      ↓
✓ Clinical attestation
      ↓
✓ Field attestation
      ↓
✓ 2-of-3 quorum
      ↓
✓ Policy eligibility
      ↓
✓ Entitlement authorized
      ↓
✓ Payment confirmed
```

This is one of the most important UI components in the prototype.

---

# 30. Transparency publication

At the end of the simulated period:

```text
Insurer A

Claims received
1,240

Settled
1,135

Denied
105

Settlement ratio
91.5%
```

The prototype generates:

```text
Transparency record
      ↓
Mock Merkle root
      ↓
Mock public anchor
```

---

# 31. Public verification

## Page: `/verify`

User enters:

```text
Transparency record:
AUG-2026-INSURER-A
```

System shows:

```text
Record found ✓

Period:
August 2026

Insurer:
Insurer A

Claims:
1,240

Settled:
1,135

Merkle root:
0x8f91...

Public anchor:
SIMULATED

Verification:
✓ MATCH
```

Clearly label this as:

> Prototype / simulated public anchor

---

# 32. Scenario 2 — Duplicate event

Reset to:

```text
Duplicate Event Scenario
```

Hospital A creates:

```text
EVT-1001
```

Then Hospital B tries:

```text
Assert Event
```

System checks.

Show:

```text
EVENT ALREADY EXISTS

Existing event:
EVT-1001

Status:
OPEN

No second event was created.

[ View Existing Event ]
[ Continue Existing Event ]
```

This demonstrates prevention at event creation.

---

# 33. Scenario 3 — Two legitimate policies

Rahim has:

```text
POL-1001
Insurer A

POL-2001
Insurer B
```

Same event:

```text
EVT-1001
```

Insurer A has:

```text
ENT-1001
BDT 30,000
SETTLED
```

Insurer B sees:

```text
Existing event found.

Your policy may still create
an entitlement against this event.
```

Then:

```text
EVT-1001
│
├── ENT-1001
│     Policy A
│     BDT 30,000
│     SETTLED
│
└── ENT-2001
      Policy B
      BDT 20,000
      OPEN
```

This is one of the strongest demonstrations in the whole prototype.

---

# 34. Scenario 4 — Hospital transfer

Rahim starts at:

```text
ABC Upazila Health Complex
```

Then is transferred to:

```text
ABC District Hospital
```

District Hospital attempts:

```text
Assert Event
```

Obhoy detects:

```text
Existing open event:
EVT-1001
```

Instead of creating a second event:

```text
CONTINUE EXISTING EVENT

[ Continue Event ]
```

Then:

```text
EVT-1001

Segments

01
ABC Upazila Health Complex
Initial admission

02
ABC District Hospital
Transfer
```

Still one event.

---

# 35. Scenario 5 — Insufficient quorum

Provider has attested.

Clinical verifier has not.

Field verifier has not.

Show:

```text
VERIFICATION STATUS

Provider          ✓
Clinical          —
Field             —

1 / 3

Settlement blocked.

Need two attesting classes.
```

Then field verifier attests:

```text
Provider          ✓
Clinical          —
Field             ✓

2 / 3

QUORUM SATISFIED ✓
```

---

# 36. Scenario 6 — Claim denial

Insurer chooses:

> DENY

Show:

```text
ENTITLEMENT DENIED

ENT-1001

Reason:
Policy exclusion

Status:
DENIED

[ Request Appeal ]
```

---

# 37. Appeal

Policyholder opens:

```text
APPEAL

Claim:
ENT-1001

Reason:
[ I believe this event is covered because... ]

[ Submit Appeal ]
```

Then:

```text
APPEAL SUBMITTED

Status:
UNDER REVIEW

Independent panel:
Assigned ✓
```

---

# 38. Appeal decision

Panel view:

```text
APPEAL REVIEW

Insurer:
Excluded from panel ✓

Evidence:
Available

Decision:

[ Uphold Denial ]
[ Overturn Denial ]
```

Choose:

> Overturn

Then:

```text
APPEAL SUCCESSFUL ✓

Original denial:
OVERTURNED

Settlement:
BDT 50,000
```

---

# 39. Scenario 7 — Payment uncertainty

Insurer authorizes:

```text
AUTHORIZED ✓
```

Payment begins:

```text
PROCESSING...
```

Then:

```text
PAYMENT OUTCOME UNKNOWN

The payment rail did not return
a definitive result.

No blind retry will be made.

[ Reconcile ]
```

Click:

> Reconcile

Then:

```text
PAYMENT CONFIRMED ✓

Reference:
PAY-1001
```

This demonstrates the proposed reconciliation behavior without implementing a real MFS integration.

---

# 40. Scenario 8 — Provider accreditation

Provider dashboard:

```text
ABC Hospital

Accreditation:
ACTIVE ✓

Events asserted:
428

Successful verification:
412

Anomalies:
LOW
```

Regulator revokes provider:

```text
Provider status:
REVOKED
```

History remains:

```text
Accreditation history

2026-01
Accredited

2026-08
Revoked

Historical events:
Preserved ✓
```

The prototype should not delete the provider's historical activity.

---

# 41. Regulator workflow

Switch role:

```text
IDRA / Regulator
```

Dashboard:

```text
OBHOY NETWORK

Active policies       42,821
Events                  5,218
Settled                 4,891
Denied                    327

Settlement ratio        93.7%
```

Click:

> Insurer A

Show:

```text
Claims
Settlement
Denials
Appeals
Settlement time
Provider anomalies
Transparency history
```

The regulator can drill down into aggregate behavior.

---

# 42. Academic auditor workflow

Switch role:

```text
Academic Auditor
```

The interface is intentionally restricted.

Show:

```text
AUDIT VIEW

Claims received
12,821

Settled
11,920

Denied
901

Settlement ratio
92.97%

Public anchor
✓ Verified
```

Do not expose clinical details.

---

# 43. Role permissions demonstrated by UI

The prototype should explicitly demonstrate:

```text
POLICYHOLDER
✓ View own policy
✓ View own events
✓ View payments
✓ Appeal
✗ Authorize settlement
```

```text
PROVIDER
✓ Find patient
✓ Assert event
✓ Continue event
✓ Attest
✗ Authorize payment
```

```text
CLINICAL VERIFIER
✓ Review clinical verification task
✓ Attest
✗ Authorize payment
```

```text
FIELD VERIFIER
✓ Verify beneficiary/event
✓ Attest
✗ See clinical details
✗ Authorize payment
```

```text
INSURER
✓ View own policies
✓ Adjudicate own entitlements
✓ Authorize own settlements
✗ Adjudicate another insurer's policy
```

```text
REGULATOR
✓ Network oversight
✓ Aggregate monitoring
✓ Insurer/provider monitoring
```

```text
ACADEMIC AUDITOR
✓ Aggregate transparency
✗ Private clinical information
```

---

# 44. Final story mode

The main BCOLBD presentation should use this exact sequence:

```text
SCENE 1
"Rahim needs affordable health protection."
        ↓
Public website

SCENE 2
"He compares insurer performance."
        ↓
Transparency Explorer

SCENE 3
"He enrolls through an MFI."
        ↓
Enrollment

SCENE 4
"His identity is verified."
        ↓
Identity Verification

SCENE 5
"His policy becomes active."
        ↓
Policy Dashboard

SCENE 6
"Rahim is hospitalized."
        ↓
Provider Portal

SCENE 7
"The provider asserts the event."
        ↓
Event Creation

SCENE 8
"Obhoy checks whether this event already exists."
        ↓
Uniqueness Check

SCENE 9
"Independent parties verify it."
        ↓
Verifier Portal

SCENE 10
"Two of three classes satisfy quorum."
        ↓
Quorum

SCENE 11
"The insurer adjudicates the entitlement."
        ↓
Insurer Portal

SCENE 12
"The benefit is authorized."
        ↓
Settlement

SCENE 13
"The payment reaches Rahim."
        ↓
Policyholder Receipt

SCENE 14
"The insurer's behavior becomes part of transparency."
        ↓
Transparency Ledger

SCENE 15
"The public can verify the record."
        ↓
Public Explorer
```

Then immediately demonstrate the three strongest edge cases:

```text
EDGE CASE 1
Same event submitted twice
→ Duplicate refused

EDGE CASE 2
Two legitimate policies
→ One event, two entitlements

EDGE CASE 3
Hospital transfer
→ One event, multiple segments
```

Then finish with:

```text
WHY OBHOY?

Real-world event
      ↓
Independent verification
      ↓
Protocol-enforced uniqueness
      ↓
Rule-bound entitlement
      ↓
Auditable settlement
      ↓
Public accountability
```

---

# 45. The single most important demo screen

At the end, show a global Event Explorer:

```text
EVENT EVT-1001

Rahim
Hospitalization

──────────────────────────────────

EVENT
✓ Unique
✓ Non-transferable
✓ Verified

ATTESTATIONS
✓ Provider
✓ Clinical
✓ Field

QUORUM
2 / 3 ✓

ENTITLEMENTS

ENT-1001
Insurer A
BDT 30,000
SETTLED

ENT-2001
Insurer B
BDT 20,000
SETTLED

SETTLEMENT
BDT 50,000

TRANSPARENCY
✓ Published

PUBLIC ANCHOR
✓ Verified
```

This screen tells the entire Obhoy story in one place.

---

# 46. Final navigation map

```text
PUBLIC
/
├── /how-it-works
├── /products
├── /transparency
└── /verify

POLICYHOLDER
/policyholder
├── /enroll
├── /identity
├── /policy
├── /events
├── /events/:eventId
├── /payments
└── /appeals

PROVIDER
/provider
├── /patients
├── /events/new
├── /events/:eventId
├── /events/:eventId/continue
└── /history

VERIFIER
/verifier
├── /queue
├── /events/:eventId
└── /history

INSURER
/insurer
├── /dashboard
├── /events
├── /entitlements
├── /entitlements/:id
├── /settlements
├── /providers
└── /transparency

REGULATOR
/regulator
├── /dashboard
├── /insurers
├── /providers
├── /appeals
└── /audit

DEMO
/demo
├── /happy-path
├── /duplicate
├── /dual-policy
├── /transfer
├── /quorum
├── /denial
├── /payment
└── /provider
```

---

# 47. The prototype's core rule

Everything must ultimately connect to the same simulated state:

```text
Policy
   ↓
Event
   ↓
Attestations
   ↓
Quorum
   ↓
Entitlement
   ↓
Settlement
   ↓
Transparency
```

If a user changes something in the Provider portal, the change must appear in the Insurer portal.

If the insurer settles something, the Policyholder must see it.

If a claim is denied, the Regulator should see the aggregate effect.

If transparency is published, the Public Explorer should show it.

That shared state is what will make the prototype feel like an actual system.
