# Obhoy Frontend Prototype — Implementation Plan

## 1. Prototype goal

This project is **frontend-only**. We are not implementing Hyperledger Fabric, chaincode, real KYC, real payment rails, real MFS APIs, or real blockchain anchoring.

Instead, the website will behave like a **deterministic simulation of the Obhoy protocol**.

The prototype must let a judge/user experience the complete story:

> Enrolment → Policy → Hospital Event → Event Uniqueness → Independent Attestation → Quorum → Insurer Adjudication → Entitlement → Settlement → Payment → Transparency → Public Verification

It must also demonstrate the important exceptional flows:

- duplicate event detection
- legitimate second policy / dual coverage
- hospital transfer / `continueEvent`
- insufficient quorum
- denied claim
- independent appeal
- payment pending / reconciliation
- provider accreditation/revocation history
- regulator/auditor visibility
- public transparency and anchor verification

The whitepaper's claim lifecycle is admission → attestation → quorum → settlement → transparency publication, with a two-of-three attestation quorum and at least one non-payee class. The architecture separates the event from the entitlement so a second legitimate policy can claim against the same event. [Whitepaper references: Fig. 10 and Fig. 11]

---

# 2. Core design principle

Do **not** build a collection of unrelated dashboards.

Build a **single simulation engine + multiple role-specific views**.

The same simulated objects must be visible from different perspectives.

Example:

```text
Rahim
  │
  └── Policy POL-1001
          │
          └── Event EVT-1001
                  │
                  ├── Hospital assertion
                  ├── Clinical attestation
                  ├── Field attestation
                  │
                  ├── Entitlement ENT-1001
                  │       └── Settlement SET-1001
                  │
                  └── Transparency record
```

If the provider creates `EVT-1001`, the verifier, insurer, policyholder, regulator, and public explorer must all eventually see **that same event ID**.

That is what makes the prototype feel like one system rather than a mockup.

---

# 3. Recommended stack

Use a simple modern React stack:

```text
React
TypeScript
Vite
React Router
Tailwind CSS
Zustand
Lucide React
```

Optional:

```text
Recharts
```

for regulator/insurer charts.

### Why this stack?

- React + Vite: fast prototype development.
- TypeScript: prevents inconsistent event/policy state.
- React Router: clean role/page navigation.
- Tailwind: fast UI iteration.
- Zustand: one shared simulation state across all role portals.
- Lucide: consistent icons.
- Recharts: useful for transparency and regulatory dashboards.

Do not introduce a real backend yet.

---

# 4. High-level architecture

```text
                    ┌──────────────────────┐
                    │       React UI       │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
          Role-specific pages          Story/demo pages
                 │                           │
                 └─────────────┬─────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Zustand Store       │
                    │  Simulation State    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Simulation Engine    │
                    │                      │
                    │ openEvent()          │
                    │ continueEvent()      │
                    │ attestEvent()        │
                    │ checkQuorum()        │
                    │ createEntitlement()  │
                    │ authorizeSettlement()│
                    │ processPayment()     │
                    │ publishTransparency()│
                    │ createAppeal()       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Local Mock Data       │
                    │ localStorage          │
                    └──────────────────────┘
```

The simulation engine is the most important part.

The UI should never directly mutate an event from arbitrary pages.

Instead:

```text
Button
   ↓
simulation action
   ↓
state transition
   ↓
timeline event
   ↓
UI updates everywhere
```

This makes the prototype internally consistent.

---

# 5. Project structure

Recommended structure:

