// The Fabric gateway.
//
// It serves exactly the routes the local node serves, so the web application
// and the harness do not know or care which one they are talking to. Point the
// front end at :7545 for the in-process ledger, or at this on :7546 for a real
// peer, and nothing else changes.
//
// That symmetry is the point. A prototype where the demonstrable path and the
// real path are different code is a prototype that demonstrates the wrong
// thing.

import http from 'node:http';
import { submit, evaluate, ORGS, config, closeAll } from './fabric/connection.js';

const PORT = Number(process.env.PORT || 7546);

const json = (res, code, body) => {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Obhoy-MSP',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(payload);
};

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// path -> [contract, transaction, how to build the argument list]
//
// Every entry names the contract explicitly. The chaincode ships eight
// contracts in one package, so `EventRegistry:OpenEvent` and
// `ClaimSettlement:CreateEntitlement` are different transactions on the same
// deployment.
const WRITES = {
  '/api/events/open': ['EventRegistry', 'OpenEvent',
    (b) => [b.line || 'HEALTH', b.subjectCommitment, b.admissionWindow, b.asserterId,
      b.categoryCode, b.assessedLoss ?? 0, b.benefitCapAggregate ?? 0]],
  '/api/events/attest': ['EventRegistry', 'AttestEvent',
    (b) => [b.eventId, b.attesterId, b.sigRef || 'sig']],
  '/api/events/attest-anonymous': ['EventRegistry', 'AttestEventAnonymously',
    (b) => [b.eventId, b.nullifier, b.sigRef || 'anon']],
  '/api/events/continue': ['EventRegistry', 'ContinueEvent',
    (b) => [b.eventId, b.providerId, b.kind, b.attestedBy || '']],
  '/api/events/close': ['EventRegistry', 'CloseEvent', (b) => [b.eventId]],
  '/api/events/expire': ['EventRegistry', 'ExpireEvent', (b) => [b.eventId]],

  '/api/entitlements/create': ['ClaimSettlement', 'CreateEntitlement',
    (b) => [b.eventId, b.policyId]],
  '/api/entitlements/adjudicate': ['ClaimSettlement', 'Adjudicate', (b) => [b.entitlementId]],
  '/api/entitlements/settle': ['ClaimSettlement', 'AuthoriseSettlement',
    (b) => [b.entitlementId, b.settlementRef]],
  '/api/entitlements/deny': ['ClaimSettlement', 'Deny', (b) => [b.entitlementId, b.denialCode]],
  '/api/entitlements/appeal': ['ClaimSettlement', 'Appeal', (b) => [b.entitlementId]],
  '/api/entitlements/panel': ['ClaimSettlement', 'PanelDecision',
    (b) => [b.entitlementId, String(Boolean(b.upheld)), b.note || '']],

  '/api/subjects': ['IdentityRegistry', 'RegisterSubjectCommitment',
    (b) => [b.commitment, b.keyVersion ?? 1, b.aggregatorId || '', b.context || 'event']],
  '/api/disclosures/log': ['IdentityRegistry', 'LogDisclosure',
    (b) => [b.disclosureId, b.commitment, b.orderRef]],

  '/api/policies/issue': ['PolicyRegistry', 'IssuePolicy',
    (b) => [b.policyId, b.subjectCommitment, b.poolId, b.type, b.benefitCap ?? 0,
      b.waitingPeriodEnd ?? 0, b.effectiveFrom ?? 0, b.expiresAt ?? 0]],
  '/api/policies/state': ['PolicyRegistry', 'SetPolicyState', (b) => [b.policyId, b.state]],

  '/api/providers/accredit': ['ProviderRegistry', 'Accredit',
    (b) => [b.providerID || b.providerId, b.MSP || b.msp, b.class, b.DGHSRef || b.dghsRef || '']],
  '/api/providers/deaccredit': ['ProviderRegistry', 'DeAccredit',
    (b) => [b.providerID || b.providerId, b.reason || '']],
  '/api/providers/reinstate': ['ProviderRegistry', 'Reinstate',
    (b) => [b.providerID || b.providerId, b.proposalId]],
  '/api/anomaly/raise': ['ProviderRegistry', 'RaiseAnomalyFlag',
    (b) => [b.flagId, b.providerId, b.verifierId, b.pairings ?? 0, b.zScore ?? 0, b.note || '']],

  '/api/periods/open': ['TransparencyLedger', 'OpenPeriod', (b) => [b.periodId, b.poolId]],
  '/api/periods/close': ['TransparencyLedger', 'ClosePeriod', (b) => [b.periodId]],
  '/api/periods/anchor': ['TransparencyLedger', 'RecordAnchor',
    (b) => [b.periodId, b.chain, b.txHash, b.blockNumber ?? 0]],
  '/api/periods/premium': ['TransparencyLedger', 'RecordPremium', (b) => [b.poolId, b.amount]],
  '/api/periods/reserve': ['TransparencyLedger', 'SetReserve', (b) => [b.poolId, b.amount]],

  '/api/governance/propose-admission': ['GovernanceCouncil', 'ProposeAdmission',
    (b) => [b.proposalId, b.description || '', JSON.stringify(b.spec)]],
  '/api/governance/propose': ['GovernanceCouncil', 'Propose',
    (b) => [b.proposalId, b.kind, b.description || '', b.payload || '']],
  '/api/governance/vote': ['GovernanceCouncil', 'Vote', (b) => [b.proposalId]],
};

