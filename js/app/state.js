'use strict';
/* App state, undo history and change tracking. Every edit goes through commit(). */

const prefs = {
  get(key, fallback) { try { return localStorage.getItem('tb-' + key) || fallback; } catch (_) { return fallback; } },
  set(key, value) { try { localStorage.setItem('tb-' + key, value); } catch (_) { /* private window */ } }
};

const S = {
  files: { save: null, general: null },
  mode: prefs.get('mode', 'simple') === 'advanced' ? 'advanced' : 'simple',
  view: 'home', undo: [], redo: [], compare: null, rev: 0,
  inv: { q: '', tab: 'tool', sel: new Set(), open: null },
  fish: { id: 'fish_lake_bass', quality: 5, preset: 'biggest', size: null, name: '', copies: 1, journal: true,
    sections: new Set(['lake', 'ocean', 'rain', 'water_trash', 'alien', 'void']), rarities: new Set([0, 1, 2, 3, 4, 5]), sizes: new Set(['smallest', 'biggest']), skipOwned: false, setJournal: true },
  jr: { sec: 'lake', q: '', open: null, show: 'all' },
  cos: { q: '', cat: 'hat', show: 'all', many: false },
  rawOpen: new Set()
};
/* Until a save is opened, a built-in new game stands in so every page can be looked at. It can never be saved. */
const isSample = () => !!S.files.save && S.files.save.sample === true;
const inSimple = () => S.mode === 'simple' && !isSample();

/* ---------- commit / undo ---------- */
function snapshot(fk) { const f = S.files[fk]; return serializeFile(f.root, f.tail); }
function commit(fk, label, fn, { render = true, merge = false } = {}) {
  const now = Date.now(), last = S.undo[S.undo.length - 1];
  if (merge && last && last.key === fk && last.label === label && now - last.t < 1500) last.t = now;
  else {
    S.undo.push({ key: fk, label, t: now, bytes: snapshot(fk) });
    if (S.undo.length > 100) S.undo.shift();
  }
  S.redo = [];
  S.rev++;
  fn();
  if (render) renderMain();
  updateChrome();
}
function restoreEntry(entry, from, to) {
  to.push({ key: entry.key, label: entry.label, t: 0, bytes: snapshot(entry.key) });
  S.files[entry.key].root = parseFile(entry.bytes).root;
  S.rev++;
  diffCache = null;
  toast((from === S.undo ? 'Undid: ' : 'Redid: ') + entry.label);
  render();
}
function undo() { const e = S.undo.pop(); if (e) restoreEntry(e, S.undo, S.redo); }
function redo() { const e = S.redo.pop(); if (e) restoreEntry(e, S.redo, S.undo); }
function dropHistory(fk) { S.undo = S.undo.filter(e => e.key !== fk); S.redo = S.redo.filter(e => e.key !== fk); }

/* ---------- changes ---------- */
let diffCache = null;
function allChanges() {
  if (diffCache) return diffCache;
  const out = [];
  for (const fk of ['save', 'general']) {
    const f = S.files[fk];
    if (!f) continue;
    for (const d of diff(f.orig, f.root)) { d.file = fk; out.push(d); }
    if (fk === 'save' && orderChanged(f)) out.push({ file: fk, path: ['inventory'], kind: 'order' });
  }
  return (diffCache = out);
}
/* diff() matches items by ref and ignores their order, so order is compared separately. */
function orderChanged(f) {
  const refs = (root) => (get(root, 'inventory') || { v: [] }).v.map(n => String(val(n, 'ref')));
  const a = refs(f.orig), b = refs(f.root);
  const inA = new Set(a), inB = new Set(b);
  const x = a.filter(r => inB.has(r)), y = b.filter(r => inA.has(r));
  return x.length !== y.length || x.some((r, i) => r !== y[i]);
}
function changeCount() { return allChanges().length; }
function isDirty(fk) { return allChanges().some(d => d.file === fk); }
/* edits that exist only in this page */
function unsaved(fk) { const f = S.files[fk]; return !!f && !f.sample && isDirty(fk) && f.savedRev !== S.rev; }
function isChanged(fk, path) {
  const f = S.files[fk], a = get(f.orig, ...path), b = get(f.root, ...path);
  return !a || !b ? a !== b : diff(a, b).length > 0;
}
let chromeQueued = false;
function updateChrome() {
  diffCache = null;
  if (chromeQueued) return;
  chromeQueued = true;
  requestAnimationFrame(() => { chromeQueued = false; renderChrome(); });
}