```text
obhoy/
│
├── public/
│   ├── logo.svg
│   └── favicon.svg
│
├── src/
│   │
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   └── providers.tsx
│   │
│   ├── assets/
│   │   └── ...
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Progress.tsx
│   │   │   ├── Timeline.tsx
│   │   │   └── DataTable.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── PublicNavbar.tsx
│   │   │   ├── PortalSidebar.tsx
│   │   │   ├── PortalHeader.tsx
│   │   │   └── PageContainer.tsx
│   │   │
│   │   ├── workflow/
│   │   │   ├── WorkflowStepper.tsx
│   │   │   ├── EventStatusCard.tsx
│   │   │   ├── AttestationPanel.tsx
│   │   │   ├── QuorumIndicator.tsx
│   │   │   ├── EntitlementCard.tsx
│   │   │   ├── SettlementCard.tsx
│   │   │   ├── VerificationTimeline.tsx
│   │   │   └── TrustProof.tsx
│   │   │
│   │   └── demo/
│   │       ├── StoryModeBar.tsx
│   │       ├── ScenarioSelector.tsx
│   │       └── SimulationControls.tsx
│   │
│   ├── pages/
│   │   │
│   │   ├── public/
│   │   │   ├── Home.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── Products.tsx
│   │   │   ├── InsurerComparison.tsx
│   │   │   ├── TransparencyExplorer.tsx
│   │   │   └── VerifyRecord.tsx
│   │   │
│   │   ├── policyholder/
│   │   │   ├── Enrollment.tsx
│   │   │   ├── IdentityVerification.tsx
│   │   │   ├── PolicyDashboard.tsx
│   │   │   ├── PolicyDetails.tsx
│   │   │   ├── MyEvents.tsx
│   │   │   ├── EventDetails.tsx
│   │   │   ├── PaymentReceipt.tsx
│   │   │   └── Appeal.tsx
│   │   │
│   │   ├── provider/
│   │   │   ├── ProviderDashboard.tsx
│   │   │   ├── PatientLookup.tsx
│   │   │   ├── AssertEvent.tsx
│   │   │   ├── ExistingEvent.tsx
│   │   │   ├── ContinueEvent.tsx
│   │   │   └── ProviderHistory.tsx
│   │   │
│   │   ├── verifier/
│   │   │   ├── VerificationQueue.tsx
│   │   │   ├── VerifyEvent.tsx
│   │   │   └── AttestationHistory.tsx
│   │   │
│   │   ├── insurer/
│   │   │   ├── InsurerDashboard.tsx
│   │   │   ├── EventQueue.tsx
│   │   │   ├── EntitlementDetails.tsx
│   │   │   ├── Adjudication.tsx
│   │   │   ├── Settlement.tsx
│   │   │   ├── ProviderAnalytics.tsx
│   │   │   └── Transparency.tsx
│   │   │
│   │   └── regulator/
│   │       ├── RegulatorDashboard.tsx
│   │       ├── InsurerMonitoring.tsx
│   │       ├── ProviderMonitoring.tsx
│   │       ├── AppealsMonitoring.tsx
│   │       └── Audit.tsx
│   │
│   ├── data/
│   │   ├── seedData.ts
│   │   ├── insurers.ts
│   │   ├── providers.ts
│   │   ├── users.ts
│   │   ├── scenarios.ts
│   │   └── transparency.ts
│   │
│   ├── simulation/
│   │   ├── engine.ts
│   │   ├── transitions.ts
│   │   ├── validators.ts
│   │   ├── scenarioRunner.ts
│   │   └── timeline.ts
│   │
│   ├── store/
│   │   ├── simulationStore.ts
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   │
│   ├── types/
│   │   ├── policy.ts
│   │   ├── event.ts
│   │   ├── entitlement.ts
│   │   ├── settlement.ts
│   │   ├── actor.ts
│   │   ├── transparency.ts
│   │   └── simulation.ts
│   │
│   ├── lib/
│   │   ├── ids.ts
│   │   ├── dates.ts
│   │   ├── format.ts
│   │   └── storage.ts
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   └── main.tsx
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

# 6. Data model

The frontend needs protocol-like objects even though there is no blockchain.

## Policy

```ts
type PolicyStatus = "PENDING" | "ACTIVE" | "LAPSED" | "REVOKED";

interface Policy {
  id: string;
  holderId: string;
  insurerId: string;
  product: string;
  benefitCap: number;
  scheduleVersion: string;
  status: PolicyStatus;
  startDate: string;
  endDate: string;
}
```

## Event

```ts
type EventStatus =
  | "DRAFT"
  | "OPEN"
  | "CLOSED_ELIGIBLE"
  | "CLOSED_INELIGIBLE";

interface InsurableEvent {
  id: string;
  eventKey: string;
  holderId: string;
  admissionWindow: string;
  providerId: string;
  status: EventStatus;
  segments: EventSegment[];
  attestations: Attestation[];
  timeline: TimelineEntry[];
}
```

## Event segment

```ts
interface EventSegment {
  id: string;
  providerId: string;
  facilityName: string;
  admittedAt: string;
  type: "INITIAL" | "TRANSFER" | "READMISSION";
}
```

This is needed to demonstrate `continueEvent()`.

## Attestation

```ts
type AttesterClass =
  | "PROVIDER"
  | "CLINICAL"
  | "FIELD";

