'use strict';
/* Lookups over the game data: names, pictures, categories. Shared by every view. */

const hasKey = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const isItem = (id) => hasKey(GAME_ITEMS, id);
const isCosmetic = (id) => hasKey(GAME_COSMETICS, id);
function thing(id) { return isItem(id) ? GAME_ITEMS[id] : isCosmetic(id) ? GAME_COSMETICS[id] : null; }

const ID_PREFIX = /^(fish_(lake|ocean|rain|alien|void|deep)_|wtrash_|species_|pattern_|pcolor_|scolor_|hat_|eye_|nose_|mouth_|undershirt_|overshirt_|legs_|tail_|accessory_|title_|bobber_|prop_|potion_)/;
function prettyId(id) { return String(id).replace(ID_PREFIX, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

/* Some game entries share a name with another entry, so the editor labels them more clearly. */
const NAME_OVERRIDES = {
  fish_deep_test: 'Deep Test Fish A', fish_deep_testb: 'Deep Test Fish B', fish_deep_testc: 'Deep Test Fish C',
  prop_test: 'Test Prop', empty_hand: 'Empty hand (built in)'
};
function nameOf(id) { const t = thing(id); return NAME_OVERRIDES[id] || (t && t.name) || prettyId(id); }

/* Inventory tabs, split the way the game splits them. */
const ITEM_TABS = [['tool', 'Items'], ['fish', 'Creatures'], ['furniture', 'Props'], ['other', 'Other']];
function itemTab(id) {
  const c = isItem(id) ? GAME_ITEMS[id].category : 'other';
  return c === 'tool' || c === 'fish' || c === 'furniture' ? c : 'other';
}

const CATCHABLE = Object.keys(GAME_ITEMS).filter(id => GAME_ITEMS[id].category === 'fish' && JOURNAL_SECTIONS.some(s => s.key === GAME_ITEMS[id].table));
const ALL_FISH = Object.keys(GAME_ITEMS).filter(id => GAME_ITEMS[id].category === 'fish' && GAME_ITEMS[id].usesSize);
const JOURNAL_IDS = Object.fromEntries(JOURNAL_SECTIONS.map(s => [s.key, CATCHABLE.filter(id => GAME_ITEMS[id].table === s.key)]));
/* Things you own once and keep: what "unlock everything" hands out. */
const KEEPER_TOOLS = Object.keys(GAME_ITEMS).filter(id => ['Item_Tools', 'Item_Chalk', 'Item_Consumables'].includes(GAME_ITEMS[id].group) && !GAME_ITEMS[id].unobtainable && id !== 'treasure_chest');
const UNUSED_ITEMS = Object.keys(GAME_ITEMS).filter(id => GAME_ITEMS[id].unobtainable && !GAME_ITEMS[id].hidden);
const KEEPER_PROPS = Object.keys(GAME_ITEMS).filter(id => GAME_ITEMS[id].category === 'furniture' && !GAME_ITEMS[id].unobtainable);

const COS_PREFIX = { species_: 'species', pattern_: 'pattern', pcolor_: 'primary_color', scolor_: 'secondary_color', hat_: 'hat', eye_: 'eye', nose_: 'nose', mouth_: 'mouth', undershirt_: 'undershirt', shirt_: 'undershirt', overshirt_: 'overshirt', legs_: 'legs', tail_: 'tail', accessory_: 'accessory', title_: 'title', bobber_: 'bobber' };
function cosCat(id) {
  if (isCosmetic(id)) return GAME_COSMETICS[id].category;
  for (const [p, c] of Object.entries(COS_PREFIX)) if (String(id).startsWith(p)) return c;
  return 'other';
}
/* Cosmetics that actually show up for a normal player. */
const USABLE_COSMETICS = Object.keys(GAME_COSMETICS).filter(id => !CONTRIBUTOR_TITLES.has(id));

/* ---------- pictures ---------- */
const imgPath = (file) => 'assets/game/' + file;

/* The game multiplies most cosmetic pictures by a colour. An SVG filter does the same here. */
const madeTints = new Set();
function tintFilter(hex) {
  if (!hex || hex.toLowerCase() === '#ffffff') return 'none';
  const id = 'tint-' + hex.slice(1);
  if (!madeTints.has(id)) {
    madeTints.add(id);
    const [r, g, b] = [1, 3, 5].map(i => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(4));
    const ns = 'http://www.w3.org/2000/svg';
    const filter = document.createElementNS(ns, 'filter'), matrix = document.createElementNS(ns, 'feColorMatrix');
    filter.setAttribute('id', id); filter.setAttribute('color-interpolation-filters', 'sRGB');
    matrix.setAttribute('type', 'matrix');
    matrix.setAttribute('values', r + ' 0 0 0 0  0 ' + g + ' 0 0 0  0 0 ' + b + ' 0 0  0 0 0 1 0');
    filter.append(matrix);
    document.getElementById('tints').append(filter);
  }
  return 'url(#' + id + ')';
}
function Pic(file, cls = 'ic', tint = null) {
  if (!file) return h('span', { class: 'well ' + cls + ' none', 'aria-hidden': 'true' });
  const img = h('img', { src: imgPath(file), alt: '', draggable: 'false', loading: 'lazy' });
  if (tint) img.style.filter = tintFilter(tint);
  return h('span', { class: 'well ' + cls }, img);
}
function itemIcon(id, cls = 'ic') {
  const t = thing(id);
  if (!t) return h('span', { class: 'well ' + cls + ' none', 'aria-hidden': 'true' }, '?');
  if (isItem(id)) return Pic(t.icon, cls);
  return Pic(t.icon, cls, t.category === 'species' || t.category === 'tail' ? '#8a5a2b' : t.color);
}
