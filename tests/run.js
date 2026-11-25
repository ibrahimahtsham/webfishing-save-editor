/*
 * node tests/run.js [folder with real .sav files]
 * Runs the editor's logic without a browser. Real saves are only read.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
const FILES = ['core/variant', 'core/nodes', 'core/diff', 'core/zip', 'data/items', 'data/cosmetics', 'data/gear', 'data/secrets', 'data/item-order', 'data/fresh-save', 'app/ui', 'app/catalog', 'app/fish', 'app/actions', 'app/state', 'app/backups', 'app/files', 'app/safety'];
const ctx = vm.createContext({ console, TextEncoder, TextDecoder, atob, localStorage: { getItem: () => null, setItem() {} }, document: {}, window: {}, navigator: {} });
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), ctx, { filename: f });
const E = (code) => vm.runInContext(code, ctx);
const X = E('({ parseFile, serializeFile, clone, diff, get, val, N, readSaveFile, checkSave, unlockEverything, completion, startFresh, freshRoot, setTabOrder, moveInTab, sortTab, tabItems, addItems, removeRefs, planCollection, sizeName, SIZE_PRESETS, SIZE_NAMES, biggestNatural, atRatio, CATCHABLE, ALL_FISH, GAME_ITEMS, GAME_COSMETICS, UNLOCK_PARTS, SORTS, LIMITS, JOURNAL_SECTIONS, summarize, recordCatch, setHotbar, hotbarSlotOf, setFavorite, isFavorite, favoriteSet, hasFullCollection, organizeAll, ITEM_ORDER, SECRET_COSMETICS, SECRET_ITEMS, FINDABLE_SECRETS, HIDDEN_COSMETICS, CONTRIBUTOR_TITLES, maxQuests, questsDone, questBoard, tutorialDone, FULL_COLLECTION, missingFish, orderChanged, makeZip, sameBytes, hashBytes, itemTab, USABLE_COSMETICS })');

const same = (a, b, m) => assert.deepStrictEqual(JSON.parse(JSON.stringify([...a])), JSON.parse(JSON.stringify([...b])), m);
let passed = 0;
const test = (name, fn) => { try { fn(); passed++; } catch (e) { console.error('FAIL ' + name + '\n  ' + e.message.split('\n').slice(0, 6).join('\n  ')); process.exitCode = 1; } };
const parts = Object.fromEntries(X.UNLOCK_PARTS.map(([k]) => [k, true]));
const refs = (root, tab) => X.tabItems(root, tab).map(n => String(X.val(n, 'ref')));
const open = (name, root) => X.readSaveFile(name, X.serializeFile(root, null));
const stops = (f) => X.checkSave(f).issues.filter(i => i.level === 'stop');

/* ---------- data ---------- */
test('every picture in the data exists', () => {
  const have = new Set(fs.readdirSync(path.join(ROOT, 'assets/game')));
  for (const [id, t] of [...Object.entries(X.GAME_ITEMS), ...Object.entries(X.GAME_COSMETICS)]) for (const p of [t.icon, t.altEye]) assert(!p || have.has(p), id + ' ' + p);
  for (const m of fs.readFileSync(path.join(ROOT, 'js/data/gear.js'), 'utf8').matchAll(/icon: '([^']+)'/g)) assert(have.has(m[1]), m[1]);
});
test('every script in index.html exists', () => { for (const m of fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)) assert(fs.existsSync(path.join(ROOT, m[1])), m[1]); });
test('journal covers the 78 fish a new save lists', () => {
  const fresh = X.freshRoot(), ids = X.JOURNAL_SECTIONS.flatMap(s => [...X.get(fresh, 'journal', s.key).m.keys()]);
  same(ids.sort(), [...X.CATCHABLE].sort());
});

test('every item and prop has a place in the order', () => {
  same([...X.ITEM_ORDER].sort(), Object.keys(X.GAME_ITEMS).filter(id => ['tool', 'furniture'].includes(X.GAME_ITEMS[id].category)).sort());
});
test('secret lists match the game data', () => {
  same([...X.HIDDEN_COSMETICS].sort(), X.SECRET_COSMETICS.map(s => s.id).sort());
  same(Object.keys(X.GAME_ITEMS).filter(id => X.GAME_ITEMS[id].unobtainable && !X.GAME_ITEMS[id].hidden).sort(), X.SECRET_ITEMS.map(s => s.id).sort());
  for (const s of X.FINDABLE_SECRETS) { assert(X.GAME_ITEMS[s.id] || X.GAME_COSMETICS[s.id], s.id); assert(!(X.GAME_ITEMS[s.id] || {}).unobtainable && !X.HIDDEN_COSMETICS.has(s.id), s.id); }
  for (const id of X.CONTRIBUTOR_TITLES) assert(X.GAME_COSMETICS[id], id);
  for (const q of X.get(X.freshRoot(), 'quests').m.values()) for (const n of X.val(q, 'rewards')) assert(!X.HIDDEN_COSMETICS.has(n.v) && !X.HIDDEN_COSMETICS.has('s' + n.v.slice(2)), n.v);
});
test('a save holding every unused item still passes the safety check', () => { const f = open('webfishing_save_slot_0.sav', X.freshRoot()); X.addItems(f.root, X.SECRET_ITEMS.map(s => ({ id: s.id }))); same(stops(f), []); });

