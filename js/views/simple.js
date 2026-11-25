'use strict';
/* Simple view: your character, one button, then save. */
const simpleParts = Object.fromEntries(UNLOCK_PARTS.map(([k]) => [k, true]));

function SimpleView() {
  const f = S.files.save, r = f.root, eq = equippedOf(r), s = summarize('save', r);
  const rows = completion(r), done = isDirty('save');
  const full = rows.every(([, have, total]) => have >= total);
  const run = () => askAndUnlock(simpleParts);
  return h('div', { class: 'simple-page' },
    h('section', { class: 'portrait px' }, Doll(eq),
      h('div', { class: 'portrait-cap' }, h('b', null, titleText(eq) || 'No title'), h('span', { class: 'muted small' }, 'Rank ' + fmtNum(s.level) + ', $' + fmtNum(s.money)),
        h('span', { class: 'muted small' }, plural(s.fish, 'fish', 'fish') + ' caught, ' + plural(s.items, 'item')))),
    h('section', { class: 'simple-main' },
      h('h1', null, full ? 'Everything is unlocked' : 'Unlock everything on this save'),
      h('p', { class: 'muted' }, 'Your outfit stays as it is. This adds what you are missing, fills your stacks and puts each kind of item together. Everything added is favorited so you cannot sell it by accident.'),
      h('div', { class: 'meters' }, rows.map(([l, a, b]) => meter(l, a, b))),
      h('div', { class: 'row wrap' },
        button('Unlock everything', run, (done || full ? '' : 'primary ') + 'huge', { disabled: !Object.values(simpleParts).some(Boolean) }),
        done ? button('Save game', () => saveDialog('save'), 'primary huge') : null,
        done && S.undo.length ? button('Undo', undo, 'ghost') : null),
      h('details', { class: 'options' }, h('summary', null, 'Choose what gets unlocked'),
        h('div', { class: 'optgrid' }, UNLOCK_PARTS.map(([k, label, desc]) => checkbox(h('span', null, h('b', null, label), h('span', { class: 'muted small block' }, desc)), simpleParts[k], v => { simpleParts[k] = v; })))),
      h('p', { class: 'muted small' }, 'After loading, catch one fish: the game then re-checks your journal and opens the collector rod rewards. It may also award Steam achievements for money, rank and journal.'),
      h('p', { class: 'muted small' }, 'Want to pick things one by one? ', h('button', { type: 'button', class: 'link', onclick: () => setMode('advanced') }, 'Switch to Advanced'), '. Curious what is hidden in the game? ', h('button', { type: 'button', class: 'link', onclick: () => go('secrets') }, 'See the secret items'), '.')));
}
