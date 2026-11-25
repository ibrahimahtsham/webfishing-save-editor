'use strict';
/* ================= raw ================= */
function RawView() {
  const roots = ['save', 'general'].filter(k => S.files[k]);
  const sel = S.rawFile && S.files[S.rawFile] ? S.rawFile : roots[0]; S.rawFile = sel; const f = S.files[sel];
  const filter = h('input', { type: 'search', class: 'search', placeholder: 'Jump to a top-level key', 'aria-label': 'Filter keys', value: S.rawQ || '', oninput: (e) => { S.rawQ = e.target.value; fill(); } });
  const host = h('div', { class: 'tree' });
  const scalar = (n, path, label) => {
    const set = (fn) => commit(sel, 'Edit ' + label, fn, { render: false, merge: true });
    let inp;
    if (n.t === 'bool') inp = h('input', { type: 'checkbox', checked: n.v, onchange: (e) => set(() => { n.v = e.target.checked; }) });
    else if (n.t === 'str') inp = h('input', { type: 'text', value: n.v, onchange: (e) => set(() => { n.v = e.target.value; }) });
    else if (n.t === 'int') inp = h('input', { type: 'text', inputmode: 'numeric', value: String(n.v), onchange: (e) => { try { const b = BigInt(e.target.value.trim()); set(() => setNum(n, (b >= -MAXS && b <= MAXS) ? Number(b) : b)); } catch (_) { e.target.value = String(n.v); toast('Whole numbers only', 'bad'); } } });
    else if (n.t === 'real') inp = h('input', { type: 'number', step: 'any', value: cleanReal(n), onchange: (e) => { const x = parseFloat(e.target.value); isFinite(x) ? set(() => setNum(n, x)) : (e.target.value = cleanReal(n)); } });
    else if (n.t === 'vec2') inp = h('span', null, describeNode(n));
    else inp = h('span', { class: 'muted' }, 'empty');
    return h('div', { class: 'tnode leaf' }, h('span', { class: 'tkey' }, label), h('span', { class: 'ttype' }, n.t), inp);
  };
  const branch = (n, label, pathKey) => {
    const count = n.t === 'dict' ? n.m.size : n.v.length; const d = h('details', { class: 'tnode', open: S.rawOpen.has(pathKey) });
    const body = h('div', { class: 'tchildren' });
    const fillBody = (limit = 150) => {
      put(body); const entries = n.t === 'dict' ? [...n.m.entries()] : n.v.map((x, i) => [String(i), x]);
      entries.slice(0, limit).forEach(([k, v]) => { const pk = pathKey + '/' + k; addKids(body, v.t === 'dict' || v.t === 'arr' ? branch(v, k, pk) : scalar(v, pk, k)); });
      if (entries.length > limit) addKids(body, button('Show ' + Math.min(300, entries.length - limit) + ' more of ' + entries.length, () => fillBody(limit + 300), 'small'));
    };
    d.append(h('summary', null, h('span', { class: 'tkey' }, label), h('span', { class: 'ttype' }, n.t), h('span', { class: 'muted small' }, count + (count === 1 ? ' entry' : ' entries'))), body);
    if (d.open) fillBody();
    d.addEventListener('toggle', () => { if (d.open) { S.rawOpen.add(pathKey); if (!body.firstChild) fillBody(); } else S.rawOpen.delete(pathKey); });
    return d;
  };
  const fill = () => {
    put(host); const q = (S.rawQ || '').toLowerCase();
    for (const [k, v] of f.root.m) { if (q && !k.toLowerCase().includes(q)) continue; addKids(host, v.t === 'dict' || v.t === 'arr' ? branch(v, k, sel + '/' + k) : scalar(v, sel + '/' + k, k)); }
  };
  fill();
  return h('div', { class: 'page' }, pageHead('Raw data', 'Every value in the file, exactly as stored. Edits here follow the same undo and review as everywhere else.'),
    h('div', { class: 'toolbar' }, roots.length > 1 ? h('div', { class: 'chips' }, roots.map(k => chip(k === 'save' ? 'Save slot' : 'Settings', k === sel, () => { S.rawFile = k; renderMain(); }))) : null, filter),
    host);
}