/* ---------- sizes ---------- */
test('each size preset gives the size name it promises, for every fish', () => {
  for (const id of X.ALL_FISH) for (const [key, label, fn] of X.SIZE_PRESETS) {
    const want = { smallest: null, normal: '', biggest: 'Colossal' }[key];
    const got = X.sizeName(id, fn(id));
    if (key === 'smallest') assert.strictEqual(fn(id), 0.01);
    else assert.strictEqual(got, want === undefined ? label : want, id + ' ' + key + ' ' + fn(id));
  }
});
test('full collection is species x 6 rarities x 2 sizes', () => {
  const list = X.planCollection({ sections: X.JOURNAL_SECTIONS.map(s => s.key), rarities: [0, 1, 2, 3, 4, 5], sizes: ['smallest', 'biggest'] });
  assert.strictEqual(list.length, X.CATCHABLE.length * 12);
});

/* ---------- actions on every save given ---------- */
const saves = [['fresh template', X.freshRoot()]];
if (process.argv[2]) for (const f of fs.readdirSync(process.argv[2]).filter(f => /\.(sav|backup)$/.test(f))) {
  const bytes = new Uint8Array(fs.readFileSync(path.join(process.argv[2], f)));
  test(f + ' rewrites byte for byte', () => { const p = X.parseFile(bytes); assert(X.sameBytes(X.serializeFile(p.root, p.tail), bytes)); });
  const p = X.parseFile(bytes);
  if (p.root.m.has('inventory')) saves.push([f, p.root]);
}
for (const [name, root0] of saves) {
  const fresh = () => X.clone(root0);
  test(name + ': untouched save passes the safety check', () => { const f = open('webfishing_save_slot_0.sav', fresh()); assert(f.lossless); same(stops(f), []); assert.strictEqual(X.diff(f.orig, f.root).length, 0); });
  test(name + ': unlock everything completes every meter', () => { const r = fresh(); X.unlockEverything(r, parts); for (const [label, a, b] of X.completion(r)) assert.strictEqual(a, b, label); });
  test(name + ': unlock keeps outfit, items, hotbar, lists, and order when organize is off', () => {
    const r = fresh(); X.unlockEverything(r, { ...parts, organize: false });
    for (const k of ['cosmetics_equipped', 'hotbar', 'locked_refs', 'muted_players', 'hidden_players', 'guitar_shapes', 'lure_selected', 'bait_selected']) assert.strictEqual(X.diff(X.get(root0, k), X.get(r, k)).length, 0, k);
    const a = X.get(root0, 'inventory').v, b = X.get(r, 'inventory').v;
    a.forEach((n, i) => assert(X.diff(n, b[i]).every(d => d.path.join() === 'count' && X.GAME_ITEMS[X.val(n, 'id')].stack), X.val(n, 'id')));
  });
  test(name + ': maxing quests finishes the board, pays the rewards and logs CREATURE', () => {
    const r = fresh(); X.unlockEverything(r, { quests: true });
    for (const q of X.get(r, 'quests').m.values()) { assert.strictEqual(X.val(q, 'max_level'), -1); assert.strictEqual(X.val(q, 'tier'), 9); assert(X.val(q, 'progress') >= X.val(q, 'goal_amt')); }
    assert.strictEqual(X.questsDone(r), X.questBoard().length);
    const own = new Set(X.val(r, 'cosmetics_unlocked').map(n => n.v)), items = new Set(X.get(r, 'inventory').v.map(n => X.val(n, 'id')));
    for (const q of X.get(root0, 'quests').m.values()) for (const w of X.val(q, 'rewards').slice(X.val(q, 'tier')).map(n => n.v)) {
      if (w[0] === '$') assert(items.has(w.slice(1)), w); else if (w[0] === '*') assert(own.has(w.slice(1)) && own.has('s' + w.slice(2)), w); else assert(own.has(w), w);
    }
    assert(X.val(r, 'completed_quests').some(n => n.v === 'Catch CREATURE'));
  });
  test(name + ': unlock skips the tutorial and adds no other flag', () => {
    const r = fresh(); X.unlockEverything(r, parts); assert(X.tutorialDone(r));
    const other = (root) => X.val(root, 'saved_tags').map(n => n.v).filter(x => x !== 'first_join');
    same(other(r), other(root0));
  });
  test(name + ': unlock adds all 936 fish even when some are owned, and only once by default', () => {
    const r = fresh(), all = X.FULL_COLLECTION(); X.removeRefs(r, refs(r, 'fish')); X.addItems(r, all.slice(0, 5));
    const n0 = X.tabItems(r, 'fish').length;
    X.unlockEverything(r, { fish: true }); assert.strictEqual(X.tabItems(r, 'fish').length, n0 + 936);
    X.unlockEverything(r, { fish: true }); assert.strictEqual(X.tabItems(r, 'fish').length, n0 + 936);
    X.unlockEverything(r, { fish: true }, { addFishSet: true }); assert.strictEqual(X.tabItems(r, 'fish').length, n0 + 1872);
  });
  test(name + ': favoriting covers the set, keeps old favorites, and is safe to save', () => {
    const base = fresh(); if (X.hasFullCollection(base)) X.removeRefs(base, refs(base, 'fish'));
    const f = open('webfishing_save_slot_0.sav', base), old = X.favoriteSet(base), ownFish = new Set(refs(base, 'fish'));
    X.unlockEverything(f.root, parts, { favoriteFish: true });
    const favs = X.favoriteSet(f.root), added = refs(f.root, 'fish').filter(x => !ownFish.has(x));
    assert.strictEqual(added.length, 936); assert(added.every(x => favs.has(x))); assert([...old].every(x => favs.has(x)));
    assert.strictEqual(favs.size, X.val(f.root, 'locked_refs').length);
    for (const x of ownFish) assert.strictEqual(favs.has(x), old.has(x));
    assert.strictEqual(stops(f).length, 0);
    const again = X.clone(f.root); X.unlockEverything(again, parts, { favoriteFish: true }); assert.strictEqual(X.favoriteSet(again).size, favs.size);
  });
  test(name + ': saying no favorites nothing', () => { const r = fresh(); X.unlockEverything(r, parts); assert.strictEqual(X.favoriteSet(r).size, X.favoriteSet(root0).size); });
  test(name + ': unlock adds the full fish collection once', () => { const r = fresh(); X.unlockEverything(r, parts); assert.strictEqual(X.missingFish(r, X.FULL_COLLECTION()).length, 0); });
  test(name + ': unlock fills every stack and nothing else', () => {
    const r = fresh(); X.unlockEverything(r, parts);
    const seen = new Set();
    for (const n of X.get(r, 'inventory').v) {
      const id = X.val(n, 'id'), max = X.GAME_ITEMS[id] && X.GAME_ITEMS[id].stack;
      if (max) { seen.add(id); assert.strictEqual(X.val(n, 'count'), max, id); }
    }
    assert.strictEqual(seen.size, Object.values(X.GAME_ITEMS).filter(d => d.stack).length);
    const before = new Set(X.get(root0, 'inventory').v.map(n => String(X.val(n, 'ref'))));
    for (const n of X.get(r, 'inventory').v) if (!before.has(String(X.val(n, 'ref'))) && !X.GAME_ITEMS[X.val(n, 'id')].stack) assert.strictEqual(X.val(n, 'count'), 1);
  });
  test(name + ': organizing groups every kind and only moves items', () => {
    const r = fresh(); X.unlockEverything(r, parts, { favoriteFish: true });
    const before = X.clone(r); X.organizeAll(r);
    assert(X.sameBytes(X.serializeFile(before, null), X.serializeFile(r, null)), 'organizing twice changes nothing');
    const loose = fresh(); X.unlockEverything(loose, { ...parts, organize: false });
    assert.strictEqual(X.get(loose, 'inventory').v.length, X.get(r, 'inventory').v.length);
    const ids = X.tabItems(r, 'tool').map(n => X.val(n, 'id')), rods = ids.map((id, i) => /^fishing_rod/.test(id) ? i : -1).filter(i => i >= 0);
    assert.strictEqual(rods[0], 0); assert.strictEqual(rods[rods.length - 1], rods.length - 1); assert.strictEqual(ids[0], 'fishing_rod_simple');
    for (const tab of ['tool', 'fish', 'furniture']) { const list = X.tabItems(r, tab).map(n => X.val(n, 'id')); list.forEach((id, i) => assert(i === 0 || list[i - 1] === id || !list.slice(0, i).includes(id), tab + ' ' + id)); }
    const old = X.clone(root0); X.organizeAll(old);
    assert.strictEqual(X.diff(root0, old).length, 0);
  });
  test(name + ': unlock never lowers a number', () => {
    const r = fresh(); X.unlockEverything(r, parts);
    for (const k of ['money', 'level', 'xp', 'max_bait', 'rod_power', 'fish_caught', 'loan_level']) assert(Number(X.val(r, k)) >= Number(X.val(root0, k)), k);
  });
  test(name + ': unlock twice changes nothing more', () => { const r = fresh(); X.unlockEverything(r, parts); const s = X.serializeFile(r, null); X.unlockEverything(r, parts); assert(X.sameBytes(s, X.serializeFile(r, null))); });
  test(name + ': unlocked save passes the safety check and reads back', () => { const f = open('webfishing_save_slot_0.sav', fresh()); X.unlockEverything(f.root, parts); same(stops(f), []); });
  test(name + ': unlocked item IDs stay unique', () => { const r = fresh(); X.unlockEverything(r, parts); const all = X.get(r, 'inventory').v.map(n => String(X.val(n, 'ref'))); assert.strictEqual(new Set(all).size, all.length); });
  test(name + ': whole fish collection fits, is safe, and reads back', () => {
    const f = open('webfishing_save_slot_0.sav', fresh());
    const list = X.planCollection({ sections: X.JOURNAL_SECTIONS.map(s => s.key), rarities: [0, 1, 2, 3, 4, 5], sizes: ['smallest', 'biggest'] });
    assert.strictEqual(X.addItems(f.root, list).length, list.length);
    for (const x of list) X.recordCatch(f.root, x.id, { size: x.size, qualities: [x.quality] });
    const back = X.parseFile(X.serializeFile(f.root, f.tail)).root;
    const inv = X.get(back, 'inventory').v.slice(-list.length);
    inv.forEach((n, i) => { assert.strictEqual(X.val(n, 'id'), list[i].id); assert.strictEqual(X.val(n, 'size'), list[i].size); });
    same(stops(f), []);
  });
  test(name + ': sorting and moving keep every item and leave other tabs alone', () => {
    const r = fresh(); X.unlockEverything(r, parts);
    const before = { fish: refs(r, 'fish'), furniture: refs(r, 'furniture'), tool: refs(r, 'tool') };
    for (const how of Object.keys(X.SORTS)) X.sortTab(r, 'tool', how, true);
    X.moveInTab(r, 'tool', before.tool.slice(0, 3), before.tool.length);
    same(refs(r, 'fish'), before.fish); same(refs(r, 'furniture'), before.furniture);
    same(refs(r, 'tool').sort(), [...before.tool].sort());
    same(refs(r, "tool").slice(-3).sort(), before.tool.slice(0, 3).sort());
  });
  for (const look of ['none', 'worn', 'all']) test(name + ': start fresh (' + look + ')', () => {
    const f = open('webfishing_save_slot_0.sav', fresh());
    f.root = X.startFresh(f.root, { look, keep: new Set(['players']) });
    same(stops(f), []);
    assert.strictEqual(Number(X.val(f.root, 'money')), 25); assert.strictEqual(Number(X.val(f.root, 'level')), 1); assert.strictEqual(X.get(f.root, 'inventory').v.length, 2);
    assert.strictEqual(X.diff(X.get(root0, 'muted_players'), X.get(f.root, 'muted_players')).length, 0);
    if (look !== 'none') assert.strictEqual(X.diff(X.get(root0, 'cosmetics_equipped'), X.get(f.root, 'cosmetics_equipped')).length, 0);
  });
}

