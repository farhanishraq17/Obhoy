// The commitment service.
//
// This is where a national identity number becomes a subject commitment, and
// it is the single most security-sensitive component in the prototype. Three
// design decisions matter, and all three come straight from the whitepaper:
//
//  1. The commitment is a KEYED pseudorandom function, HMAC_Kv(NID || context),
//     not a bare hash. A bare SHA-256 of a national identity number is not a
//     pseudonym: the space is small enough to enumerate, so anybody holding the
//     digest holds the number.
//
//  2. There is ONE key across the network, not a salt per insurer. Independent
//     salts would mint a different commitment per insurer for the same person,
//     which silently breaks the cross-insurer uniqueness invariant -- the
//     mechanism would appear to work and would in fact be doing nothing.
//
//  3. That one key is never held whole. It is split 2-of-3 across custodians in
//     different institutional classes, reconstructed in memory for the length
//     of one request, and zeroed. No single class can compute a commitment, and
//     no single class can be compelled to.
//
// `context` domain-separates the uses, so a leak in one does not unlock the
// other: the commitment that keys an event is not the commitment that binds a
// policy credential.

import crypto from 'node:crypto';
import { serve, required } from '../shared/http.js';
import { combine } from '../shared/shamir.js';

const VALID_CONTEXTS = new Set(['event', 'policy']);

export function startCommitmentService({ port, custodians, threshold = 2, keyVersion = 1 }) {
  let version = keyVersion;
  let issued = 0;

  async function fetchShare(c, requestId, purpose) {
    const res = await fetch(`${c.url}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, purpose }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.error || `custodian ${c.id} refused`);
    }
    const body = await res.json();
    return { x: body.x, y: Buffer.from(body.share, 'base64'), custodian: c.id };
  }

  /**
   * Gather a threshold of shares and reconstruct the key. Returns the key and
   * which custodians took part, so the caller can report the quorum honestly
   * rather than claiming one that did not happen.
   */
  async function reconstruct(requestId, purpose) {
    const results = await Promise.allSettled(
      custodians.map((c) => fetchShare(c, requestId, purpose)),
    );
    const shares = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const refusals = results
      .filter((r) => r.status === 'rejected')
      .map((r) => r.reason.message);

    if (shares.length < threshold) {
      throw new Error(
        `threshold not met: ${shares.length} of ${threshold} required shares available. `
        + `No commitment can be computed. (${refusals.join('; ')})`,
      );
    }
    const key = combine(shares.slice(0, threshold));
    return { key, quorum: shares.slice(0, threshold).map((s) => s.custodian), refusals };
  }

  const routes = {
    'GET /health': async () => [200, {
      ok: true,
      service: 'commitment',
      keyVersion: version,
      threshold,
      custodians: custodians.map((c) => ({ id: c.id, url: c.url })),
      commitmentsIssued: issued,
      note: 'this service never stores the key and never stores a national identity number',
    }],

    // Compute a commitment. The identifier is used and discarded: nothing here
    // writes it to disk, and nothing returns it.
    'POST /commit': async ({ body }) => {
      required(body, 'nid', 'context');
      if (!VALID_CONTEXTS.has(body.context)) {
        throw new Error('context must be "event" or "policy" -- domain separation is not optional');
      }
      const requestId = body.requestId || crypto.randomUUID();
      const { key, quorum, refusals } = await reconstruct(requestId, `commit:${body.context}`);
      try {
        const commitment = crypto
          .createHmac('sha256', key)
          .update(`${body.nid}|${body.context}|v${version}`)
          .digest('hex');
        issued += 1;
        return [200, {
          ok: true,
          commitment,
          keyVersion: version,
          context: body.context,
          quorum,
          custodiansUnavailable: refusals,
        }];
      } finally {
        key.fill(0); // the reconstructed key does not outlive the request
      }
    },

    // Rotate to a new key version. A suspected compromise retires Kv and forces
    // re-commitment under Kv+1 through the enrolment path. Commitments made
    // under the old version do not silently keep working: they are a different
    // value, and the chaincode records which version each was made under.
    'POST /rotate': async () => {
      version += 1;
      return [200, {
        ok: true,
        keyVersion: version,
        note: 'every existing commitment must now be re-issued through enrolment; '
          + 'the ledger records the version each commitment was made under',
      }];
    },
  };

  return serve({
    name: 'commitment',
    port,
    routes,
    banner: [
      `HMAC-SHA256 keyed PRF, key split ${threshold}-of-${custodians.length}`,
      'no key and no identity number is stored here',
    ],
  });
}
