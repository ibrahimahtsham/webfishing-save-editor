'use strict';
/* Journal: one page per creature. */
function sectionIds(key) {
  const node = get(S.files.save.root, 'journal', key);
  const ids = new Set([...JOURNAL_IDS[key], ...(node ? node.m.keys() : [])]);
  return [...ids].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
}
function JournalView() {
  const fk = 'save', f = S.files.save;
  if (!f) return needFile(fk, 'Journal');
  const st = S.jr, root = f.root, sec = JOURNAL_SECTIONS.find(s => s.key === st.sec) || JOURNAL_SECTIONS[0];
  const host = h('div'), detail = h('aside', { class: 'detail px' }), counter = h('span', { class: 'muted small' });
  const entry = (id) => journalEntry(root, sec.key, id);
  const edit = (label, fn) => { commit(fk, label, fn, { render: false }); drawGrid(); drawDetail(); };
  const drawGrid = () => {
    const q = st.q.trim().toLowerCase(), ids = sectionIds(sec.key);
    const shown = ids.filter(id => (st.show === 'all' || (st.show === 'caught') === isCaught(entry(id))) && (!q || (nameOf(id) + id).toLowerCase().includes(q)));
    counter.textContent = ids.filter(id => isCaught(entry(id))).length + ' of ' + ids.length + ' caught';
    put(host, shown.length ? h('div', { class: 'grid' }, shown.map(id => {
      const e = entry(id), caught = isCaught(e), quals = e ? val(e, 'quality').map(x => x.v) : [];
      return h('div', { class: 'tile px' + (caught ? '' : ' missing') + (st.open === id ? ' open' : '') },
        h('button', { type: 'button', class: 'tile-main', onclick: () => { st.open = id; drawGrid(); drawDetail(); } }, itemIcon(id, 'ic big'), h('span', { class: 'tile-name' }, nameOf(id)),
          h('span', { class: 'tile-sub muted' }, caught ? '×' + fmtNum(val(e, 'count')) + ', best ' + sizeText(numOf(get(e, 'record'))) : 'Not caught'),
          h('span', { class: 'stamps', role: 'img', 'aria-label': quals.length + ' of 6 rarities' }, RARITY.map((r, i) => h('i', { class: r.c + (quals.includes(i) ? ' on' : '') })))));
    })) : h('p', { class: 'empty' }, 'Nothing matches.'));
  };
  const drawDetail = () => {
    const id = st.open;
    if (!id || !sectionIds(sec.key).includes(id)) { put(detail, h('div', { class: 'empty' }, 'Select a creature to edit its page.')); return; }
    const e = entry(id);
    const head = h('div', { class: 'dhead' }, itemIcon(id, 'ic huge'), h('div', null, h('h2', null, nameOf(id)), h('code', { class: 'muted' }, id)));
    if (!isCaught(e)) { put(detail, head, h('p', { class: 'muted' }, 'Not caught yet.'), button('Mark as caught', () => edit('Mark ' + nameOf(id) + ' caught', () => recordCatch(root, id, { size: fishAvg(id), qualities: [0] })), 'primary')); return; }
    const quals = val(e, 'quality').map(x => x.v);
    put(detail, head,
      h('div', { class: 'two' }, field('Times caught', numInput(fk, get(e, 'count'), { label: 'Times caught', min: 0, onChange: () => { drawGrid(); drawDetail(); } })), field('Record size (cm)', numInput(fk, get(e, 'record'), { label: 'Record size', min: 0, step: 'any', onChange: drawGrid }))),
      h('div', { class: 'row wrap' }, button('Record: smallest', () => edit('Set record', () => setReal(get(e, 'record'), MIN_FISH_SIZE)), 'small'), button('Record: biggest possible', () => edit('Set record', () => setReal(get(e, 'record'), biggestNatural(id))), 'small')),
      h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Rarities caught'), rarityPills(quals, (i) => edit('Edit journal rarities', () => { const a = get(e, 'quality'); a.v = quals.includes(i) ? a.v.filter(x => x.v !== i) : [...a.v, N.int(i)]; }), true)),
      h('div', { class: 'row end' }, button('Mark as not caught', () => edit('Clear journal page', () => { setNum(get(e, 'count'), 0); setNum(get(e, 'record'), 0); get(e, 'quality').v = []; }), 'small danger')));
  };
  const complete = (keys, label) => commit(fk, label, () => { for (const k of keys) for (const id of JOURNAL_IDS[k]) recordCatch(root, id, { size: fishAvg(id), qualities: [0, 1, 2, 3, 4, 5] }); });
  const tabs = h('div', { class: 'tabs' }, JOURNAL_SECTIONS.map(s => {
    const ids = sectionIds(s.key);
    return h('button', { type: 'button', class: 'tab' + (s.key === sec.key ? ' on' : ''), 'aria-pressed': s.key === sec.key ? 'true' : 'false', onclick: () => { st.sec = s.key; st.open = null; renderMain(); } }, s.name, h('span', { class: 'muted small' }, ids.filter(id => isCaught(journalEntry(root, s.key, id))).length + '/' + ids.length));
  }));
  const search = h('input', { type: 'search', class: 'search', placeholder: 'Search creatures ( / )', value: st.q, 'aria-label': 'Search creatures', oninput: (e) => { st.q = e.target.value; drawGrid(); } });
  drawGrid(); drawDetail();
  return h('div', { class: 'page wide' }, pageHead('Journal', 'After completing it here, catch one fish in the game so it re-checks the journal and opens the rod rewards.',
    button('Complete ' + sec.name.toLowerCase(), () => complete([sec.key], 'Complete ' + sec.name + ' journal')), button('Complete all', () => complete(JOURNAL_SECTIONS.map(s => s.key), 'Complete journal'), 'primary')), tabs,
  h('div', { class: 'toolbar' }, search, h('div', { class: 'chips' }, [['all', 'All'], ['caught', 'Caught'], ['missing', 'Missing']].map(([k, l]) => chip(l, st.show === k, () => { st.show = k; renderMain(); }))), counter),
  h('div', { class: 'split' }, host, detail));
}
