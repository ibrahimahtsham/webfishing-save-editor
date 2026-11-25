'use strict';
/* ---------- diff ---------- */
function scalarEq(a, b) {
  if (a.t !== b.t) return false;
  if (a.t === 'vec2') return a.v[0] === b.v[0] && a.v[1] === b.v[1];
  if (a.t === 'nil') return true;
  return a.v === b.v || (typeof a.v === 'bigint' || typeof b.v === 'bigint' ? String(a.v) === String(b.v) : false);
}
function isScalar(n) { return n.t !== 'dict' && n.t !== 'arr'; }
/* returns [{path:[...], kind:'changed'|'added'|'removed', from?:node, to?:node, key?:string}] */
function diff(a, b, path = [], out = []) {
  if (!a) { out.push({ path, kind: 'added', to: b }); return out; }
  if (!b) { out.push({ path, kind: 'removed', from: a }); return out; }
  if (a.t !== b.t) { out.push({ path, kind: 'changed', from: a, to: b }); return out; }
  if (isScalar(a)) { if (!scalarEq(a, b)) out.push({ path, kind: 'changed', from: a, to: b }); return out; }
  if (a.t === 'dict') {
    for (const [k, v] of a.m) { const o = b.m.get(k); o ? diff(v, o, [...path, k], out) : out.push({ path: [...path, k], kind: 'removed', from: v }); }
    for (const [k, v] of b.m) if (!a.m.has(k)) out.push({ path: [...path, k], kind: 'added', to: v });
    return out;
  }
  // arrays
  const keyed = (arr) => arr.length && arr.every(e => e.t === 'dict' && e.m.has('ref'));
  if (keyed(a.v) || keyed(b.v)) {
    const idx = (arr) => { const m = new Map(); arr.forEach(e => { const r = e.m.get('ref'); if (r) m.set(String(r.v), e); }); return m; };
    const A = idx(a.v), B = idx(b.v);
    for (const [k, v] of A) { const o = B.get(k); o ? diff(v, o, [...path, '#' + k], out) : out.push({ path: [...path, '#' + k], kind: 'removed', from: v }); }
    for (const [k, v] of B) if (!A.has(k)) out.push({ path: [...path, '#' + k], kind: 'added', to: v });
    return out;
  }
  if (a.v.every(isScalar) && b.v.every(isScalar)) {
    const cnt = (arr) => { const m = new Map(); arr.forEach(e => { const k = e.t + ':' + e.v; m.set(k, [(m.get(k) || [0, e])[0] + 1, e]); }); return m; };
    const A = cnt(a.v), B = cnt(b.v);
    for (const [k, [c, e]] of A) { const d = c - (B.get(k) ? B.get(k)[0] : 0); for (let i = 0; i < d; i++) out.push({ path, kind: 'removed', from: e, item: true }); }
    for (const [k, [c, e]] of B) { const d = c - (A.get(k) ? A.get(k)[0] : 0); for (let i = 0; i < d; i++) out.push({ path, kind: 'added', to: e, item: true }); }
    return out;
  }
  const n = Math.max(a.v.length, b.v.length);
  for (let i = 0; i < n; i++) diff(a.v[i], b.v[i], [...path, i], out);
  return out;
}

