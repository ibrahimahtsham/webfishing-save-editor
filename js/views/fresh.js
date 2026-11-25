'use strict';
/* Start fresh: turn the open save into a new game, keeping chosen parts. */
function FreshView() {
  const f = S.files.save;
  if (!f) return needFile('save', 'Start fresh');
  let look = 'worn', skipTutorial = true;
  const keep = new Set(['players', 'guitar']);
  return h('div', { class: 'page' }, pageHead('Start fresh', 'Turn this save into a brand-new game, and keep the parts you choose. You can undo it, and nothing changes on disk until you save.'),
    h('div', { class: 'cols' },
      card('Your character', [['worn', 'Keep the outfit', 'You keep what you are wearing and start without the rest.'], ['all', 'Keep every cosmetic', 'Outfit and everything you own.'], ['none', 'Start as a new character', 'The default white cat.']].map(([k, l, d]) =>
        h('label', { class: 'check big' }, h('input', { type: 'radio', name: 'look', checked: look === k, onchange: () => { look = k; } }), h('span', null, h('b', null, l), h('span', { class: 'muted small block' }, d))))),
      card('Also keep', KEEP_GROUPS.map(([id, label]) => checkbox(label, keep.has(id), v => { v ? keep.add(id) : keep.delete(id); }))),
      card('First visit', checkbox('Skip the tutorial', true, v => { skipTutorial = v; }))),
    h('div', { class: 'row' }, button('Start fresh', () => confirmBox('Start fresh?', 'Everything you did not tick goes back to a new game: rank 1, $25, a simple rod and 5 worms. Your original stays in Backups.', 'Start fresh', () => {
      S.inv.sel.clear(); S.inv.open = null;
      commit('save', 'Start fresh', () => { f.root = startFresh(f.root, { look, keep, skipTutorial }); });
      toast('This is now a new game. Review it, then save.');
      go('progress');
    }, true), 'primary danger')));
}
