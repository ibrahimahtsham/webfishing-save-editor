'use strict';
/* Rod stat values per upgrade tier, from the WEBFISHING wiki (Upgrade Shop). */
const ROD_TABLE = { rod_power: [1, 3, 10, 20, 35, 50, 70, 90, 125], rod_speed: [0, 0.1, 0.24, 0.4, 0.7, 1], rod_chance: [0, 0.02, 0.04, 0.06, 0.08, 0.1], rod_luck: [0, 1, 2, 3, 4, 5] };
function tierField(key, label) {
  const node = get(S.files.save.root, key), max = LIMITS[key];
  if (!node) return null;
  const effect = (v) => 'Tier ' + v + ' of ' + max + (ROD_TABLE[key] ? ', value ' + ROD_TABLE[key][Math.max(0, Math.min(v, max))] : '');
  const hint = h('span', { class: 'hint' }, effect(node.v));
  return h('label', { class: 'field' }, h('span', { class: 'lbl' }, label), numInput('save', node, { label, min: 0, max, path: [key], onChange: (v) => { hint.textContent = effect(v); } }), hint);
}
function GearView() {
  const fk = 'save', f = S.files.save;
  if (!f) return needFile(fk, 'Gear and bait');
  const r = f.root, baitInv = get(r, 'bait_inv'), baitUn = get(r, 'bait_unlocked'), baitSel = get(r, 'bait_selected'), lureUn = get(r, 'lure_unlocked'), lureSel = get(r, 'lure_selected');
  const has = (arr, id) => arr.v.some(x => x.v === id);
  const baitIds = [...new Set([...Object.keys(GAME_BAITS), ...baitInv.m.keys(), ...baitUn.v.map(x => x.v)])].filter(Boolean);
  const lureIds = [...new Set([...Object.keys(GAME_LURES), ...lureUn.v.map(x => x.v)])].filter(Boolean);
  const baitRows = baitIds.map(id => {
    const meta = GAME_BAITS[id] || { name: prettyId(id), desc: 'Not in this version of the game', icon: null };
    const node = baitInv.m.get(id) || N.int(0);
    return h('div', { class: 'row-item' }, Pic(meta.icon, 'ic big'), h('div', { class: 'grow' }, h('b', null, meta.name), h('div', { class: 'muted small' }, meta.desc)),
      numInput(fk, node, { label: meta.name + ' count', min: 0, path: ['bait_inv', id], attach: () => { if (!baitInv.m.has(id)) baitInv.m.set(id, node); } }),
      checkbox('Unlocked', has(baitUn, id), v => commit(fk, 'Toggle bait', () => toggleInList(baitUn, id, v), { render: false })),
      h('label', { class: 'check' }, h('input', { type: 'radio', name: 'bait', checked: baitSel.v === id, onchange: () => commit(fk, 'Select bait', () => { baitSel.v = id; toggleInList(baitUn, id, true); }) }), 'In use'));
  });
  const lureTiles = ['', ...lureIds].map(id => {
    const meta = id === '' ? { name: 'Bare Hook', desc: 'No lure', icon: 'bait_icons9.webp' } : GAME_LURES[id] || { name: prettyId(id), desc: 'Not in this version of the game', icon: null };
    const on = has(lureUn, id);
    return h('div', { class: 'tile px lure' + (on ? '' : ' missing') }, h('div', { class: 'tile-main still' }, Pic(meta.icon, 'ic big'), h('span', { class: 'tile-name' }, meta.name), h('span', { class: 'tile-sub muted small' }, meta.desc)),
      h('div', { class: 'row lurebtns' }, id === '' ? null : checkbox('Unlocked', on, v => commit(fk, 'Toggle lure', () => toggleInList(lureUn, id, v))),
        h('label', { class: 'check' }, h('input', { type: 'radio', name: 'lure', checked: lureSel.v === id, onchange: () => commit(fk, 'Select lure', () => { lureSel.v = id; toggleInList(lureUn, id, true); }) }), 'In use')));
  });
  return h('div', { class: 'page' }, pageHead('Gear and bait', 'Rod upgrades, fishing buddy, bait and lures.'),
    h('div', { class: 'cols' },
      card('Rod', tierField('rod_power', 'Power'), tierField('rod_speed', 'Reel speed'), tierField('rod_chance', 'Catch chance'), tierField('rod_luck', 'Luck')),
      card('Fishing buddy', tierField('buddy_level', 'Quality'), tierField('buddy_speed', 'Speed')),
      card('Bait limit', numField(fk, 'max_bait', 'Most of each bait you can carry', { min: 5, max: 50, step: 5, hint: 'Starts at 5 and grows by 5 per upgrade, up to 50.' }))),
    h('section', { class: 'card px' }, h('h3', null, 'Bait'), baitRows), h('section', { class: 'card px' }, h('h3', null, 'Lures'), h('div', { class: 'grid lures' }, lureTiles)));
}