interface Attestation {
  id: string;
  eventId: string;
  actorId: string;
  actorClass: AttesterClass;
  timestamp: string;
  status: "VALID" | "REJECTED";
}
```

## Entitlement

```ts
type EntitlementStatus = "OPEN" | "AUTHORIZED" | "SETTLED" | "DENIED";

interface Entitlement {
  id: string;
  eventId: string;
  policyId: string;
  insurerId: string;
  amount: number;
  status: EntitlementStatus;
  denialReason?: string;
}
```

This is deliberately separate from `InsurableEvent`.

That separation is one of the central claims of the whitepaper.

## Settlement

```ts
type SettlementStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "PROCESSING"
  | "SETTLED"
  | "RECONCILIATION_REQUIRED";

interface Settlement {
  id: string;
  entitlementId: string;
  amount: number;
  rail: "BKASH" | "NAGAD" | "ROCKET";
  status: SettlementStatus;
  reference?: string;
}
```

## Appeal

```ts
interface Appeal {
  id: string;
  entitlementId: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "UPHELD" | "OVERTURNED";
  reason: string;
  panel: string[];
  decision?: string;
}
```

---

# 7. The simulation engine

This is where the prototype becomes convincing.

Implement actions such as:

```ts
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
resolveAppeal()
publishTransparency()
verifyAnchor()
```

Each action should:

1. Validate current state.
2. Change state.
3. Add a timeline entry.
4. Return a result for the UI.

Example:

```text
openEvent()
    ↓
calculate mock eventKey
    ↓
search existing OPEN event
    ↓
if found:
    return EXISTING_EVENT
else:
    create event
    return EVENT_CREATED
```

The UI then renders the appropriate story.

---

# 8. Never fake protocol rules only in visual components

Bad:

```tsx
if (attestations.length >= 2) {
  setStatus("CLOSED_ELIGIBLE");
}
```

inside a React component.

Good:

```text
UI
 ↓
simulationEngine.attestEvent()
 ↓
validators.checkQuorum()
 ↓
state transition
 ↓
timeline
 ↓
UI
```

This means every page is observing the same simulated protocol.

---

# 9. State machine

Use explicit states.

## Event

```text
OPEN
 │
 ├── duplicate → EXISTING_EVENT
 │
 ├── insufficient attestation → OPEN
 │
 └── quorum satisfied
          ↓
   CLOSED_ELIGIBLE
```

## Entitlement

```text
OPEN
 │
 ├── DENY → DENIED
 │
 └── AUTHORIZE
        ↓
   AUTHORIZED
        ↓
   SETTLEMENT
        ↓
     SETTLED
```

## Settlement

```text
AUTHORIZED
     ↓
PROCESSING
     │
     ├── success → SETTLED
     │
     └── unknown outcome
             ↓
       RECONCILIATION_REQUIRED
             ↓
          CONFIRMED
```

---

# 10. Build a "Story Mode"

This should be the centerpiece of the BCOLBD prototype.

Add a persistent top bar:

```text
OBHOY DEMO

Rahim's Journey

01 Enrol
02 Policy
03 Hospital
04 Verify
05 Quorum
06 Adjudicate
07 Pay
08 Transparency

[Reset] [Next]
```

The judge can press:

> Next

and the application moves through the story.

At each step, the relevant role/page opens.

Example:

```text
Step 03
Provider Portal

"Rahim has been admitted."

[ Assert Event ]
```

Then:

```text
Step 04
Verification

"Independent verification required."

[ Clinical Attest ]
[ Field Attest ]
```

Then:

```text
Step 05
Quorum

2 of 3 classes satisfied ✓

[ Continue ]
```

Then:

```text
Step 06
Insurer

"Eligible entitlement detected."

[ Authorize BDT 50,000 ]
```

This makes the entire demonstration controllable during judging.

---

# 11. Scenario system

Create predefined scenarios rather than relying only on free navigation.

## Scenario 1 — Happy path

```text
Rahim
→ enrol
→ policy active
→ hospital admission
→ event created
→ clinical attestation
→ field attestation
→ quorum
→ entitlement
→ settlement
→ payment
→ transparency
```

## Scenario 2 — Duplicate event

```text
Hospital A
→ creates EVT-1001

Hospital B
→ tries to create same event

Obhoy:
"Existing event found."

→ no second event created
```

## Scenario 3 — Dual policy

```text
Event EVT-1001

Policy A
→ entitlement
→ BDT 30,000 settled

Policy B
→ same event
→ new entitlement
→ BDT 20,000 available

