// Obhoy Blockchain & Off-Chain Services API Client
// Connects frontend to the Go Chaincode HTTP Node (:7545) and Off-chain services (:7560, :7562, :7565).
// Zero backend code is touched.

export const NODE_URL = 'http://localhost:7545';
export const COMMITMENT_URL = 'http://localhost:7560';
export const MFS_URL = 'http://localhost:7562';
export const ANCHOR_URL = 'http://localhost:7565';

export type FabricMSP =
  | 'ProviderMSP'
  | 'ClinicalMSP'
  | 'FieldMSP'
  | 'InsurerAMSP'
  | 'InsurerBMSP'
  | 'RegulatorMSP'
  | 'AcademicMSP'
  | 'PanelMSP';

export const ROLE_TO_MSP: Record<string, FabricMSP> = {
  PROVIDER: 'ProviderMSP',
  CLINICAL_VERIFIER: 'ClinicalMSP',
  FIELD_VERIFIER: 'FieldMSP',
  INSURER: 'InsurerAMSP',
  INSURER_A: 'InsurerAMSP',
  INSURER_B: 'InsurerBMSP',
  REGULATOR: 'RegulatorMSP',
  AUDITOR: 'AcademicMSP',
  POLICYHOLDER: 'FieldMSP',
  PUBLIC: 'AcademicMSP',
};

let activeMsp: FabricMSP = 'ProviderMSP';

export function setActiveMsp(msp: FabricMSP) {
  activeMsp = msp;
}

export function getActiveMsp(): FabricMSP {
  return activeMsp;
}

interface ApiResponse<T = any> {
  ok: boolean;
  function?: string;
  result?: T;
  events?: any[];
  error?: string;
  commitment?: string;
  receipt?: any;
  [key: string]: any;
}

async function request<T = any>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
  overrideMsp?: FabricMSP,
): Promise<ApiResponse<T>> {
  const msp = overrideMsp || activeMsp;
  const url = `${baseUrl}${path}`;
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (baseUrl === NODE_URL) {
    headers.set('X-Obhoy-MSP', msp);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: body.error || `HTTP ${res.status}: ${res.statusText}`,
        result: body.result,
      };
    }
    return body;
  } catch (err: any) {
    return {
      ok: false,
      error: err.message || 'Network connection to backend failed',
    };
  }
}

