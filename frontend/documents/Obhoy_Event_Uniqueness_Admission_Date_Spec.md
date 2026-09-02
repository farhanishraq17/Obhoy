# Obhoy — Event Uniqueness & Admission Date Logic

## Purpose

This document specifies the correct frontend prototype behavior for **Assert New Event** when the provider enters an admission date.

The key correction is:

> **The same patient can have multiple separate insurable events on different admission dates.**

The prototype must **not** treat every event from the same patient as a duplicate.

---

# 1. Core Rule

The whitepaper defines the deterministic event key as:

```text
EventKey = H(SubjectCommitment ∥ admissionWindow)
```

Therefore, uniqueness is determined using:

```text
SubjectCommitment
        +
admissionWindow
```

not:

```text
SubjectCommitment alone
```

---

# 2. Correct Behavior

Suppose Rahim has:

```text
SubjectCommitment = SUBJ-8A91
```

### Admission 1

```text
Patient
Rahim

Admission
2026-09-01

SubjectCommitment
SUBJ-8A91
```

The system derives:

```text
H(SUBJ-8A91 ∥ 2026-09-01)
        ↓
EventKey A
        ↓
EVT-6667
```

### Admission 2

Later, Rahim is admitted again:

```text
Patient
Rahim

Admission
2026-09-15

SubjectCommitment
SUBJ-8A91
```

The system derives:

```text
H(SUBJ-8A91 ∥ 2026-09-15)
        ↓
EventKey B
        ↓
NEW EVENT
```

Therefore:

```text
Rahim
  │
  ├── 2026-09-01 → EVT-6667
  │
  └── 2026-09-15 → EVT-7812
```

This is valid because the event keys are different.

---

# 3. What Must NOT Happen

The frontend must NOT implement uniqueness as:

```typescript
const existingEvent = events.find(
  event => event.subjectCommitment === subjectCommitment
);
```

This would incorrectly mean:

```text
One patient
   ↓
Only one event ever
```

That is not the intended event-key model.

---

# 4. Correct Prototype Logic

The mock implementation should conceptually behave like:

```typescript
const eventKey = generateMockEventKey(
  subjectCommitment,
  admissionWindow
);

const existingEvent = events.find(
  event => event.eventKey === eventKey
);
```

The important comparison is:

```text
eventKey === eventKey
```

where the event key incorporates:

```text
SubjectCommitment + admissionWindow
```

---

# 5. Same Date / Same Admission Window

If the provider submits the same patient with the same admission window:

```text
SUBJ-8A91 + 2026-09-01
```

and an existing event already has:

```text
EventKey:
H(SUBJ-8A91 ∥ 2026-09-01)
```

then:

```text
EXISTING EVENT DETECTED
```

The system should prevent a second event.

Display:

```text
EXISTING EVENT DETECTED

Event ID
EVT-6667

Status
OPEN

Admission Window
2026-09-01

No new event was created.

Obhoy prevented duplicate creation
for the same event key.
```

Actions:

```text
[ View Existing Event ]
[ Continue Existing Event ]
```

---

# 6. Different Admission Date

If the provider changes:

```text
2026-09-01
```

to:

```text
2026-09-15
```

the prototype must perform a new uniqueness check.

Display:

```text
CHECKING EVENT REGISTRY...

✓ Subject commitment resolved
✓ Admission window determined
✓ Event key generated
✓ No matching event found
```

Then:

```text
NEW EVENT

Event ID
EVT-7812

Status
OPEN

Admission Window
2026-09-15

[ Create Event ]
```

Do NOT show:

```text
DUPLICATE PREVENTED
```

merely because the patient is the same.

---

# 7. Transfer / Continuation Is a Different Scenario

A different admission date does not automatically mean:

> "Create a new event."

The provider must distinguish between:

### A. New hospitalization

```text
Previous event:
2026-09-01

New admission:
2026-09-15

Separate hospitalization
        ↓
NEW EVENT
```

### B. Transfer / continuation

```text
Existing event:
EVT-6667

Patient transferred
within the relevant continuation window
        ↓
CONTINUE EVENT
        ↓
Same EVT-6667
        ↓
New admission segment
```

The whitepaper specifies `continueEvent()` for adding an admission segment to an open event when the patient is transferred or readmitted within the relevant window.

---

# 8. Do Not Use Date Alone to Decide Continuation

The frontend should NOT implement:

```text
Different date
   ↓
Always new event
```

or:

```text
Same patient
   ↓
Always continue event
```

Instead, the prototype should make the event relationship explicit.

For example:

```text
Existing Event Found
        ↓
Is this a continuation/transfer?
        │
       YES
        ↓
Continue Existing Event

       NO
        ↓
Create Separate Event
```

For the prototype, this can be represented by the user's selected workflow rather than by a real clinical rules engine.

---

# 9. Recommended Assert New Event UI

Use the existing four-step indicator:

```text
1 Patient
2 Admission
3 Uniqueness
4 Created
```

## Step 1 — Patient

```text
PATIENT

Rahim

Subject Reference
SUBJ-••••91A2

Identity
Verified ✓
```

## Step 2 — Admission

```text
ADMISSION DETAILS

Facility
ABC Upazila Health Complex

Admission Date
[ 2026-09-15 ]

Admission Time
[ 10:32 AM ]

Event Category
[ Hospitalization ]

[ Check Event ]
```

## Step 3 — Uniqueness

Show:

```text
CHECKING EVENT REGISTRY...

Subject commitment
✓ Resolved

Admission window
✓ 2026-09-15

Deterministic event key
✓ Generated

Registry lookup
✓ Complete
```

