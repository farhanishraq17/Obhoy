// Small DOM helpers. No framework: the whole application is a few hundred
// lines of view functions, and a build step would be the largest dependency in
// a repository that otherwise has none on the front end.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export const text = (s) => document.createTextNode(String(s));

export function pill(label, kind = '') {
  return h('span', { class: `pill ${kind}`.trim() }, label);
}

export function stat(label, value, sub, kind = '') {
  return h('div', { class: `stat ${kind}`.trim() },
    h('dt', {}, label),
    h('dd', {}, String(value), sub ? h('span', { class: 'sub' }, ` ${sub}`) : null));
}

export function table(columns, rows, options = {}) {
  if (!rows.length) {
    return h('div', { class: 'tablewrap' }, h('div', { class: 'empty' }, options.empty || 'Nothing here yet.'));
  }
  return h('div', { class: 'tablewrap' },
    h('table', {},
      h('thead', {}, h('tr', {}, columns.map((c) => h('th', { class: c.num ? 'num' : '' }, c.label)))),
      h('tbody', {}, rows.map((row) => h('tr', {},
        columns.map((c) => {
          const value = c.render ? c.render(row) : row[c.key];
          const cls = [c.num ? 'num' : '', c.mono ? 'k' : ''].filter(Boolean).join(' ');
          return h('td', { class: cls }, value === undefined || value === null ? '—' : value);
        }))))));
}

export function card(title, hint, ...children) {
  return h('div', { class: 'card' },
    title ? h('h3', {}, title) : null,
    hint ? h('p', { class: 'hint' }, hint) : null,
    ...children);
}

export function note(kind, ...children) {
  return h('div', { class: `note ${kind}`.trim() }, ...children);
}

let toastTimer;
export function toast(title, detail, isError = false) {
  const el = document.getElementById('toast');
  el.innerHTML = '';
  el.append(h('span', { class: 't' }, title));
  if (detail) el.append(h('span', { class: 'd' }, detail));
  el.className = `toast show${isError ? ' err' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, isError ? 9000 : 4200);
}

/**
 * Report the outcome of a transaction. A refusal is shown as a refusal, in the
 * chaincode's own words, because the wording is the evidence: "invariant (4)
 * violated" is the thing a reviewer needs to see, not "something went wrong".
 */
export function report(label, response) {
  if (response && response.ok) {
    toast(`${label} — committed`, '');
    return true;
  }
  toast(`${label} — refused by the ledger`, response ? response.error : 'no response', true);
  return false;
}

export function stateBadge(s) {
  const kinds = {
    OPEN: 'warn', CLOSED_ELIGIBLE: 'ok', EXPIRED: 'mute',
    CREATED: '', ADJUDICATED: 'warn', SETTLED: 'ok',
    DENIED: 'bad', APPEALED: 'warn', DENIED_UPHELD: 'bad',
    ACCREDITED: 'ok', DEACCREDITED: 'bad',
    ACTIVE: 'ok', SUSPENDED: 'bad', LAPSED: 'mute',
  };
  return pill(s, kinds[s] ?? '');
}

export function field(label, control) {
  return h('div', { class: 'field' }, h('label', {}, label), control);
}

export function select(options, value, onChange) {
  const el = h('select', { onchange: (e) => onChange(e.target.value) },
    options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)));
  return el;
}

export function input(placeholder, value = '') {
  return h('input', { type: 'text', placeholder, value });
}
