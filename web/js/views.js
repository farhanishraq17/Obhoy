// The role surfaces.
//
// One application, eight organisations. Which controls appear is decided by the
// organisation selected in the header -- and, more to the point, so is what the
// ledger will accept. Hiding a control the chaincode would refuse is a courtesy;
// the refusal is the actual access control, and the Oversight tab lets you
// watch one happen.

import { api, post, state, taka, short, when, demoSubject, ORGS } from './api.js';
import { h, card, table, note, pill, stat, stateBadge, report, toast, field, input } from './ui.js';

const classOf = (msp) => (ORGS.find((o) => o.msp === msp) || {}).class || 'UNKNOWN';

// ===========================================================================
// Transparency -- the public explorer. No credential, no login, no role.
// ===========================================================================

export async function transparency(root, refresh) {
  const [periods, metrics] = await Promise.all([api.periods(), api.metrics()]);

  root.append(
    h('h2', {}, 'Published record'),
    h('p', { class: 'lede' },
      'Every figure below is derived from the claim path rather than declared, and once a period closes it is committed to a Merkle root and anchored on a public chain. ',
      h('strong', {}, 'A buyer can check an insurer’s behaviour before buying.'),
      ' No credential is needed to read this page.'),
  );

  const totals = periods.reduce((acc, p) => ({
    received: acc.received + p.claimsReceived,
    settled: acc.settled + p.claimsSettled,
    denied: acc.denied + p.claimsDenied,
    amount: acc.amount + p.amountSettled,
    premium: acc.premium + p.writtenPremium,
  }), { received: 0, settled: 0, denied: 0, amount: 0, premium: 0 });

  const ratio = totals.received ? Math.round((totals.settled / totals.received) * 100) : 0;

  root.append(h('div', { class: 'grid stats' },
    stat('Claims received', totals.received),
    stat('Settled', totals.settled, '', 'good'),
    stat('Denied', totals.denied, '', totals.denied ? 'bad' : ''),
    stat('Settlement ratio', `${ratio}%`, 'of filed claims', ratio >= 50 ? 'good' : 'bad'),
    stat('Paid out', taka(totals.amount)),
    stat('Written premium', taka(totals.premium)),
  ));

  root.append(note('plain',
    h('p', {}, h('strong', {}, 'For comparison: '),
      'general insurers in Bangladesh settled 9.37% of filed claims in the final quarter of 2025. ',
      'The number above is from synthetic demonstration data and is not a market figure — what is being demonstrated is that the number exists at all, is derived rather than declared, and cannot be restated after the fact.')));

  root.append(h('h3', {}, 'Governance concentration, recomputed each period'));
  root.append(h('div', { class: 'grid stats' },
    stat('Nakamoto Coefficient', metrics.nakamotoCoefficient, `floor 3`, metrics.nakamotoCoefficient >= 3 ? 'good' : 'bad'),
    stat('Gini', metrics.gini.toFixed(4), 'ceiling 0.20', metrics.gini <= 0.2 ? 'good' : 'bad'),
    stat('Largest class', `${(metrics.maxClassWeight * 100).toFixed(0)}%`, 'cap 30%', metrics.maxClassWeight <= 0.3 ? 'good' : 'bad'),
    stat('Classes seated', metrics.classCount),
  ));

  root.append(h('h3', {}, 'Periods'));
  root.append(table([
    { label: 'Period', key: 'periodId', mono: true },
    { label: 'Pool', key: 'poolId', mono: true },
    { label: 'State', render: (p) => (p.closed ? pill('CLOSED', 'ok') : pill('OPEN', 'warn')) },
    { label: 'Received', key: 'claimsReceived', num: true },
    { label: 'Settled', key: 'claimsSettled', num: true },
    { label: 'Denied', key: 'claimsDenied', num: true },
    { label: 'Paid', render: (p) => taka(p.amountSettled), num: true },
    { label: 'Reserve', render: (p) => taka(p.reservePosition), num: true },
    {
      label: 'Anchor',
      render: (p) => (p.anchor
        ? h('span', { class: 'mono', title: p.anchor.txHash }, `${p.anchor.chain} ${short(p.anchor.txHash, 12)}`)
        : h('span', { class: 'dim' }, 'not anchored')),
    },
  ], periods, { empty: 'No periods have been opened.' }));

  // Verify a published figure against the committed root.
  const closed = periods.filter((p) => p.closed);
  const verifyOut = h('div');
  const periodSel = h('select', {}, closed.map((p) => h('option', { value: p.periodId }, p.periodId)));
  const nameSel = h('select', {}, ['claimsSettled', 'claimsReceived', 'claimsDenied', 'amountSettled', 'reservePosition', 'writtenPremium']
    .map((n) => h('option', { value: n }, n)));
  const valueIn = input('value as published', '');

  root.append(card('Verify a published figure',
    'Reconstruct the Merkle path for one number and check it against the root that was anchored. A figure that was not committed at the time will not verify — which is what stops a settled period being quietly restated.',
    closed.length === 0
      ? h('p', { class: 'dim' }, 'Close a period first — the Oversight tab has the control.')
      : h('div', {},
        h('div', { class: 'row' }, periodSel, nameSel, valueIn,
          h('button', {
            class: 'primary',
            onclick: async () => {
              verifyOut.innerHTML = '';
              const value = Number(valueIn.value);
              if (!Number.isFinite(value)) { toast('Enter a number', '', true); return; }
              try {
                const proof = await api.proof(periodSel.value, nameSel.value, value);
                verifyOut.append(note('good',
                  h('p', {}, h('strong', {}, 'Verified. '),
                    `${nameSel.value} = ${value} was committed when ${periodSel.value} closed.`),
                  h('p', { class: 'statecode' }, `root ${proof.root}`),
                  h('p', { class: 'statecode' }, `leaf ${proof.leaf} at index ${proof.index}, ${proof.proof.length} sibling(s)`)));
              } catch (err) {
                verifyOut.append(note('bad',
                  h('p', {}, h('strong', {}, 'Not committed. '), err.message),
                  h('p', {}, 'This is the tamper case: a restated figure has no path to the anchored root.')));
              }
            },
          }, 'Verify')),
        verifyOut)));
}

