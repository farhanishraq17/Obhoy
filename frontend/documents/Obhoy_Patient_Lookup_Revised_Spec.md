# Obhoy Provider Portal — Patient Lookup Page (Revised)

## Purpose

This document replaces the earlier Patient Lookup specification.

The key architectural correction is:

> **The provider does not search the blockchain using the raw NID.**

The raw NID is processed through the identity/commitment mechanism to derive the same deterministic `SubjectCommitment` used during enrolment. The commitment is then used to resolve the policyholder's policy records, while the provider receives only information permitted by their role.

---

# 1. Correct Conceptual Flow

```text
POLICYHOLDER ENROLMENT

NID
 │
 ▼
HMAC_Kv(NID ∥ context)
 │
 ▼
SubjectCommitment
 │
 ├──────── Policy A
 │
 ├──────── Policy B
 │
 └──────── Policy C
```

Later:

```text
PROVIDER LOOKUP

Provider enters NID
       │
       ▼
Identity / API layer
       │
       ▼
Same deterministic commitment derivation
       │
       ▼
SubjectCommitment
       │
       ▼
Policy / event records resolved
       │
       ▼
Provider-authorized information returned
```

The important point is that the raw NID is **not stored on-chain**.

---

# 2. What the Page Should NOT Do

Do NOT implement:

```text
Provider
   ↓
Blockchain
   ↓
SELECT * WHERE NID = "..."
```

Do NOT imply:

```text
NID
 ↓
raw NID stored on ledger
 ↓
search ledger
```

Do NOT show every piece of information associated with the subject commitment.

The provider only receives information appropriate to the provider role.

---

# 3. Page Layout

## Route

```text
/provider/patients
```

Page title:

```text
PATIENT LOOKUP
```

Subtitle:

```text
Verify a beneficiary and view their active
Obhoy coverage before asserting an event.
```

---

# 4. Search Interface

Use:

```text
┌─────────────────────────────────────────────────┐
│ PATIENT LOOKUP                                  │
│                                                 │
│ Search by NID                                   │
│                                                 │
│ [ 1987XXXXXXXXXX                         ]      │
│                                                 │
│              [ Verify Identity ]               │
└─────────────────────────────────────────────────┘
```

For the prototype, NID is a simulated input.

Optional second method:

```text
Search by

○ NID
○ Policy ID
```

But NID should be the main demonstration because it lets us show the commitment-resolution process.

---

# 5. Lookup Processing Animation

When the provider clicks:

```text
[ Verify Identity ]
```

do not immediately display the patient.

Show the protocol as a short sequence.

```text
RESOLVING BENEFICIARY...

✓ Provider credential verified
✓ Secure identity lookup initiated
✓ NID processed
✓ Subject commitment resolved
✓ Policy records located
✓ Provider access permissions checked
```

This is a **frontend simulation**, not a real cryptographic operation.

---

# 6. Technical Explanation During Lookup

Include a small expandable section:

```text
▸ How identity resolution works
```

When opened:

```text
RAW NID

1987XXXXXXXXXX
        │
        ▼
HMAC_Kv(NID ∥ context)
        │
        ▼
SubjectCommitment

0x8a91...42f
```

Then:

```text
The raw NID is not searched or stored
on the ledger.

The deterministic commitment is used
to link the beneficiary to their
authorized policy records.
```

Do not expose the actual secret key `Kv`.

---

# 7. Patient Found

After successful resolution:

```text
┌─────────────────────────────────────────────────┐
│ PATIENT FOUND ✓                                 │
│                                                 │
│ Rahim                                           │
│ Identity: Verified                              │
│                                                 │
│ Subject Reference                               │
│ SUBJ-••••91A2                                   │
│                                                 │
│ Active Policies                                 │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ POL-1001                                    │ │
│ │ Insurer A                                   │ │
│ │ Hospitalization                             │ │
│ │ ACTIVE ✓                                    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [ View Coverage ]   [ Assert New Event ]        │
└─────────────────────────────────────────────────┘
```

The provider does not need to see the raw NID after verification.

---

# 8. Multiple Policies

A single `SubjectCommitment` may be associated with multiple policy records.

Example:

