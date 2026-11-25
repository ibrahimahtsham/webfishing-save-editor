'use strict';
/* Review changes, and compare with another save. */
const TOP_NAMES = {
  money: 'Money', level: 'Rank', xp: 'XP', fish_caught: 'Fish caught', cash_total: 'Cash total', inventory: 'Inventory', hotbar: 'Hotbar', locked_refs: 'Favorites', journal: 'Journal',
  cosmetics_unlocked: 'Cosmetics owned', cosmetics_equipped: 'Outfit', quests: 'Quests', completed_quests: 'Finished quests', bait_inv: 'Bait', bait_unlocked: 'Bait unlocked', bait_selected: 'Bait in use',
  lure_unlocked: 'Lures unlocked', lure_selected: 'Lure in use', max_bait: 'Bait limit', player_options: 'Settings', saved_aqua_fish: 'Aquarium fish', rod_power: 'Rod power', rod_speed: 'Rod speed',
  rod_chance: 'Rod catch chance', rod_luck: 'Rod luck', buddy_level: 'Buddy quality', buddy_speed: 'Buddy speed', loan_level: 'Camp tier', loan_left: 'Camp loan left', saved_tags: 'Milestones'
};
function describeNode(n) {
  if (!n) return 'nothing';
  switch (n.t) {
    case 'str': return thing(n.v) ? nameOf(n.v) : '“' + n.v + '”';
    case 'bool': return n.v ? 'on' : 'off';
    case 'nil': return 'empty';
    case 'int': case 'real': return typeof n.v === 'bigint' ? String(n.v) : fmtNum(numOf(n), 4);
    case 'vec2': return fmtNum(n.v[0]) + ' × ' + fmtNum(n.v[1]);
    case 'arr': return plural(n.v.length, 'entry', 'entries');
    default:
      if (n.m.has('id')) {
        const q = val(n, 'quality') || 0, id = val(n, 'id');
        return itemTab(id) === 'fish' ? gameName(id, Number(val(n, 'size')), q, val(n, 'custom_name')) + ', ' + sizeText(Number(val(n, 'size'))) : nameOf(id);
      }
      return n.m.has('title') ? val(n, 'title') : n.m.has('count') ? '×' + describeNode(get(n, 'count')) : plural(n.m.size, 'field');
  }
}
function pathLabel(d, rootA, rootB) {
  const out = [];
  let na = rootA, nb = rootB;
  const step = (n, s) => n && (n.t === 'dict' ? n.m.get(String(s)) : n.t === 'arr' ? (String(s).startsWith('#') ? n.v.find(e => e.m && e.m.has('ref') && String(val(e, 'ref')) === String(s).slice(1)) : n.v[s]) : undefined);
  d.path.forEach((seg, i) => {
    na = step(na, seg); nb = step(nb, seg);
    const here = nb || na;
    if (i === 0) out.push(TOP_NAMES[seg] || prettyId(seg));
    else if (String(seg).startsWith('#')) out.push(here && get(here, 'id') ? nameOf(val(here, 'id')) + (val(here, 'custom_name') ? ' “' + val(here, 'custom_name') + '”' : '') : 'Item');
    else if (thing(seg)) out.push(nameOf(seg));
    else if (here && here.t === 'dict' && here.m.has('title')) out.push(val(here, 'title'));
    else out.push(prettyId(seg));
  });
  return out;
}
function changeRows(list, rootA, rootB, grouped) {
  return list.map(d => {
    if (d.kind === 'order') return h('li', { class: 'crow changed' }, h('span', { class: 'cpath' }, 'Inventory'), h('span', { class: 'cval to' }, 'Items rearranged'));
    const bare = d.item && d.path.length === 1;
    const what = d.kind === 'changed' ? [h('span', { class: 'from' }, describeNode(d.from)), ' to ', h('span', { class: 'to' }, describeNode(d.to))]
      : h('span', { class: d.kind === 'added' ? 'to' : 'from' }, (d.kind === 'added' ? 'Added ' : 'Removed ') + (d.item ? nameOf(String((d.to || d.from).v)) : describeNode(d.to || d.from)));
    return h('li', { class: 'crow ' + d.kind }, bare ? null : h('span', { class: 'cpath' }, pathLabel(d, rootA, rootB).slice(grouped && d.path.length > 1 ? 1 : 0).join(', ')), h('span', { class: 'cval' + (bare ? ' left' : '') }, what));
  });
}
function ChangesView() {
  const list = allChanges(), groups = new Map();
  list.forEach(d => { const k = d.file + ':' + d.path[0]; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(d); });
  const cmp = S.compare, cmpList = cmp && S.files.save ? diff(cmp.root, S.files.save.root) : [];
  const revert = () => confirmBox('Undo every change?', 'Every edit since you opened the files is discarded.', 'Undo everything', () => {
    for (const fk of ['save', 'general']) { const f = S.files[fk]; if (f) f.root = clone(f.orig); }
    S.undo = []; S.redo = []; S.rev++; diffCache = null;
    render();
    toast('Back to the files as you opened them.');
  }, true);
  const cmpInput = h('input', { type: 'file', accept: '.sav,.backup', hidden: true, onchange: async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { S.compare = { name: file.name, root: parseFile(new Uint8Array(await file.arrayBuffer())).root }; renderMain(); } catch (err) { toast('Could not read that file: ' + err.message, 'bad'); }
  } });
  return h('div', { class: 'page' }, pageHead('Review changes', list.length ? 'What will be different when you save.' : 'You have not changed anything yet.',
    S.mode === 'simple' ? button('Back', () => go('progress')) : null,
    ['save', 'general'].filter(fk => S.files[fk] && isDirty(fk)).map(fk => button(fk === 'save' ? 'Save game' : 'Save settings', () => saveDialog(fk), 'primary')),
    list.length ? button('Undo every change', revert, 'ghost danger') : null),
  [...groups.entries()].map(([k, items]) => {
    const f = S.files[k.split(':')[0]];
    return h('section', { class: 'card px' }, h('h3', null, TOP_NAMES[items[0].path[0]] || prettyId(items[0].path[0]), ' ', h('span', { class: 'muted small' }, plural(items.length, 'change'))),
      h('ul', { class: 'changes' }, changeRows(items.slice(0, 200), f.orig, f.root, true)), items.length > 200 ? h('p', { class: 'muted small' }, 'Showing the first 200.') : null);
  }),
  S.files.save ? card('Compare with another save', h('p', { class: 'muted' }, 'See what differs between any other save and the one you are editing.'),
    h('div', { class: 'row' }, button('Choose a save', () => cmpInput.click()), cmp ? button('Clear', () => { S.compare = null; renderMain(); }, 'ghost') : null), cmpInput,
    cmp ? [h('h4', null, cmp.name + ': ' + plural(cmpList.length, 'difference')), h('ul', { class: 'changes' }, changeRows(cmpList.slice(0, 300), cmp.root, S.files.save.root)), cmpList.length > 300 ? h('p', { class: 'muted small' }, 'Showing the first 300.') : null] : null) : null);
}