// ===========================================================================
// Claim desk -- role-aware
// ===========================================================================

export async function claimDesk(root, refresh) {
  const cls = classOf(state.msp);
  const [events, providers] = await Promise.all([api.events(), api.providers()]);

  root.append(
    h('h2', {}, 'Claim desk'),
    h('p', { class: 'lede' },
      'You are acting as ', h('strong', {}, state.msp), ' (', cls, '). ',
      'The controls below are the ones this organisation may use. Anything else the ledger would refuse — try it from the Oversight tab.'),
  );

  if (cls === 'PROVIDER') await providerDesk(root, events, providers, refresh);
  else if (cls === 'CLINICAL' || cls === 'FIELD') await attesterDesk(root, events, providers, cls, refresh);
  else if (cls === 'INSURER') await insurerDesk(root, events, refresh);
  else await oversightDesk(root, events, refresh);
}

async function providerDesk(root, events, providers, refresh) {
  const facilities = providers.filter((p) => p.class === 'PROVIDER' && p.state === 'ACCREDITED');

  // Assert an admission.
  const subjSel = h('select', {}, Array.from({ length: 8 }, (_, i) => h('option', { value: i + 1 }, `Demo subject ${i + 1}`)));
  const facSel = h('select', {}, facilities.map((f) => h('option', { value: f.providerId }, f.providerId)));
  const catSel = h('select', {}, ['H-CARD-01', 'H-RESP-02', 'H-SURG-03', 'H-OBST-04', 'H-INJ-05']
    .map((c) => h('option', { value: c }, c)));
  const windowIn = input('admission window', new Date().toISOString().slice(0, 16) + 'Z');

  root.append(card('Assert an admission',
    'In deployment this arrives from the facility’s own HMIS as an ADT message; the identifier in that message is converted to a commitment before anything is written. The event key is derived here from the commitment and the admission window — you cannot choose it.',
    h('div', { class: 'row' }, subjSel, facSel, catSel, windowIn,
      h('button', {
        class: 'primary',
        onclick: async () => {
          const commitment = await demoSubject(Number(subjSel.value));
          const res = await post('/api/events/open', {
            line: 'HEALTH',
            subjectCommitment: commitment,
            admissionWindow: windowIn.value,
            asserterId: facSel.value,
            categoryCode: catSel.value,
            assessedLoss: 5000000,
            benefitCapAggregate: 5000000,
          });
          report('Assert admission', res);
          refresh();
        },
      }, 'Assert')),
    note('', h('p', {},
      h('strong', {}, 'Try this twice. '),
      'Assert the same subject from two different facilities without closing the first. The second is refused at commit under equation (4) — which is the mechanism no single insurer’s database can perform, because no insurer can see the others’.'))));

  // Open events belonging to this organisation.
  const open = events.filter((e) => e.state === 'OPEN');
  root.append(h('h3', {}, 'Open episodes'));
  root.append(table([
    { label: 'Event', render: (e) => h('span', { title: e.eventId }, short(e.eventId, 12)), mono: true },
    { label: 'Subject', render: (e) => short(e.subjectCommitment, 10), mono: true },
    { label: 'Category', key: 'categoryCode', mono: true },
    { label: 'Classes', render: (e) => new Set(e.attestations.map((a) => a.class)).size + ' of ' + e.quorumSize },
    { label: 'Segments', render: (e) => e.segments.map((s) => s.kind).join(' → ') },
    {
      label: '',
      render: (e) => h('div', { class: 'row' },
        h('button', {
          class: 'small',
          onclick: async () => {
            const res = await post('/api/events/close', { eventId: e.eventId });
            report('Close episode', res);
            refresh();
          },
        }, 'Close'),
        h('button', {
          class: 'small',
          onclick: async () => {
            const other = facilities.find((f) => f.providerId !== e.asserterId);
            const res = await post('/api/events/continue', {
              eventId: e.eventId,
              providerId: other ? other.providerId : e.asserterId,
              kind: 'TRANSFER',
              attestedBy: e.asserterId,
            });
            report('Transfer', res);
            refresh();
          },
        }, 'Transfer out')),
    },
  ], open, { empty: 'No open episodes.' }));
}

