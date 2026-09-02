## 2. Backend Consistency Audit

*Auditing `chaincode/obhoycc`, `services/`, `httpapi/server.go`*

The backend implementation is **100% faithful and consistent** with the Whitepaper specification:

### 1. Smart Contracts (`chaincode/obhoycc/contracts/`):

- **`EventRegistry`**: Implements `openEvent`, `attestEvent`, `continueEvent`, `closeEvent`. Checks duplicate `eventKey` at commit time (Mechanism 1).
- **`ClaimSettlement`**: Implements `CreateEntitlement`, `Adjudicate`, `AuthoriseSettlement`, `Deny`, `Appeal`, `PanelDecision`. Enforces arithmetic coordination of benefits (Equation 1).
- **`GovernanceCouncil`**: Implements Nakamoto Coefficient ($\text{NC} = 3$) and Gini Coefficient ($G = 0.14$) calculations across 5 stakeholder classes.
- **`TransparencyLedger`**: Builds Merkle trees for period totals and records public chain anchors.

### 2. Off-Chain Services (`services/src/`):

- **`custodian/` & `shared/shamir.js`**: Real 2-of-3 Shamir threshold key reconstruction.
- **`commitment/`**: Keyed-PRF HMAC calculation service.
- **`anchor/`**: Rebuilds period Merkle roots independently of the chaincode.

### 3. HTTP REST API (`chaincode/obhoycc/internal/httpapi/server.go`):

- Exposes all contract methods over HTTP on port `7545`.
- Enforces role-based identity checks via the `X-Obhoy-MSP` request header (`ProviderMSP`, `ClinicalMSP`, `FieldMSP`, `InsurerAMSP`, `InsurerBMSP`, `RegulatorMSP`, `AcademicMSP`, `PanelMSP`).


---

## 3. Frontends Comparison & Compatibility Analysis

Comparing `web/` (integrated), `frontend/` (target UI), and `Obhoy_Complete_Website_Flow.md`

### High-Level Gap Assessment

- **`web/` (Integrated Frontend)**: Communicates directly with the Go REST API (`/api/...`) via `web/js/api.js`. It passes `X-Obhoy-MSP` headers and reacts to live chaincode transaction events.
- **`frontend/` (Vite + React + TS)**: Designed according to `Obhoy_Complete_Website_Flow.md`. It features a modern design system, but is currently driven by a **local memory simulation store (`simulationStore.ts`)** rather than connecting to the live Go backend endpoints.

---

### Detailed Compatibility & Feature Matrix

