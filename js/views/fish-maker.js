'use strict';
/* Fish maker: one custom fish, or every fish in chosen rarities and sizes. */
function FishView() {
  const f = S.files.save;
  if (!f) return needFile('save', 'Fish maker');
  return h('div', { class: 'page' }, pageHead('Fish maker', 'Build one fish exactly how you want it, or add whole collections.'), CustomFish(f), FishCollection(f));
}

function CustomFish(f) {
  const st = S.fish, root = f.root, preview = h('div', { class: 'fishcard px' }), form = h('div');
  const size = () => (st.preset === 'custom' ? st.size : presetSize(st.preset, st.id));
  const drawPreview = () => {
    const s = size(), d = GAME_ITEMS[st.id];
    preview.className = 'fishcard px r' + st.quality;
    put(preview, itemIcon(st.id, 'ic giant'), h('h3', { class: 'r' + st.quality + '-text' }, gameName(st.id, s, st.quality, st.name)),
      h('p', { class: 'muted' }, d.desc || ' '),
      h('dl', { class: 'facts' }, h('dt', null, 'Size'), h('dd', null, sizeText(s)), h('dt', null, 'Average'), h('dd', null, sizeText(d.avg)),
        h('dt', null, 'Sells for'), h('dd', null, d.noSell ? 'Cannot be sold' : '$' + fmtNum(itemWorth(st.id, s, st.quality))), h('dt', null, 'Size name'), h('dd', null, sizeName(st.id, s) || 'None')),
      s > biggestNatural(st.id) ? h('p', { class: 'warn small' }, 'Bigger than any fish the game can roll.' + (s > MAX_DRAWN_SIZE ? ' The game draws it as 120 m.' : '')) : null,
      d.unobtainable ? h('p', { class: 'warn small' }, 'Unused fish. The game never hands it out and will not let it be mailed.') : null);
  };
  const groups = [...JOURNAL_SECTIONS.map(s => [s.name, JOURNAL_IDS[s.key]]), ['Other finds', ALL_FISH.filter(id => !CATCHABLE.includes(id) && !GAME_ITEMS[id].unobtainable)], ['Unused', ALL_FISH.filter(id => GAME_ITEMS[id].unobtainable)]].filter(([, ids]) => ids.length);
  const draw = () => {
    const sizeBox = h('input', { type: 'number', min: MIN_FISH_SIZE, max: ABSOLUTE_MAX_SIZE, step: 'any', value: size(), 'aria-label': 'Size in cm',
      onchange: (e) => { const x = Math.min(ABSOLUTE_MAX_SIZE, Math.max(MIN_FISH_SIZE, parseFloat(e.target.value) || MIN_FISH_SIZE)); st.preset = 'custom'; st.size = x; draw(); } });
    put(form, 
      field('Fish', h('select', { onchange: (e) => { st.id = e.target.value; draw(); } }, groups.map(([label, ids]) => h('optgroup', { label }, ids.slice().sort((a, b) => nameOf(a).localeCompare(nameOf(b))).map(id => h('option', { value: id, selected: id === st.id }, nameOf(id))))))),
      h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Rarity'), rarityPills(st.quality, (i) => { st.quality = i; draw(); }, false)),
      h('div', { class: 'two' },
        field('Size', h('select', { onchange: (e) => { if (e.target.value === 'custom') st.size = size(); st.preset = e.target.value; draw(); } }, [...SIZE_PRESETS.map(([k, l]) => [k, l]), ['custom', 'Custom']].map(([k, l]) => h('option', { value: k, selected: st.preset === k }, l)))),
        field('Size in cm', sizeBox)),
      h('div', { class: 'two' },
        field('Custom name', h('input', { type: 'text', value: st.name, maxlength: LIMITS.nameLength, placeholder: 'Optional', oninput: (e) => { st.name = cleanName(e.target.value); drawPreview(); } }), 'The game adds “(edit)” after it.'),
        field('How many', h('input', { type: 'number', value: st.copies, min: 1, max: 500, onchange: (e) => { st.copies = Math.min(500, Math.max(1, Math.round(parseFloat(e.target.value)) || 1)); e.target.value = st.copies; } }))),
      checkbox('Mark as favorite', st.fav, v => { st.fav = v; }),
      checkbox('Also record it in the journal', st.journal, v => { st.journal = v; }),
      button('Add fish', () => {
        const s = size();
        let added = 0;
        commit('save', 'Add custom fish', () => {
          added = addItems(root, Array.from({ length: st.copies }, () => ({ id: st.id, size: s, quality: st.quality, name: st.name, fav: st.fav }))).length;
          if (st.journal && added) recordCatch(root, st.id, { size: s, qualities: [st.quality], count: added });
        }, { render: false });
        toast(added ? 'Added ' + plural(added, 'fish', 'fish') + '. They are at the end of Creatures.' : 'The inventory is full.', added ? '' : 'bad');
      }, 'primary'));
    drawPreview();
  };
  draw();
  return h('section', { class: 'card px' }, h('h3', null, 'Custom fish'), h('div', { class: 'maker' }, form, preview));
}