// ------------------------------------------------------------ API Methods
export const api = {
  // System Health
  health: () => request(NODE_URL, '/api/health'),

  // Domain Profiles & Schedules
  profiles: () => request(NODE_URL, '/api/profiles'),
  schedules: () => request(NODE_URL, '/api/schedules'),

  // Providers & Accreditation
  providers: () => request(NODE_URL, '/api/providers'),
  accreditProvider: (inData: { ProviderID: string; MSP: string; Class: string; DGHSRef: string }) =>
    request(NODE_URL, '/api/providers/accredit', { method: 'POST', body: JSON.stringify(inData) }, 'RegulatorMSP'),
  deaccreditProvider: (providerId: string, reason: string) =>
    request(NODE_URL, '/api/providers/deaccredit', { method: 'POST', body: JSON.stringify({ ProviderID: providerId, Reason: reason }) }, 'RegulatorMSP'),

  // Subjects / Identity Commitments
  registerSubject: (inData: { commitment: string; keyVersion: number; aggregatorId: string; context: string }) =>
    request(NODE_URL, '/api/subjects', { method: 'POST', body: JSON.stringify(inData) }, 'FieldMSP'),
  disclosures: () => request(NODE_URL, '/api/disclosures'),

  // Policies
  policiesForSubject: (subjectCommitment: string) =>
    request(NODE_URL, `/api/policies?subject=${encodeURIComponent(subjectCommitment)}`),
  getPolicy: (policyId: string) =>
    request(NODE_URL, `/api/policies?id=${encodeURIComponent(policyId)}`),
  issuePolicy: (policy: {
    policyId: string;
    subjectCommitment: string;
    poolId: string;
    type: string;
    benefitCap: number;
    waitingPeriodEnd: number;
    effectiveFrom: number;
    expiresAt: number;
  }) =>
    request(NODE_URL, '/api/policies/issue', { method: 'POST', body: JSON.stringify(policy) }, 'InsurerAMSP'),

  // Events
  events: (id?: string) =>
    request(NODE_URL, id ? `/api/events?id=${encodeURIComponent(id)}` : '/api/events'),
  eventHistory: (id: string) =>
    request(NODE_URL, `/api/events/history?id=${encodeURIComponent(id)}`),
  openForSubject: (subjectCommitment: string) =>
    request(NODE_URL, `/api/events/open-for-subject?subject=${encodeURIComponent(subjectCommitment)}`),
  openEvent: (inData: {
    line?: string;
    subjectCommitment: string;
    admissionWindow: string;
    asserterId: string;
    categoryCode: string;
    assessedLoss: number;
    benefitCapAggregate: number;
  }) =>
    request(NODE_URL, '/api/events/open', { method: 'POST', body: JSON.stringify(inData) }, 'ProviderMSP'),
  attestEvent: (inData: { EventID: string; AttesterID: string; SigRef: string }, msp: FabricMSP = 'ClinicalMSP') =>
    request(NODE_URL, '/api/events/attest', { method: 'POST', body: JSON.stringify(inData) }, msp),
  continueEvent: (inData: { EventID: string; ProviderID: string; Kind: string; AttestedBy: string }) =>
    request(NODE_URL, '/api/events/continue', { method: 'POST', body: JSON.stringify(inData) }, 'ProviderMSP'),
  closeEvent: (eventId: string) =>
    request(NODE_URL, '/api/events/close', { method: 'POST', body: JSON.stringify({ EventID: eventId }) }, 'ProviderMSP'),

  // Entitlements & Settlement
  entitlements: (eventId?: string) =>
    request(NODE_URL, eventId ? `/api/entitlements?event=${encodeURIComponent(eventId)}` : '/api/entitlements'),
  getEntitlement: (id: string) =>
    request(NODE_URL, `/api/entitlements?id=${encodeURIComponent(id)}`),
  coverage: (eventId: string) =>
    request(NODE_URL, `/api/coverage?event=${encodeURIComponent(eventId)}`),
  createEntitlement: (eventId: string, policyId: string, msp: FabricMSP = 'InsurerAMSP') =>
    request(NODE_URL, '/api/entitlements/create', { method: 'POST', body: JSON.stringify({ EventID: eventId, PolicyID: policyId }) }, msp),
  adjudicate: (entitlementId: string, msp: FabricMSP = 'InsurerAMSP') =>
    request(NODE_URL, '/api/entitlements/adjudicate', { method: 'POST', body: JSON.stringify({ EntitlementID: entitlementId }) }, msp),
  authoriseSettlement: (entitlementId: string, settlementRef: string, msp: FabricMSP = 'InsurerAMSP') =>
    request(NODE_URL, '/api/entitlements/settle', { method: 'POST', body: JSON.stringify({ EntitlementID: entitlementId, SettlementRef: settlementRef }) }, msp),
  deny: (entitlementId: string, denialCode: string, msp: FabricMSP = 'InsurerAMSP') =>
    request(NODE_URL, '/api/entitlements/deny', { method: 'POST', body: JSON.stringify({ EntitlementID: entitlementId, DenialCode: denialCode }) }, msp),
  appeal: (entitlementId: string) =>
    request(NODE_URL, '/api/entitlements/appeal', { method: 'POST', body: JSON.stringify({ EntitlementID: entitlementId }) }, 'FieldMSP'),
  panelDecision: (entitlementId: string, upheld: boolean, note: string) =>
    request(NODE_URL, '/api/entitlements/panel', { method: 'POST', body: JSON.stringify({ entitlementId, upheld, note }) }, 'PanelMSP'),

  // Transparency & Public Anchoring
  periods: (id?: string) =>
    request(NODE_URL, id ? `/api/periods?id=${encodeURIComponent(id)}` : '/api/periods'),
  proof: (periodId: string, name: string, value: number) =>
    request(NODE_URL, `/api/periods/proof?id=${encodeURIComponent(periodId)}&name=${encodeURIComponent(name)}&value=${encodeURIComponent(value)}`),

  // Governance
  governanceMembers: () => request(NODE_URL, '/api/governance/members'),
  governanceMetrics: () => request(NODE_URL, '/api/governance/metrics'),
  governanceProposals: (id?: string) =>
    request(NODE_URL, id ? `/api/governance/proposals?id=${encodeURIComponent(id)}` : '/api/governance/proposals'),
  governanceVote: (proposalId: string, msp: FabricMSP = 'RegulatorMSP') =>
    request(NODE_URL, '/api/governance/vote', { method: 'POST', body: JSON.stringify({ ProposalID: proposalId }) }, msp),

  // Anomaly & Audit
  anomalyFlags: () => request(NODE_URL, '/api/anomaly'),
  ledgerBlocks: () => request(NODE_URL, '/api/ledger/blocks'),
  ledgerState: () => request(NODE_URL, '/api/ledger/state'),

  // ---------------------------------------------------------- Off-Chain Services
  offchain: {
    // 1. Keyed-PRF Commitment Service (:7560)
    commit: async (nid: string, context: 'event' | 'policy' = 'event') => {
      const res = await request<{ ok: boolean; commitment: string; keyVersion: number }>(
        COMMITMENT_URL,
        '/commit',
        { method: 'POST', body: JSON.stringify({ nid, context }) },
      );
      return res;
    },

    // 2. MFS Payout Adapter (:7562)
    disburse: async (params: {
      requestId: string;
      payload: { msisdn: string; amount: number; entitlementId: string };
    }) => {
      return request<{ ok: boolean; receipt: { receiptId: string; state: 'SETTLED' | 'PENDING'; amount: number } }>(
        MFS_URL,
        '/disburse',
        { method: 'POST', body: JSON.stringify(params) },
      );
    },
    mfsReconciliation: () => request(MFS_URL, '/reconciliation'),
    mfsReconcile: (requestId: string, outcome: 'SETTLED' | 'FAILED') =>
      request(MFS_URL, '/reconcile', { method: 'POST', body: JSON.stringify({ requestId, outcome }) }),

    // 3. Anchor Service (:7565)
    anchorHealth: () => request(ANCHOR_URL, '/health'),
  },
};

// Utility to convert minor units (paisa) to BDT
export function formatTaka(minor: number | undefined | null): string {
  if (minor === undefined || minor === null) return '—';
  return `৳${(minor / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
