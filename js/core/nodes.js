'use strict';
/* ---------- node helpers ---------- */
const N = {
  int: (v) => ({ t: 'int', f: (v > INT32_MAX || v < INT32_MIN) ? 1 : 0, v }),
  real: (v) => ({ t: 'real', f: Math.fround(v) === v ? 0 : 1, v }),
  str: (v) => ({ t: 'str', f: 0, v }),
  bool: (v) => ({ t: 'bool', f: 0, v }),
  arr: (v = []) => ({ t: 'arr', f: 0, v }),
  dict: (entries = []) => ({ t: 'dict', f: 0, m: new Map(entries), kt: new Map() })
};
function get(n, ...path) {
  for (const p of path) {
    if (!n) return undefined;
    if (n.t === 'dict') n = n.m.get(String(p)); else if (n.t === 'arr') n = n.v[p]; else return undefined;
  }
  return n;
}
function val(n, ...path) { const x = get(n, ...path); return x ? x.v : undefined; }
function setNum(node, x) {
  if (node.t === 'int') { x = (typeof x === 'bigint') ? x : Math.round(x); node.f = (x > INT32_MAX || x < INT32_MIN) ? (node.f | 1) : (node.f & ~1); }
  else if (node.t === 'real') node.f = Math.fround(x) === x ? (node.f & ~1) : (node.f | 1);
  node.v = x;
}
function ensure(dict, key, factory) { if (!dict.m.has(key)) dict.m.set(key, factory()); return dict.m.get(key); }
function clone(n) {
  switch (n.t) {
    case 'dict': { const m = new Map(); for (const [k, v] of n.m) m.set(k, clone(v)); return { t: 'dict', f: n.f, m, kt: new Map(n.kt) }; }
    case 'arr': return { t: 'arr', f: n.f, v: n.v.map(clone) };
    case 'vec2': return { t: 'vec2', f: n.f, v: n.v.slice() };
    default: return { ...n };
  }
}

