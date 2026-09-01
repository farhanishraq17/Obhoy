// A hospital management information system feed.
//
// Obhoy is API-first and attaches to existing systems rather than replacing
// them. A facility does not retype an admission into a blockchain application:
// its HMIS already emits admission and discharge events, and the provider
// surface consumes that feed and turns each admission into an assertion.
//
// This service stands in for that feed. It emits ADT-shaped messages carrying
// the fields a real one would -- and deliberately carries the national identity
// number in the message, because that is the reality of the integration: the
// identifier exists on this side of the boundary and must be turned into a
// commitment BEFORE anything is written to the ledger. Where that conversion
// happens is the whole privacy design, so the feed shows the problem honestly
// rather than pretending the identifier is not there.
//
// The identity numbers below are synthetic and structurally invalid: they begin
// with 0000, which no issued Bangladeshi NID does.

import { serve } from '../shared/http.js';

const FACILITIES = ['HOSP-UPAZILA-KLG', 'HOSP-DISTRICT-GZP', 'HOSP-PRIVATE-SVR'];
const CATEGORIES = ['H-CARD-01', 'H-RESP-02', 'H-SURG-03', 'H-OBST-04', 'H-INJ-05'];

export function startHmis({ port }) {
  let seq = 0;
  const emitted = [];

  function makeAdmission(subjectIndex, facility, category) {
    seq += 1;
    const admitted = new Date(Date.now() - (seq % 5) * 3600_000);
    return {
      messageType: 'ADT^A01',
      messageId: `ADT${String(seq).padStart(6, '0')}`,
      facility,
      // Synthetic and structurally invalid on purpose: a real NID never starts
      // 0000. Nothing in this repository contains a valid one.
      patientIdentifier: `0000${String(100000 + subjectIndex).padStart(9, '0')}`,
      demoSubjectIndex: subjectIndex,
      admissionWindow: admitted.toISOString().slice(0, 16) + 'Z',
      categoryCode: category,
      admittedAt: admitted.toISOString(),
      note: 'the identifier in this message must be converted to a commitment before any ledger write',
    };
  }

  const routes = {
    'GET /health': async () => [200, { ok: true, service: 'hmis', emitted: emitted.length }],

    // The feed the provider surface polls.
    'GET /adt': async ({ query }) => {
      const count = Math.min(Number(query.get('count') || 5), 20);
      const out = [];
      for (let i = 0; i < count; i += 1) {
        out.push(makeAdmission(
          (seq % 8) + 1,
          FACILITIES[seq % FACILITIES.length],
          CATEGORIES[seq % CATEGORIES.length],
        ));
      }
      emitted.push(...out);
      return [200, { ok: true, messages: out }];
    },

    'GET /emitted': async () => [200, { ok: true, messages: emitted }],
  };

  return serve({
    name: 'hmis-feed',
    port,
    routes,
    banner: ['ADT^A01 admissions; identifiers are synthetic and start 0000'],
  });
}
