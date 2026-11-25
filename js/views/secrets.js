'use strict';
/* Secret items: what is hidden in the game, whether you have it, and where to see it. */
function ownsThing(root, id) {
  return isItem(id)
    ? invOf(root).v.some(n => val(n, 'id') === id) || isCaught(journalEntry(root, GAME_ITEMS[id].table, id))
    : val(root, 'cosmetics_unlocked').some(n => n.v === id);
}
function SecretsView() {
  const f = S.files.save, root = f && !f.sample ? f.root : null;
  const row = (id, text, look, add) => {
    const has = root && ownsThing(root, id), c = isCosmetic(id) ? GAME_COSMETICS[id] : null;
    return h('article', { class: 'secret px' + (has ? ' have' : '') },
      c && c.category === 'title' ? h('span', { class: 'well huge titlewell' }, c.title) : itemIcon(id, 'ic huge'),
      h('div', { class: 'grow' },
        h('div', { class: 'row wrap' }, h('h3', null, nameOf(id)), root ? h('span', { class: 'tag' + (has ? ' good' : '') }, has ? 'You have it' : 'Not yet') : null),
        h('p', null, text),
        look ? h('p', { class: 'muted small' }, 'See it in the game: ' + look) : null),
      add && root && !has ? button('Add to my save', () => { commit('save', 'Add ' + nameOf(id), () => add(id)); toast('Added ' + nameOf(id) + '. Save to see it in the game.'); }, 'small') : null);
  };
  const own = (id) => toggleInList(get(root, 'cosmetics_unlocked'), id, true);
  const item = (id) => addItems(root, [{ id, size: GAME_ITEMS[id].usesSize ? fishAvg(id) : 1 }]);
  const missing = (list) => (root ? list.filter(s => !ownsThing(root, s.id)) : []);
  const section = (title, sub, list, add, warn) => h('section', { class: 'secretblock' },
    h('div', { class: 'row wrap' }, h('h2', null, title), h('span', { class: 'spacer' }),
      add && missing(list).length > 1 ? button('Add all ' + missing(list).length, () => commit('save', 'Add ' + title.toLowerCase(), () => missing(list).forEach(s => add(s.id))), 'small') : null),
    h('p', { class: 'muted' }, sub), warn ? h('p', { class: 'note' }, warn) : null,
    h('div', { class: 'secrets' }, list.map(s => row(s.id, s.note || s.how, s.look, add))));
  return h('div', { class: 'page' },
    pageHead('Secret items', 'What is hidden in WEBFISHING and what it is. This page has spoilers.', inSimple() ? button('Back', () => go('progress')) : null),
    section('Hidden cosmetics', 'Finished and wearable, but the game never gives them to you.', SECRET_COSMETICS, own),
    section('Unused items', 'Left over from features that were cut. The game never hands these out.', SECRET_ITEMS, item,
      'Do not mail these. The game turns an unused item into a salmon when it is mailed.'),
    section('Secrets you can find yourself', 'Everyone can get these by playing.', FINDABLE_SECRETS, null),
    h('section', { class: 'secretblock' }, h('h2', null, 'Contributor titles'),
      h('p', { class: 'muted' }, 'Made for people who helped with the game. Anyone else who wears one is shown as “Scout”, so adding them does nothing.'),
      h('div', { class: 'chips' }, [...CONTRIBUTOR_TITLES].map(id => h('span', { class: 'chip static' }, GAME_COSMETICS[id].title || nameOf(id))))));
}