No second event.
```

## Scenario 4 — Hospital transfer

```text
Upazila Hospital
→ creates EVT-1001

District Hospital
→ detects existing event

→ Continue Event

EVT-1001
├── Segment 1
└── Segment 2
```

## Scenario 5 — Insufficient quorum

```text
Provider ✓
Clinical —
Field —

1 / 3

Cannot settle.
```

Then:

```text
Field verifier ✓

2 / 3

Quorum satisfied.
```

## Scenario 6 — Denial + appeal

```text
Event verified
→ insurer denies
→ policyholder appeals
→ independent panel
→ denial overturned
→ settlement
```

## Scenario 7 — Payment uncertainty

```text
Authorized
→ processing
→ unknown outcome
→ reconciliation
→ payment confirmed
```

These scenarios are more valuable than adding dozens of static pages.

---

# 12. Navigation model

Use two navigation modes.

## Mode A — Normal product navigation

```text
Public
Policyholder
Provider
Verifier
Insurer
Regulator
```

A role switcher can be placed in the demo header:

```text
Viewing as:
[ Policyholder ▼ ]
```

This is acceptable for a prototype and avoids implementing real authentication.

## Mode B — Story Mode

Story Mode automatically switches role and page according to the scenario.

Example:

```text
Story Step 4
→ automatically opens Verifier / Verify Event
```

The user can still manually jump to any role.

---

# 13. Public pages

Build these first:

### `/`

Hero:

> Insurance you can verify.

CTA:

> Start Demo

### `/how-it-works`

Show:

```text
Event
 ↓
Attestation
 ↓
Quorum
 ↓
Entitlement
 ↓
Settlement
 ↓
Transparency
```

### `/products`

Show the health pilot.

Use labels such as:

> Illustrative prototype values

because the whitepaper's product figures are planning assumptions rather than deployed pricing.

### `/transparency`

Interactive insurer comparison.

### `/verify`

Mock public-anchor verification.

---

# 14. Policyholder pages

The policyholder should have the simplest UI.

### Dashboard

```text
Coverage
ACTIVE ✓

Benefit
BDT 50,000

Current event
EVT-1001

Status
Payment complete
```

### Event details

Show the verification timeline.

### Payment receipt

Show:

```text
Amount
Payment rail
Reference
Event ID
Entitlement ID
Verification status
```

### Appeal

Only appears when the entitlement is denied.

---

# 15. Provider pages

Provider can:

- search beneficiary
- view active policy status
- assert an event
- detect existing event
- continue an existing event
- attest to event
- view accreditation status

Provider cannot:

- authorize payment
- settle an entitlement

That role restriction should be visibly demonstrated.

Example:

```text
Settlement

🔒 Provider accounts cannot authorize payment.
```

The whitepaper explicitly separates provider assertion from insurer adjudication.

---

# 16. Verifier pages

Verifier gets:

```text
Verification Queue
```

Click event:

```text
Event details
Evidence summary
Attestation form
```

The UI should deliberately hide clinical details from a field verifier.

Use two mock verifier modes:

```text
Clinical Verifier
Field Verifier
```

This makes the two-of-three quorum visually obvious.

---

# 17. Insurer pages

Insurer gets:

```text
Event Queue
Entitlement Queue
Adjudication
Settlement
Analytics
Transparency
```

Important distinction:

```text
EVENT
EVT-1001
```

versus:

```text
ENTITLEMENT
ENT-1001
Policy: POL-1001
Amount: BDT 50,000
```

The insurer should never be shown a generic "claim = event" model.

---

# 18. Regulator pages

Show network-level monitoring:

```text
Active policies
Events
Claims
Settlement ratio
Denial ratio
Appeals
Average settlement time
Provider anomalies
```

Allow:

```text
Regulator
→ Insurer A
→ Provider B
→ Event statistics
```

The academic auditor view should be even more restricted:

```text
Totals only
```

This reflects the whitepaper's audit-channel separation.

---

# 19. Transparency Explorer

This should be publicly accessible without login.

Example:

```text
Insurer A

Claims received       1,240
Settled               1,135
Denied                  105

Settlement ratio       91.5%
Median settlement       2.1 days

Period
August 2026

Transparency anchor
✓ Verified
```

Click:

> Verify anchor

Then show:

```text
Period totals
    ↓
Merkle root
    ↓
Public anchor
    ↓
