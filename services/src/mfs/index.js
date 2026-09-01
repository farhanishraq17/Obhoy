// The mobile financial services adapter.
//
// This is a mock of a bKash-shaped payout API. It reproduces the SEMANTICS the
// whitepaper specifies, not the vendor: what matters here is the boundary, not
// the brand.
//
// Disbursement crosses a boundary the ledger does not control, so:
//
//  - every instruction carries a request identifier bound to its payload;
//  - a repeat request with the SAME payload returns the original receipt, so a
//    network timeout followed by a retry cannot pay twice;
//  - a repeat request with a DIFFERENT payload under the same identifier is
//    refused outright, because that is either a bug or an attack;
//  - an instruction whose outcome is unknown stays PENDING and is reconciled
//    against the daily settlement file rather than silently retried.
//
// The ledger authorises payment. It does not execute it, and it cannot know
// whether execution succeeded -- which is exactly why these rules live here.

import crypto from 'node:crypto';
import { serve, required } from '../shared/http.js';

const payloadHash = (p) => crypto.createHash('sha256')
  .update(JSON.stringify({ msisdn: p.msisdn, amount: p.amount, entitlementId: p.entitlementId }))
  .digest('hex');

export function startMfs({ port }) {
  const receipts = new Map(); // requestId -> receipt
  let pendingNext = false;

  const routes = {
    'GET /health': async () => [200, {
      ok: true, service: 'mfs', receipts: receipts.size, rail: 'mock-bkash',
    }],

    'POST /disburse': async ({ body }) => {
      required(body, 'requestId', 'payload');
      const { requestId, payload } = body;
      required(payload, 'msisdn', 'amount', 'entitlementId');
      const hash = payloadHash(payload);

      const existing = receipts.get(requestId);
      if (existing) {
        if (existing.payloadHash !== hash) {
          // Same identifier, different money. This is never a valid retry.
          throw new Error(
            `request ${requestId} was already used for a different payload `
            + `(${existing.payloadHash.slice(0, 12)} vs ${hash.slice(0, 12)}); refusing to execute`,
          );
        }
        return [200, {
          ok: true,
          idempotent: true,
          receipt: existing,
          note: 'this request identifier has been seen before with the same payload; '
            + 'returning the original receipt rather than paying again',
        }];
      }

      const receipt = {
        requestId,
        payloadHash: hash,
        receiptId: `BKX${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
        msisdn: `${String(payload.msisdn).slice(0, 5)}******`, // never log a full number
        amount: payload.amount,
        entitlementId: payload.entitlementId,
        state: pendingNext ? 'PENDING' : 'SETTLED',
        at: Date.now(),
      };
      pendingNext = false;
      receipts.set(requestId, receipt);
      return [201, { ok: true, idempotent: false, receipt }];
    },

    // Arm the next disbursement to come back with an unknown outcome, so the
    // reconciliation path can be demonstrated rather than described.
    'POST /admin/next-pending': async () => {
      pendingNext = true;
      return [200, { ok: true, note: 'the next disbursement will return PENDING' }];
    },

    'GET /receipts': async () => [200, { ok: true, receipts: [...receipts.values()] }],

    // The daily settlement file. A PENDING instruction is resolved against
    // this, never by re-sending it.
    'GET /reconciliation': async () => {
      const pending = [...receipts.values()].filter((r) => r.state === 'PENDING');
      return [200, {
        ok: true,
        date: new Date().toISOString().slice(0, 10),
        settled: [...receipts.values()].filter((r) => r.state === 'SETTLED').length,
        pending: pending.length,
        pendingInstructions: pending,
        note: 'a pending instruction is resolved from this file, never by re-sending it',
      }];
    },

    'POST /reconcile': async ({ body }) => {
      required(body, 'requestId', 'outcome');
      const receipt = receipts.get(body.requestId);
      if (!receipt) throw new Error(`no instruction ${body.requestId}`);
      if (receipt.state !== 'PENDING') {
        throw new Error(`instruction ${body.requestId} is ${receipt.state} and is not awaiting reconciliation`);
      }
      receipt.state = body.outcome === 'SETTLED' ? 'SETTLED' : 'FAILED';
      receipt.reconciledAt = Date.now();
      return [200, { ok: true, receipt }];
    },
  };

  return serve({
    name: 'mfs-adapter',
    port,
    routes,
    banner: ['payload-bound request identifiers; retries are idempotent'],
  });
}
