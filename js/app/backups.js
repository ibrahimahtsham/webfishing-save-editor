'use strict';
/* The backup vault: every file that is opened, and every file that is written,
   is kept byte for byte in this browser. Nothing is ever removed automatically. */

const Vault = (() => {
  let dbPromise = null;
  const failed = { reason: '' };
  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('This browser has no local storage for files'));
      const req = indexedDB.open('tackle-box-backups', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files', { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Local storage is blocked'));
      req.onblocked = () => reject(new Error('Another tab is blocking local storage'));
    });
    dbPromise.catch(e => { failed.reason = e.message; });
    return dbPromise;
  }
  async function run(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', mode);
      const req = fn(tx.objectStore('files'));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onabort = tx.onerror = () => reject(tx.error || new Error('Local storage failed'));
    });
  }
  const list = async () => (await run('readonly', s => s.getAll())).sort((a, b) => b.seen - a.seen);
  const find = (id) => run('readonly', s => s.get(id));
  /* The id is a hash of the content, so opening the same file twice keeps one copy. */
  async function add(entry) {
    const id = hashBytes(entry.bytes);
    const old = await find(id);
    const rec = old
      ? { ...old, seen: Date.now() }
      : { id, name: entry.name, kind: entry.kind, slot: entry.slot, reason: entry.reason, bytes: entry.bytes, size: entry.bytes.length, summary: entry.summary, added: Date.now(), seen: Date.now(), downloaded: false, note: '' };
    await run('readwrite', s => s.put(rec));
    const back = await find(id);
    if (!back || !sameBytes(back.bytes, entry.bytes)) throw new Error('The stored copy did not match the file');
    return rec;
  }
  async function patch(id, change) { const rec = await find(id); if (rec) await run('readwrite', s => s.put({ ...rec, ...change })); }
  const remove = (id) => run('readwrite', s => s.delete(id));
  function persist() { try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (_) { /* optional */ } }
  return { add, list, find, patch, remove, persist, failed };
})();

function sameBytes(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
/* Content fingerprint. add() reads every copy back and compares it, so a collision can never lose a file. */
function hashBytes(u8) {
  const lane = (seed) => {
    let hi = seed >>> 0, lo = 0x84222325 ^ seed;
    for (let i = 0; i < u8.length; i++) {
      lo = Math.imul(lo ^ u8[i], 0x01000193) >>> 0;
      hi = Math.imul(hi ^ (lo >>> 13) ^ u8[i], 0x85ebca6b) >>> 0;
    }
    return hi.toString(16).padStart(8, '0') + (lo >>> 0).toString(16).padStart(8, '0');
  };
  return u8.length.toString(36) + '-' + lane(0xcbf29ce4) + lane(0x9e3779b9);
}

function summarize(kind, root) {
  if (kind !== 'save') return {};
  const eq = {};
  const node = get(root, 'cosmetics_equipped');
  if (node && node.t === 'dict') for (const [k, n] of node.m) eq[k] = n.t === 'arr' ? n.v.map(x => x.v) : n.v;
  const num = (k) => Number(val(root, k) || 0);
  return { money: num('money'), level: num('level'), fish: num('fish_caught'), items: (val(root, 'inventory') || []).length, outfit: eq };
}
function slotLabel(slot) { return slot == null ? 'slot unknown' : 'Save Slot ' + (Number(slot) + 1); }
function backupName(rec) {
  const base = rec.kind === 'general' ? 'webfishing_general_data' : 'webfishing_save_slot_' + (rec.slot == null ? 'unknown' : rec.slot);
  return base + ' BACKUP ' + stamp(new Date(rec.added)) + '.sav';
}
function saveBlob(bytes, name, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