function FishCollection(f) {
  const st = S.fish, root = f.root, out = h('div', { class: 'row wrap end-align' });
  const plan = () => {
    const all = planCollection({ sections: JOURNAL_SECTIONS.map(s => s.key).filter(k => st.sections.has(k)), rarities: [0, 1, 2, 3, 4, 5].filter(q => st.rarities.has(q)), sizes: ['smallest', 'biggest'].filter(k => st.sizes.has(k)) });
    return st.skipOwned ? missingFish(root, all) : all;
  };
  const flip = (set, v) => { set.has(v) ? set.delete(v) : set.add(v); draw(); };
  const body = h('div');
  const draw = () => {
    const list = plan(), room = LIMITS.inventory - invOf(root).v.length;
    put(body, 
      h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Which fish'), h('div', { class: 'chips' }, JOURNAL_SECTIONS.map(s => chip(s.name + ' (' + JOURNAL_IDS[s.key].length + ')', st.sections.has(s.key), () => flip(st.sections, s.key))))),
      h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Rarities'), rarityPills([...st.rarities], (i) => flip(st.rarities, i), true)),
      h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Sizes'), h('div', { class: 'chips' }, chip('Smallest possible', st.sizes.has('smallest'), () => flip(st.sizes, 'smallest')), chip('Biggest possible', st.sizes.has('biggest'), () => flip(st.sizes, 'biggest'))),
        h('span', { class: 'hint' }, 'Smallest is 0.01 cm, the game’s own floor. Biggest is ' + MAX_NATURAL_RATIO.toFixed(2) + ' times the average, the most the game’s size roll can reach. Rarity does not change size.')),
      checkbox('Favorite them (favorites cannot be sold, not even with Sell all)', st.favAll, v => { st.favAll = v; }),
      checkbox('Skip exact copies I already have (same fish, rarity and size)', st.skipOwned, v => { st.skipOwned = v; draw(); }),
      checkbox('Also record them in the journal', st.setJournal, v => { st.setJournal = v; }),
      out);
    put(out, button('Add ' + plural(Math.min(list.length, room), 'fish', 'fish'), () => {
      let added = [];
      commit('save', 'Add fish collection', () => {
        added = addFish(root, list, st.setJournal);
        if (st.favAll) setFavorites(root, added.map(n => val(n, 'ref')));
      }, { render: false });
      toast('Added ' + plural(added.length, 'fish', 'fish') + '. Undo removes them all.');
      draw();
    }, 'primary', { disabled: !list.length || room <= 0 }),
    h('span', { class: 'muted small' }, !list.length ? 'Nothing to add with these choices.' : list.length > room ? 'Only ' + fmtNum(room) + ' fit in the inventory.' : 'That is ' + plural(Math.ceil((tabItems(root, 'fish').length + list.length) / GAME_PAGE), 'page') + ' of creatures in the game.'));
  };
  draw();
  return h('section', { class: 'card px' }, h('h3', null, 'Every fish, smallest and biggest'), body);
}