✓ Match confirmed
```

This is a simulation, so clearly label:

> Prototype verification — simulated public anchor

Do not imply that a real Polygon/Bitcoin transaction exists.

---

# 20. The most important reusable UI component

Create:

## `VerificationTimeline`

It should be reusable in:

- policyholder event page
- insurer entitlement page
- regulator event view
- public demo

Example:

```text
✓ Identity verified
      ↓
✓ Provider accredited
      ↓
✓ Event uniqueness check
      ↓
✓ Hospital attestation
      ↓
✓ Clinical attestation
      ↓
✓ 2-of-3 quorum
      ↓
✓ Policy eligibility
      ↓
✓ Entitlement authorized
      ↓
✓ Payment confirmed
```

This single component can communicate most of Obhoy's value proposition.

---

# 21. Build a "Why?" drawer

Whenever an important state changes, allow:

> Why?

Example:

```text
EVENT CREATED ✓

Why?

No open event was found for this
policyholder and admission window.

This prevents another insurer from
creating a competing event for the
same real-world episode.
```

Another:

```text
QUORUM SATISFIED ✓

2 of 3 attesting classes have signed.

Provider       ✓
Clinical       ✓
Field          —

At least one non-payee class is present.
```

This makes the prototype educational instead of merely decorative.

---

# 22. Error states are essential

A protocol demo is much stronger when it demonstrates refusal.

Implement explicit states:

### Duplicate

```text
Event already exists.

No new event was created.

[View existing event]
```

### Insufficient quorum

```text
Settlement blocked.

Required:
2 of 3 attesting classes

Current:
1 of 3
```

### Provider cannot settle

```text
Action unavailable.

Providers may assert and attest,
but cannot authorize settlement.
```

### Insurer cannot adjudicate another insurer's policy

```text
Access restricted.

This entitlement belongs to Insurer B.
```

### Field verifier sees no clinical data

```text
Clinical information
Not available to this role.
```

These are not cosmetic errors. They demonstrate the protocol's access-control and invariant claims.

---

# 23. Visual language

Use a calm, trustworthy financial/healthcare visual system.

Suggested:

```text
Background: warm/off-white
Primary: deep green
Accent: teal
Text: dark charcoal
Success: green
Warning: amber
Error: red
```

Keep the UI clean.

Avoid:

- excessive blockchain imagery
- crypto coin visuals
- glowing chain graphics
- fake "Web3" aesthetics
- unnecessary technical jargon

Obhoy is insurance infrastructure, not a cryptocurrency product.

---

# 24. Blockchain visibility

Do not hide the blockchain completely.

Instead, provide a secondary:

> Technical proof

drawer.

Normal user sees:

```text
✓ Event verified
```

Technical viewer can expand:

```text
Event ID
Event key
Attestations
Endorsement status
Ledger transaction
Block number
Channel
```

Since this is a frontend prototype, label them:

> Simulated Fabric record

This lets judges see that the UI corresponds to the proposed architecture without pretending that a real Fabric network is running.

---

# 25. Implementation phases

## Phase 0 — Project setup

Tasks:

- initialize Vite
- install dependencies
- configure Tailwind
- configure routing
- configure TypeScript
- create base layout
- create theme

Deliverable:

```text
Empty Obhoy application
```

---

## Phase 1 — Design system

Build:

- Button
- Card
- Badge
- Modal
- Input
- Select
- Tabs
- Table
- Timeline
- Stepper
- Toast
- Empty state
- Error state

Deliverable:

```text
Reusable Obhoy UI kit
```

---

## Phase 2 — Domain model

Implement TypeScript types:

```text
Actor
Policy
Event
EventSegment
Attestation
Entitlement
Settlement
Appeal
TransparencyRecord
TimelineEntry
```

Deliverable:

```text
Strongly typed simulation domain
```

---

## Phase 3 — Simulation engine

Implement:

```text
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
resolveAppeal()
publishTransparency()
verifyAnchor()
```

Deliverable:

```text
Functional fake protocol
```

This is the most important engineering phase.

---

## Phase 4 — Seed scenario

Create one complete scenario:

```text
Rahim
→ policy
→ hospitalization
→ verification
→ settlement
→ transparency
```

Do not build all dashboards yet.

Deliverable:

```text
One complete working story
```

---

## Phase 5 — Policyholder portal

Build:

- enrollment
- identity verification
- dashboard
- policy
- event timeline
- payment receipt
- appeal

Deliverable:

```text
Complete policyholder experience
```

---

## Phase 6 — Provider + verifier portals

Build:

- provider dashboard
- patient lookup
- assert event
- duplicate detection
- continue event
- verification queue
- clinical attestation
- field attestation

Deliverable:

```text
Complete event creation + verification workflow
```

---

## Phase 7 — Insurer portal

Build:

- event queue
- entitlement queue
- adjudication
- denial
- settlement
- payment status
- provider analytics

Deliverable:

```text
Complete insurer workflow
```

---

## Phase 8 — Regulator + auditor

Build:

- network dashboard
- insurer monitoring
- provider monitoring
- appeals
- aggregate audit view

Deliverable:

```text
Oversight experience
```

---

## Phase 9 — Public transparency

Build:

- insurer comparison
- transparency explorer
- record verification
- simulated Merkle root
- simulated public anchor

Deliverable:

```text
Public accountability experience
```

---

## Phase 10 — Edge-case scenarios

Implement and polish:

1. Duplicate event.
2. Dual insurance.
3. Hospital transfer.
4. Insufficient quorum.
5. Claim denial.
6. Appeal.
7. Payment uncertainty.
8. Provider revocation.

Deliverable:

```text
Protocol edge-case demonstration
```

---

## Phase 11 — Story Mode

Create:

```text
ScenarioSelector
StoryModeBar
Next button
Previous button
Reset button
```

Story Mode should drive the same simulation engine used by the normal application.

Deliverable:

```text
One-click BCOLBD demonstration
```

---

## Phase 12 — Final polish

Add:

- loading states
- transitions
- responsive layout
- empty states
- error states
- simulated notifications
- technical proof drawer
- "why?" explanations
- demo reset
- sample data reset

Deliverable:

```text
Presentation-ready prototype
```

---

# 26. What NOT to implement

Do not waste time building:

- Hyperledger Fabric
- Fabric peers
- real chaincode
- real MSPs
- real Idemix
- real HSM
- real NID API
- real HMIS integration
- real bKash API
- real Nagad API
- real Rocket API
- real Polygon transaction
- real Merkle infrastructure
- production authentication
- production KYC

The prototype should simulate their **observable effects**.

For example:

```text
Real:
National ID API
      ↓
