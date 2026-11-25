'use strict';
/* ================= settings ================= */
const SETTING_GROUPS = [
  ['Display', ['res', 'fullscreen', 'vsync', 'fps_limit', 'water', 'view_distance', 'pixel', 'resizeable']],
  ['Audio', ['main_vol', 'sfx_vol', 'music_vol', 'instrument_vol']],
  ['Controls', ['mouse_sens', 'mouse_invert', 'sprint_toggle', 'punchable', 'disable_chalk', 'autoclick']],
  ['Interface', ['catch_bell', 'chat_filter', 'mail_close', 'altfont']]
];
const SETTING_NAMES = { res: 'Window size', fullscreen: 'Fullscreen mode', vsync: 'Vertical sync', fps_limit: 'Frame rate limit', water: 'Water quality', view_distance: 'View distance', pixel: 'Pixelation', resizeable: 'Resizable window', main_vol: 'Master volume', sfx_vol: 'Effects volume', music_vol: 'Music volume', instrument_vol: 'Instrument volume', mouse_sens: 'Mouse sensitivity', mouse_invert: 'Invert mouse', sprint_toggle: 'Toggle sprint', punchable: 'Players can punch you', disable_chalk: 'Hide chalk drawings', autoclick: 'Auto-click while reeling', catch_bell: 'Catch bell', chat_filter: 'Chat filter', mail_close: 'Close mail after reading', altfont: 'Alternate font' };
function SettingsView() {
  const fk = 'general'; const f = S.files.general; if (!f) return needFile(fk, 'Game settings');
  const po = get(f.root, 'player_options'); const done = new Set();
  const ctl = (key) => {
    const n = po.m.get(key); if (!n) return null; done.add(key); const label = SETTING_NAMES[key] || prettyId(key).toLowerCase().replace(/^./, c => c.toUpperCase()); const path = ['player_options', key];
    if (n.t === 'int' && (n.v === 0 || n.v === 1) && !/fps|water|distance|pixel|fullscreen/.test(key)) {
      return h('label', { class: 'check big' }, h('input', { type: 'checkbox', checked: n.v === 1, onchange: (e) => commit(fk, 'Edit ' + label, () => setNum(n, e.target.checked ? 1 : 0), { render: false }) }), label);
    }
    if (n.t === 'real' && /vol|sens/.test(key)) return field(label, numInput(fk, n, { label, min: 0, max: key === 'mouse_sens' ? 1 : 1, step: 0.01, slider: true, path }));
    if (n.t === 'vec2') {
      const mk = (i) => h('input', { type: 'number', value: n.v[i], min: 0, 'aria-label': label + (i ? ' height' : ' width'), onchange: (e) => { commit(fk, 'Edit ' + label, () => { n.v[i] = parseFloat(e.target.value) || 0; }, { render: false, merge: true }); } });
      return field(label, h('div', { class: 'two' }, mk(0), mk(1)));
    }
    if (n.t === 'int' || n.t === 'real') return field(label, numInput(fk, n, { label, path }));
    if (n.t === 'str') return field(label, h('input', { type: 'text', value: n.v, onchange: (e) => commit(fk, 'Edit ' + label, () => { n.v = e.target.value; }, { render: false, merge: true }) }));
    return h('div', { class: 'muted small' }, label + ': ' + describeNode(n) + ' (edit in Raw data)');
  };
  const groups = SETTING_GROUPS.map(([title, keys]) => { const c = keys.map(ctl).filter(Boolean); return c.length ? card(title, c) : null; });
  const rest = [...po.m.keys()].filter(k => !done.has(k)).map(ctl).filter(Boolean);
  return h('div', { class: 'page' }, pageHead('Game settings', 'From webfishing_general_data.sav: video, audio and controls.'), h('div', { class: 'cols' }, groups, rest.length ? card('Other', rest) : null),
    h('p', { class: 'muted small' }, 'Some numbers are menu positions the game defines (for example fullscreen mode). Change them one step at a time.'));
}

