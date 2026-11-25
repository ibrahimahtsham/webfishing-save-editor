'use strict';
/* Asks about the fish before unlocking, then unlocks. Used by the Simple and Advanced views. */
function runUnlock(parts, options) {
  const f = S.files.save, look = JSON.stringify(equippedOf(f.root));
  const before = invOf(f.root).v.length;
  commit('save', 'Unlock everything', () => unlockEverything(f.root, parts, options));
  if (JSON.stringify(equippedOf(f.root)) !== look) { undo(); return toast('Stopped: your outfit would have changed.', 'bad'); }
  const full = parts.fish && !hasFullCollection(f.root);
  toast(full ? 'Unlocked, but the inventory is full at 10,000, so some fish were left out.' : 'Unlocked. ' + plural(invOf(f.root).v.length - before, 'item') + ' added.', full ? 'bad' : '');
}
function askAndUnlock(parts) {
  if (!parts.fish) return runUnlock(parts);
  const root = S.files.save.root, owned = hasFullCollection(root);
  let another = false;
  const go = (favoriteFish) => { m.close(); runUnlock(parts, { favoriteFish, addFishSet: !owned || another }); };
  const m = modal('Favorite the fish?', [
    h('p', null, 'Favorites cannot be sold in the shop, not even with Sell all, so you cannot lose them by accident.'),
    h('p', null, owned ? 'This save already has all 936 fish. Your answer applies to those.' : 'This adds all 936 fish: every species in all six rarities, smallest and biggest. Fish you already have are not skipped.'),
    owned ? checkbox('Add another 936 as well', false, v => { another = v; }) : null,
    h('p', { class: 'muted small' }, 'You can unfavorite any of them in the game with right-click. Favoriting more by hand needs you to be at 100 or fewer.'),
    h('div', { class: 'row wrap end' }, button('Cancel', () => m.close(), 'ghost'), button('No, leave them', () => go(false)), button('Yes, favorite them', () => go(true), 'primary'))
  ]);
  m.el.querySelector('.btn.primary').focus();
}