identity verified

Prototype:
Mock NID service
      ↓
identity verified
```

And:

```text
Real:
Fabric EventRegistry
      ↓
openEvent()
      ↓
ledger state

Prototype:
simulationStore
      ↓
openEvent()
      ↓
local state
```

The interface and state transitions remain conceptually aligned.

---

# 27. Prototype honesty

Every simulated infrastructure element should be labelled when necessary.

Examples:

```text
SIMULATED
Fabric transaction
```

```text
SIMULATED
Public anchor
```

```text
DEMO
MFS payment
```

Never claim that a real blockchain transaction happened.

The prototype demonstrates:

> "This is how the proposed system would behave."

not:

> "This blockchain network is currently operating."

---

# 28. Definition of done

The prototype is ready when a judge can perform this sequence without explanation:

```text
Home
 ↓
Start Demo
 ↓
Enroll Rahim
 ↓
Activate policy
 ↓
Hospital admits Rahim
 ↓
Provider asserts event
 ↓
Event ID appears
 ↓
Verifier attests
 ↓
Quorum becomes 2/3
 ↓
Insurer sees entitlement
 ↓
Insurer authorizes
 ↓
Payment completes
 ↓
Rahim receives receipt
 ↓
Public transparency updates
 ↓
Judge verifies anchor
```

Then the judge should be able to switch to:

```text
Duplicate Scenario
```

and immediately see:

```text
EVENT ALREADY EXISTS
```

Then:

```text
Dual Policy Scenario
```

and see:

```text
ONE EVENT
   ├── Entitlement A
   └── Entitlement B
```

Then:

```text
Transfer Scenario
```

and see:

```text
ONE EVENT
   ├── Admission Segment 1
   └── Admission Segment 2
```

That is the core demonstration.

---

# 29. Final development order

Do not build pages randomly.

Follow this exact order:

```text
1. Setup
      ↓
2. Design system
      ↓
3. Types
      ↓
4. Simulation engine
      ↓
5. Seed data
      ↓
6. Happy-path story
      ↓
7. Policyholder
      ↓
8. Provider
      ↓
9. Verifier
      ↓
10. Insurer
      ↓
11. Regulator
      ↓
12. Public transparency
      ↓
13. Edge cases
      ↓
14. Story Mode
      ↓
15. Polish
```

The key dependency is:

> **Simulation engine before complex UI.**

If the engine is correct, every role page becomes a different window into the same simulated system.