/* ---------- focused checks ---------- */
test('moving one item earlier and later', () => {
  const r = X.freshRoot(); X.addItems(r, ['guitar', 'tambourine', 'chalk_red', 'ringbox'].map(id => ({ id })));
  const ids = () => X.tabItems(r, 'tool').map(n => X.val(n, 'id')), ref = (id) => String(X.val(X.tabItems(r, 'tool').find(n => X.val(n, 'id') === id), 'ref'));
  same(ids(), ['fishing_rod_simple', 'guitar', 'tambourine', 'chalk_red', 'ringbox']);
  X.moveInTab(r, 'tool', [ref('ringbox')], 0); same(ids()[0], 'ringbox');
  X.moveInTab(r, 'tool', [ref('ringbox')], 2); same(ids(), ['fishing_rod_simple', 'ringbox', 'guitar', 'tambourine', 'chalk_red']);
  X.moveInTab(r, 'tool', [ref('chalk_red')], 3); same(ids(), ['fishing_rod_simple', 'ringbox', 'guitar', 'chalk_red', 'tambourine']);
  assert.strictEqual(String(X.val(X.get(r, 'inventory').v[0], 'id')), 'empty_hand');
});
test('repeating quest numbers match a real tier 9 quest', () => {
  const r = X.freshRoot(); X.maxQuests(r);
  const q = [...X.get(r, 'quests').m.values()].find(x => X.val(x, 'title') === 'Catch Lake Fish');
  same([X.val(q, 'goal_amt'), X.val(q, 'gold_reward'), X.val(q, 'xp_reward')], [2560, 12800, 5120]);
});
test('every quest reward exists in the game data', () => {
  for (const q of X.get(X.freshRoot(), 'quests').m.values()) for (const n of X.val(q, 'rewards')) {
    const w = n.v;
    if (w[0] === '$') assert(X.GAME_ITEMS[w.slice(1)], w); else if (w[0] === '*') assert(X.GAME_COSMETICS[w.slice(1)] && X.GAME_COSMETICS['s' + w.slice(2)], w); else assert(X.GAME_COSMETICS[w], w);
  }
});
test('start fresh decides the tutorial', () => {
  for (const skipTutorial of [true, false]) assert.strictEqual(X.tutorialDone(X.startFresh(X.freshRoot(), { look: 'none', keep: new Set(['tags']), skipTutorial })), skipTutorial);
});
test('hotbar and favorites follow removal', () => {
  const r = X.freshRoot(), [n] = X.addItems(r, [{ id: 'guitar' }]), ref = X.val(n, 'ref');
  X.setHotbar(r, 3, ref); X.setFavorite(r, ref, true); assert.strictEqual(X.hotbarSlotOf(r, ref), 3); assert(X.isFavorite(r, ref));
  X.removeRefs(r, [ref]); assert.strictEqual(X.hotbarSlotOf(r, ref), -1); assert(!X.isFavorite(r, ref));
});
test('rearranging alone counts as a change', () => { const f = open('webfishing_save_slot_0.sav', (() => { const r = X.freshRoot(); X.addItems(r, [{ id: 'guitar' }, { id: 'tambourine' }]); return r; })()); assert(!X.orderChanged(f)); X.moveInTab(f.root, 'tool', [refs(f.root, 'tool')[2]], 0); assert(X.orderChanged(f)); });
test('the safety check stops unknown items, bad rarities, missing keys and wrong headers', () => {
  const mk = () => open('webfishing_save_slot_0.sav', X.freshRoot());
  let f = mk(); X.addItems(f.root, [{ id: 'not_a_thing' }]); assert(stops(f).length);
  f = mk(); X.get(f.root, 'inventory').v[1].m.get('quality').v = 9; assert(stops(f).length);
  f = mk(); f.root.m.delete('journal'); assert(stops(f).length);
  f = mk(); X.get(f.root, 'inventory').v[1].m.delete('size'); assert(stops(f).length);
  const bytes = X.serializeFile(X.freshRoot(), null); bytes[0] ^= 1; f = X.readSaveFile('x.sav', bytes); assert(!f.lossless); assert(stops(f).length);
});
test('truncated and foreign files are refused', () => {
  const bytes = X.serializeFile(X.freshRoot(), null);
  for (const n of [0, 7, 100, bytes.length - 1]) assert.throws(() => X.readSaveFile('x.sav', bytes.slice(0, n)));
  assert.throws(() => X.readSaveFile('x.sav', new TextEncoder().encode('hello this is not a save file at all')));
});
test('text with a byte-order mark survives', () => { const r = X.N.dict([['s', X.N.str('﻿x')]]), b = X.serializeFile(r, null); assert(X.sameBytes(b, X.serializeFile(X.parseFile(b).root, null))); });
test('zip is readable', () => {
  const z = X.makeZip([{ name: 'a.sav', bytes: new Uint8Array([1, 2, 3]), date: new Date(2026, 0, 2) }, { name: 'b.sav', bytes: new Uint8Array(5000).fill(7), date: new Date(2026, 0, 2) }]);
  fs.writeFileSync(path.join(require('os').tmpdir(), 'tackle-box-test.zip'), z); assert(z.length > 5000);
});
test('fresh template carries no player IDs', () => { assert(!Buffer.from(X.serializeFile(X.freshRoot(), null)).toString('latin1').includes('7656')); assert.strictEqual(X.get(X.freshRoot(), 'muted_players').v.length, 0); });

console.log(passed + ' passed' + (process.exitCode ? ', with failures' : ''));