| Feature / Workflow | Whitepaper & Backend Capability | `Obhoy_Complete_Website_Flow.md` Plan | `frontend/` Implementation Status | Compatibility & Fix Required for `frontend/` |
|---|---|---|---|---|
| **Role Authentication & MSP** | Headers: `X-Obhoy-MSP` (`ProviderMSP`, `InsurerAMSP`, etc.) | Role switcher dropdown | `authStore.ts` manages roles locally | **Missing API Header:** Needs `api.ts` adapter sending `X-Obhoy-MSP` to `http://localhost:7545`. |
| **Public Transparency Explorer** | `/api/periods`, `/api/periods/proof`, `/api/ledger/state` | Insurer settlement ratios, Merkle roots, proof lookup | `TransparencyExplorer.tsx`, `VerifyRecord.tsx` present | **Missing Real Proof Connection:** `VerifyRecord.tsx` displays mock text. Fix by fetching `/api/periods/proof`. |
| **NID / Enrollment Flow** | Off-chain keyed-PRF HMAC (`/api/subjects`) + `IssuePolicy` | NID verification form (`/enroll/identity`), `$\\rightarrow$` `${rightarrow}` Consent `${rightarrow}` Payment | `Enrollment.tsx` wizard exists | **Data Transformation Needed:** Form NID should call off-chain PRF service (`:7560`) to generate `SubjectCommitment` before passing it to the ledger. |
| **Event Creation & Uniqueness** | `openEvent` in `eventregistry.go` returns 422 `Unprocessable Entity` if key exists | Pause animation + uniqueness check indicator | `AssertEvent.tsx` handles simulation state | **Connect to `/api/events/open`:** Map form fields to `POST` payload; display backend refusal message on duplicate. |
| **Event Continuation (Transfer)** | `ContinueEvent` adds admission segment to open event | Hospital transfer scenario (Scenario 4) | `ContinueEvent.tsx` page exists | **Connect to `/api/events/continue`:** Post `eventId`, `providerId`, `kind`, and `attestedBy`. |
| **Multi-Class Attestation** | `AttestEvent` (2-of-3 quorum check with $g_1$ non-payee) | Verifier queue, 2-of-3 indicator | `VerificationQueue.tsx` | **Connect to `/api/events/attest`:** Switch `X-Obhoy-MSP` to `ClinicalMSP` or `FieldMSP` during attestation. |
| **Entitlement & Settlement** | `CreateEntitlement` $\rightarrow$ `Adjudicate` $\rightarrow$ `AuthoriseSettlement` | Insurer adjudication & settlement screens | `EventQueue.tsx`, `Settlement.tsx` in `pages/insurer/` | **Connect to `/api/entitlements/*`:** Call `adjudicate` and `settle` endpoints using `InsurerAMSP`. |
| **Appeals & Panel Review** | `Appeal` $\rightarrow$ `PanelDecision` | Policyholder appeal & independent panel decision | `Appeal.tsx`, `AppealsMonitoring.tsx` present | **Connect to `/api/entitlements/appeal` & `/panel`:** Use `PanelMSP` for panel decision actions. |
| **Regulator & Audit Metrics** | `/api/governance/metrics` (Nakamoto, Gini), `/api/ledger/state` | Aggregate health overview, insurer drill-down | `RegulatorDashboard.tsx` exists | **Missing Governance Visuals:** Add Nakamoto coefficient ($NC=3$) and Gini ($G=0.14$) charts from `/api/governance/metrics`. |

---

## 4. Summary of Gaps & Action Plan for `frontend/`

### 1. What is in `frontend/` / Spec but NOT in Backend (Frontend-Only Concerns)

- **Raw NID Input & DoB Forms:** The backend strictly avoids raw NIDs for privacy compliance. The frontend form is an off-chain input layer that must hash the NID into a `SubjectCommitment` before passing it to the ledger.
- **Simulated MFS Checkout UI:** The backend authorizes payouts; actual payment execution occurs off-ledger. The frontend payment screens simulate the mobile money interaction.

### 2. What is in Backend but NOT yet shown in `frontend/`

- **Raw World State Privacy Explorer:** The backend endpoint `/api/ledger/state` exposes every raw key-value pair to prove zero PHI is stored on-chain. This is a key paper argument missing from `frontend/`.
- **Merkle Leak Proof Generator:** Endpoint `/api/periods/proof` returns exact Merkle audit paths.
- **Governance Council & Nakamoto/Gini Metrics:** Endpoints `/api/governance/metrics` and `/api/governance/proposals` provide real-time decentralization measurements.
- **Off-Chain Service Health & Anomaly Scoring:** Endpoints on ports `7560–7565` (Shamir custodians, commitment, anchoring, anomaly scoring flags).

### 3. Recommended Integration Approach (Keeping Backend Intact)

1. **Add API Adapter (`frontend/src/lib/api.ts`):** Create a lightweight fetch wrapper modeled after `web/js/api.js` pointing to `http://localhost:7545`.
2. **Inject `X-Obhoy-MSP` Header:** Automatically append the appropriate Fabric MSP according to the active role in `authStore.ts`.
3. **Connect Just the Backend to API:** Replace local transitions in `simulationStore.ts` with real API calls (`api.openEvent`, `api.attestEvent`, `api.authoriseSettlement`, etc.).
4. **Enhance Public & Regulator Pages:** Add real Merkle proof verification to `VerifyRecord.tsx` and render live governance metrics in `RegulatorDashboard.tsx`.

