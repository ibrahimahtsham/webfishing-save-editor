'use strict';
/* Edits to a save tree. No DOM in here, so it can be tested on its own. */

const REF_MAX = 4294967295;
function invOf(root) { return get(root, 'inventory'); }
function refSet(root) { return new Set(invOf(root).v.map(n => String(val(n, 'ref')))); }
function newRef(used) {
  let r;
  do { r = 2 + Math.floor(Math.random() * (REF_MAX - 2)); } while (used.has(String(r)));
  used.add(String(r));
  return r;
}
/* Same fields, in the same order, as the game writes. */
function makeItem(id, o = {}, used) {
  return N.dict([
    ['id', N.str(id)], ['ref', N.int(o.ref ?? newRef(used))], ['size', N.real(o.size ?? 1)], ['quality', N.int(o.quality ?? 0)],
    ['tags', N.arr()], ['custom_name', N.str(cleanName(o.name))], ['count', N.int(Math.min(LIMITS.stack, Math.max(1, o.count ?? 1)))]
  ]);
}
/* list: [{ id, size, quality, name, count }]. Returns what fit. Everything added is favorited, so it cannot be sold by accident. */
function addItems(root, list) {
  const inv = invOf(root), used = refSet(root);
  const room = Math.max(0, LIMITS.inventory - inv.v.length);
  const added = list.slice(0, room).map(o => makeItem(o.id, o, used));
  inv.v.push(...added);
  setFavorites(root, added.map(n => val(n, 'ref')));
  return added;
}
function removeRefs(root, refs) {
  const gone = new Set(refs.map(String));
  invOf(root).v = invOf(root).v.filter(n => !gone.has(String(val(n, 'ref'))));
  const hb = get(root, 'hotbar');
  if (hb) for (const n of hb.m.values()) if (gone.has(String(n.v))) setNum(n, 0);
  const lk = get(root, 'locked_refs');
  if (lk) lk.v = lk.v.filter(n => !gone.has(String(n.v)));
}
function isFavorite(root, ref) { const a = get(root, 'locked_refs'); return !!a && a.v.some(x => String(x.v) === String(ref)); }
function favoriteSet(root) { return new Set((val(root, 'locked_refs') || []).map(n => String(n.v))); }
function setFavorites(root, refs) {
  if (!refs.length) return;
  const a = ensure(root, 'locked_refs', () => N.arr()), have = favoriteSet(root);
  for (const ref of refs) if (!have.has(String(ref))) { have.add(String(ref)); a.v.push(N.int(Number(ref))); }
}
function setFavorite(root, ref, on) {
  const a = ensure(root, 'locked_refs', () => N.arr());
  a.v = a.v.filter(x => String(x.v) !== String(ref));
  if (on) a.v.push(N.int(Number(ref)));
}
function hotbarSlotOf(root, ref) {
  const hb = get(root, 'hotbar');
  if (hb && String(ref) !== '0') for (const [k, n] of hb.m) if (String(n.v) === String(ref)) return Number(k);
  return -1;
}
function setHotbar(root, slot, ref) {
  const hb = get(root, 'hotbar');
  if (ref) for (const n of hb.m.values()) if (String(n.v) === String(ref)) setNum(n, 0);
  if (slot < 0) return;
  const key = String(slot);
  if (!hb.m.has(key)) { hb.m.set(key, N.int(0)); hb.kt.set(key, N.int(slot)); }
  setNum(hb.m.get(key), Number(ref) || 0);
}

/* ---------- inventory order ---------- */
/* The game lists items in saved order, one tab at a time. Rearranging one tab
   leaves every other tab's positions alone. */
