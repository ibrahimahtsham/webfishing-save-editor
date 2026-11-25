'use strict';
/* ---------- Godot 3 binary variant reader / writer (lossless) ---------- */
const MAXS = BigInt(Number.MAX_SAFE_INTEGER);
const INT32_MIN = -2147483648, INT32_MAX = 2147483647;

class Reader {
  constructor(u8) { this.u8 = u8; this.dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); this.p = 0; }
  need(n) { if (this.p + n > this.u8.length) throw new Error('Unexpected end of file at byte ' + this.p); }
  u16() { this.need(2); const v = this.dv.getUint16(this.p, true); this.p += 2; return v; }
  u32() { this.need(4); const v = this.dv.getUint32(this.p, true); this.p += 4; return v; }
  i32() { this.need(4); const v = this.dv.getInt32(this.p, true); this.p += 4; return v; }
  i64() { this.need(8); const v = this.dv.getBigInt64(this.p, true); this.p += 8; return v; }
  f32() { this.need(4); const v = this.dv.getFloat32(this.p, true); this.p += 4; return v; }
  f64() { this.need(8); const v = this.dv.getFloat64(this.p, true); this.p += 8; return v; }
  bytes(n) { this.need(n); const b = this.u8.subarray(this.p, this.p + n); this.p += n; return b; }
}

class Writer {
  constructor() { this.u8 = new Uint8Array(1 << 16); this.dv = new DataView(this.u8.buffer); this.p = 0; }
  grow(n) {
    if (this.p + n <= this.u8.length) return;
    let size = this.u8.length;
    while (size < this.p + n) size *= 2;
    const nu = new Uint8Array(size); nu.set(this.u8);
    this.u8 = nu; this.dv = new DataView(nu.buffer);
  }
  u16(v) { this.grow(2); this.dv.setUint16(this.p, v, true); this.p += 2; }
  u32(v) { this.grow(4); this.dv.setUint32(this.p, v, true); this.p += 4; }
  i32(v) { this.grow(4); this.dv.setInt32(this.p, v, true); this.p += 4; }
  i64(v) { this.grow(8); this.dv.setBigInt64(this.p, BigInt(v), true); this.p += 8; }
  f32(v) { this.grow(4); this.dv.setFloat32(this.p, v, true); this.p += 4; }
  f64(v) { this.grow(8); this.dv.setFloat64(this.p, v, true); this.p += 8; }
  bytes(b) { this.grow(b.length); this.u8.set(b, this.p); this.p += b.length; }
  out() { return this.u8.slice(0, this.p); }
}

const TD = new TextDecoder("utf-8", { ignoreBOM: true }), TE = new TextEncoder();

function readVariant(r) {
  const t = r.u16(), f = r.u16(), is64 = (f & 1) !== 0;
  switch (t) {
    case 0: return { t: 'nil', f };
    case 1: return { t: 'bool', f, v: r.u32() !== 0 };
    case 2: {
      if (is64) { const b = r.i64(); return { t: 'int', f, v: (b >= -MAXS && b <= MAXS) ? Number(b) : b }; }
      return { t: 'int', f, v: r.i32() };
    }
    case 3: return { t: 'real', f, v: is64 ? r.f64() : r.f32() };
    case 4: {
      const n = r.u32(); const b = r.bytes(n); const pad = (4 - (n % 4)) % 4; r.bytes(pad);
      return { t: 'str', f, v: TD.decode(b) };
    }
    case 5: return { t: 'vec2', f, v: is64 ? [r.f64(), r.f64()] : [r.f32(), r.f32()] };
    case 18: {
      const n = r.u32(); const m = new Map(), kt = new Map();
      for (let i = 0; i < n; i++) {
        const k = readVariant(r);
        if (k.t !== 'str' && k.t !== 'int') throw new Error('Unsupported dictionary key type: ' + k.t);
        const ks = String(k.v);
        if (k.t !== 'str' || k.f !== 0) kt.set(ks, k);
        m.set(ks, readVariant(r));
      }
      return { t: 'dict', f, m, kt };
    }
    case 19: {
      const n = r.u32(); const v = new Array(n);
      for (let i = 0; i < n; i++) v[i] = readVariant(r);
      return { t: 'arr', f, v };
    }
    default: throw new Error('This save uses a data type the editor does not know yet (Godot type id ' + t + ').');
  }
}

function writeVariant(w, n) {
  const typeId = { nil: 0, bool: 1, int: 2, real: 3, str: 4, vec2: 5, dict: 18, arr: 19 }[n.t];
  w.u16(typeId); w.u16(n.f); const is64 = (n.f & 1) !== 0;
  switch (n.t) {
    case 'nil': break;
    case 'bool': w.u32(n.v ? 1 : 0); break;
    case 'int': is64 ? w.i64(n.v) : w.i32(Number(n.v)); break;
    case 'real': is64 ? w.f64(n.v) : w.f32(n.v); break;
    case 'str': { const b = TE.encode(n.v); w.u32(b.length); w.bytes(b); w.bytes(new Uint8Array((4 - (b.length % 4)) % 4)); break; }
    case 'vec2': is64 ? (w.f64(n.v[0]), w.f64(n.v[1])) : (w.f32(n.v[0]), w.f32(n.v[1])); break;
    case 'dict':
      w.u32(n.m.size);
      for (const [k, val] of n.m) {
        writeVariant(w, n.kt.get(k) || { t: 'str', f: 0, v: k });
        writeVariant(w, val);
      }
      break;
    case 'arr': w.u32(n.v.length); for (const e of n.v) writeVariant(w, e); break;
  }
}

/* A WEBFISHING file = uint32 payload length + one Godot variant (a Dictionary). */
function parseFile(u8) {
  if (u8.length < 8) throw new Error('This file is too small to be a WEBFISHING save.');
  const r = new Reader(u8);
  const declared = r.u32();
  const root = readVariant(r);
  if (root.t !== 'dict') throw new Error('Expected a dictionary at the top of the file.');
  const tail = u8.slice(r.p);
  return { root, tail, headerOk: declared === u8.length - 4 };
}
function serializeFile(root, tail) {
  const w = new Writer(); writeVariant(w, root); if (tail && tail.length) w.bytes(tail);
  const body = w.out(); const out = new Uint8Array(body.length + 4);
  new DataView(out.buffer).setUint32(0, body.length, true); out.set(body, 4);
  return out;
}