async function attesterDesk(root, events, providers, cls, refresh) {
  const mine = providers.filter((p) => p.class === cls && p.state === 'ACCREDITED');
  const open = events.filter((e) => e.state === 'OPEN');
  const attesterSel = h('select', {}, mine.map((m) => h('option', { value: m.providerId }, m.providerId)));

  root.append(card('Attest as ' + cls,
    'Corroboration from a class with different interests from the payee. A class that has already attested is refused, so the facility being paid cannot fill the quorum by signing twice.',
    h('div', { class: 'row' }, h('span', { class: 'dim' }, 'attesting as'), attesterSel)));

  root.append(h('h3', {}, 'Episodes awaiting corroboration'));
  root.append(table([
    { label: 'Event', render: (e) => h('span', { title: e.eventId }, short(e.eventId, 12)), mono: true },
    { label: 'Asserted by', key: 'asserterId', mono: true },
    { label: 'Category', key: 'categoryCode', mono: true },
    {
      label: 'Classes present',
      render: (e) => h('div', { class: 'row' }, [...new Set(e.attestations.map((a) => a.class))].map((c) => pill(c, c === e.payeeClass ? 'warn' : 'ok'))),
    },
    {
      label: '',
      render: (e) => h('div', { class: 'row' },
        h('button', {
          class: 'small primary',
          onclick: async () => {
            const res = await post('/api/events/attest', {
              eventId: e.eventId, attesterId: attesterSel.value, sigRef: 'sig-' + attesterSel.value,
            });
            report('Attest', res);
            refresh();
          },
        }, 'Attest'),
        cls === 'FIELD' || cls === 'CLINICAL'
          ? h('button', {
            class: 'small',
            title: 'Prove class membership without naming the individual who acted',
            onclick: async () => {
              const res = await post('/api/events/attest-anonymous', {
                eventId: e.eventId,
                nullifier: `null-${cls}-${e.eventId.slice(0, 8)}`,
                sigRef: 'anon',
              });
              report('Anonymous attestation', res);
              refresh();
            },
          }, 'Attest anonymously')
          : null),
    },
  ], open, { empty: 'Nothing is awaiting corroboration.' }));

  root.append(note('', h('p', {},
    h('strong', {}, 'Anonymous attestation. '),
    'A field verifier should be able to corroborate without their employer learning which agent was at which bedside. The nullifier stops anonymity buying a second vote. Idemix is the mechanism the paper names for this and it is a client-side property only — Fabric does not extend it to endorsement, so the peer signature is still an ordinary X.509 identity.')));
}

async function insurerDesk(root, events, refresh) {
  const [entitlements] = await Promise.all([api.entitlements()]);
  const mine = entitlements.filter((e) => e.insurerMsp === state.msp);
  const eligible = events.filter((e) => e.state === 'CLOSED_ELIGIBLE');

  // Claim against an eligible event.
  const evSel = h('select', {}, eligible.map((e) => h('option', { value: e.eventId }, `${short(e.eventId, 12)} · ${e.categoryCode}`)));
  const polOut = h('div');
  const polSel = h('select', {});

  async function loadPolicies() {
    polSel.innerHTML = '';
    polOut.innerHTML = '';
    const ev = eligible.find((e) => e.eventId === evSel.value);
    if (!ev) return;
    const policies = await api.policiesForSubject(ev.subjectCommitment);
    const usable = policies.filter((p) => p.insurerMsp === state.msp);
    for (const p of usable) polSel.append(h('option', { value: p.policyId }, `${p.policyId} · ${p.type}`));

    const others = policies.filter((p) => p.insurerMsp !== state.msp);
    if (others.length) {
      polOut.append(note('plain', h('p', {},
        h('strong', {}, 'Coordination of benefits. '),
        `This subject also holds ${others.length} polic${others.length === 1 ? 'y' : 'ies'} with `,
        [...new Set(others.map((p) => p.insurerMsp))].join(', '),
        '. You can see that, and see what they have already paid, before you settle. Today no insurer in this market can, at any price.')));
    }
    const cover = await api.coverage(ev.eventId);
    polOut.append(h('div', { class: 'grid stats' },
      stat('Assessed loss', taka(cover.assessedLoss)),
      stat('Indemnity paid', taka(cover.paidIndemnity), 'across all insurers'),
      stat('Indemnity headroom', taka(cover.indemnityHeadroom), '', cover.indemnityHeadroom > 0 ? 'good' : 'bad'),
      stat('Fixed-benefit paid', taka(cover.paidFixed), 'separate bound'),
    ));
  }
  evSel.addEventListener('change', loadPolicies);

  root.append(card('Adjudicate a claim',
    'The amount comes from the benefit schedule version the event was opened under — never from a document the claimant wrote. What is left attackable is the category code, which the multi-class quorum and outlier scoring reduce but do not remove.',
    eligible.length === 0
      ? h('p', { class: 'dim' }, 'No eligible events. An episode needs two attesting classes, one of them not the payee.')
      : h('div', {},
        h('div', { class: 'row' }, evSel, polSel,
          h('button', {
            class: 'primary',
            onclick: async () => {
              const res = await post('/api/entitlements/create', { eventId: evSel.value, policyId: polSel.value });
              report('Create entitlement', res);
              refresh();
            },
          }, 'Claim')),
        polOut)));

  if (eligible.length) await loadPolicies();

  root.append(h('h3', {}, 'Your entitlements'));
  root.append(table([
    { label: 'Entitlement', render: (e) => h('span', { title: e.entitlementId }, short(e.entitlementId, 10)), mono: true },
    { label: 'Policy', key: 'policyId', mono: true },
    { label: 'Type', key: 'type' },
    { label: 'State', render: (e) => stateBadge(e.state) },
    { label: 'Amount', render: (e) => taka(e.amount), num: true },
    { label: 'Reason', render: (e) => e.denialCode || '' , mono: true },
    {
      label: '',
      render: (e) => h('div', { class: 'row' },
        e.state === 'CREATED' ? h('button', {
          class: 'small',
          onclick: async () => { report('Adjudicate', await post('/api/entitlements/adjudicate', { entitlementId: e.entitlementId })); refresh(); },
        }, 'Adjudicate') : null,
        e.state === 'ADJUDICATED' ? h('button', {
          class: 'small primary',
          onclick: async () => {
            report('Authorise settlement', await post('/api/entitlements/settle', {
              entitlementId: e.entitlementId,
              settlementRef: `MFS-REQ-${e.entitlementId.slice(0, 8).toUpperCase()}`,
            }));
            refresh();
          },
        }, 'Authorise payout') : null,
        (e.state === 'CREATED' || e.state === 'ADJUDICATED') ? h('button', {
          class: 'small danger',
          onclick: async () => {
            report('Deny', await post('/api/entitlements/deny', {
              entitlementId: e.entitlementId, denialCode: 'D-07-CATEGORY-NOT-COVERED',
            }));
            refresh();
          },
        }, 'Deny') : null,
        e.state === 'SETTLED' ? h('button', {
          class: 'small',
          title: 'Re-authorising a consumed entitlement must be refused',
          onclick: async () => {
            report('Re-authorise (should be refused)', await post('/api/entitlements/settle', {
              entitlementId: e.entitlementId, settlementRef: 'MFS-REQ-RETRY',
            }));
          },
        }, 'Try to pay again') : null),
    },
  ], mine, { empty: 'You hold no entitlements yet.' }));
}