function tabItems(root, tab) { return invOf(root).v.filter(n => itemTab(val(n, 'id')) === tab); }
function setTabOrder(root, tab, ordered) {
  const inv = invOf(root), slots = [];
  inv.v.forEach((n, i) => { if (itemTab(val(n, 'id')) === tab) slots.push(i); });
  if (slots.length !== ordered.length || new Set(ordered).size !== ordered.length) throw new Error('Order does not match the inventory');
  slots.forEach((pos, i) => { inv.v[pos] = ordered[i]; });
}
/* Move the listed items so they sit together before position `to` (counted in the current tab order). */
function moveInTab(root, tab, refs, to) {
  const moving = new Set(refs.map(String));
  const list = tabItems(root, tab);
  const pick = list.filter(n => moving.has(String(val(n, 'ref'))));
  const before = list.slice(0, to).filter(n => !moving.has(String(val(n, 'ref'))));
  const after = list.slice(to).filter(n => !moving.has(String(val(n, 'ref'))));
  setTabOrder(root, tab, [...before, ...pick, ...after]);
}
const FISH_GROUPS = ['Creatures_Fish_Freshwater', 'Creatures_Fish_Ocean', 'Creatures_Fish_RainSpecial', 'Creatures_Fish_Alien', 'Creatures_Fish_Void', 'Creatures_Fish_Deep', 'Creatures_WaterTrash'];
const ORDER_OF = new Map(ITEM_ORDER.map((id, i) => [id, i]));
function kindRank(id) {
  if (!isItem(id)) return 9999; // modded items keep their place at the end
  if (itemTab(id) === 'fish') return FIND_ORDER.includes(id) ? 100 + FIND_ORDER.indexOf(id) : FISH_GROUPS.indexOf(GAME_ITEMS[id].group);
  return ORDER_OF.has(id) ? ORDER_OF.get(id) : 9000;
}
/* Fish: by water, then species, then rarity, then size. Everything else: the fixed list. */
function byKind(a, b) {
  const x = val(a, 'id'), y = val(b, 'id');
  return kindRank(x) - kindRank(y) || (itemTab(x) === 'fish' ? nameOf(x).localeCompare(nameOf(y)) || x.localeCompare(y) || val(a, 'quality') - val(b, 'quality') || val(a, 'size') - val(b, 'size') : 0);
}
const SORTS = {
  kind: ['Kind', byKind],
  name: ['Name', (a, b) => nameOf(val(a, 'id')).localeCompare(nameOf(val(b, 'id'))) || val(b, 'quality') - val(a, 'quality') || val(b, 'size') - val(a, 'size')],
  rarity: ['Rarity, best first', (a, b) => val(b, 'quality') - val(a, 'quality') || nameOf(val(a, 'id')).localeCompare(nameOf(val(b, 'id')))],
  big: ['Size, biggest first', (a, b) => val(b, 'size') - val(a, 'size')],
  small: ['Size, smallest first', (a, b) => val(a, 'size') - val(b, 'size')],
  worth: ['Price, highest first', (a, b) => worthOf(b) - worthOf(a)],
  stack: ['Stack, largest first', (a, b) => (val(b, 'count') || 1) - (val(a, 'count') || 1)]
};
function worthOf(n) { return itemWorth(val(n, 'id'), val(n, 'size'), val(n, 'quality')); }
function sortTab(root, tab, how, favoritesFirst) {
  const favs = favoriteSet(root), fav = (n) => favoritesFirst && favs.has(String(val(n, 'ref'))) ? 0 : 1;
  const cmp = SORTS[how][1];
  setTabOrder(root, tab, tabItems(root, tab).sort((a, b) => fav(a) - fav(b) || cmp(a, b)));
}

/* Put every tab in kind order. */
function organizeAll(root) { for (const [tab] of ITEM_TABS) if (tab !== 'other') sortTab(root, tab, 'kind', false); }