```text
ACTIVE POLICIES

┌─────────────────────────────────────────────┐
│ POL-1001                                    │
│ Insurer A                                   │
│ Hospitalization                             │
│ ACTIVE ✓                                    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ POL-2001                                    │
│ Insurer B                                   │
│ Hospitalization                             │
│ ACTIVE ✓                                    │
└─────────────────────────────────────────────┘
```

Important UI message:

```text
These policies belong to the same
verified beneficiary.

Policies remain separate entitlements.
```

The provider should NOT create one event per policy.

The conceptual relationship is:

```text
                  SubjectCommitment
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
          Policy A    Policy B    Policy C
```

And later:

```text
              ONE REAL-WORLD EVENT
                       │
                       ▼
                    EVT-1001
                       │
              ┌────────┴────────┐
              ▼                 ▼
        Entitlement A      Entitlement B
        Insurer A          Insurer B
```

---

# 9. What the Provider Can See

The lookup result should show only provider-relevant information.

### Show

```text
✓ Identity verified
✓ Subject reference / masked reference
✓ Active policy exists
✓ Policy ID
✓ Insurer name
✓ Coverage category
✓ Policy status
✓ Relevant event status
```

### Do not show

```text
✗ Raw NID
✗ Secret HMAC key
✗ Full identity mapping
✗ Unrestricted clinical records
✗ Clinical notes
✗ Imaging
✗ Laboratory results
✗ Payment account information
✗ Insurer-private commercial information
```

The prototype should visually communicate this separation.

---

# 10. No Active Policy

If the NID resolves to a beneficiary but there is no active coverage:

```text
IDENTITY VERIFIED ✓

Rahim

Subject reference
SUBJ-••••91A2

No active Obhoy policy was found.

[ Search Another Patient ]
```

Do not allow the normal insured-event flow to continue.

---

# 11. Identity Not Found

If no beneficiary is found:

```text
BENEFICIARY NOT FOUND

No matching Obhoy identity could be
resolved from the provided NID.

Possible reasons:

• Beneficiary is not enrolled
• NID was entered incorrectly
• Identity is not accessible to this provider

[ Try Again ]
```

Do not reveal whether a different private identity record exists.

---

# 12. Invalid / Unusable NID

Show:

```text
INVALID NID

Please verify the entered National ID
and try again.

[ Try Again ]
```

This is a frontend validation state.

---

# 13. Provider Access Restricted

The provider may successfully resolve the beneficiary but not have access to some underlying data.

Example:

```text
IDENTITY VERIFIED ✓

Policy status
ACTIVE ✓

Clinical information
RESTRICTED

Your provider role does not provide
access to clinical records.

[ Continue to Event Assertion ]
```

This reinforces role-based access control.

---

# 14. The "View Coverage" Page

Clicking:

```text
[ View Coverage ]
```

should open:

```text
COVERAGE DETAILS

Policy
POL-1001

Insurer
Insurer A

Coverage
Hospitalization

Status
ACTIVE ✓

Effective
01 Jan 2026

Expires
31 Dec 2026
```

If multiple policies exist, show them separately.

Do not merge their benefits into a single policy.

---

# 15. Transition to Assert New Event

After successful lookup:

```text
PATIENT FOUND ✓

Rahim
Identity verified

Active policy:
POL-1001

[ Assert New Event ]
```

Clicking the button should navigate to:

```text
/provider/events/new
```

and automatically carry the verified patient context.

The provider should NOT need to enter the NID again.

---

# 16. State Model for the Frontend

Create these lookup states:

```text
IDLE
SEARCHING
IDENTITY_RESOLVED
POLICIES_LOADING
FOUND
MULTIPLE_POLICIES
NO_ACTIVE_POLICY
NOT_FOUND
ACCESS_RESTRICTED
ERROR
```

Example:

```typescript
type LookupStatus =
  | "IDLE"
  | "SEARCHING"
  | "IDENTITY_RESOLVED"
  | "POLICIES_LOADING"
  | "FOUND"
  | "MULTIPLE_POLICIES"
  | "NO_ACTIVE_POLICY"
  | "NOT_FOUND"
  | "ACCESS_RESTRICTED"
  | "ERROR";
```

---

# 17. Mock Data Model

For the prototype, separate identity data from policy data.

Example:

```typescript
type Subject = {
  subjectCommitment: string;
  displayName: string;
  identityVerified: boolean;
};

type Policy = {
  policyId: string;
  subjectCommitment: string;
  insurerId: string;
  insurerName: string;
  coverageType: string;
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED";
};
```

