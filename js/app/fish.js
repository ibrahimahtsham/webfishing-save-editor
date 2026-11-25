'use strict';
/* Size, naming and price rules from the game. */

const MIN_FISH_SIZE = 0.01;
/* A catch is a bell-curve roll: |average * 1.25 + average * 0.55 * z|, rounded to 0.01 cm, never under 0.01.
   There is no written upper limit. z comes from Godot's generator, which tops out near 6.66,
   so about 4.91 times the average is the ceiling. Rarity does not change the roll. */
const MAX_Z = Math.sqrt(-2 * Math.log(2 ** -32));
const MAX_NATURAL_RATIO = 1.25 + 0.55 * MAX_Z;
const MAX_DRAWN_SIZE = 12000;         // the game clamps the model it draws to this
const ABSOLUTE_MAX_SIZE = 999999999;  // the game's own validation limit

const SIZE_NAMES = [[0.1, 'Microscopic'], [0.25, 'Tiny'], [0.5, 'Small'], [1, ''], [1.5, 'Large'], [1.75, 'Huge'], [2.25, 'Massive'], [2.75, 'Gigantic'], [3.25, 'Colossal']];
const SIZE_WORTH = [[0.1, 1.75], [0.25, 0.6], [0.5, 0.8], [1, 1], [1.5, 1.5], [2, 2.5], [3, 4.25]];
function ladder(table, ratio, start) {
  let out = start;
  for (const [min, v] of table) { if (min > ratio) break; out = v; }
  return out;
}

const round2 = (x) => Math.round(x * 100) / 100;
function fishAvg(id) { return isItem(id) ? GAME_ITEMS[id].avg : 75; }
function sizeName(id, size) { return ladder(SIZE_NAMES, size / fishAvg(id), ''); }
function biggestNatural(id) { return round2(fishAvg(id) * MAX_NATURAL_RATIO); }
/* smallest two-decimal size that still earns a label */
function atRatio(id, ratio) {
  const avg = fishAvg(id);
  let cents = Math.max(1, Math.floor(avg * ratio * 100));
  while (cents / 100 / avg < ratio) cents++;
  return cents / 100;
}

const SIZE_PRESETS = [
  ['smallest', 'Smallest possible', () => MIN_FISH_SIZE],
  ['microscopic', 'Microscopic', (id) => atRatio(id, 0.1)],
  ['tiny', 'Tiny', (id) => atRatio(id, 0.25)],
  ['small', 'Small', (id) => atRatio(id, 0.5)],
  ['normal', 'Average', (id) => fishAvg(id)],
  ['large', 'Large', (id) => atRatio(id, 1.5)],
  ['huge', 'Huge', (id) => atRatio(id, 1.75)],
  ['massive', 'Massive', (id) => atRatio(id, 2.25)],
  ['gigantic', 'Gigantic', (id) => atRatio(id, 2.75)],
  ['colossal', 'Colossal', (id) => atRatio(id, 3.25)],
  ['biggest', 'Biggest possible', (id) => biggestNatural(id)]
];
function presetSize(key, id) { const p = SIZE_PRESETS.find(x => x[0] === key); return p ? p[2](id) : fishAvg(id); }

function itemWorth(id, size, quality) {
  if (!isItem(id)) return 0;
  const d = GAME_ITEMS[id];
  let value = d.sell;
  if (d.worth) {
    value = Math.pow(5 * (1 + 0.25 * d.tier), 2.5 - d.weight);
    if (d.weight < 0.4) value *= 1.1;
    if (d.weight < 0.15) value *= 1.25;
    if (d.weight < 0.05) value *= 1.5;
  }
  return Math.ceil(value * ladder(SIZE_WORTH, size / d.avg, 1) * (RARITY[quality] ? RARITY[quality].worth : 1));
}
function sizeText(size) { return size < 100 ? fmtNum(size, 2) + ' cm' : fmtNum(size / 100, 4) + ' m'; }
function cleanName(s) { return String(s || '').replace(/[[\]]/g, '').slice(0, LIMITS.nameLength); }
/* the name as the game prints it */
function gameName(id, size, quality, custom) {
  const base = custom ? cleanName(custom) + ' (edit)' : (sizeName(id, size) + ' ' + nameOf(id)).trim();
  return (quality > 0 && RARITY[quality] ? RARITY[quality].n + ' ' : '') + base;
}

/* One entry per species x rarity x size that was ticked. */
function planCollection({ sections, rarities, sizes }) {
  const out = [];
  for (const sec of sections) {
    for (const id of JOURNAL_IDS[sec] || []) {
      for (const quality of rarities) {
        for (const key of sizes) out.push({ id, quality, size: presetSize(key, id) });
      }
    }
  }
  return out;
}