/* ---------- journal ---------- */
/* A new save already lists every fish with a count of 0, so "caught" means count above 0. */
function journalEntry(root, sec, id) { return get(root, 'journal', sec, id); }
function isCaught(e) { return !!e && Number(val(e, 'count')) > 0; }
function recordCatch(root, id, { size = 0, qualities = [], count = 1 } = {}) {
  const sec = isItem(id) && GAME_ITEMS[id].table;
  if (!JOURNAL_IDS[sec] || !JOURNAL_IDS[sec].includes(id)) return;
  const section = ensure(get(root, 'journal'), sec, () => N.dict());
  const e = ensure(section, id, () => N.dict([['count', N.int(0)], ['record', N.real(0)], ['quality', N.arr()]]));
  const c = get(e, 'count'), rec = get(e, 'record'), q = get(e, 'quality');
  if (Number(c.v) < count) setNum(c, count);
  if (Number(rec.v) < size) setReal(rec, size);
  for (const x of qualities) if (!q.v.some(n => n.v === x)) q.v.push(N.int(x));
}
/* A whole number saved as an int must become a real before it can hold decimals. */
function setReal(node, x) { if (node.t === 'int') node.t = 'real'; setNum(node, x); }

/* ---------- quests ---------- */
const QUEST_TOP_TIER = 9; // the game stops raising a quest at tier 9
/* Repeating quests have no last level. The others leave the board after their last tier. */
function isRepeating(q) { return Number(val(q, 'max_level')) === -1; }
/* Raise one tier at a time, the way claiming does it in the game. */
function raiseQuest(q, target) {
  const tier = get(q, 'tier'), steps = val(q, 'goal_array') || [];
  while (Number(tier.v) < target) {
    const next = Number(tier.v) + 1;
    setNum(tier, next);
    setNum(get(q, 'goal_amt'), next < steps.length ? Number(steps[next].v) : Math.ceil(Number(val(q, 'goal_amt')) * 2));
    for (const k of ['gold_reward', 'xp_reward']) setNum(get(q, k), Math.ceil(Number(val(q, k)) * 2));
  }
}
/* "$" marks an item, "*" marks a fur colour given as both main and second fur. */
function grantReward(root, reward) {
  const own = (id) => toggleInList(get(root, 'cosmetics_unlocked'), id, true);
  if (reward[0] === '$') {
    const id = reward.slice(1);
    if (!invOf(root).v.some(n => val(n, 'id') === id)) addItems(root, [{ id }]);
  } else if (reward[0] === '*') { own(reward.slice(1)); own('s' + reward.slice(2)); }
  else if (reward) own(reward);
}
/* Finish a one-time quest: hand out what is left, log it, take it off the board. */
function finishQuest(root, key) {
  const quests = get(root, 'quests'), q = quests.m.get(key), log = ensure(root, 'completed_quests', () => N.arr());
  const rewards = val(q, 'rewards') || [], last = Number(val(q, 'max_level'));
  for (let t = Number(val(q, 'tier')); t < last; t++) {
    if (rewards[t]) grantReward(root, String(rewards[t].v));
    log.v.push(N.str(val(q, 'title')));
  }
  quests.m.delete(key);
  quests.kt.delete(key);
}
function maxQuest(root, key) {
  const q = get(root, 'quests').m.get(key);
  if (!isRepeating(q)) return finishQuest(root, key);
  raiseQuest(q, QUEST_TOP_TIER);
  if (Number(val(q, 'progress')) < Number(val(q, 'goal_amt'))) setNum(get(q, 'progress'), val(q, 'goal_amt'));
  if (get(q, 'hidden')) get(q, 'hidden').v = false;
}
/* The game puts this one back on load unless it is open or logged as finished. */
const READDED_QUEST = 'Catch CREATURE', READDED_REWARDS = ['title_freaky', 'eye_wobble'];
function maxQuests(root) {
  const quests = get(root, 'quests'), log = ensure(root, 'completed_quests', () => N.arr());
  for (const key of [...quests.m.keys()]) maxQuest(root, key);
  if (!log.v.some(n => n.v === READDED_QUEST)) {
    READDED_REWARDS.forEach(id => grantReward(root, id));
    log.v.push(N.str(READDED_QUEST));
  }
}
let boardCache = null;
function questBoard() {
  if (!boardCache) boardCache = [...get(freshRoot(), 'quests').m.values()].map(q => ({ title: val(q, 'title'), repeating: isRepeating(q) }));
  return boardCache;
}
function questsDone(root) {
  const open = new Map([...get(root, 'quests').m.values()].map(q => [val(q, 'title'), q]));
  const log = new Set((val(root, 'completed_quests') || []).map(n => n.v));
  return questBoard().filter(b => {
    const q = open.get(b.title);
    return b.repeating ? q && Number(val(q, 'tier')) >= QUEST_TOP_TIER : !q && (b.title !== READDED_QUEST || log.has(b.title));
  }).length;
}

