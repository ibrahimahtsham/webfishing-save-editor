'use strict';
/* Inventory: shown in the order the game uses, and rearranged by dragging. */
const GAME_PAGE = 24;
const refOf = (n) => String(val(n, 'ref'));
function findByRef(ref) { return invOf(S.files.save.root).v.find(n => refOf(n) === String(ref)); }

function InventoryView() {
  const fk = 'save', f = S.files.save;
  if (!f) return needFile(fk, 'Inventory');
  const st = S.inv, root = f.root;
  const host = h('div', { class: 'gridhost' }), detail = h('aside', { class: 'detail px', 'aria-live': 'polite' }), bulk = h('div'), hot = h('div', { class: 'hotbar' }), counter = h('span', { class: 'muted small' });
  const edit = (label, fn, opts) => { commit(fk, label, fn, { render: false, ...opts }); drawAll(); };
  const drawAll = () => { drawHot(); drawBulk(); drawGrid(); drawDetail(); };

  let favs = new Set();
  const list = () => tabItems(root, st.tab);
  const shown = () => {
    const q = st.q.trim().toLowerCase();
    return !q ? list() : list().filter(n => (nameOf(val(n, 'id')) + ' ' + val(n, 'id') + ' ' + (val(n, 'custom_name') || '') + ' ' + (RARITY[val(n, 'quality')] || { n: '' }).n).toLowerCase().includes(q));
  };
  const canArrange = () => !st.q.trim();
  const move = (refs, to) => edit(refs.length > 1 ? 'Move ' + refs.length + ' items' : 'Move item', () => moveInTab(root, st.tab, refs, to));
  const groupFor = (ref) => (st.sel.has(ref) ? list().map(refOf).filter(r => st.sel.has(r)) : [ref]);

  const drawHot = () => {
    const hb = get(root, 'hotbar');
    put(hot, ...[0, 1, 2, 3, 4].map(i => {
      const n = hb && hb.m.get(String(i)), it = n && Number(n.v) ? findByRef(n.v) : null, label = it ? nameOf(val(it, 'id')) : 'empty';
      return h('button', { type: 'button', class: 'slot px' + (it ? ' filled' : ''), 'aria-label': 'Hotbar ' + (i + 1) + ': ' + label, title: label,
        onclick: () => pickInventory('Hotbar slot ' + (i + 1), (ref) => edit('Set hotbar slot', () => setHotbar(root, i, ref))) },
        h('span', { class: 'slot-n' }, i + 1), it ? itemIcon(val(it, 'id'), 'ic big') : h('span', { class: 'muted' }, '–'));
    }));
  };
  const tile = (n, index) => {
    const id = val(n, 'id'), ref = refOf(n), q = val(n, 'quality') || 0, cnt = val(n, 'count') || 1, name = val(n, 'custom_name');
    const sub = itemTab(id) === 'fish' ? sizeText(numOf(get(n, 'size'))) + (q ? ', ' + (RARITY[q] || { n: '?' }).n : '') : cnt > 1 ? '×' + fmtNum(cnt) : '';
    const hb = hotbarSlotOf(root, ref);
    const el = h('div', { class: 'tile px r' + q + (st.open === ref ? ' open' : '') + (st.sel.has(ref) ? ' sel' : '') + (isItem(id) ? '' : ' unknown') + (canArrange() ? ' movable' : ''), 'data-ref': ref, 'data-index': index },
      h('input', { type: 'checkbox', class: 'tile-check', checked: st.sel.has(ref), 'aria-label': 'Select ' + nameOf(id), onchange: (e) => { e.target.checked ? st.sel.add(ref) : st.sel.delete(ref); drawBulk(); el.classList.toggle('sel', e.target.checked); } }),
      h('button', { type: 'button', class: 'tile-main', onclick: () => { st.open = ref; drawGrid(); drawDetail(); },
        onkeydown: (e) => {
          const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
          if (!e.altKey || !step || !canArrange()) return;
          e.preventDefault();
          move([ref], step < 0 ? Math.max(0, index - 1) : Math.min(list().length, index + 2));
          const again = host.querySelector('[data-ref="' + ref + '"] .tile-main');
          if (again) again.focus();
        } },
        itemIcon(id, 'ic big'), h('span', { class: 'tile-name' }, name ? '“' + name + '”' : nameOf(id)), h('span', { class: 'tile-sub muted' }, name ? nameOf(id) : sub || ' ')),
      h('span', { class: 'tile-flags' }, favs.has(ref) ? h('span', { class: 'heart', title: 'Favorite' }, h('img', { src: imgPath('item_star.webp'), alt: 'Favorite' })) : null, hb >= 0 ? h('span', { class: 'hbflag', title: 'Hotbar ' + (hb + 1) }, hb + 1) : null));
    return el;
  };
  const drawGrid = () => {
    const items = shown();
    favs = favoriteSet(root);
    put(host);
    if (!items.length) addKids(host, h('p', { class: 'empty' }, list().length ? 'Nothing matches that search.' : 'Nothing in this tab yet. Add an item to get started.'));
    const paged = st.tab !== 'furniture' && canArrange();
    for (let i = 0; i < items.length; i += paged ? GAME_PAGE : items.length) {
      const part = items.slice(i, paged ? i + GAME_PAGE : items.length);
      if (paged && items.length > GAME_PAGE) addKids(host, h('h4', { class: 'pagemark' }, 'Game page ' + (i / GAME_PAGE + 1)));
      addKids(host, h('div', { class: 'grid' }, part.map((n, k) => tile(n, i + k))));
    }
    counter.textContent = items.length === list().length ? plural(items.length, 'item') : items.length + ' of ' + plural(list().length, 'item');
    put(tabsHost, ...tabs());
  };
  /* Rearranging by mouse or pen. Touch keeps scrolling; the position buttons cover it there. */
  const clearMarks = () => document.querySelectorAll('.tile.before,.tile.after,.slot.over').forEach(x => x.classList.remove('before', 'after', 'over'));
  const aim = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const slot = el.closest('.hotbar .slot');
    if (slot) return { slot: [...hot.children].indexOf(slot), el: slot };
    const t = el.closest('.gridhost .tile');
    if (!t) return null;
    const box = t.getBoundingClientRect(), after = x > box.left + box.width / 2;
    return { el: t, after, to: Number(t.dataset.index) + (after ? 1 : 0) };
  };
  host.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.tile');
    if (!t || e.button !== 0 || e.pointerType === 'touch' || e.target.closest('.tile-check') || !canArrange()) return;
    const x0 = e.clientX, y0 = e.clientY, refs = groupFor(t.dataset.ref);
    let ghost = null, spot = null, timer = 0, last = { x: x0, y: y0 };
    const begin = () => {
      ghost = h('div', { class: 'dragghost px' }, itemIcon(val(findByRef(t.dataset.ref), 'id'), 'ic big'), refs.length > 1 ? h('b', null, refs.length) : null);
      document.body.append(ghost);
      document.body.classList.add('arranging');
      host.querySelectorAll('.tile').forEach(el => el.classList.toggle('dragging', refs.includes(el.dataset.ref)));
      timer = setInterval(() => { const dy = last.y < 110 ? -16 : last.y > window.innerHeight - 60 ? 16 : 0; if (dy) { window.scrollBy(0, dy); mark(); } }, 16);
    };
    const mark = () => {
      clearMarks();
      spot = aim(last.x, last.y);
      if (spot) spot.el.classList.add(spot.slot != null ? 'over' : spot.after ? 'after' : 'before');
    };
    const onMove = (ev) => {
      last = { x: ev.clientX, y: ev.clientY };
      if (!ghost && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 7) return;
      if (!ghost) begin();
      ev.preventDefault();
      ghost.style.transform = 'translate(' + (ev.clientX + 10) + 'px,' + (ev.clientY + 10) + 'px)';
      mark();
    };
    const end = (drop) => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel); window.removeEventListener('keydown', onKey, true);
      clearInterval(timer);
      clearMarks();
      if (!ghost) return;
      ghost.remove();
      document.body.classList.remove('arranging');
      host.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
      /* the click that follows a drag must not open the tile */
      const eat = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener('click', eat, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', eat, true), 50);
      if (!drop || !spot) return;
      if (spot.slot != null) edit('Set hotbar slot', () => setHotbar(root, spot.slot, Number(t.dataset.ref)));
      else move(refs, spot.to);
    };
    const onUp = () => end(true), onCancel = () => end(false);
    const onKey = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); end(false); } };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel); window.addEventListener('keydown', onKey, true);
  });

  const drawBulk = () => {
    for (const r of [...st.sel]) if (!findByRef(r)) st.sel.delete(r);
    put(bulk);
    if (!st.sel.size) return;
    const refs = [...st.sel], fishTab = st.tab === 'fish';
    addKids(bulk, h('div', { class: 'bulk px' }, h('b', null, refs.length + ' selected'),
      !fishTab ? null : rarityPills(-1, (i) => edit('Set rarity', () => refs.forEach(r => { const n = findByRef(r); if (n) setNum(get(n, 'quality'), i); })), false),
      button('Move to front', () => move(refs, 0), 'small'), button('Move to end', () => move(refs, list().length), 'small'),
      button('Favorite', () => edit('Favorite items', () => setFavorites(root, refs)), 'small'),
      button('Select all shown', () => { shown().forEach(n => st.sel.add(refOf(n))); drawBulk(); drawGrid(); }, 'small'),
      button('Clear', () => { st.sel.clear(); drawBulk(); drawGrid(); }, 'small ghost'),
      button('Delete ' + refs.length, () => deleteItems(refs), 'small danger')));
  };
  const deleteItems = (refs) => {
    const safe = refs.filter(r => r !== '0');
    if (!safe.length) return toast('The empty hand is built in and stays.', 'bad');
    confirmBox('Delete ' + plural(safe.length, 'item') + '?', 'They leave your inventory, hotbar and favorites. You can undo this.', 'Delete', () => edit('Delete items', () => { removeRefs(root, safe); st.sel.clear(); if (safe.includes(st.open)) st.open = null; }), true);
  };

  const drawDetail = () => {
    put(detail);
    const n = st.open && findByRef(st.open);
    if (!n || itemTab(val(n, 'id')) !== st.tab) { addKids(detail, h('div', { class: 'empty' }, h('p', null, 'Select an item to edit it.'), h('p', { class: 'small' }, 'Drag items to rearrange them, or hold Alt and press the arrow keys. Tick several to move them together.'))); return; }
    const id = val(n, 'id'), ref = refOf(n), q = val(n, 'quality') || 0, data = isItem(id) ? GAME_ITEMS[id] : null;
    const head = h('div', { class: 'dhead' }, itemIcon(id, 'ic huge'), h('div', null, h('h2', null, nameOf(id)), h('code', { class: 'muted' }, id),
      !data ? h('p', { class: 'warn small' }, 'Not in the game’s item list. It is kept as it is.') : data.unobtainable ? h('p', { class: 'warn small' }, data.hidden ? 'The game adds this itself. Leave it alone.' : 'Unused item: the game never hands this out. Do not mail it.') : null));
    if (ref === '0') { addKids(detail, head); return; }
    const pos = list().findIndex(x => refOf(x) === ref), last = list().length - 1;
    const sizeN = get(n, 'size'), countN = get(n, 'count') || N.int(1);
    const name = h('input', { type: 'text', value: val(n, 'custom_name') || '', maxlength: LIMITS.nameLength, placeholder: 'No custom name', onchange: (e) => edit('Rename item', () => { ensure(n, 'custom_name', () => N.str('')).v = cleanName(e.target.value); }) });
    const price = data && !data.noSell ? 'Sells for $' + fmtNum(itemWorth(id, numOf(sizeN), q)) + '. ' : '';
    addKids(detail, head,
      data && data.noRename ? null : field('Custom name', name, 'The game adds “(edit)” after it.'),
      st.tab !== 'fish' ? null : h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Rarity'), rarityPills(q, (i) => edit('Set rarity', () => setNum(get(n, 'quality'), i)), false)),
      h('div', { class: 'two' },
        data && !data.usesSize ? null : field('Size (cm)', numInput(fk, sizeN, { label: 'Size', min: MIN_FISH_SIZE, max: ABSOLUTE_MAX_SIZE, step: 'any', onChange: () => drawAll() })),
        field('Stack', numInput(fk, countN, { label: 'Stack', min: 1, max: LIMITS.stack, onChange: () => drawAll(), attach: () => { if (!get(n, 'count')) n.m.set('count', countN); } }))),
      h('p', { class: 'muted small' }, price + (itemTab(id) === 'fish' && sizeName(id, numOf(sizeN)) ? 'The game calls this size ' + sizeName(id, numOf(sizeN)) + '.' : '')),
      canArrange() ? h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Position ' + (pos + 1) + ' of ' + (last + 1)), h('div', { class: 'row wrap' },
        button('First', () => move([ref], 0), 'small', { disabled: pos === 0 }), button('Earlier', () => move([ref], pos - 1), 'small', { disabled: pos === 0 }),
        button('Later', () => move([ref], pos + 2), 'small', { disabled: pos === last }), button('Last', () => move([ref], last + 1), 'small', { disabled: pos === last }))) : null,
      h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Hotbar'), h('div', { class: 'pills' }, [-1, 0, 1, 2, 3, 4].map(i => h('button', { type: 'button', class: 'pill' + (hotbarSlotOf(root, ref) === i ? ' on' : ''), 'aria-pressed': hotbarSlotOf(root, ref) === i ? 'true' : 'false', onclick: () => edit('Set hotbar slot', () => setHotbar(root, i, Number(ref))) }, i < 0 ? 'None' : i + 1)))),
      checkbox('Favorite (cannot be sold by accident)', isFavorite(root, ref), v => edit('Toggle favorite', () => setFavorite(root, ref, v))),
      h('div', { class: 'row end' },
        button('Duplicate', () => edit('Duplicate item', () => {
          const c = clone(n), inv = invOf(root), r = newRef(refSet(root));
          c.m.set('ref', N.int(r));
          inv.v.splice(inv.v.indexOf(n) + 1, 0, c);
          st.open = String(r);
        }), 'small'),
        button('Delete', () => deleteItems([ref]), 'small danger')));
  };

  const tabs = () => ITEM_TABS.map(([k, l]) => [k, l, tabItems(root, k).length]).filter(([k, , c]) => k !== 'other' || c).map(([k, l, c]) =>
    h('button', { type: 'button', class: 'tab' + (st.tab === k ? ' on' : ''), 'aria-pressed': st.tab === k ? 'true' : 'false', onclick: () => { st.tab = k; st.sel.clear(); st.open = null; drawAll(); } }, l, h('span', { class: 'muted small' }, c)));
  const tabsHost = h('div', { class: 'tabs' });
  let favFirst = false;
  const sortSel = h('select', { 'aria-label': 'Sort by' }, Object.entries(SORTS).map(([k, [l]]) => h('option', { value: k }, l)));
  const search = h('input', { type: 'search', class: 'search', placeholder: 'Search this tab ( / )', value: st.q, 'aria-label': 'Search inventory', oninput: (e) => { st.q = e.target.value; drawGrid(); drawDetail(); } });
  drawAll();
  return h('div', { class: 'page wide' }, pageHead('Inventory', 'Shown in the order the game shows it. Drag to rearrange.', button('Add item', () => addItemDialog(), 'primary'), button('Organize everything', () => edit('Organize inventory', () => organizeAll(root)), '', { title: 'Puts each kind of item together, in every tab' }), button('Make a fish', () => go('fish'))),
    h('div', { class: 'hotbar-wrap' }, h('span', { class: 'muted small' }, 'Hotbar'), hot), tabsHost,
    h('div', { class: 'toolbar' }, search, counter, h('span', { class: 'spacer' }), h('span', { class: 'muted small' }, 'Sort this tab by'), sortSel,
      checkbox('favorites first', false, v => { favFirst = v; }), button('Sort', () => edit('Sort ' + ITEM_TABS.find(t => t[0] === st.tab)[1].toLowerCase(), () => sortTab(root, st.tab, sortSel.value, favFirst)), 'small')),
    bulk, h('div', { class: 'split' }, host, detail));
}

