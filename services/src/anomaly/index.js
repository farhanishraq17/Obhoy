// The pairing scorer.
//
// The fraud taxonomy in the whitepaper marks exactly one row as the real
// residual risk: payee-verifier collusion. Every other attack has a structural
// control. This one does not, because a hospital and a verifier who always work
// together produce attestations that are individually valid in every way the
// chaincode can check.
//
// What is left is statistical. If one facility's events are corroborated by the
// same verifier far more often than the population would suggest, that is worth
// looking at -- not proof of anything, and the flag says so. Detection lives
// off-chain because it needs a view across events and a model; the FLAG lives
// on-chain, because a warning an operator can quietly drop is not a control.
//
// This is the honest shape of the mitigation the paper describes as "rotation,
// anomaly detection, audit sampling": it narrows where an auditor looks. It
// does not close the row.

import { serve, required } from '../shared/http.js';

export function startAnomaly({ port, nodeUrl }) {
  const routes = {
    'GET /health': async () => [200, { ok: true, service: 'anomaly', nodeUrl }],

    // Score the pairings visible on the ledger.
    'GET /score': async () => {
      const res = await fetch(`${nodeUrl}/api/events`);
      if (!res.ok) throw new Error(`cannot read events from ${nodeUrl}`);
      const { result: events = [] } = await res.json();

      // Count (asserting facility, corroborating attester) pairs.
      const pairs = new Map();
      const byProvider = new Map();
      for (const ev of events) {
        const asserter = ev.asserterId;
        if (!asserter) continue;
        byProvider.set(asserter, (byProvider.get(asserter) || 0) + 1);
        for (const att of ev.attestations || []) {
          if (att.class === 'PROVIDER') continue; // the asserter's own class
          const who = att.attesterId || `anonymous:${att.class}`;
          const key = `${asserter}|${who}`;
          pairs.set(key, (pairs.get(key) || 0) + 1);
        }
      }

      const counts = [...pairs.values()];
      const n = counts.length;
      const mean = n ? counts.reduce((a, b) => a + b, 0) / n : 0;
      const variance = n ? counts.reduce((a, b) => a + (b - mean) ** 2, 0) / n : 0;
      const sd = Math.sqrt(variance);

      const scored = [...pairs.entries()].map(([key, count]) => {
        const [providerId, verifierId] = key.split('|');
        const z = sd > 0 ? (count - mean) / sd : 0;
        const concentration = byProvider.get(providerId)
          ? count / byProvider.get(providerId)
          : 0;
        return {
          providerId,
          verifierId,
          pairings: count,
          zScore: Number(z.toFixed(3)),
          concentration: Number(concentration.toFixed(3)),
          // Two conditions, not one: unusual against the population AND
          // dominant for that facility. Either alone produces noise on a small
          // ledger.
          flagged: z >= 1.5 && concentration >= 0.6 && count >= 3,
        };
      }).sort((a, b) => b.zScore - a.zScore);

      return [200, {
        ok: true,
        eventsScanned: events.length,
        distinctPairings: n,
        meanPairings: Number(mean.toFixed(3)),
        standardDeviation: Number(sd.toFixed(3)),
        pairings: scored,
        flagged: scored.filter((s) => s.flagged),
        caveat: 'a flag is a place to look, not a finding. Concentration is also what a '
          + 'small rural catchment looks like, where one diagnostic centre may be the only one.',
      }];
    },

    // Write a flag to the ledger. The regulator raises it; the flag is public
    // within the network and cannot be withdrawn quietly.
    'POST /raise': async ({ body }) => {
      required(body, 'flagId', 'providerId', 'verifierId');
      const res = await fetch(`${nodeUrl}/api/anomaly/raise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Obhoy-MSP': 'RegulatorMSP' },
        body: JSON.stringify({
          flagId: body.flagId,
          providerId: body.providerId,
          verifierId: body.verifierId,
          pairings: body.pairings || 0,
          zScore: body.zScore || 0,
          note: body.note || 'pairing concentration above threshold; audit sample requested',
        }),
      });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error || 'the ledger refused the flag');
      return [200, { ok: true, flagId: body.flagId }];
    },
  };

  return serve({
    name: 'anomaly-scorer',
    port,
    routes,
    banner: ['payee-verifier pairing concentration -- narrows the audit, does not close the risk'],
  });
}