/* ---------- tutorial ---------- */
/* The game sends you to the tutorial island until the save carries this flag. */
const TUTORIAL_FLAG = 'first_join';
function tutorialDone(root) { return val(root, 'saved_tags').some(n => n.v === TUTORIAL_FLAG); }
function setTutorialDone(root, on) { toggleInList(get(root, 'saved_tags'), TUTORIAL_FLAG, on); }

/* ---------- fish collection ---------- */
const FULL_COLLECTION = () => planCollection({ sections: JOURNAL_SECTIONS.map(s => s.key), rarities: [0, 1, 2, 3, 4, 5], sizes: ['smallest', 'biggest'] });
const fishKey = (id, quality, size) => id + '|' + quality + '|' + round2(size);
function missingFish(root, plan) {
  const have = new Set(tabItems(root, 'fish').map(n => fishKey(val(n, 'id'), val(n, 'quality'), Number(val(n, 'size')))));
  return plan.filter(x => !have.has(fishKey(x.id, x.quality, x.size)));
}
function hasFullCollection(root) { return !missingFish(root, FULL_COLLECTION()).length; }
/* Favorite what earlier unlocks added too: the collection, the unused fish, and any of the listed ids. */
function favoriteEarlier(root, ids) {
  const keys = new Set(FULL_COLLECTION().map(x => fishKey(x.id, x.quality, x.size)));
  setFavorites(root, invOf(root).v.filter(n => ids.has(val(n, 'id')) || (ids.has('collection') && keys.has(fishKey(val(n, 'id'), val(n, 'quality'), Number(val(n, 'size')))))).map(n => val(n, 'ref')));
}
function addFish(root, list, journal) {
  const added = addItems(root, list);
  if (journal) for (const n of added) recordCatch(root, val(n, 'id'), { size: val(n, 'size'), qualities: [val(n, 'quality')] });
  return added;
}

/* ---------- completion ---------- */
const CAMP_TIERS = 4;
function completion(root) {
  const owned = new Set(val(root, 'cosmetics_unlocked').map(x => x.v));
  const lures = new Set(val(root, 'lure_unlocked').map(x => x.v)), baits = new Set(val(root, 'bait_unlocked').map(x => x.v));
  const ids = new Set(invOf(root).v.map(n => val(n, 'id')));
  const fullPlan = FULL_COLLECTION(), maxed = maxedIds(root), props = ownable(KEEPER_PROPS);
  let caught = 0, stamps = 0;
  for (const s of JOURNAL_SECTIONS) for (const id of JOURNAL_IDS[s.key]) {
    const e = journalEntry(root, s.key, id);
    if (isCaught(e)) caught++;
    if (e) stamps += new Set(val(e, 'quality').map(x => x.v).filter(x => x >= 0 && x <= 5)).size;
  }
  const up = ['rod_power', 'rod_speed', 'rod_chance', 'rod_luck', 'buddy_level', 'buddy_speed'];
  const sum = (list) => list.reduce((s, k) => s + Math.min(LIMITS[k], Number(val(root, k) || 0)), 0);
  return [
    ['Cosmetics', USABLE_COSMETICS.filter(id => owned.has(id)).length, USABLE_COSMETICS.length],
    ['Journal', caught, CATCHABLE.length],
    ['Journal rarities', stamps, CATCHABLE.length * 6],
    ['Rod and buddy upgrades', sum(up), up.reduce((s, k) => s + LIMITS[k], 0)],
    ['Lures', Object.keys(GAME_LURES).filter(id => lures.has(id)).length, Object.keys(GAME_LURES).length],
    ['Bait', Object.keys(GAME_BAITS).filter(id => baits.has(id)).length, Object.keys(GAME_BAITS).length],
    ['Tools', KEEPER_TOOLS.filter(id => maxed.has(id)).length, KEEPER_TOOLS.length],
    ['Props', props.length - lacking(root, props).length, props.length],
    ['Unused items', UNUSED_ITEMS.filter(id => ids.has(id)).length, UNUSED_ITEMS.length],
    ['Fragments', fragmentSet(1).length - lacking(root, fragmentSet(1)).length, fragmentSet(1).length],
    ['Spectral bones', BONES.length - lacking(root, boneSet(1)).length, BONES.length],
    ['Other finds', findSet().length - lacking(root, findSet()).length, findSet().length],
    ['Quests', questsDone(root), questBoard().length],
    ['Fish collection', fullPlan.length - missingFish(root, fullPlan).length, fullPlan.length],
    ['Rank', Math.min(LIMITS.level, Number(val(root, 'level'))), LIMITS.level],
    ['Camp', Math.min(CAMP_TIERS, Number(val(root, 'loan_level')) + 1), CAMP_TIERS]
  ];
}

