# Obhoy Provider Portal — Page & Workflow Specification

## Purpose

This document defines exactly what the five Provider Portal navigation items should contain:

1. Provider Dashboard
2. Patient Lookup
3. Assert New Event
4. Continue Event (Transfer)
5. Attestation History

The provider is primarily responsible for:

```text
Patient identification
      ↓
Event assertion
      ↓
Event uniqueness handling
      ↓
Event continuation when appropriate
      ↓
Provider attestation
      ↓
Waiting for independent verification
```

The provider is **not** responsible for:

```text
Claim adjudication
Payment authorization
Settlement
Regulatory oversight
```

The whitepaper specifies that providers connect through the provider association's peer or a hosted gateway. It also treats provider accreditation as a revocable credential whose history survives revocation.

---

# 1. Provider Portal Layout

Keep the current sidebar exactly as it is:

```text
PORTAL NAVIGATION

▣ Provider Dashboard
⌕ Patient Lookup
⊕ Assert New Event
↶ Continue Event (Transfer)
◷ Attestation History
```

Use a persistent header:

```text
OBHOY

ABC Upazila Health Complex
Provider ID: PRV-00142

● ACCREDITED

[ Notifications ] [ Provider Profile ]
```

The header should always communicate:

- facility name
- provider ID
- accreditation status
- current signed-in role

For the prototype, authentication is simulated. Do not imply that a real Fabric credential or device-bound secure element is being used.

---

# 2. Provider Dashboard

## Route

```text
/provider
```

## Purpose

The dashboard is the provider's **operational home page**.

It should answer:

1. Is my facility accredited?
2. What needs my attention?
3. What events did I recently create?
4. What events are waiting for my attestation?

It should not become a generic hospital-management dashboard.

## 2.1 Provider identity

```text
ABC Upazila Health Complex

Provider ID
PRV-00142

Accreditation
ACTIVE ✓

Credential status
VALID ✓

Last verified
01 Sep 2026
```

Button:

```text
[ View Accreditation ]
```

Show accreditation history:

```text
ACCREDITATION HISTORY

12 Apr 2025
Accredited

03 Feb 2026
Renewed

01 Sep 2026
ACTIVE
```

## 2.2 Dashboard statistics

Use four compact cards:

```text
Today's Admissions
12

Open Events
8

Pending Attestations
3

Events Completed
41
```

These are simulated values.

## 2.3 Needs Attention

This should be the most useful section.

Example:

```text
NEEDS ATTENTION

┌──────────────────────────────────────────┐
│ EVT-1001                                 │
│ Rahim                                    │
│                                          │
│ Provider attestation pending             │
│ Clinical: ✓                              │
│ Field: —                                 │
│                                          │
│ [ Review Event ]                         │
└──────────────────────────────────────────┘
```

Another possible item:

```text
EXISTING EVENT DETECTED

Patient: Karim
Existing event: EVT-0998

[ View ] [ Continue Event ]
```

## 2.4 Recent Events

| Event | Patient | Admission | Status | Action |
|---|---|---|---|---|
| EVT-1001 | Rahim | 01 Sep, 10:32 | Open | View |
| EVT-0998 | Karim | 31 Aug, 15:10 | Eligible | View |
| EVT-0997 | Salma | 30 Aug, 11:22 | Settled | View |

Possible statuses:

```text
OPEN
CLOSED_ELIGIBLE
SETTLED
DENIED
APPEALED
```

## 2.5 Quick Actions

```text
[ Find Patient ]
[ Assert New Event ]
[ Continue Event ]
```

---

# 3. Patient Lookup

## Route

```text
/provider/patients
```

## Purpose

The provider identifies a beneficiary before asserting an event.

This should feel like a focused **Obhoy beneficiary lookup**, not a complete hospital EMR.

## 3.1 Search

```text
PATIENT LOOKUP

Search by

[ NID / Policy ID / Mobile number ]

                         [ Search ]
```

Use mock data in the prototype.

## 3.2 Search result

Example:

```text
PATIENT FOUND ✓

Rahim

Identity
Verified ✓

Policy
POL-1001

Insurer
Insurer A

Coverage
Hospitalization

Policy status
ACTIVE ✓
```

Actions:

```text
[ View Policy ]
[ Assert New Event ]
```

## 3.3 No active policy

```text
NO ACTIVE OBHOY COVERAGE

This beneficiary does not currently
have an active policy.

[ Search Another Patient ]
```

## 3.4 Multiple policies

For the dual-policy scenario:

```text
ACTIVE POLICIES

POL-1001
Insurer A
Hospitalization
ACTIVE

POL-2001
Insurer B
Hospitalization
ACTIVE
```

Do not make the provider choose which policy creates the event.

Instead:

```text
The hospitalization event is separate
from the policy entitlement.

[ Continue to Assert Event ]
```

This reflects the whitepaper's central separation between the insurable event and the entitlement claimed against it.

## 3.5 Data visibility

Show only what the provider needs:

```text
Identity verification
Policy status
Coverage category
Admission information
Event status
```

Do not expose unrestricted:

```text
Full NID
Address
Detailed diagnosis
Clinical notes
Imaging
Laboratory results
Bank/MFS account details
```

The whitepaper places sensitive identity, clinical, financial and document data off-chain.

---

# 4. Assert New Event

## Route

```text
/provider/events/new
```

This is the **most important page in the Provider Portal**.

## 4.1 Page structure

```text
ASSERT NEW INSURABLE EVENT

1 Patient
   ↓
2 Admission
   ↓
3 Uniqueness Check
   ↓
4 Event Created
```

## 4.2 Patient section

```text
PATIENT

Rahim
Policy: POL-1001
Status: ACTIVE ✓

[ Change Patient ]
```

## 4.3 Admission section

```text
ADMISSION DETAILS

Facility
ABC Upazila Health Complex

Admission date
01 Sep 2026

Admission time
10:32 AM

Event category
Hospitalization

[ Assert Event ]
```

Do not make diagnosis part of the event key.

The whitepaper deliberately excludes diagnosis and provider from the deterministic event key so that changing them cannot create a different event.

## 4.4 Uniqueness check

After clicking Assert:

```text
CHECKING EVENT REGISTRY...

✓ Beneficiary commitment resolved
✓ Admission window determined
✓ Event key generated
✓ Existing event lookup complete
```

Then branch.

## 4.5 Branch A — New event

```text
EVENT CREATED ✓

Event ID
EVT-1001

Status
OPEN

Admission
01 Sep 2026, 10:32 AM

Provider
ABC Upazila Health Complex
```

Then:

```text
ATTESTATION STATUS

Provider
○ Pending

Clinical
○ Pending

Field
○ Pending

Quorum
0 / 2
```

Button:

```text
[ Attest This Event ]
```

The proposed system uses a two-of-three attestation quorum, with the insurer separately acting as payer/endorser.

## 4.6 Branch B — Duplicate event

```text
EXISTING EVENT DETECTED

Event ID
EVT-1001

Status
OPEN

Admission window
01 Sep 2026

This hospitalization already has
an open Obhoy event.

No new event was created.
```

Actions:

```text
[ View Existing Event ]
[ Continue Existing Event ]
```

Do not present this as a generic error.

The message should explain:

> Obhoy prevents a second event from being minted for the same real-world episode.

The whitepaper specifies that `openEvent` fails when an unconsumed event already exists for the event key.

---

# 5. Continue Event (Transfer)

## Route

```text
/provider/events/continue
```

## Purpose

This page demonstrates:

> **Continuation, not duplication.**

The whitepaper specifies that `continueEvent` adds an admission segment to an open event when a patient is transferred or readmitted within the relevant window, with attestation by the transferring provider.

## 5.1 Find existing event

```text
CONTINUE EXISTING EVENT

Event ID
[ EVT-1001 ]

[ Search ]
```

Or arrive here automatically from the duplicate-event screen.

## 5.2 Existing event summary

```text
EXISTING EVENT

EVT-1001

Patient
Rahim

Current status
OPEN

Original admission

ABC Upazila Health Complex
01 Sep 2026, 10:32 AM
```

Then:

```text
CURRENT FACILITY

ABC District Hospital

Transfer date
01 Sep 2026

Transfer time
15:40

Reason
Patient transferred
```

## 5.3 Continue Event action

Before submitting:

