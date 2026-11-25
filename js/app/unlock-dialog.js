'use strict';
/* Asks what it needs to before unlocking, then unlocks. Used by the Simple and Advanced views. */
function runUnlock(parts, options = {}) {
  const f = S.files.save, look = JSON.stringify(equippedOf(f.root));
  commit('save', options.clear ? 'Clear inventory and unlock everything' : 'Unlock everything', () => unlockEverything(f.root, parts, options));
  if (JSON.stringify(equippedOf(f.root)) !== look) { undo(); return toast('Stopped: your outfit would have changed.', 'bad'); }
  const full = parts.fish && !hasFullCollection(f.root);
  toast(full ? 'Unlocked, but the inventory is full at 10,000, so some fish were left out.' : 'Unlocked. You now have ' + plural(invOf(f.root).v.length, 'item') + '.', full ? 'bad' : '');
}
function askAndUnlock(parts) {
  const root = S.files.save.root, owned = hasFullCollection(root);
  const mine = invOf(root).v.filter(n => String(val(n, 'ref')) !== '0' && val(n, 'id') !== 'fishing_rod_simple');
  if (!parts.fish && !mine.length) return runUnlock(parts);
  const o = { favoriteFish: parts.fish, another: false, clear: false };
  const favs = favoriteSet(root), hearted = mine.filter(n => favs.has(String(val(n, 'ref')))).length, named = mine.filter(n => val(n, 'custom_name')).length;
  const extra = [hearted ? plural(hearted, 'favorite') : null, named ? plural(named, 'renamed item') : null].filter(Boolean).join(' and ');
  const note = (text) => h('span', { class: 'muted small block' }, text);
  const body = h('div', { class: 'asklist' });
  const draw = () => put(body,
    mine.length ? checkbox(h('span', null, h('b', null, 'Clear my inventory first'), note('Start with an empty bag, then add everything. Your outfit, money, journal and the rest stay.')), o.clear, v => { o.clear = v; draw(); }) : null,
    o.clear ? h('p', { class: 'issue stop' }, 'This removes all ' + plural(mine.length, 'item') + (extra ? ', including ' + extra : '') + '. That means keepsakes and fish you caught too. You can undo it, and your original stays in Backups.') : null,
    parts.fish ? checkbox(h('span', null, h('b', null, 'Favorite the 936 fish'), note('Favorites cannot be sold, not even with Sell all. They also cannot be mailed until you unfavorite them in the game with right-click.')), o.favoriteFish, v => { o.favoriteFish = v; }) : null,
    parts.fish && owned && !o.clear ? checkbox(h('span', null, h('b', null, 'Add another 936 fish'), note('This save already has them all.')), o.another, v => { o.another = v; }) : null,
    parts.fragments || parts.bones ? h('p', { class: 'muted small' }, 'Fragments and bones are never favorited, so you can trade or mail them. Sell all would sell them.') : null,
    h('div', { class: 'row wrap end' }, button('Cancel', () => m.close(), 'ghost'),
      button(o.clear ? 'Clear and unlock' : 'Unlock everything', () => {
        m.close();
        runUnlock(parts, { favoriteFish: o.favoriteFish, clear: o.clear, addFishSet: o.clear || !owned || o.another });
      }, o.clear ? 'primary danger' : 'primary')));
  const m = modal('Before you unlock', body);
  draw();
  m.el.querySelector('.btn.primary').focus();
}