/* ---------- fragments, bones and finds ---------- */
/* The bone shop only talks to saves with this flag. The game sets it when the first bone is picked up. */
const BONE_FLAG = 'spectral';
function bonesOpen(root) { return val(root, 'saved_tags').some(n => n.v === BONE_FLAG); }
function countItems(root, id, quality = null) {
  return invOf(root).v.filter(n => val(n, 'id') === id && (quality == null || val(n, 'quality') === quality)).reduce((s, n) => s + Number(val(n, 'count') || 1), 0);
}
function collectible(id, quality = 0) { return { id, quality, size: BONES.includes(id) ? 10 : GAME_ITEMS[id].usesSize ? fishAvg(id) : 1 }; }
const repeat = (n, fn) => Array.from({ length: n }, fn);
function fragmentSet(sets) { return FRAGMENTS.flatMap(f => repeat(sets * FRAGMENTS_PER_TRADE, () => collectible(f.id))); }
function boneSet(sets) { return repeat(sets, () => BONES.map(id => collectible(id))).flat(); }
function findSet() { return [...METAL_FINDS.map(id => collectible(id)), ...COIN_BAG_LEVELS.map(q => collectible(COIN_BAG, q)), collectible(CHEST)]; }
/* every copy of these you can own: one of each, or the shop's limit, in full stacks */
function ownable(ids) { return ids.flatMap(id => repeat(OWN_LIMIT[id] || 1, () => ({ ...collectible(id), count: stackMax(id) }))); }
/* the part of a list that is not owned yet, counting duplicates */
function lacking(root, list) {
  const key = (id, q) => id + (id === COIN_BAG ? '|' + q : ''), have = new Map();
  for (const n of invOf(root).v) { const k = key(val(n, 'id'), val(n, 'quality')); have.set(k, (have.get(k) || 0) + countOf(n)); }
  return list.filter(x => { const k = key(x.id, x.quality), c = have.get(k) || 0; have.set(k, c - 1); return c <= 0; });
}
/* Empty the bag, keeping only the built-in empty hand. */
function clearInventory(root) {
  const inv = invOf(root);
  inv.v = inv.v.filter(n => String(val(n, 'ref')) === '0');
  for (const n of get(root, 'hotbar').m.values()) setNum(n, 0);
  const lk = get(root, 'locked_refs');
  if (lk) lk.v = [];
}
/* Nobody is left without a rod. */
function ensureRod(root) {
  let rod = invOf(root).v.find(n => val(n, 'id') === 'fishing_rod_simple');
  if (!rod) [rod] = addItems(root, [{ id: 'fishing_rod_simple' }]);
  if (rod) setHotbar(root, 0, val(rod, 'ref'));
}