Then branch.

---

# 10. Branch A — No Matching Event

```text
NO MATCHING EVENT FOUND ✓

The event key does not match
an existing open event.

A new event can be created.
```

Button:

```text
[ Create Event ]
```

After clicking:

```text
EVENT CREATED ✓

EVT-7812

Status
OPEN
```

---

# 11. Branch B — Matching Event

If the exact same event key already exists:

```text
EXISTING EVENT DETECTED

EVT-6667

Status
OPEN

Admission Window
2026-09-01

The same event key already exists.

No duplicate event was created.
```

Actions:

```text
[ View Existing Event ]
[ Continue Event ]
```

---

# 12. Branch C — Existing Event but Different Date

Example:

```text
Existing event:
EVT-6667
2026-09-01

New assertion:
2026-09-15
```

The event key is different:

```text
H(SUBJ-8A91 ∥ 2026-09-01)
        ≠
H(SUBJ-8A91 ∥ 2026-09-15)
```

Therefore:

```text
No exact event-key collision
        ↓
New event may be created
```

The prototype should display:

```text
SEPARATE EVENT WINDOW

Existing event:
EVT-6667
2026-09-01

Current admission:
2026-09-15

✓ Different event window

[ Create New Event ]
```

---

# 13. Example: Complete Scenario

## First hospitalization

Provider enters:

```text
Patient:
Rahim

Admission:
2026-09-01
```

System:

```text
SubjectCommitment = SUBJ-8A91

EventKey =
H(SUBJ-8A91 ∥ 2026-09-01)
```

Result:

```text
EVT-6667 CREATED
```

---

## Second hospitalization

Two weeks later:

```text
Patient:
Rahim

Admission:
2026-09-15
```

System:

```text
SubjectCommitment = SUBJ-8A91

EventKey =
H(SUBJ-8A91 ∥ 2026-09-15)
```

Result:

```text
Different EventKey
        ↓
EVT-7812 CREATED
```

Final state:

```text
RAHIM

Events

EVT-6667
Admission: 2026-09-01
Status: CLOSED_ELIGIBLE

EVT-7812
Admission: 2026-09-15
Status: OPEN
```

---

# 14. Example: Transfer Scenario

Instead:

```text
EVT-6667
Admission:
2026-09-01
```

Rahim is transferred from:

```text
ABC Upazila Health Complex
```

to:

```text
ABC District Hospital
```

The provider selects:

```text
Continue Event (Transfer)
```

The system shows:

```text
EXISTING EVENT

EVT-6667

Original facility
ABC Upazila Health Complex

Transfer destination
ABC District Hospital

[ Continue Existing Event ]
```

After confirmation:

```text
EVT-6667

Admission Segments

01
ABC Upazila Health Complex
2026-09-01
Initial admission

02
ABC District Hospital
2026-09-01
Transfer / continuation
```

The event ID remains:

```text
EVT-6667
```

No second event is created.

---

# 15. Frontend State Logic

The Assert New Event page should have these states:

```text
PATIENT_SELECTED
      ↓
ADMISSION_ENTERED
      ↓
CHECKING_UNIQUENESS
      ↓
      ├───────────────┐
      ↓               ↓
NO_MATCH          MATCH_FOUND
      ↓               ↓
NEW_EVENT         EXISTING_EVENT
      ↓               ↓
CREATED        ┌──────┴──────┐
               ↓             ↓
           VIEW EVENT    CONTINUE
```

---

# 16. Mock Event Data

Use an event structure like:

```typescript
type MockEvent = {
  eventId: string;
  subjectCommitment: string;
  admissionWindow: string;
  eventKey: string;
  status:
    | "OPEN"
    | "CLOSED_ELIGIBLE"
    | "SETTLED"
    | "DENIED"
    | "APPEALED";
  providerId: string;
};
```

Example:

```typescript
const events = [
  {
    eventId: "EVT-6667",
    subjectCommitment: "SUBJ-8A91",
    admissionWindow: "2026-09-01",
    eventKey: "H(SUBJ-8A91|2026-09-01)",
    status: "OPEN",
    providerId: "PRV-00142",
  },
];
```

Then a new date:

```typescript
const newEventKey =
  `H(${subjectCommitment}|${admissionWindow})`;
```

Search:

```typescript
const existingEvent = events.find(
  event => event.eventKey === newEventKey
);
```

---

# 17. Important Demo Principle

The UI should make this distinction obvious to a judge:

```text
SAME PATIENT
      ≠
SAME EVENT
```

Instead:

```text
SAME PATIENT
      +
SAME EVENT WINDOW
      ↓
Potential duplicate
```

while:

```text
SAME PATIENT
      +
DIFFERENT EVENT WINDOW
      ↓
Potentially separate event
```

And:

```text
TRANSFER / CONTINUATION
      ↓
Extend existing event
      ↓
Do not create duplicate event
```

---

# 18. Final Rule for Implementation

Replace the current behavior:

```text
Patient exists in events?
        ↓
YES → Duplicate
```

with:

```text
Generate event key from:

SubjectCommitment
        +
AdmissionWindow

        ↓

Does exact event key already exist?
        │
   ┌────┴────┐
   │         │
  YES        NO
   │         │
   ↓         ↓
Duplicate   New Event
Prevented   Allowed
   │
   ↓
Is this actually a transfer/
continuation?
   │
  YES
   ↓
Continue Existing Event
```

This is the behavior the frontend prototype should demonstrate.