function pickInventory(title, cb) {
  const root = S.files.save.root, list = h('div', { class: 'grid compact' }), q = h('input', { type: 'search', placeholder: 'Search', 'aria-label': 'Search items' });
  const m = modal(title, [q, h('div', { class: 'scroll' }, list)], { wide: true });
  const fill = () => {
    const s = q.value.toLowerCase();
    put(list, h('button', { type: 'button', class: 'tile px plain', onclick: () => { m.close(); cb(0); } }, h('span', { class: 'tile-name' }, 'Empty')),
      ...invOf(root).v.filter(n => refOf(n) !== '0' && (!s || (nameOf(val(n, 'id')) + (val(n, 'custom_name') || '')).toLowerCase().includes(s))).slice(0, 300).map(n =>
        h('button', { type: 'button', class: 'tile px plain r' + (val(n, 'quality') || 0), onclick: () => { m.close(); cb(Number(refOf(n))); } }, itemIcon(val(n, 'id'), 'ic big'), h('span', { class: 'tile-name' }, val(n, 'custom_name') || nameOf(val(n, 'id'))))));
  };
  q.addEventListener('input', fill);
  fill();
  q.focus();
}

function addItemDialog() {
  const o = { copies: 1, quality: 0, size: 1, count: 1 };
  let pick = null, cat = 'all', unused = false;
  const list = h('div', { class: 'grid compact' }), form = h('div', { class: 'addform' }), chips = h('div', { class: 'chips' });
  const q = h('input', { type: 'search', placeholder: 'Search every item', 'aria-label': 'Search items' });
  const ids = Object.keys(GAME_ITEMS).filter(id => !GAME_ITEMS[id].hidden).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const drawChips = () => put(chips, ...[['all', 'All'], ['tool', 'Items'], ['fish', 'Creatures'], ['furniture', 'Props']].map(([k, l]) => chip(l, cat === k, () => { cat = k; drawChips(); draw(); })));
  const draw = () => {
    const s = q.value.toLowerCase();
    put(list, ...ids.filter(id => (cat === 'all' || itemTab(id) === cat) && (unused || !GAME_ITEMS[id].unobtainable) && (!s || (nameOf(id) + id).toLowerCase().includes(s))).map(id =>
      h('button', { type: 'button', class: 'tile px plain' + (pick === id ? ' open' : ''), onclick: () => { pick = id; o.size = GAME_ITEMS[id].usesSize ? fishAvg(id) : 1; o.count = 1; draw(); drawForm(); } }, itemIcon(id, 'ic big'), h('span', { class: 'tile-name' }, nameOf(id)), GAME_ITEMS[id].unobtainable ? h('span', { class: 'tile-sub warn' }, 'Unused') : null)));
  };
  const drawForm = () => {
    put(form);
    if (!pick) { addKids(form, h('p', { class: 'muted' }, 'Pick an item above.')); return; }
    const d = GAME_ITEMS[pick];
    const num = (label, key, min, max, step) => field(label, h('input', { type: 'number', value: o[key], min, max, step: step || 1, onchange: (e) => { o[key] = Math.min(max, Math.max(min, parseFloat(e.target.value) || min)); e.target.value = o[key]; } }));
    addKids(form, h('div', { class: 'row wrap end-align' }, h('b', null, nameOf(pick)), num('Copies', 'copies', 1, 500), d.usesSize ? num('Size (cm)', 'size', MIN_FISH_SIZE, ABSOLUTE_MAX_SIZE, 'any') : null, d.stack ? num('Stack', 'count', 1, LIMITS.stack) : null,
      itemTab(pick) === 'fish' ? h('div', { class: 'field wide' }, h('span', { class: 'lbl' }, 'Rarity'), rarityPills(o.quality, (i) => { o.quality = i; drawForm(); }, false)) : null,
      button('Add to inventory', () => {
        const n = Math.round(o.copies), quality = itemTab(pick) === 'fish' ? o.quality : 0;
        m.close();
        S.inv.tab = itemTab(pick);
        let added = 0;
        commit('save', 'Add items', () => { added = addItems(S.files.save.root, Array.from({ length: n }, () => ({ id: pick, size: o.size, quality, count: Math.round(o.count) }))).length; });
        toast(added === n ? 'Added ' + n + ' × ' + nameOf(pick) : 'Added ' + added + '. The inventory is full at 10,000.', added === n ? '' : 'bad');
      }, 'primary')));
  };
  const m = modal('Add item', [q, chips, checkbox('Show unused items (the game never hands these out)', false, v => { unused = v; draw(); }), h('div', { class: 'scroll' }, list), form], { wide: true });
  q.addEventListener('input', draw);
  drawChips(); draw(); drawForm(); q.focus();
}
