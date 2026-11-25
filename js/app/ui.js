'use strict';
/* Shared interface pieces: buttons, fields, dialogs, messages. */

/* ---------- formatting ---------- */
function fmtNum(n, d = 0) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: d }); }
function fmtBytes(n) { return n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB'; }
function cleanReal(node) { return node.f & 1 ? node.v : Number(Number(node.v).toPrecision(7)); }
function numOf(node) { return node.t === 'real' ? cleanReal(node) : node.v; }
function plural(n, one, many) { return fmtNum(n) + ' ' + (Number(n) === 1 ? one : (many || one + 's')); }
function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}
function whenText(t) { return new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }

/* ---------- messages ---------- */
function toast(msg, kind = '') {
  const box = $('#toasts');
  if (!box) return;
  const t = h('div', { class: 'toast ' + kind, role: 'status' }, msg);
  while (box.children.length >= 2) box.firstChild.remove();
  box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, kind === 'bad' ? 6000 : 3600);
}

/* ---------- controls ---------- */
function button(label, onclick, cls = '', attrs = {}) { return h('button', { type: 'button', class: 'btn ' + cls, onclick, ...attrs }, label); }
function chip(label, active, onclick, extra = {}) { return h('button', { type: 'button', class: 'chip' + (active ? ' on' : ''), 'aria-pressed': active ? 'true' : 'false', onclick, ...extra }, label); }
function card(title, ...kids) { return h('section', { class: 'card px' }, title ? h('h3', null, title) : null, kids); }
function field(label, control, hint) {
  return h('label', { class: 'field' }, h('span', { class: 'lbl' }, label), control, hint ? h('span', { class: 'hint' }, hint) : null);
}
function checkbox(label, checked, onchange, attrs = {}) {
  return h('label', { class: 'check' }, h('input', { type: 'checkbox', checked, onchange: (e) => onchange(e.target.checked), ...attrs }), h('span', null, label));
}
function pageHead(title, sub, ...actions) {
  return h('div', { class: 'page-head' }, h('div', null, h('h1', null, title), sub ? h('p', { class: 'muted' }, sub) : null), h('div', { class: 'row wrap' }, actions));
}
function needFile(fk, what) {
  return h('div', { class: 'page' }, pageHead(what), card(null,
    h('p', null, 'This page needs ' + (fk === 'general' ? 'webfishing_general_data.sav.' : 'a save slot.')),
    button('Choose file', () => $('#picker').click(), 'primary')));
}
function meter(label, have, total) {
  const full = have >= total;
  return h('div', { class: 'meter' + (full ? ' full' : '') }, h('span', { class: 'm-lbl' }, label), h('span', { class: 'm-num' }, fmtNum(have) + ' / ' + fmtNum(total)),
    h('span', { class: 'm-bar', 'aria-hidden': 'true' }, h('i', { style: { width: Math.round((have / total) * 100) + '%' } })));
}
function rarityPills(current, onPick, multi) {
  return h('div', { class: 'pills', role: 'group', 'aria-label': 'Rarity' }, RARITY.map((r, i) => {
    const on = multi ? current.includes(i) : current === i;
    return h('button', { type: 'button', class: 'pill ' + r.c + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: () => onPick(i) }, r.n);
  }));
}
/* Number box bound to a save node. opts.attach adds the node to the save on first edit only. */
function numInput(fk, node, opts = {}) {
  const { path, label, min, max, step, slider, onChange, attach } = opts;
  if (typeof node.v === 'bigint') return h('input', { type: 'text', value: String(node.v), readOnly: true, title: 'Very large number, shown read-only to keep it exact' });
  const input = h('input', { type: 'number', value: numOf(node), step: step || (node.t === 'int' ? 1 : 'any'), min, max, inputmode: 'decimal', 'aria-label': label });
  let rng = null;
  const apply = (raw) => {
    let x = parseFloat(raw);
    if (!isFinite(x)) { input.value = numOf(node); return; }
    if (min != null) x = Math.max(min, x);
    if (max != null) x = Math.min(max, x);
    commit(fk, 'Edit ' + label, () => { if (attach) attach(); setNum(node, x); }, { render: false, merge: true });
    input.value = numOf(node);
    if (rng) rng.value = node.v;
    if (path) wrap.classList.toggle('changed', isChanged(fk, path));
    if (onChange) onChange(node.v);
  };
  input.addEventListener('change', () => apply(input.value));
  if (slider) rng = h('input', { type: 'range', min, max, step: step || 'any', value: node.v, 'aria-label': label + ' slider', oninput: () => { input.value = rng.value; }, onchange: () => apply(rng.value) });
  const wrap = h('div', { class: 'numwrap' + (path && isChanged(fk, path) ? ' changed' : '') }, input, rng);
  return wrap;
}
function numField(fk, rootKey, label, opts = {}) {
  const path = [].concat(rootKey), node = get(S.files[fk].root, ...path);
  return node ? field(label, numInput(fk, node, { label, path, ...opts }), opts.hint) : null;
}

/* ---------- dialogs ---------- */
function modal(title, body, { wide = false } = {}) {
  const prev = document.activeElement;
  const close = () => { ov.remove(); document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); };
  const key = (e) => {
    if (document.querySelector('.overlay:last-of-type') !== ov) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = [...ov.querySelectorAll('button,input,select,a[href]')].filter(x => !x.disabled && x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  const ov = h('div', { class: 'overlay', onmousedown: (e) => { if (e.target === ov) close(); } },
    h('div', { class: 'modal px' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'modal-head' }, h('h2', null, title), h('button', { type: 'button', class: 'btn ghost', onclick: close, 'aria-label': 'Close' }, '✕')),
      h('div', { class: 'modal-body' }, body)));
  document.addEventListener('keydown', key);
  document.body.append(ov);
  const first = ov.querySelector('.modal-body input:not([type=checkbox]), .modal-body button, .modal-body select');
  if (first) first.focus();
  return { close, el: ov };
}
function confirmBox(title, text, okLabel, onOk, danger = false) {
  const m = modal(title, [h('p', null, text), h('div', { class: 'row end' },
    button('Cancel', () => m.close(), 'ghost'),
    button(okLabel, () => { m.close(); onOk(); }, danger ? 'danger' : 'primary'))]);
}
