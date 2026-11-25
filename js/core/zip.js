'use strict';
/* Minimal ZIP writer (no compression), used for "download all backups". */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
/* files: [{ name, bytes, date }] */
function makeZip(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.bytes), d = f.date || new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const day = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const head = (sig, extra) => {
      const dv = new DataView(new ArrayBuffer(sig === 0x04034b50 ? 30 : 46));
      let p = 0;
      const u32 = (v) => { dv.setUint32(p, v, true); p += 4; }, u16 = (v) => { dv.setUint16(p, v, true); p += 2; };
      u32(sig);
      if (extra) u16(20);
      u16(20); u16(0x0800); u16(0); u16(time); u16(day); u32(crc); u32(f.bytes.length); u32(f.bytes.length); u16(name.length); u16(0);
      if (extra) { u16(0); u16(0); u16(0); u32(0); u32(offset); }
      return new Uint8Array(dv.buffer);
    };
    const local = head(0x04034b50, false);
    central.push(head(0x02014b50, true), name);
    parts.push(local, name, f.bytes);
    offset += local.length + name.length + f.bytes.length;
  }
  const centralSize = central.reduce((s, b) => s + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true); end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, b) => s + b.length, 0));
  let p = 0;
  for (const b of all) { out.set(b, p); p += b.length; }
  return out;
}
