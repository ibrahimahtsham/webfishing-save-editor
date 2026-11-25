'use strict';
/* Page frame: top bar, navigation, and which view is on screen. */

const NAV = [
  ['progress', 'Progress', 'save'], ['inventory', 'Inventory', 'save'], ['fish', 'Fish maker', 'save'], ['journal', 'Journal', 'save'],
  ['cosmetics', 'Cosmetics', 'save'], ['secrets', 'Secret items', null], ['quests', 'Quests', 'save'], ['gear', 'Gear and bait', 'save'], ['settings', 'Game settings', 'general']
];
const NAV_KEYS = {
  progress: ['money', 'level', 'xp', 'fish_caught', 'cash_total', 'loan_level', 'loan_left', 'voice_pitch', 'voice_speed'],
  inventory: ['inventory', 'hotbar', 'locked_refs', 'saved_aqua_fish'], fish: [], journal: ['journal'],
  cosmetics: ['cosmetics_unlocked', 'cosmetics_equipped', 'new_cosmetics'], quests: ['quests', 'completed_quests'],
  gear: ['rod_power', 'rod_speed', 'rod_chance', 'rod_luck', 'buddy_level', 'buddy_speed', 'max_bait', 'bait_inv', 'bait_selected', 'bait_unlocked', 'lure_unlocked', 'lure_selected']
};
const VIEWS = () => ({
  progress: ProgressView, inventory: InventoryView, fish: FishView, journal: JournalView, cosmetics: CosmeticsView, secrets: SecretsView, quests: QuestsView,
  gear: GearView, settings: SettingsView, changes: ChangesView, backups: BackupsView, fresh: FreshView, raw: RawView
});

function render() {
  const app = $('#app');
  put(app);
  if (!anyFile()) {
    addKids(app, S.view === 'backups' ? h('div', { class: 'landing' }, button('Back', () => go('progress'), 'ghost'), BackupsView()) : Landing());
    document.title = 'Tackle Box, a WEBFISHING save editor';
    return;
  }
  const simple = S.mode === 'simple' && S.files.save;
  addKids(app, Topbar(), h('div', { class: 'body' + (simple ? ' simple' : '') }, simple ? null : Sidebar(), h('main', { id: 'main', tabindex: '-1' })));
  renderMain();
  renderChrome();
}
function renderChrome() {
  const t = $('.top');
  if (!t) return;
  const active = document.activeElement, focus = active && active.dataset && active.dataset.nav;
  t.replaceWith(Topbar());
  const side = $('.side');
  if (side) side.replaceWith(Sidebar());
  if (focus) { const el = document.querySelector('[data-nav="' + focus + '"]'); if (el) el.focus(); }
  document.title = (unsaved('save') || unsaved('general') ? '• ' : '') + 'Tackle Box, a WEBFISHING save editor';
}
function renderMain() {
  const m = $('#main');
  if (!m) return;
  const y = m.scrollTop, wy = window.scrollY;
  const simple = S.mode === 'simple' && S.files.save && !['backups', 'changes', 'secrets'].includes(S.view);
  let el;
  try { el = simple ? SimpleView() : (VIEWS()[S.view] || ProgressView)(); } catch (e) {
    console.error(e);
    el = h('div', { class: 'page' }, card('This page could not be drawn', h('p', null, e.message), h('p', { class: 'muted' }, 'Your data is untouched. Undo the last edit, or use Raw data.')));
  }
  put(m, el);
  m.scrollTop = y;
  window.scrollTo(0, wy);
}
function go(view) {
  S.view = view;
  if (!anyFile()) return render();
  renderMain();
  renderChrome();
  window.scrollTo(0, 0);
}
function setMode(mode) {
  S.mode = mode;
  prefs.set('mode', mode);
  if (mode === 'simple' && !S.files.save) toast('Simple view needs a save slot.', 'bad');
  if (mode === 'simple') S.view = 'progress';
  render();
}

function Topbar() {
  const n = changeCount();
  const dirty = ['save', 'general'].filter(fk => S.files[fk] && isDirty(fk));
  return h('header', { class: 'top' },
    h('div', { class: 'brand' }, h('span', { class: 'bobber', 'aria-hidden': 'true' }), h('span', { class: 'brand-name' }, 'Tackle Box')),
    h('div', { class: 'seg', role: 'group', 'aria-label': 'View' }, [['simple', 'Simple'], ['advanced', 'Advanced']].map(([k, l]) =>
      h('button', { type: 'button', class: S.mode === k ? 'on' : '', 'aria-pressed': S.mode === k ? 'true' : 'false', onclick: () => setMode(k) }, l))),
    h('div', { class: 'filechips' }, ['save', 'general'].map(fk => S.files[fk] && fileChip(fk))),
    h('div', { class: 'spacer' }),
    button('Undo', undo, 'ghost', { disabled: !S.undo.length, title: S.undo.length ? 'Undo: ' + S.undo[S.undo.length - 1].label : 'Nothing to undo' }),
    button('Redo', redo, 'ghost', { disabled: !S.redo.length }),
    n ? button('Review ' + plural(n, 'change'), () => go('changes'), 'ghost', { 'data-nav': 'changes-top' }) : null,
    button('Backups', () => go('backups'), 'ghost', { 'data-nav': 'backups-top' }),
    ['save', 'general'].filter(fk => S.files[fk]).map(fk => button(fk === 'save' ? 'Save game' : 'Save settings', () => saveDialog(fk), dirty.includes(fk) ? 'primary' : '', { disabled: !dirty.includes(fk), title: dirty.includes(fk) ? '' : 'No edits to save yet' })));
}
function fileChip(fk) {
  const f = S.files[fk], ok = f.lossless && !f.vaultError;
  return h('span', { class: 'filechip', title: f.name + (ok ? '\nBacked up in this browser' : '') },
    h('span', { class: ok ? 'dot ok' : 'dot warn' }), h('span', { class: 'fname' }, fk === 'general' ? 'Settings' : slotLabel(f.slot)),
    h('span', { class: 'muted' }, ok ? 'backed up' : !f.lossless ? 'read only' : 'not backed up'),
    h('button', { type: 'button', class: 'x', 'aria-label': 'Close ' + f.name, onclick: () => closeFile(fk) }, '✕'));
}
function Sidebar() {
  const changed = new Set(allChanges().map(d => d.file + ':' + d.path[0]));
  const dot = (nav, fk) => (nav === 'settings' ? isDirty('general') : (NAV_KEYS[nav] || []).some(k => changed.has('save:' + k))) ? h('span', { class: 'chg', title: 'Has edits' }) : null;
  const item = (id, label, extra) => h('button', { type: 'button', class: 'nav' + (S.view === id ? ' on' : ''), 'data-nav': id, 'aria-current': S.view === id ? 'page' : null, onclick: () => go(id) }, label, extra);
  const n = changeCount();
  return h('nav', { class: 'side', 'aria-label': 'Sections' },
    NAV.map(([id, label, fk]) => item(id, label, dot(id, fk) || (fk && !S.files[fk] ? h('span', { class: 'muted small' }, 'add file') : null))),
    h('div', { class: 'side-sep' }),
    item('changes', 'Review changes', n ? h('span', { class: 'count' }, n) : null),
    item('backups', 'Backups'), item('fresh', 'Start fresh'), item('raw', 'Raw data'),
    h('div', { class: 'side-foot' }, button('Open another file', () => $('#picker').click(), 'ghost small'),
      h('p', { class: 'muted small' }, 'Your files stay on this computer.')));
}