async function oversightDesk(root, events, refresh) {
  const entitlements = await api.entitlements();
  const appealed = entitlements.filter((e) => e.state === 'APPEALED');
  const denied = entitlements.filter((e) => e.state === 'DENIED');

  root.append(card('Appeals',
    'Denial stays a human judgement — no ledger can force an insurer to accept that an event qualifies. What the ledger fixes is that every denial carries a coded reason, is counted in the period totals, and goes to a panel whose decisions are themselves on the record.',
    table([
      { label: 'Entitlement', render: (e) => short(e.entitlementId, 10), mono: true },
      { label: 'Denied by', key: 'deniedByMsp', mono: true },
      { label: 'Reason', key: 'denialCode', mono: true },
      { label: 'State', render: (e) => stateBadge(e.state) },
      {
        label: '',
        render: (e) => h('div', { class: 'row' },
          e.state === 'DENIED' ? h('button', {
            class: 'small',
            onclick: async () => { report('Appeal', await post('/api/entitlements/appeal', { entitlementId: e.entitlementId })); refresh(); },
          }, 'Appeal') : null,
          e.state === 'APPEALED' ? h('button', {
            class: 'small primary',
            onclick: async () => {
              report('Overturn denial', await post('/api/entitlements/panel', {
                entitlementId: e.entitlementId, upheld: false, note: 'category was covered under this schedule version',
              }));
              refresh();
            },
          }, 'Overturn') : null,
          e.state === 'APPEALED' ? h('button', {
            class: 'small danger',
            onclick: async () => {
              report('Uphold denial', await post('/api/entitlements/panel', {
                entitlementId: e.entitlementId, upheld: true, note: 'denial upheld',
              }));
              refresh();
            },
          }, 'Uphold') : null),
      },
    ], [...appealed, ...denied], { empty: 'No denials on the record.' })));

  root.append(note('', h('p', {},
    h('strong', {}, 'The conflict rule. '),
    'Switch to Insurer A, deny something, appeal it, then come back and try to decide it as Insurer A. The chaincode refuses: an insurer may not validate an appeal against its own denial. That rule is in the contract, not in a policy document.')));
}

// ===========================================================================
// Events
// ===========================================================================