**Note:** All code and backend services remain completely unchanged and running on `http://localhost:7545`.

Solution:

NID ISSUE:

How the Frontend MUST handle NID Input Correctly
When a user types their NID into a frontend input box, the frontend must execute this 3-step sequence:

[ User enters NID in Form ] 
           │
           ▼
1. POST to Off-Chain Service (http://localhost:7560/commit)
   { "nid": "1995123456789", "context": "event" }
           │
           ▼
2. Commitment Service reconstructs Kv (2-of-3 custodians)
   and returns: { "commitment": "6d0e01e663cdbe21f8e6af01..." }
           │
           ▼
3. Frontend discards raw NID and sends ONLY the 64-char commitment 
   to the Blockchain Backend (http://localhost:7545/api/events/open)
   { "subjectCommitment": "6d0e01e663cdbe21f8e6af01..." }

PAYMENT ISSUE

To make the Simulated MFS Checkout UI in frontend/ 100% compatible with the backend architecture, you need to understand the structural separation between On-Chain Authorization and Off-Chain MFS Execution.

Architectural Principle (Why it's designed this way)
"The ledger authorizes payment; it does not execute it."

On-Chain (chaincode/obhoycc): The blockchain smart contract (AuthoriseSettlement) verifies policy validity, 2-of-3 attestation quorums, and dual-cover limits. Once satisfied, it consumes (burns) the entitlement on-chain. It requires a settlementRef (the MFS transaction receipt ID).
Off-Chain (services/src/mfs/index.js on port 7562): The mock MFS Adapter simulates bKash/Nagad/Rocket APIs. It enforces payload-bound idempotency so network retries cannot cause double-payouts.

Step-by-Step Frontend Integration Flow
When the user triggers a payment/payout in the frontend/ UI, execute this exact 4-step sequence:

[ Frontend Payment UI (e.g. Insurer Settlement / Policyholder Receipt) ]
                               │
                               ▼ Step 1: Execute Off-Chain MFS Payout
[ POST http://localhost:7562/disburse ]
  Body: {
    "requestId": "REQ-ENT1001-01",
    "payload": {
      "msisdn": "01700000000",
      "amount": 5000000,          // in paisa (BDT 50,000)
      "entitlementId": "ENT-1001"
    }
  }
                               │
                               ▼ Step 2: MFS Returns Receipt
  Response: {
    "ok": true,
    "receipt": {
      "receiptId": "BKXA9F312B",  // bKash transaction reference
      "state": "SETTLED"
    }
  }
                               │
                               ▼ Step 3: Record Settlement on Blockchain DLT
[ POST http://localhost:7545/api/entitlements/settle ]
  Headers: { "X-Obhoy-MSP": "InsurerAMSP" }
  Body: {
    "entitlementId": "ENT-1001",
    "settlementRef": "BKXA9F312B" // Payload-bound reference from Step 2
  }
                               │
                               ▼ Step 4: Render UI State
  Display "✓ Payment Completed (Ref: BKXA9F312B)" on Frontend

Handling Edge Case: Payment Uncertainty / Reconciliation
If the MFS network returns PENDING (e.g., simulated timeout via POST http://localhost:7562/admin/next-pending):

1. The frontend should NOT retry the POST request blindly (which could cause double payment).
2. The UI displays "Payment Processing / Pending Verification".
3. To resolve it, the frontend calls the MFS reconciliation endpoint:
    GET http://localhost:7562/reconciliation (checks daily settlement file).
    POST http://localhost:7562/reconcile with { "requestId": "REQ-ENT1001-01", "outcome": "SETTLED" }.
4. Once reconciled, pass the confirmed receiptId to the blockchain (/api/entitlements/settle).