Mock data:

```typescript
const subject = {
  subjectCommitment: "subj_8a91...42f",
  displayName: "Rahim",
  identityVerified: true,
};

const policies = [
  {
    policyId: "POL-1001",
    subjectCommitment: "subj_8a91...42f",
    insurerId: "INS-A",
    insurerName: "Insurer A",
    coverageType: "Hospitalization",
    status: "ACTIVE",
  },
  {
    policyId: "POL-2001",
    subjectCommitment: "subj_8a91...42f",
    insurerId: "INS-B",
    insurerName: "Insurer B",
    coverageType: "Hospitalization",
    status: "ACTIVE",
  },
];
```

This makes the important relationship visible in the code:

```text
Same SubjectCommitment
        │
        ├── POL-1001
        └── POL-2001
```

---

# 18. Prototype Lookup Function

Do NOT implement a real HMAC system for this frontend prototype.

Instead simulate:

```typescript
async function resolvePatient(nid: string) {
  setStatus("SEARCHING");

  await delay(500);

  // Simulated deterministic identity resolution
  const subject = mockIdentityResolution[nid];

  if (!subject) {
    setStatus("NOT_FOUND");
    return null;
  }

  setStatus("IDENTITY_RESOLVED");

  await delay(400);

  const policies = mockPolicies.filter(
    policy => policy.subjectCommitment === subject.subjectCommitment
  );

  return {
    subject,
    policies,
  };
}
```

This lets the UI behave correctly without pretending that the cryptographic infrastructure exists.

---

# 19. Recommended Demo Scenario

Use Rahim as the main demonstration.

### Step 1

Provider opens:

```text
Patient Lookup
```

### Step 2

Enters:

```text
NID:
1987XXXXXXXXXX
```

### Step 3

System displays:

```text
✓ Provider credential verified
✓ NID processed
✓ Subject commitment resolved
✓ Policy records located
```

### Step 4

Display:

```text
Rahim
Identity Verified ✓

POL-1001
Insurer A
ACTIVE
```

### Step 5

Provider clicks:

```text
[ Assert New Event ]
```

### Step 6

The system moves to:

```text
Assert New Event
```

with Rahim already selected.

### Step 7

Provider enters admission information and submits.

### Step 8

The system generates/checks the event using the subject commitment and admission window.

```text
H(SubjectCommitment ∥ admissionWindow)
              ↓
          Event Key
              ↓
       Event Registry
```

### Step 9

If no event exists:

```text
EVT-1001 CREATED
```

If one exists:

```text
EXISTING EVENT DETECTED
→ Continue Existing Event
```

---

# 20. Important Architectural Message

The Patient Lookup page should communicate this distinction clearly:

```text
                    RAW IDENTITY
                         │
                         │
                    NID entered
                         │
                         ▼
              Identity Resolution Layer
                         │
                         ▼
                 SubjectCommitment
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           Policy A   Policy B   Policy C
              │          │          │
              └──────────┬─────────┘
                         ▼
                   Provider View
                  (authorized data)
```

The blockchain is therefore **not a searchable database of NIDs**.

It stores/uses the commitment-based representation and protocol state, while sensitive identity information remains in the appropriate private/off-chain layer.

---

# 21. Final Page Specification

The finished Patient Lookup page should contain:

```text
PATIENT LOOKUP

[ NID __________________ ] [ Verify Identity ]

             ↓

      RESOLVING BENEFICIARY
      ✓ Credential verified
      ✓ NID processed
      ✓ Commitment resolved
      ✓ Policies located
      ✓ Access checked

             ↓

      PATIENT FOUND ✓

      Rahim
      Identity Verified

      Subject: SUBJ-••••91A2

      ACTIVE POLICIES

      POL-1001
      Insurer A
      Hospitalization
      ACTIVE

      POL-2001
      Insurer B
      Hospitalization
      ACTIVE

      [ View Coverage ]
      [ Assert New Event ]

             ↓

      ASSERT NEW EVENT
```

The core principle is:

> **NID is an input to authorized identity resolution, not a blockchain lookup key. The deterministic SubjectCommitment links the beneficiary to their separate policy records, and the provider sees only the information their role permits.**