const READS = {
  '/api/profiles': ['EventRegistry', 'ListDomainProfiles', () => []],
  '/api/providers': ['ProviderRegistry', 'ListProviders', () => []],
  '/api/schedules': ['BenefitSchedule', 'ListSchedules', () => []],
  '/api/events/history': ['EventRegistry', 'GetEventHistory', (q) => [q.get('id')]],
  '/api/events/open-for-subject': ['EventRegistry', 'FindOpenEventForSubject', (q) => [q.get('subject')]],
  '/api/coverage': ['ClaimSettlement', 'GetCoverageView', (q) => [q.get('event')]],
  '/api/governance/members': ['GovernanceCouncil', 'ListMembers', () => []],
  '/api/governance/metrics': ['GovernanceCouncil', 'GetMetrics', () => []],
  '/api/anomaly': ['ProviderRegistry', 'ListAnomalyFlags', () => []],
  '/api/disclosures': ['IdentityRegistry', 'ListDisclosures', () => []],
  '/api/periods/proof': ['TransparencyLedger', 'GetLeafProof',
    (q) => [q.get('id'), q.get('name'), q.get('value')]],
};

// Reads whose shape depends on the query string.
const CONDITIONAL_READS = {
  '/api/events': (q) => (q.get('id')
    ? ['EventRegistry', 'GetEvent', [q.get('id')]]
    : ['EventRegistry', 'ListEvents', []]),
  '/api/entitlements': (q) => {
    if (q.get('event')) return ['ClaimSettlement', 'ListEntitlementsForEvent', [q.get('event')]];
    if (q.get('id')) return ['ClaimSettlement', 'GetEntitlement', [q.get('id')]];
    return ['ClaimSettlement', 'ListEntitlements', []];
  },
  '/api/policies': (q) => (q.get('subject')
    ? ['PolicyRegistry', 'ListPoliciesForSubject', [q.get('subject')]]
    : ['PolicyRegistry', 'GetPolicy', [q.get('id')]]),
  '/api/periods': (q) => (q.get('id')
    ? ['TransparencyLedger', 'GetPeriod', [q.get('id')]]
    : ['TransparencyLedger', 'ListPeriods', []]),
  '/api/governance/proposals': (q) => (q.get('id')
    ? ['GovernanceCouncil', 'GetProposal', [q.get('id')]]
    : ['GovernanceCouncil', 'ListProposals', []]),
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, null);

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const msp = req.headers['x-obhoy-msp'] || 'AcademicMSP';

  if (url.pathname === '/api/health') {
    return json(res, 200, {
      ok: true,
      result: {
        node: 'obhoy-fabric-gateway',
        channel: config.CHANNEL,
        chaincode: config.CHAINCODE,
        organisations: Object.keys(ORGS),
      },
    });
  }

  if (!ORGS[msp]) {
    return json(res, 400, { ok: false, error: `unknown organisation "${msp}"` });
  }

  try {
    if (req.method === 'POST' && WRITES[url.pathname]) {
      const [contract, fn, argsOf] = WRITES[url.pathname];
      const body = await readBody(req);
      const out = await submit(msp, contract, fn, argsOf(body));
      return json(res, out.ok ? 200 : 422, { ...out, function: `${contract}:${fn}` });
    }

    if (READS[url.pathname]) {
      const [contract, fn, argsOf] = READS[url.pathname];
      const out = await evaluate(msp, contract, fn, argsOf(url.searchParams));
      return json(res, out.ok ? 200 : 422, { ...out, function: `${contract}:${fn}` });
    }

    if (CONDITIONAL_READS[url.pathname]) {
      const [contract, fn, args] = CONDITIONAL_READS[url.pathname](url.searchParams);
      const out = await evaluate(msp, contract, fn, args);
      return json(res, out.ok ? 200 : 422, { ...out, function: `${contract}:${fn}` });
    }

    return json(res, 404, { ok: false, error: `no route ${req.method} ${url.pathname}` });
  } catch (err) {
    return json(res, 500, { ok: false, error: err.message });
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('obhoy fabric gateway');
  console.log(`  channel    ${config.CHANNEL}`);
  console.log(`  chaincode  ${config.CHAINCODE}`);
  console.log(`  identities ${config.ORG_DIR}`);
  console.log(`  listening  http://localhost:${PORT}`);
  console.log('');
  console.log('  The same REST surface the local node serves. Point web/js/api.js');
  console.log('  at this instead of :7545 and nothing in the front end changes.');
  console.log('');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await closeAll();
    process.exit(0);
  });
}