/* ---------- stacks ---------- */
const stackMax = (id) => (isItem(id) && GAME_ITEMS[id].stack) || 1;
const countOf = (n) => Number(val(n, 'count') || 1);
/* Fill every stack of every stackable item that is already owned. */
function fillStacks(root) {
  for (const n of invOf(root).v) {
    const max = stackMax(val(n, 'id'));
    if (max > 1 && countOf(n) < max) setNum(ensure(n, 'count', () => N.int(1)), max);
  }
}
/* Owned, and at a full stack if it stacks. */
function maxedIds(root) { return new Set(invOf(root).v.filter(n => countOf(n) >= stackMax(val(n, 'id'))).map(n => val(n, 'id'))); }

/* ---------- unlock everything ---------- */
const UNLOCK_PARTS = [
  ['money', 'Money', 'At least $999,999,999'],
  ['level', 'Rank', 'Rank 50, the highest'],
  ['gear', 'Rod and fishing buddy', 'Every upgrade'],
  ['bait', 'Bait', 'Every kind unlocked, 50 of each'],
  ['lures', 'Lures', 'All 15'],
  ['camp', 'Camp', 'Tier 4, loan paid off'],
  ['cosmetics', 'Cosmetics', 'Everything in the game files, including hidden ones'],
  ['tools', 'Tools', 'Every rod, instrument, chalk, drink and gadget, with full stacks of 99'],
  ['props', 'Props', 'Every prop, as many as the shop lets you own (4 chairs). Placing the Canvas Prop can get you kicked from some servers'],
  ['unused', 'Unused items', 'The 8 leftovers from cut features, see Secret items'],
  ['fragments', 'Fragments', 'Three of each metal detector fragment, enough for all four trades'],
  ['bones', 'Spectral bones', 'All five, and opens the hidden bone shop'],
  ['finds', 'Other finds', 'Metal detector junk, a coin bag of each kind and a treasure chest'],
  ['journal', 'Journal', 'Every fish caught in all six rarities'],
  ['quests', 'Quests', 'One-time quests finished with their rewards, repeating ones at tier 9'],
  ['fish', 'Fish collection', 'All 78 fish in six rarities, smallest and biggest: 936 fish'],
  ['tutorial', 'Skip the tutorial', 'Start at camp on the first visit'],
  ['organize', 'Organize the inventory', 'Puts each kind together: rods, gear, drinks, instruments, chalk, fish by species']
];
function toggleInList(arr, id, on) {
  const has = arr.v.some(x => x.v === id);
  if (on && !has) arr.v.push(N.str(id));
  if (!on && has) arr.v = arr.v.filter(x => x.v !== id);
}
/* Only ever adds or raises. The outfit is not touched; owned items change only by filling their stack, and their place only if organize is on. */
/* The whole fish set is added, with nothing skipped. Only a save that already holds all 936 needs addFishSet to get another. */
function unlockEverything(root, parts, { addFishSet, clear = false } = {}) {
  if (clear) clearInventory(root);
  const addSet = addFishSet == null ? !hasFullCollection(root) : addFishSet;
  const raise = (key, v) => { const n = get(root, key); if (n && Number(n.v) < v) setNum(n, v); };
  if (parts.money) raise('money', LIMITS.money);
  if (parts.level) raise('level', LIMITS.level);
  if (parts.gear) for (const k of ['rod_power', 'rod_speed', 'rod_chance', 'rod_luck', 'buddy_level', 'buddy_speed']) {
    ensure(root, k, () => N.int(0));
    raise(k, LIMITS[k]);
  }
  if (parts.bait) {
    raise('max_bait', LIMITS.max_bait);
    for (const id of Object.keys(GAME_BAITS)) {
      toggleInList(get(root, 'bait_unlocked'), id, true);
      const n = ensure(get(root, 'bait_inv'), id, () => N.int(0));
      if (Number(n.v) < LIMITS.max_bait) setNum(n, LIMITS.max_bait);
    }
  }
  if (parts.lures) for (const id of Object.keys(GAME_LURES)) toggleInList(get(root, 'lure_unlocked'), id, true);
  if (parts.camp && Number(val(root, 'loan_level')) < LIMITS.loan_level) {
    setNum(get(root, 'loan_level'), LIMITS.loan_level);
    setNum(get(root, 'loan_left'), LOAN_AMOUNT[LIMITS.loan_level]);
  }
  if (parts.cosmetics) {
    const arr = get(root, 'cosmetics_unlocked'), have = new Set(arr.v.map(x => x.v));
    for (const id of USABLE_COSMETICS) if (!have.has(id)) arr.v.push(N.str(id));
  }
  addItems(root, lacking(root, ownable([...(parts.tools ? KEEPER_TOOLS : []), ...(parts.props ? KEEPER_PROPS : []), ...(parts.unused ? UNUSED_ITEMS : [])])));
  if (parts.tools) fillStacks(root);
  if (parts.journal) for (const id of CATCHABLE) recordCatch(root, id, { size: GAME_ITEMS[id].avg, qualities: [0, 1, 2, 3, 4, 5] });
  if (parts.quests) maxQuests(root);
  if (parts.fish && addSet) addFish(root, FULL_COLLECTION(), parts.journal);
  if (parts.fragments) addItems(root, lacking(root, fragmentSet(1)));
  if (parts.bones) { addItems(root, lacking(root, boneSet(1))); toggleInList(get(root, 'saved_tags'), BONE_FLAG, true); }
  if (parts.finds) addItems(root, lacking(root, findSet()));
  favoriteEarlier(root, new Set([...(parts.fish ? ['collection'] : []), ...(parts.unused ? UNUSED_ITEMS : []), ...(parts.fragments ? FRAGMENTS.map(f => f.id) : []), ...(parts.bones ? BONES : []), ...(parts.finds ? [...METAL_FINDS, COIN_BAG, CHEST] : [])]));
  if (parts.tutorial) setTutorialDone(root, true);
  if (clear) ensureRod(root);
  if (parts.organize) organizeAll(root);
}

