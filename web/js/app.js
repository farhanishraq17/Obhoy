// The application shell: organisation switcher, tabs, and the render loop.

import { api, state, ORGS } from './api.js';
import { h, toast } from './ui.js';
import * as views from './views.js';

const TABS = [
  { id: 'transparency', label: 'Published record', render: views.transparency },
  { id: 'desk', label: 'Claim desk', render: views.claimDesk },
  { id: 'events', label: 'Events', render: views.eventsView },
  { id: 'governance', label: 'Governance', render: views.governance },
  { id: 'oversight', label: 'Oversight', render: views.oversight },
  { id: 'ledger', label: 'Ledger', render: views.ledger },
  { id: 'scenarios', label: 'Harness', render: views.scenarios },
  { id: 'ussd', label: 'USSD', render: views.ussd },
];

let current = location.hash.slice(1) || 'transparency';
if (!TABS.some((t) => t.id === current)) current = 'transparency';

const view = document.getElementById('view');
const tabsEl = document.getElementById('tabs');
const roleSel = document.getElementById('role');
const roleClass = document.getElementById('role-class');
const nodeState = document.getElementById('node-state');

// The organisation is remembered per browser, so a demonstration can be
// resumed without re-selecting a role on every reload.
try {
  const saved = localStorage.getItem('obhoy.msp');
  if (saved && ORGS.some((o) => o.msp === saved)) state.msp = saved;
} catch { /* private windows and blocked storage are fine; the default stands */ }

for (const org of ORGS) {
  roleSel.append(h('option', { value: org.msp, selected: org.msp === state.msp }, org.label));
}

function syncRole() {
  const org = ORGS.find((o) => o.msp === state.msp);
  roleClass.textContent = org ? org.class : '';
  roleClass.title = org ? `${org.msp} — ${org.note}` : '';
  roleClass.className = 'pill' + (org && org.class === 'INSURER' ? ' warn' : org && org.class === 'OVERSIGHT' ? ' mute' : ' ok');
}

roleSel.addEventListener('change', (e) => {
  state.msp = e.target.value;
  try { localStorage.setItem('obhoy.msp', state.msp); } catch { /* ignore */ }
  syncRole();
  render();
});

for (const tab of TABS) {
  tabsEl.append(h('button', {
    class: 'tab',
    'data-tab': tab.id,
    onclick: () => { current = tab.id; location.hash = tab.id; render(); },
  }, tab.label));
}

window.addEventListener('hashchange', () => {
  const next = location.hash.slice(1);
  if (next && next !== current && TABS.some((t) => t.id === next)) {
    current = next;
    render();
  }
});

async function render() {
  for (const btn of tabsEl.children) {
    btn.setAttribute('aria-current', String(btn.dataset.tab === current));
  }
  const tab = TABS.find((t) => t.id === current);
  view.innerHTML = '';
  const container = h('div');
  view.append(container);
  try {
    await tab.render(container, render);
  } catch (err) {
    container.innerHTML = '';
    container.append(h('div', { class: 'note bad' },
      h('p', {}, h('strong', {}, 'Could not load this view. '), err.message),
      h('p', {}, 'Is the local node running? Start it with ', h('code', {}, 'make dev'),
        ' or ', h('code', {}, 'go run ./cmd/localnode'), ' from ', h('code', {}, 'chaincode/obhoycc'), '.')));
  }
}

async function poll() {
  const health = await api.health();
  nodeState.textContent = health
    ? `${health.node} · ${health.blocks} transactions`
    : 'node unreachable';
  nodeState.className = health ? '' : 'dim';
}

syncRole();
render();
poll();
setInterval(poll, 5000);
