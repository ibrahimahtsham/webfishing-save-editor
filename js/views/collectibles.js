'use strict';
/* Fragments, bones and other finds: see how many you have and add more. */
function CollectiblesView() {
  const f = S.files.save, root = f.root;
  const edit = (label, fn, msg) => { commit('save', label, fn); toast(msg); };
  const row = (id, note, { quality = 0, label } = {}) => {
    const amount = h('input', { type: 'number', value: 1, min: 1, max: 99, 'aria-label': 'How many ' + (label || nameOf(id)) });
    return h('div', { class: 'row-item' }, itemIcon(id, 'ic big'),
      h('div', { class: 'grow' }, h('b', null, label || nameOf(id)), h('div', { class: 'muted small' }, note)),
      h('span', { class: 'muted' }, 'You have ' + fmtNum(countItems(root, id, id === COIN_BAG ? quality : null))),
      h('div', { class: 'numwrap' }, amount),
      button('Add', () => {
        const n = Math.min(99, Math.max(1, Math.round(parseFloat(amount.value)) || 1));
        edit('Add ' + nameOf(id), () => addItems(root, Array.from({ length: n }, () => collectible(id, quality))), 'Added ' + n + ' × ' + (label || nameOf(id)) + '.');
      }, 'small'));
  };
  const sets = (label, make) => {
    const n = h('input', { type: 'number', value: 1, min: 1, max: 20, 'aria-label': 'How many sets' });
    return h('div', { class: 'row wrap' }, h('div', { class: 'numwrap setcount' }, n), button(label, () => {
      const k = Math.min(20, Math.max(1, Math.round(parseFloat(n.value)) || 1));
      edit(label, () => make(k), 'Added ' + plural(k, 'set') + '.');
    }, 'primary'));
  };
  const open = bonesOpen(root), hasRod = countItems(root, 'fishing_rod_skeleton') > 0;
  return h('div', { class: 'page' }, pageHead('Fragments and bones', 'Things you trade in, or mail to a friend. They go in Creatures.'),
    h('p', { class: 'note' }, 'Leave these un-hearted: the game does not let you trade or mail favorites. That also means Sell all will sell them, so do not press it while you are holding them.'),
    card('Metal detector fragments', h('p', { class: 'muted' }, 'Three of a kind plus $25 at the dock shop buys the item. One set is three of each, enough for all four.'),
      sets('Add full sets', k => addItems(root, fragmentSet(k))),
      FRAGMENTS.map(x => row(x.id, 'Three buy the ' + nameOf(x.gives) + (val(root, 'cosmetics_unlocked').some(n => n.v === x.gives) ? ', which you already own' : '')))),
    card('Spectral bones', h('p', { class: 'muted' }, 'One of each plus $500 buys the Spectral Rod from the hidden bone shop.' + (hasRod ? ' You already have the rod and the shop will not sell a second one, so these are for giving away.' : '')),
      sets('Add full sets', k => addItems(root, boneSet(k))),
      checkbox('Open the hidden bone shop for me', open, v => commit('save', v ? 'Open bone shop' : 'Close bone shop', () => toggleInList(get(root, 'saved_tags'), BONE_FLAG, v))),
      BONES.map(id => row(id, 'One of five'))),
    card('Other finds', METAL_FINDS.map(id => row(id, 'Metal detector find, sells for $' + fmtNum(itemWorth(id, fishAvg(id), 0)))),
      COIN_BAG_LEVELS.map(q => row(COIN_BAG, 'Found with rod luck ' + q + ', sells for $' + fmtNum(itemWorth(COIN_BAG, fishAvg(COIN_BAG), q)), { quality: q, label: RARITY[q].n + ' Coin Bag' })),
      row(CHEST, 'Gives a cosmetic you do not own, or $100 once you own them all. Goes in Items.')));
}
