'use strict';
/* First screen: drop a save. */
function Landing() {
  const pick = () => $('#picker').click();
  return h('div', { class: 'landing' },
    h('h1', null, 'Unlock or edit your WEBFISHING save'),
    h('p', { class: 'lede' }, 'Start with your own save so your character, outfit and progress stay yours. A backup is made before anything can change.'),
    h('button', { type: 'button', class: 'drop px', id: 'dropzone', onclick: pick },
      h('span', { class: 'drop-title' }, 'Drop your save here'),
      h('span', { class: 'muted' }, 'or click to choose it. You can add several files at once.'),
      h('span', { class: 'drop-types' }, h('code', null, 'webfishing_save_slot_0.sav'), h('code', null, 'webfishing_general_data.sav'))),
    h('div', { class: 'where-block' }, h('p', null, h('b', null, 'Where is it?'), ' Press Windows + R, paste this and press Enter. Save Slot 1 in the game is ', h('code', null, 'slot_0'), '.'), pathRow()),
    h('div', { class: 'lookaround' }, h('h2', null, 'No save handy?'),
      h('p', { class: 'muted' }, 'Every page is open with a sample new game, so you can see what is in here first.'),
      h('div', { class: 'row wrap' }, button('See the secret items', () => go('secrets')), button('Try the fish maker', () => go('fish')), button('Dress up a character', () => go('cosmetics')), button('My backups', () => go('backups'), 'ghost'))),
    h('p', { class: 'muted small' }, 'Your files stay on this computer. Nothing is uploaded.'));
}