/* ---------- start fresh ---------- */
const KEEP_GROUPS = [
  ['players', 'Muted and hidden players', ['muted_players', 'hidden_players']],
  ['guitar', 'Guitar chords and voice', ['guitar_shapes', 'voice_pitch', 'voice_speed']],
  ['inventory', 'Inventory, hotbar and favorites', ['inventory', 'hotbar', 'locked_refs', 'saved_aqua_fish']],
  ['journal', 'Journal and fish caught', ['journal', 'fish_caught']],
  ['money', 'Money', ['money', 'cash_total']],
  ['rank', 'Rank and XP', ['level', 'xp']],
  ['gear', 'Rod, buddy, bait and lures', ['rod_power', 'rod_speed', 'rod_chance', 'rod_luck', 'buddy_level', 'buddy_speed', 'max_bait', 'bait_inv', 'bait_selected', 'bait_unlocked', 'lure_unlocked', 'lure_selected']],
  ['camp', 'Camp tier', ['loan_level', 'loan_left']],
  ['quests', 'Quests', ['quests', 'completed_quests']],
  ['tags', 'Milestone flags (journal, spectral)', ['saved_tags']]
];
function freshRoot() {
  const bin = atob(FRESH_SAVE_BASE64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return parseFile(u8).root;
}
/* look: 'none' | 'worn' (keep what is worn) | 'all' (keep every cosmetic) */
function startFresh(root, { look, keep, skipTutorial = false }) {
  const fresh = freshRoot();
  const copy = (key) => { const n = get(root, key); if (n) fresh.m.set(key, clone(n)); };
  for (const [id, , keys] of KEEP_GROUPS) if (keep.has(id)) keys.forEach(copy);
  if (look !== 'none') {
    copy('cosmetics_equipped');
    if (look === 'all') copy('cosmetics_unlocked');
    else {
      const arr = get(fresh, 'cosmetics_unlocked'), owned = new Set(val(root, 'cosmetics_unlocked').map(x => x.v));
      for (const n of get(root, 'cosmetics_equipped').m.values()) for (const id of n.t === 'arr' ? n.v.map(x => x.v) : [n.v]) if (owned.has(id)) toggleInList(arr, id, true);
    }
  }
  setTutorialDone(fresh, skipTutorial);
  return fresh;
}