```text
CONTINUATION CONFIRMATION

This will NOT create a new event.

It will add a new admission segment
to EVT-1001.

[ Confirm Continuation ]
```

Then:

```text
EVENT CONTINUED ✓

EVT-1001
```

## 5.4 Segment visualization

```text
EVT-1001

ADMISSION SEGMENTS

01
ABC Upazila Health Complex
Initial admission
10:32 AM

        ↓ Transfer

02
ABC District Hospital
Continued admission
15:40 PM
```

Core visual message:

```text
1 REAL-WORLD EPISODE
        ↓
1 EVENT
        ↓
MULTIPLE ADMISSION SEGMENTS
```

## 5.5 Transfer attestation

```text
TRANSFER ATTESTATION

I confirm that this patient was
transferred from the previous facility
and that this segment belongs to
EVT-1001.

[ Sign & Attest ]
```

After submission:

```text
✓ Transfer attestation recorded
```

---

# 6. Attestation History

## Route

```text
/provider/attestations
```

## Purpose

This is the provider's historical record of events that the provider has personally attested to.

It should not become a general claims-history page.

## 6.1 Summary

```text
ATTESTATION HISTORY

Total attestations
428

This month
37

Accepted
412

Rejected
16
```

These are simulated prototype values.

## 6.2 History table

| Event | Patient | Type | Date | Status |
|---|---|---|---|---|
| EVT-1001 | Rahim | Provider | 01 Sep | Valid |
| EVT-0998 | Karim | Provider | 31 Aug | Valid |
| EVT-0991 | Salma | Transfer | 29 Aug | Valid |

Attestation types:

```text
PROVIDER ASSERTION
PROVIDER ATTESTATION
TRANSFER ATTESTATION
```

## 6.3 Attestation detail

Clicking EVT-1001:

```text
ATTESTATION

Event
EVT-1001

Provider
ABC Upazila Health Complex

Actor
Provider credential PRV-00142

Timestamp
01 Sep 2026, 10:41 AM

Status
VALID ✓
```

Then:

```text
EVENT VERIFICATION

Provider
✓

Clinical
✓

Field
—

Quorum
2 / 3 ✓
```

The provider can see progress, but cannot authorize settlement.

---

# 7. Reusable Event Detail Drawer

This does not need its own sidebar item.

Whenever the provider clicks an event, open:

```text
EVENT EVT-1001
```

Sections:

```text
Overview
Admission
Segments
Attestations
Timeline
Technical Proof
```

## Overview

```text
EVENT EVT-1001

Status
CLOSED_ELIGIBLE ✓

Patient
Rahim

Provider
ABC Upazila Health Complex

Admission window
01 Sep 2026
```

## Attestations

```text
ATTESTATIONS

Provider
✓ ABC Hospital

Clinical
✓ Clinical Verifier

Field
—

QUORUM
2 / 3 ✓
```

## Timeline

```text
10:32
Event asserted

10:33
Uniqueness check passed

10:41
Provider attestation

11:04
Clinical attestation

11:04
Quorum satisfied

11:05
Event closed as eligible

→ Insurer adjudication
```

---

# 8. Technical Proof

Include a collapsible:

```text
[ View Technical Proof ]
```

When expanded:

```text
SIMULATED FABRIC RECORD

Event ID
EVT-1001

Event key
0x8a91...42f

State
CLOSED_ELIGIBLE

Provider credential
PRV-00142

Attestation classes
Provider
Clinical

Endorsement status
Satisfied

Channel
MAIN_CHANNEL

Status
SIMULATED
```

Important:

Do not claim this is a real blockchain transaction.

Use:

> Simulated Fabric record

The real whitepaper places event record/state/timestamps and attestation information on-chain while keeping sensitive patient and clinical information off-chain.

---

# 9. Provider Permission Boundaries

## Provider CAN

```text
✓ Look up beneficiary
✓ Check active policy status
✓ Assert event
✓ Detect duplicate event
✓ View existing event
✓ Continue event after transfer
✓ Attest to event
✓ View own attestation history
✓ View event verification progress
✓ View provider accreditation status
```

## Provider CANNOT

