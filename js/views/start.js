'use strict';
/* First screen: drop a save. */
function Landing() {
  const pick = () => $('#picker').click();
  return h('div', { class: 'landing' },
    h('div', { class: 'brand big' }, h('span', { class: 'bobber', 'aria-hidden': 'true' }), h('span', { class: 'brand-name' }, 'Tackle Box')),
    h('h1', null, 'Unlock or edit your WEBFISHING save'),
    h('p', { class: 'lede' }, 'Start with your own save so your character, outfit and progress stay yours. A backup is made before anything can change.'),
    h('button', { type: 'button', class: 'drop px', id: 'dropzone', onclick: pick },
      h('span', { class: 'drop-title' }, 'Drop your save here'),
      h('span', { class: 'muted' }, 'or click to choose it. You can add several files at once.'),
      h('span', { class: 'drop-types' }, h('code', null, 'webfishing_save_slot_0.sav'), h('code', null, 'webfishing_general_data.sav'))),
    h('div', { class: 'where-block' }, h('p', null, h('b', null, 'Where is it?'), ' Press Windows + R, paste this and press Enter. Save Slot 1 in the game is ', h('code', null, 'slot_0'), '.'), pathRow()),
    h('div', { class: 'row wrap' }, button('Open my backups', () => go('backups'), 'ghost'), h('span', { class: 'muted small' }, 'Your files stay on this computer. Nothing is uploaded.')));
}
