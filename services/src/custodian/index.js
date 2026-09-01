// A key custodian.
//
// Three of these run, in three different institutional classes -- the
// regulator, an insurer, and the MFI aggregator. Each holds exactly one Shamir
// share of the PRF key. None of them can compute a subject commitment; none of
// them can be compelled to produce one alone; and losing any single one costs
// nothing, because two of the three reconstruct.
//
// The `offline` switch exists so the demonstration can show what happens when
// custodians are unavailable: one down and commitments still issue, two down
// and they stop. That failure is the property, not a bug in it.

import { serve, required } from '../shared/http.js';

export function startCustodian({ id, name, msp, port, share }) {
  let offline = false;
  let released = 0;

  const routes = {
    'GET /health': async () => [200, {
      ok: true, custodian: id, name, msp, offline, sharesReleased: released,
    }],

    // The share is released per request, to a caller that must name the
    // request it is for. Nothing here caches a reconstructed key, and this
    // service never sees one.
    'POST /share': async ({ body }) => {
      required(body, 'requestId', 'purpose');
      if (offline) {
        throw new Error(`custodian ${id} (${name}) is offline and cannot release its share`);
      }
      released += 1;
      return [200, {
        ok: true,
        custodian: id,
        x: share.x,
        share: share.y.toString('base64'),
        requestId: body.requestId,
      }];
    },

    'POST /admin/offline': async ({ body }) => {
      offline = Boolean(body.offline);
      return [200, { ok: true, custodian: id, offline }];
    },
  };

  return serve({
    name: `custodian-${id}`,
    port,
    routes,
    banner: [`${name} (${msp}) -- holds share ${share.x} of 3`],
  });
}
