'use strict';
/* Checks run on the edited save before it can be written. "stop" blocks saving. */

function checkSave(f) {
  const out = [];
  const stop = (text) => out.push({ level: 'stop', text });
  const warn = (text) => out.push({ level: 'warn', text });

  if (!f.lossless) stop('This file cannot be rewritten byte for byte, so the editor will not risk saving over it.');

  let bytes = null;
  try {
    bytes = serializeFile(f.root, f.tail);
    const again = parseFile(bytes);
    if (!again.headerOk || diff(f.root, again.root).length) stop('The finished file did not read back identically.');
  } catch (e) {
    stop('The finished file could not be read back: ' + e.message);
  }
  if (f.kind !== 'save') return { issues: out, bytes };

  const r = f.root, o = f.orig;
  for (const [key, type] of Object.entries(REQUIRED_KEYS)) {
    const n = get(r, key);
    const ok = n && (type === 'num' ? n.t === 'int' || n.t === 'real' : n.t === type);
    if (!ok) stop('“' + key + '” is missing or has the wrong type. The game needs it to open the save.');
  }
  if (out.some(x => x.level === 'stop')) return { issues: out, bytes };

  /* inventory */
  const inv = get(r, 'inventory').v;
  const before = new Set(get(o, 'inventory') ? get(o, 'inventory').v.map(n => val(n, 'id')) : []);
  const seen = new Map(), unknownNew = new Set(), unknownOld = new Set();
  let broken = 0, badQuality = 0, bigStack = 0;
  for (const n of inv) {
    if (n.t !== 'dict' || !['id', 'ref', 'size', 'quality'].every(k => get(n, k))) { broken++; continue; }
    const id = val(n, 'id'), ref = String(val(n, 'ref')), q = get(n, 'quality');
    if (ref !== '0') seen.set(ref, (seen.get(ref) || 0) + 1);
    if (!isItem(id)) (before.has(id) ? unknownOld : unknownNew).add(id);
    if (q.t !== 'int' || q.v < 0 || q.v > LIMITS.quality) badQuality++;
    if (val(n, 'count') > LIMITS.stack) bigStack++;
  }
  if (broken) stop(plural(broken, 'inventory entry is', 'inventory entries are') + ' incomplete and would crash the game.');
  if (badQuality) stop(plural(badQuality, 'item has', 'items have') + ' a rarity the game does not have.');
  if (unknownNew.size) stop('Unknown item type: ' + [...unknownNew].join(', ') + '. Opening the inventory would crash the game.');
  if (unknownOld.size) warn('Items from a mod or newer version are kept as they were: ' + [...unknownOld].join(', ') + '.');
  if (bigStack) warn(plural(bigStack, 'stack is', 'stacks are') + ' larger than 99. The game may trim them.');
  const dupes = [...seen.values()].filter(c => c > 1).length;
  if (dupes) warn(plural(dupes, 'item ID is', 'item IDs are') + ' used twice. Those items act as one in the game.');
  if (inv.length > LIMITS.inventory) stop('The inventory holds ' + fmtNum(inv.length) + ' items. The game allows ' + fmtNum(LIMITS.inventory) + '.');

  /* references */
  const refs = new Set(inv.map(n => String(val(n, 'ref'))));
  const lost = [...get(r, 'hotbar').m.values()].filter(n => Number(n.v) !== 0 && !refs.has(String(n.v))).length;
  if (lost) warn(plural(lost, 'hotbar slot points', 'hotbar slots point') + ' at an item that is gone. It will look empty.');

  /* outfit: one unknown piece resets the whole outfit on screen */
  const eq = get(r, 'cosmetics_equipped');
  for (const [slot] of COS_SLOTS) {
    const n = get(eq, slot);
    if (!n) { warn('The outfit has no “' + slot + '”. The game would show the default outfit.'); continue; }
    for (const id of n.t === 'arr' ? n.v.map(x => x.v) : [n.v]) {
      if (!isCosmetic(id)) warn('The outfit uses “' + id + '”, which this version of the game does not have. The game would show the default outfit.');
      else if (CONTRIBUTOR_TITLES.has(id)) warn('The title “' + nameOf(id) + '” shows as “Scout” unless your account is a known contributor.');
    }
  }
  const acc = get(eq, 'accessory');
  if (acc && acc.t === 'arr' && acc.v.length > LIMITS.accessories) warn('More than 4 accessories are worn. The game only lets you pick 4.');

  return { issues: out, bytes };
}
