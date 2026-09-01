// The API client.
//
// Every call carries the organisation the operator is acting as, and nothing
// else. There is no session, no API key and no admin identity: what a caller
// may do is decided by the chaincode from the organisation it speaks for.
//
// A refusal is not an exception here. Most of what this prototype is for is
// producing refusals, so `call` returns them as data and only throws when the
// network itself fails.

export const state = {
  msp: 'ProviderMSP',
};

export const ORGS = [
  { msp: 'ProviderMSP', label: 'Provider association (hospital)', class: 'PROVIDER', note: 'asserts events; is the payee' },
  { msp: 'ClinicalMSP', label: 'Independent clinician / diagnostic centre', class: 'CLINICAL', note: 'corroborates' },
  { msp: 'FieldMSP', label: 'MFI / NGO field agent', class: 'FIELD', note: 'corroborates, enrols' },
  { msp: 'InsurerAMSP', label: 'Insurer A', class: 'INSURER', note: 'adjudicates and settles its own policies' },
  { msp: 'InsurerBMSP', label: 'Insurer B', class: 'INSURER', note: 'a competitor; cannot see A’s terms' },
  { msp: 'RegulatorMSP', label: 'IDRA (regulator)', class: 'OVERSIGHT', note: 'reads across the audit channel' },
  { msp: 'AcademicMSP', label: 'Academic auditor', class: 'OVERSIGHT', note: 'totals only' },
  { msp: 'PanelMSP', label: 'Independent appeals panel', class: 'OVERSIGHT', note: 'decides appeals' },
];

async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Obhoy-MSP': state.msp,
      ...(options.headers || {}),
    },
  });
  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`the node returned a non-JSON response (${res.status})`);
  }
  return body;
}

/** GET a resource. Returns the unwrapped result, or throws on refusal. */
export async function get(path) {
  const body = await request(path);
  if (!body.ok) throw new Error(body.error || 'refused');
  return body.result;
}

/** GET, returning null instead of throwing when the node refuses. */
export async function tryGet(path) {
  try {
    return await get(path);
  } catch {
    return null;
  }
}

/**
 * POST a transaction. Returns { ok, result, error, events } -- a refusal is a
 * normal outcome and is reported rather than thrown.
 */
export async function post(path, payload = {}) {
  return request(path, { method: 'POST', body: JSON.stringify(payload) });
}

export const api = {
  health: () => tryGet('/api/health'),
  profiles: () => get('/api/profiles'),
  providers: () => get('/api/providers'),
  schedules: () => get('/api/schedules'),
  events: () => get('/api/events'),
  event: (id) => get(`/api/events?id=${encodeURIComponent(id)}`),
  eventHistory: (id) => get(`/api/events/history?id=${encodeURIComponent(id)}`),
  openForSubject: (s) => get(`/api/events/open-for-subject?subject=${encodeURIComponent(s)}`),
  entitlements: () => get('/api/entitlements'),
  entitlementsForEvent: (id) => get(`/api/entitlements?event=${encodeURIComponent(id)}`),
  coverage: (id) => get(`/api/coverage?event=${encodeURIComponent(id)}`),
  policiesForSubject: (s) => get(`/api/policies?subject=${encodeURIComponent(s)}`),
  periods: () => get('/api/periods'),
  period: (id) => get(`/api/periods?id=${encodeURIComponent(id)}`),
  proof: (id, name, value) => get(
    `/api/periods/proof?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}&value=${encodeURIComponent(value)}`,
  ),
  members: () => get('/api/governance/members'),
  metrics: () => get('/api/governance/metrics'),
  proposals: () => get('/api/governance/proposals'),
  anomaly: () => get('/api/anomaly'),
  disclosures: () => get('/api/disclosures'),
  blocks: () => get('/api/ledger/blocks'),
  worldState: () => get('/api/ledger/state'),
  scenarios: () => get('/api/scenarios'),
  runScenario: (id) => get(`/api/scenarios/run?id=${encodeURIComponent(id)}`),
};

/** Money is held in minor units on the ledger; display it as taka. */
export function taka(minor) {
  if (minor === undefined || minor === null) return '—';
  return `৳${(minor / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function short(s, n = 10) {
  if (!s) return '—';
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

export function when(unix) {
  if (!unix) return '—';
  return new Date(unix * 1000).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * The nth synthetic subject commitment, derived exactly as the node's seed
 * derives it. Nothing here is a national identity number: the input is a fixed
 * demonstration string, and the note in it says so.
 */
export async function demoSubject(n) {
  const input = new TextEncoder().encode(`obhoy-demo-subject/not-a-real-identity/${n}`);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
