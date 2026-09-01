// The public anchoring service.
//
// At the close of each settlement period the network builds a Merkle tree over
// that period's transparency totals and commits the root to a public chain.
// Anyone -- journalist, regulator, prospective policyholder, donor -- can then
// check a published claims-paid ratio against what was committed at the time,
// and confirm that no earlier period has been rewritten.
//
// Confidentiality inside, immutability outside. Neither half works alone.
//
// This service does the Merkle work and INDEPENDENTLY recomputes the root from
// the published figures, rather than trusting the one the chaincode returned.
// That matters: if the two ever disagree, the published totals are not what was
// committed, and finding that out is the entire point of the exercise.
//
// Submitting the transaction is left to `anchor/scripts/anchor.js`, which has a
// signing library. This service has no dependencies, which is worth more here
// than the convenience of doing it in one place.

import crypto from 'node:crypto';
import { serve, required } from '../shared/http.js';

const sha256hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// These three must match model/merkle.go byte for byte, or a root built here
// will not verify against one built on-chain.
export const leafFor = (name, value) => sha256hex(Buffer.from(`${name}=${value}`, 'utf8'));

const hashPair = (a, b) => sha256hex(Buffer.concat([Buffer.from(a, 'hex'), Buffer.from(b, 'hex')]));

export function merkleRoot(leaves) {
  if (!leaves.length) throw new Error('merkle: empty leaf set');
  let level = [...leaves];
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      // An odd node is promoted, not duplicated: duplicating it makes two
      // different leaf sets produce the same root.
      if (i + 1 === level.length) next.push(level[i]);
      else next.push(hashPair(level[i], level[i + 1]));
    }
    level = next;
  }
  return level[0];
}

/**
 * Rebuild the leaf set from a period's published figures, in the order the
 * chaincode uses. Order is part of the commitment.
 */
export function leavesForPeriod(period) {
  const leaves = [
    leafFor('writtenPremium', period.writtenPremium),
    leafFor('claimsReceived', period.claimsReceived),
    leafFor('claimsSettled', period.claimsSettled),
    leafFor('claimsDenied', period.claimsDenied),
    leafFor('amountSettled', period.amountSettled),
    leafFor('meanSettlementSeconds', period.meanSettlementSeconds),
    leafFor('reservePosition', period.reservePosition),
    leafFor('nakamotoCoefficient', period.nakamotoCoefficient),
    leafFor('giniBp', Math.floor(period.gini * 10000 + 0.5)),
  ];
  for (const code of Object.keys(period.denialReasons || {}).sort()) {
    leaves.push(leafFor(`denial:${code}`, period.denialReasons[code]));
  }
  return leaves;
}

export function startAnchor({ port, nodeUrl }) {
  const routes = {
    'GET /health': async () => [200, { ok: true, service: 'anchor', nodeUrl }],

    // Rebuild and cross-check a closed period's root.
    'GET /build': async ({ query }) => {
      const periodId = query.get('periodId');
      if (!periodId) throw new Error('periodId is required');
      const res = await fetch(`${nodeUrl}/api/periods?id=${encodeURIComponent(periodId)}`);
      const { ok, result: period, error } = await res.json();
      if (!ok) throw new Error(error || `cannot read period ${periodId}`);
      if (!period.closed) throw new Error(`period ${periodId} is still open; there is nothing settled to anchor`);

      const leaves = leavesForPeriod(period);
      const rebuilt = merkleRoot(leaves);
      const agrees = rebuilt === period.merkleRoot;

      return [200, {
        ok: true,
        periodId,
        leafCount: leaves.length,
        rootFromChaincode: period.merkleRoot,
        rootRecomputedHere: rebuilt,
        agrees,
        // The whole point of recomputing independently.
        note: agrees
          ? 'the published figures reproduce the committed root'
          : 'MISMATCH: the published figures do NOT reproduce the committed root. '
            + 'Either the totals were altered after the period closed, or the leaf '
            + 'ordering has drifted between the chaincode and this service.',
        calldata: {
          periodId,
          merkleRoot: `0x${period.merkleRoot}`,
        },
      }];
    },

    // Verify one published figure against the committed root, offline.
    'GET /verify': async ({ query }) => {
      const periodId = query.get('periodId');
      const name = query.get('name');
      const value = query.get('value');
      if (!periodId || !name || value === null) {
        throw new Error('periodId, name and value are required');
      }
      const res = await fetch(
        `${nodeUrl}/api/periods/proof?id=${encodeURIComponent(periodId)}&name=${encodeURIComponent(name)}&value=${encodeURIComponent(value)}`,
      );
      const out = await res.json();
      if (!out.ok) throw new Error(out.error);
      const { leaf, proof, root } = out.result;

      let cursor = leaf;
      for (const step of proof || []) {
        cursor = step.left ? hashPair(step.hash, cursor) : hashPair(cursor, step.hash);
      }
      return [200, {
        ok: true,
        periodId,
        claim: `${name} = ${value}`,
        verified: cursor === root,
        root,
        computed: cursor,
        note: cursor === root
          ? 'this figure was committed to at the time the period closed'
          : 'this figure was NOT part of the committed period',
      }];
    },

    // Called by the on-chain submission script once the transaction lands.
    'POST /record': async ({ body }) => {
      required(body, 'periodId', 'chain', 'txHash');
      const res = await fetch(`${nodeUrl}/api/periods/anchor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Obhoy-MSP': 'RegulatorMSP' },
        body: JSON.stringify({
          periodId: body.periodId,
          chain: body.chain,
          txHash: body.txHash,
          blockNumber: body.blockNumber || 0,
        }),
      });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error || 'the ledger refused the anchor record');
      return [200, { ok: true, periodId: body.periodId, chain: body.chain, txHash: body.txHash }];
    },
  };

  return serve({
    name: 'anchor',
    port,
    routes,
    banner: ['rebuilds each period root independently of the chaincode'],
  });
}