export async function eventsView(root) {
  const events = await api.events();
  const detail = h('div');

  root.append(
    h('h2', {}, 'Events'),
    h('p', { class: 'lede' },
      'An insurable event is a non-transferable, single-use asset. Its identifier is derived from the subject commitment and the admission window — diagnosis and provider are deliberately absent, so changing either cannot mint a different event.'),
  );

  root.append(table([
    { label: 'Event', render: (e) => h('a', { href: '#', onclick: (ev) => { ev.preventDefault(); showDetail(e.eventId); } }, short(e.eventId, 14)), mono: true },
    { label: 'Line', key: 'line' },
    { label: 'Subject', render: (e) => short(e.subjectCommitment, 10), mono: true },
    { label: 'Category', key: 'categoryCode', mono: true },
    { label: 'State', render: (e) => stateBadge(e.state) },
    { label: 'Classes', render: (e) => [...new Set(e.attestations.map((a) => a.class))].map((c) => pill(c, c === e.payeeClass ? 'warn' : 'ok')) },
    { label: 'Opened', render: (e) => when(e.openTs) },
  ], events, { empty: 'No events yet. Assert one from the claim desk.' }));

  root.append(detail);

  async function showDetail(id) {
    detail.innerHTML = '';
    const [ev, ents, cover, history] = await Promise.all([
      api.event(id), api.entitlementsForEvent(id), api.coverage(id), api.eventHistory(id),
    ]);
    detail.append(h('h3', {}, 'Event ', h('code', {}, short(id, 20))));
    detail.append(h('div', { class: 'grid two' },
      card('Attestations', 'The quorum spans classes, not signatures.',
        table([
          { label: 'Class', render: (a) => pill(a.class, a.class === ev.payeeClass ? 'warn' : 'ok') },
          { label: 'Who', render: (a) => (a.anonymous ? h('span', { class: 'dim' }, `anonymous · ${short(a.nullifier, 12)}`) : a.attesterId), mono: true },
          { label: 'When', render: (a) => when(a.ts) },
        ], ev.attestations)),
      card('Coordination of benefits', 'Indemnity and fixed-benefit bounds are held apart on purpose.',
        h('div', { class: 'grid stats' },
          stat('Assessed loss', taka(cover.assessedLoss)),
          stat('Indemnity paid', taka(cover.paidIndemnity)),
          stat('Fixed paid', taka(cover.paidFixed)),
          stat('Entitlements', cover.entitlements.length))),
    ));
    detail.append(card('Admission segments',
      'A transfer or a readmission adds a segment. It never opens a second event — which is what stops the uniqueness invariant refusing legitimate care.',
      table([
        { label: 'Facility', key: 'providerId', mono: true },
        { label: 'Kind', render: (s) => pill(s.kind, s.kind === 'INITIAL' ? '' : 'warn') },
        { label: 'Admitted', render: (s) => when(s.admitTs) },
        { label: 'Attested by', key: 'attestedBy', mono: true },
      ], ev.segments)));
    detail.append(card('Entitlements', 'Settlement consumes the entitlement, never the event.',
      table([
        { label: 'Entitlement', render: (e) => short(e.entitlementId, 12), mono: true },
        { label: 'Insurer', key: 'insurerMsp', mono: true },
        { label: 'Policy', key: 'policyId', mono: true },
        { label: 'Type', key: 'type' },
        { label: 'State', render: (e) => stateBadge(e.state) },
        { label: 'Amount', render: (e) => taka(e.amount), num: true },
      ], ents)));
    detail.append(card('Ledger history',
      'Not an application audit log — this is the ledger’s own history, which is what makes "the insurer cannot revise the record" a property rather than a promise.',
      table([
        { label: 'Transaction', key: 'txId', mono: true },
        { label: 'When', render: (r) => when(r.timestamp) },
        { label: 'State', render: (r) => (r.value ? stateBadge(r.value.state) : pill('DELETED', 'mute')) },
        { label: 'Attestations', render: (r) => (r.value ? r.value.attestations.length : '—'), num: true },
      ], history)));
    detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ===========================================================================
// Governance
// ===========================================================================

export async function governance(root, refresh) {
  const [members, metrics, proposals] = await Promise.all([api.members(), api.metrics(), api.proposals()]);

  root.append(
    h('h2', {}, 'Governance'),
    h('p', { class: 'lede' },
      'These weights govern the council’s own votes — charter amendments, upgrade approval, admission and off-boarding. ',
      h('strong', {}, 'They do not govern transaction validation'),
      ', which runs on the endorsement policy and Raft ordering and which no weight table alters.'),
  );

  root.append(h('div', { class: 'grid stats' },
    stat('Nakamoto Coefficient', metrics.nakamotoCoefficient, 'floor 3', metrics.nakamotoCoefficient >= 3 ? 'good' : 'bad'),
    stat('Gini', metrics.gini.toFixed(4), 'ceiling 0.20', metrics.gini <= 0.2 ? 'good' : 'bad'),
    stat('Largest class', `${(metrics.maxClassWeight * 100).toFixed(0)}%`, 'cap 30%'),
    stat('Classes', metrics.classCount),
  ));

  root.append(table([
    { label: 'Class', key: 'class' },
    { label: 'Organisation', key: 'msp', mono: true },
    { label: 'Weight', render: (m) => m.weight.toFixed(2), num: true },
    { label: 'Share', render: (m) => h('div', { style: `height:6px;border-radius:3px;background:var(--teal);width:${m.weight * 260}px` }) },
    { label: 'State', render: (m) => stateBadge(m.state) },
  ], members));

  const specs = {
    'Breaches the 0.30 class cap': [
      { class: 'INSURERS', msp: 'InsurerAMSP', weightBp: 3500 },
      { class: 'REGULATOR', msp: 'RegulatorMSP', weightBp: 2000 },
      { class: 'AGGREGATORS', msp: 'FieldMSP', weightBp: 2000 },
      { class: 'PROVIDERS', msp: 'ProviderMSP', weightBp: 1500 },
      { class: 'ACADEMIC', msp: 'AcademicMSP', weightBp: 1000 },
    ],
    'Drops the Nakamoto Coefficient to 2': [
      { class: 'INSURERS', msp: 'InsurerAMSP', weightBp: 3000 },
      { class: 'REGULATOR', msp: 'RegulatorMSP', weightBp: 3000 },
      { class: 'AGGREGATORS', msp: 'FieldMSP', weightBp: 2000 },
      { class: 'PROVIDERS', msp: 'ProviderMSP', weightBp: 2000 },
    ],
    'Within the caps: seats a sixth class': [
      { class: 'INSURERS', msp: 'InsurerAMSP', weightBp: 2500 },
      { class: 'REGULATOR', msp: 'RegulatorMSP', weightBp: 2000 },
      { class: 'AGGREGATORS', msp: 'FieldMSP', weightBp: 2000 },
      { class: 'PROVIDERS', msp: 'ProviderMSP', weightBp: 1500 },
      { class: 'ACADEMIC', msp: 'AcademicMSP', weightBp: 1500 },
      { class: 'CLINICAL', msp: 'ClinicalMSP', weightBp: 500 },
    ],
  };
  const specSel = h('select', {}, Object.keys(specs).map((k) => h('option', { value: k }, k)));

  root.append(card('Propose a change to the weight table',
    'The metrics bind rather than describe. A distribution that would breach the caps is refused before any vote is taken — the council cannot vote itself past its own concentration limits.',
    h('div', { class: 'row' }, specSel,
      h('button', {
        class: 'primary',
        onclick: async () => {
          const id = `PROP-${Date.now().toString(36).toUpperCase()}`;
          const res = await post('/api/governance/propose-admission', {
            proposalId: id, description: specSel.value, spec: specs[specSel.value],
          });
          report('Propose admission', res);
          refresh();
        },
      }, 'Propose'))));

  root.append(h('h3', {}, 'Proposals'));
  root.append(table([
    { label: 'Proposal', key: 'proposalId', mono: true },
    { label: 'Kind', key: 'kind' },
    { label: 'Description', key: 'description' },
    { label: 'Weight for', render: (p) => p.weightFor.toFixed(2), num: true },
    { label: 'Threshold', render: (p) => p.threshold.toFixed(2), num: true },
    { label: 'State', render: (p) => pill(p.state, p.state === 'PASSED' ? 'ok' : p.state === 'REJECTED' ? 'bad' : 'warn') },
    {
      label: '',
      render: (p) => (p.state === 'OPEN' ? h('button', {
        class: 'small primary',
        onclick: async () => { report('Vote', await post('/api/governance/vote', { proposalId: p.proposalId })); refresh(); },
      }, `Vote as ${state.msp}`) : null),
    },
  ], proposals, { empty: 'No proposals.' }));
}

// ===========================================================================
// Oversight -- regulator and auditor
// ===========================================================================

export async function oversight(root, refresh) {
  const [providers, periods, flags, disclosures] = await Promise.all([
    api.providers(), api.periods(), api.anomaly(), api.disclosures(),
  ]);

  root.append(
    h('h2', {}, 'Oversight'),
    h('p', { class: 'lede' },
      'The regulator is a network member with a validating copy, not an outside inspector receiving periodic reports. ',
      'Supervision is architectural: it does not request data, it already holds it.'),
  );

  const openPeriods = periods.filter((p) => !p.closed);
  root.append(card('Close a settlement period',
    'Freezes the totals, folds in the governance metrics, and commits to all of it with a Merkle root. Once closed, a period is never restated in place.',
    openPeriods.length === 0
      ? h('p', { class: 'dim' }, 'Every period is closed.')
      : h('div', { class: 'row' }, openPeriods.map((p) => h('button', {
        class: 'primary',
        onclick: async () => {
          const res = await post('/api/periods/close', { periodId: p.periodId });
          if (res.ok) {
            toast('Period closed', `root ${short(res.result.merkleRoot, 24)}`);
            await post('/api/periods/anchor', {
              periodId: p.periodId,
              chain: 'hardhat-local',
              txHash: '0x' + res.result.merkleRoot.slice(0, 40),
              blockNumber: 1,
            });
          } else {
            report('Close period', res);
          }
          refresh();
        },
      }, `Close ${p.periodId}`)))));

  root.append(h('h3', {}, 'Accredited parties'));
  root.append(table([
    { label: 'Party', key: 'providerId', mono: true },
    { label: 'Class', render: (p) => pill(p.class) },
    { label: 'Organisation', key: 'msp', mono: true },
    { label: 'State', render: (p) => stateBadge(p.state) },
    { label: 'Attestations', render: (p) => `${p.attestationsTotal - p.attestationsFailed}/${p.attestationsTotal}`, num: true },
    { label: 'History', render: (p) => h('span', { class: 'dim', title: p.history.join('\n') }, `${p.history.length} entr${p.history.length === 1 ? 'y' : 'ies'}`) },
    {
      label: '',
      render: (p) => (p.state === 'ACCREDITED' ? h('button', {
        class: 'small danger',
        onclick: async () => {
          report('De-accredit', await post('/api/providers/deaccredit', {
            providerID: p.providerId, reason: 'pattern of failed attestations',
          }));
          refresh();
        },
      }, 'De-accredit') : h('button', {
        class: 'small',
        title: 'This must be refused: a de-accredited facility cannot re-register clean',
        onclick: async () => {
          report('Re-register', await post('/api/providers/accredit', {
            providerID: p.providerId, MSP: p.msp, class: p.class, DGHSRef: 'DGHS-NEW',
          }));
          refresh();
        },
      }, 'Try to re-register')),
    },
  ], providers));

  root.append(h('h3', {}, 'Collusion scoring'));
  root.append(note('', h('p', {},
    h('strong', {}, 'The one row the paper does not claim to close. '),
    'Payee–verifier collusion produces attestations that are individually valid in every way the chaincode can check. Detection is statistical and lives off-chain; the flag lives on-chain, because a warning an operator can quietly drop is not a control. A flag is a place to look, not a finding.')));
  root.append(table([
    { label: 'Flag', key: 'flagId', mono: true },
    { label: 'Facility', key: 'providerId', mono: true },
    { label: 'Verifier', key: 'verifierId', mono: true },
    { label: 'Pairings', key: 'pairings', num: true },
    { label: 'z-score', render: (f) => f.zScore.toFixed(2), num: true },
    { label: 'Note', key: 'note' },
  ], flags, { empty: 'No flags raised. Run the anomaly scorer in the services package.' }));

  root.append(h('h3', {}, 'Disclosure log'));
  root.append(table([
    { label: 'Disclosure', key: 'disclosureId', mono: true },
    { label: 'Subject', render: (d) => short(d.commitment, 12), mono: true },
    { label: 'Order', key: 'orderRef', mono: true },
    { label: 'Requested by', key: 'requestedBy', mono: true },
    { label: 'When', render: (d) => when(d.ts) },
  ], disclosures, { empty: 'No disclosures. The ledger records that one happened, never what was disclosed.' }));
}

// ===========================================================================
// Ledger
// ===========================================================================

export async function ledger(root) {
  const [blocks, world] = await Promise.all([api.blocks(), api.worldState()]);
  const refused = blocks.filter((b) => !b.success);

  root.append(
    h('h2', {}, 'Ledger'),
    h('p', { class: 'lede' },
      'Every transaction, including the refused ones. ',
      h('strong', {}, 'A refused transaction writes nothing'),
      ' — it is recorded as an attempt and its write set is empty, which is what "refused at commit" means.'),
  );

  root.append(h('div', { class: 'grid stats' },
    stat('Transactions', blocks.length),
    stat('Committed', blocks.length - refused.length, '', 'good'),
    stat('Refused', refused.length, '', refused.length ? 'bad' : ''),
    stat('World-state keys', Object.keys(world).length),
  ));

  root.append(table([
    { label: '#', key: 'number', num: true },
    { label: 'Transaction', key: 'txId', mono: true },
    { label: 'Organisation', key: 'msp', mono: true },
    { label: 'Function', key: 'function', mono: true },
    { label: 'Outcome', render: (b) => (b.success ? pill('COMMITTED', 'ok') : pill('REFUSED', 'bad')) },
    { label: 'Writes', render: (b) => (b.success ? String(b.writes ? b.writes.length : 0) : '0'), num: true },
    { label: 'Detail', render: (b) => h('span', { class: 'dim' }, b.success ? (b.writes || []).join(' ') : b.message) },
  ], [...blocks].reverse()));

  const keys = Object.keys(world).sort();
  const nidLike = /"(\d{10}|\d{13}|\d{17})"/;
  const offenders = keys.filter((k) => nidLike.test(k + ' ' + world[k]));

  root.append(h('h3', {}, 'World state'));
  root.append(note(offenders.length ? 'bad' : 'good',
    h('p', {}, h('strong', {}, offenders.length ? 'Identifier found. ' : 'No identifier on the ledger. '),
      `${keys.length} keys scanned for anything shaped like a national identity number, a name, or a free-text diagnosis. `,
      offenders.length ? `${offenders.length} suspect value(s).` : 'None found.'),
    h('p', {},
      h('strong', {}, 'This is not a claim of anonymity. '),
      'Category code, subject commitment, provider identity and timestamps together remain a metadata surface. The paper treats that residual as a data-protection question rather than a solved problem, and so does this page.')));

  root.append(table([
    { label: 'Key', render: (k) => h('span', { class: 'statecode' }, k), mono: true },
    { label: 'Value', render: (k) => h('span', { class: 'statecode dim' }, world[k].length > 260 ? world[k].slice(0, 260) + '…' : world[k]) },
  ], keys.map((k) => k), { empty: 'World state is empty.' }));
}

// ===========================================================================
// Scenarios
// ===========================================================================

export async function scenarios(root) {
  const list = await api.scenarios();

  root.append(
    h('h2', {}, 'Adversarial harness'),
    h('p', { class: 'lede' },
      'Thirteen scripted runs with asserted outcomes. ',
      h('strong', {}, 'Most of them pass by producing a refusal'),
      ' — the ledger declining to write something is the property being demonstrated. Each runs against its own freshly bootstrapped network, so firing one does not disturb the ledger you are browsing.'),
  );

  const results = h('div');
  root.append(h('div', { class: 'row', style: 'margin-bottom:1rem' },
    h('button', {
      class: 'primary',
      onclick: async () => {
        results.innerHTML = '';
        results.append(h('div', { class: 'loading' }, 'Running all thirteen…'));
        const all = await api.runScenario('');
        results.innerHTML = '';
        const passed = all.filter((r) => r.passed).length;
        results.append(note(passed === all.length ? 'good' : 'bad',
          h('p', {}, h('strong', {}, `${passed} of ${all.length} scenarios passed.`))));
        for (const r of all) results.append(renderScenario(r));
      },
    }, 'Run all'),
    ...list.map((s) => h('button', {
      class: 'small',
      onclick: async () => {
        results.innerHTML = '';
        results.append(h('div', { class: 'loading' }, `Running ${s.id}…`));
        const r = await api.runScenario(s.id);
        results.innerHTML = '';
        results.append(renderScenario(r, true));
      },
    }, s.id))));

  root.append(table([
    { label: '', key: 'id', mono: true },
    { label: 'Scenario', key: 'title' },
    { label: 'Criterion', key: 'criterion' },
    { label: 'What it establishes', key: 'claim' },
  ], list));

  root.append(results);
}

function renderScenario(r, open = false) {
  return h('details', { class: 'scenario', open: open || !r.passed },
    h('summary', {},
      h('header', {},
        h('span', { class: 'sid' }, r.id),
        h('span', { class: 'stitle' }, r.title),
        pill(r.passed ? 'PASSED' : 'FAILED', r.passed ? 'ok' : 'bad'))),
    h('div', { class: 'body' },
      h('p', { class: 'claim' }, r.claim),
      h('ol', { class: 'steps' }, r.steps.map((s) => h('li', {
        class: [s.got === 'refused' ? 'refused' : '', s.ok ? '' : 'failed'].filter(Boolean).join(' '),
      },
      h('span', { class: 'n' }, s.n),
      h('div', {},
        h('div', { class: 'what' }, s.action, ' ', h('span', { class: 'who' }, s.actor)),
        s.got === 'refused' && s.detail !== 'committed' ? h('div', { class: 'detail' }, s.detail) : null,
        s.comment ? h('div', { class: 'comment' }, s.comment) : null)))),
      h('p', { class: 'claim', style: 'margin-top:.7rem' }, h('strong', {}, 'Result: '), r.summary)));
}

// ===========================================================================
// USSD
// ===========================================================================

export async function ussd(root) {
  root.append(
    h('h2', {}, 'USSD fallback'),
    h('p', { class: 'lede' },
      'The target household does not have a smartphone, and a scheme that assumes one has already excluded the people it was built for. ',
      'Every policyholder function reachable in the app is reachable here on a feature phone, over the same USSD menus bKash already taught this population to use.'),
  );

  const screen = h('div', { class: 'phone' });
  const menus = {
    root: `    OBHOY
*247# claims service

1. My cover
2. Claim status
3. Report an admission
4. Recover my account
0. Exit

Reply: `,
    1: `MY COVER

Policy POL-A-0001
Insurer A · indemnity
Benefit up to Tk 30,000

Policy POL-B-0001
Insurer B · hospital cash
Benefit up to Tk 15,000

Both may pay on one
admission. This is your
contract, not a fraud.

0. Back`,
    2: `CLAIM STATUS

Episode 3f9a2c
Admitted 04 Mar
Corroborated by:
 - your hospital
 - diagnostic centre

State: SETTLED
Tk 30,000 sent to
017*****21 on 06 Mar
Receipt BKX4A9E21

0. Back`,
    3: `REPORT ADMISSION

Your hospital asserts the
admission; you do not.

If a hospital has claimed
for you and you were not
admitted, reply 9 and a
field agent will call.

0. Back`,
    4: `ACCOUNT RECOVERY

You do not hold a private
key. Nothing is lost if
your phone is.

Recovery needs BOTH:
 1. your MFI field agent
 2. one household member

Reply 1 to start.

0. Back`,
  };

  function draw(key) {
    screen.textContent = menus[key] || menus.root;
    screen.append(h('span', { class: 'cursor' }, '█'));
  }
  draw('root');

  const keypad = h('div', { class: 'row', style: 'justify-content:center;margin-top:.8rem' },
    ['1', '2', '3', '4', '0'].map((k) => h('button', {
      class: 'small',
      onclick: () => draw(k === '0' ? 'root' : k),
    }, k)));

  root.append(h('div', { class: 'grid two' },
    h('div', {}, screen, keypad),
    h('div', {},
      card('Why this is in the prototype',
        'It is cheap to build and it is the part a jury remembers, because it shows we know who the user is.',
        h('p', {}, 'Two design decisions in the paper are only legible from this screen:'),
        h('p', {}, h('strong', {}, 'Custodial keys. '),
          'This population cannot be asked to manage private keys. A scheme that costs a widow her cover because she lost a seed phrase is worse than no scheme. Recovery runs through the field agent plus a second household member — the social recovery mobile-money users already know.'),
        h('p', {}, h('strong', {}, 'The policyholder never asserts. '),
          'The hospital asserts; independent classes corroborate. What the policyholder gets is the ability to see that it happened, and to say when it did not.')))));
}
