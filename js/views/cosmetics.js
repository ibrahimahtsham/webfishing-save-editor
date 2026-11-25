'use strict';
/* Cosmetics: live outfit preview, what is worn, and what is owned. */
function cosNote(id) {
  if (!isCosmetic(id)) return 'From a mod or newer version. Kept as it is.';
  if (CONTRIBUTOR_TITLES.has(id)) return 'Shows as “Scout” unless your account is a known contributor';
  if (HIDDEN_COSMETICS.has(id)) return 'Hidden: not given out in the game';
  return GAME_COSMETICS[id].desc || '';
}
function CosmeticsView() {
  const fk = 'save', f = S.files.save;
  if (!f) return needFile(fk, 'Cosmetics');
  const st = S.cos, root = f.root, unlocked = get(root, 'cosmetics_unlocked'), eq = get(root, 'cosmetics_equipped');
  const owned = () => new Set(unlocked.v.map(x => x.v));
  const allIds = () => [...new Set([...Object.keys(GAME_COSMETICS), ...unlocked.v.map(x => x.v)])];
  const idsFor = (cat) => allIds().filter(id => cosCat(id) === cat).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const wornIn = (slot) => { const n = eq.m.get(slot); return n ? (n.t === 'arr' ? n.v.map(x => x.v) : [n.v]) : []; };
  const look = h('div', { class: 'portrait' }), equip = h('div', { class: 'equip' }), grid = h('div');
  const drawAll = () => { drawLook(); drawEquip(); drawGrid(); };
  const edit = (label, fn) => { commit(fk, label, fn, { render: false }); drawAll(); };

  const wear = (id) => {
    const cat = cosCat(id);
    if (cat === 'accessory') {
      const a = eq.m.get('accessory'), on = a && a.v.some(x => x.v === id);
      if (!on && !st.many && a && a.v.length >= LIMITS.accessories) return toast('You can wear 4 accessories. Take one off, or tick “Wear more than 4”.', 'bad');
      return edit((on ? 'Take off ' : 'Wear ') + nameOf(id), () => { toggleInList(unlocked, id, true); const arr = ensure(eq, 'accessory', () => N.arr()); arr.v = on ? arr.v.filter(x => x.v !== id) : [...arr.v, N.str(id)]; });
    }
    edit('Wear ' + nameOf(id), () => { toggleInList(unlocked, id, true); ensure(eq, cat, () => N.str('')).v = id; });
  };
  const toggleOwn = (id) => {
    const on = owned().has(id);
    if (on && COS_SLOTS.some(([s]) => wornIn(s).includes(id))) return toast('You are wearing that. Change it first.', 'bad');
    edit((on ? 'Lock ' : 'Unlock ') + nameOf(id), () => toggleInList(unlocked, id, !on));
  };
  const wearAccessories = (label, ids) => edit(label, () => {
    const arr = ensure(eq, 'accessory', () => N.arr()), have = new Set(arr.v.map(x => x.v));
    ids.forEach(id => toggleInList(unlocked, id, true));
    arr.v = ids.length ? [...arr.v, ...ids.filter(id => !have.has(id)).map(id => N.str(id))] : [];
  });
  const accessoryTools = () => {
    const all = idsFor('accessory').filter(isCosmetic), worn = wornIn('accessory').length;
    return h('div', { class: 'accbar' },
      checkbox('Wear more than 4 (experiment)', st.many, v => { st.many = v; drawGrid(); }),
      h('span', { class: 'muted small' }, worn + ' worn'),
      st.many ? button('Wear all ' + all.length, () => wearAccessories('Wear every accessory', all), 'small') : null,
      worn ? button('Take all off', () => wearAccessories('Take off accessories', []), 'small') : null,
      st.many ? h('p', { class: 'muted small' }, 'The limit of 4 is only in the game’s outfit menu. There you can take pieces off, but not put more on until you are below 4.') : null);
  };
  const drawLook = () => { const e = equippedOf(root); put(look, Doll(e), h('div', { class: 'portrait-cap' }, h('b', null, titleText(e) || 'No title'))); };
  const drawEquip = () => {
    const have = owned();
    put(equip, ...COS_SLOTS.filter(([s]) => s !== 'accessory').map(([slot, label]) => {
      const cur = wornIn(slot)[0] || '', opts = new Set(idsFor(slot).filter(id => have.has(id)));
      if (cur) opts.add(cur);
      return field(label, h('select', { onchange: (e) => wear(e.target.value) }, [...opts].sort((a, b) => nameOf(a).localeCompare(nameOf(b))).map(id => h('option', { value: id, selected: id === cur }, nameOf(id)))));
    }), h('div', { class: 'field wide' }, h('span', { class: 'lbl' }, 'Accessories'), h('div', { class: 'chips' }, wornIn('accessory').length ? wornIn('accessory').map(id => h('button', { type: 'button', class: 'chip on', title: 'Take off', onclick: () => wear(id) }, nameOf(id), ' ✕')) : h('span', { class: 'muted' }, 'None'))));
  };
  const drawGrid = () => {
    const have = owned(), worn = new Set(COS_SLOTS.flatMap(([s]) => wornIn(s))), q = st.q.trim().toLowerCase();
    const all = idsFor(st.cat);
    const ids = all.filter(id => (!q || (nameOf(id) + id).toLowerCase().includes(q)) && (st.show === 'all' || (st.show === 'owned') === have.has(id)));
    const missing = all.filter(id => !have.has(id) && !CONTRIBUTOR_TITLES.has(id));
    put(grid,
      st.cat === 'accessory' ? accessoryTools() : null,
      h('div', { class: 'row wrap' }, h('span', { class: 'muted' }, all.filter(id => have.has(id)).length + ' of ' + all.length + ' owned'),
        missing.length ? button('Unlock ' + missing.length + ' here', () => edit('Unlock cosmetics', () => missing.forEach(id => toggleInList(unlocked, id, true))), 'small') : null),
      ids.length ? h('div', { class: 'grid compact' }, ids.map(id => {
        const on = have.has(id), w = worn.has(id), c = isCosmetic(id) ? GAME_COSMETICS[id] : null;
        return h('div', { class: 'tile px' + (on ? '' : ' missing') + (w ? ' open' : '') + (c ? '' : ' unknown'), title: cosNote(id) },
          h('button', { type: 'button', class: 'tile-main', 'aria-label': 'Wear ' + nameOf(id), onclick: () => { if (!w || st.cat === 'accessory') wear(id); } },
            st.cat === 'title' ? h('span', { class: 'titletag' }, (c && c.title) || 'No title') : itemIcon(id, 'ic big'), h('span', { class: 'tile-name' }, nameOf(id)),
            CONTRIBUTOR_TITLES.has(id) ? h('span', { class: 'tile-sub warn' }, 'Contributor') : HIDDEN_COSMETICS.has(id) ? h('span', { class: 'tile-sub gold' }, 'Hidden') : null),
          h('button', { type: 'button', class: 'mini', onclick: () => toggleOwn(id) }, w ? 'Wearing' : on ? 'Owned' : 'Unlock'));
      })) : h('p', { class: 'empty' }, 'Nothing matches.'));
  };
  const search = h('input', { type: 'search', class: 'search', placeholder: 'Search cosmetics ( / )', value: st.q, 'aria-label': 'Search cosmetics', oninput: (e) => { st.q = e.target.value; drawGrid(); } });
  const cats = h('div', { class: 'chips' }, COS_SLOTS.map(([cat, label]) => chip(label, st.cat === cat, () => { st.cat = cat; renderMain(); })));
  drawAll();
  const left = USABLE_COSMETICS.filter(id => !owned().has(id)).length;
  return h('div', { class: 'page wide' }, pageHead('Cosmetics', 'Click a piece to wear it. The drawing is a stand-in for the 3D model, with the game’s real faces and colours.',
    left ? button('Unlock all ' + left, () => commit(fk, 'Unlock all cosmetics', () => USABLE_COSMETICS.forEach(id => toggleInList(unlocked, id, true))), 'primary') : null),
  h('div', { class: 'cols cos' }, h('section', { class: 'card px' }, look, equip),
    h('div', { class: 'cos-right' }, cats, h('div', { class: 'toolbar' }, search, h('div', { class: 'chips' }, [['all', 'All'], ['owned', 'Owned'], ['missing', 'Missing']].map(([k, l]) => chip(l, st.show === k, () => { st.show = k; renderMain(); })))), grid)));
}