```text
✗ Authorize entitlement
✗ Approve payment
✗ Settle claim
✗ Set benefit amount
✗ Adjudicate a claim
✗ Access another insurer's private commercial data
✗ Access unrestricted clinical information when acting
  outside the clinical-verifier role
✗ Modify a finalized event
✗ Create a second event for the same episode
```

The whitepaper separates provider assertion/attestation from insurer adjudication and settlement.

---

# 10. Final Provider Dashboard Information Architecture

```text
PROVIDER DASHBOARD

┌──────────────────────────────────────────┐
│ ABC Upazila Health Complex              │
│ PRV-00142                               │
│ ● Accredited                            │
└──────────────────────────────────────────┘

TODAY

┌─────────────┐ ┌─────────────┐
│ Admissions  │ │ Open Events │
│ 12          │ │ 8           │
└─────────────┘ └─────────────┘

┌─────────────┐ ┌─────────────┐
│ Pending     │ │ Completed   │
│ Attest. 3   │ │ 41          │
└─────────────┘ └─────────────┘

NEEDS ATTENTION

EVT-1001
Provider attestation pending
[ Review ]

EXISTING EVENT DETECTED
EVT-0998
[ Continue Event ]

RECENT EVENTS

EVT-1001   Rahim    OPEN
EVT-0998   Karim    ELIGIBLE
EVT-0997   Salma    SETTLED

QUICK ACTIONS

[ Find Patient ]
[ Assert New Event ]
[ Continue Event ]
```

---

# 11. Complete Provider Story

```text
PROVIDER LOGIN
      ↓
Provider credential simulated
      ↓
Accreditation checked
      ↓
PROVIDER DASHBOARD
      ↓
PATIENT LOOKUP
      ↓
Rahim found
      ↓
Active policy confirmed
      ↓
ASSERT NEW EVENT
      ↓
Uniqueness check
      ↓
No existing event
      ↓
EVT-1001 CREATED
      ↓
Provider attestation
      ↓
Clinical verifier attests
      ↓
2-of-3 quorum
      ↓
Event becomes CLOSED_ELIGIBLE
      ↓
Provider waits
      ↓
Insurer adjudicates
      ↓
Settlement
```

---

# 12. Duplicate Scenario

```text
Provider B
      ↓
Patient Lookup
      ↓
Rahim
      ↓
Assert New Event
      ↓
Uniqueness Check
      ↓
EXISTING EVT-1001
      ↓
NO NEW EVENT
      ↓
[ Continue Existing Event ]
      ↓
New admission segment
      ↓
Same EVT-1001
```

---

# 13. Dual Policy Scenario

The provider should not create:

```text
EVT-1001
for Insurer A

EVT-2001
for Insurer B
```

Instead:

```text
ONE REAL-WORLD EVENT

EVT-1001
        │
        ├── Entitlement A
        │   Policy POL-1001
        │   Insurer A
        │
        └── Entitlement B
            Policy POL-2001
            Insurer B
```

The provider's job ends at establishing/attesting the event. The respective insurers handle their own entitlements.

---

# 14. What Each Sidebar Item Demonstrates

| Sidebar item | Main concept demonstrated |
|---|---|
| Provider Dashboard | Provider role + accreditation + event monitoring |
| Patient Lookup | Beneficiary/policy verification before event assertion |
| Assert New Event | `openEvent()` + deterministic uniqueness |
| Continue Event (Transfer) | `continueEvent()` + no duplicate event |
| Attestation History | Provider's signed attestations + verification trail |

---

# 15. Implementation Order

Build the provider portal in this order:

```text
1. Provider Dashboard shell
        ↓
2. Patient Lookup
        ↓
3. Assert New Event
        ↓
4. Simulation: openEvent()
        ↓
5. Duplicate detection
        ↓
6. Continue Event
        ↓
7. Simulation: continueEvent()
        ↓
8. Provider attestation
        ↓
9. Attestation History
        ↓
10. Event Detail drawer
        ↓
11. Technical Proof drawer
        ↓
12. Error/permission states
```

Do **not** start with charts or analytics.

The core Provider Portal workflow is:

```text
LOOK UP
   ↓
ASSERT
   ↓
CHECK UNIQUENESS
   ↓
CREATE OR CONTINUE
   ↓
ATTEST
   ↓
OBSERVE QUORUM
```

That is what the five navigation items should make immediately understandable.
