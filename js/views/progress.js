'use strict';
function ProgressView() {
  const fk = 'save', f = S.files.save;
  if (!f) return needFile(fk, 'Progress');
  const addMoney = (n) => commit(fk, 'Add money', () => { const m = get(f.root, 'money'); setNum(m, Number(m.v || 0) + n); });
  const tier = get(f.root, 'loan_level');
  const eq = equippedOf(f.root);
  return h('div', { class: 'page' }, pageHead('Progress', 'Money, rank and totals.', button('Unlock everything', unlockDialog, 'primary')),
    h('div', { class: 'cols' },
      h('section', { class: 'card px portrait' }, Doll(eq), h('div', { class: 'portrait-cap' }, h('b', null, titleText(eq) || 'No title'), button('Change outfit', () => go('cosmetics'), 'small'))),
      card('Completion', h('div', { class: 'meters one' }, completion(f.root).map(([l, a, b]) => meter(l, a, b)))),
      card('Money', numField(fk, 'money', 'Money', { min: 0 }),
        h('div', { class: 'row wrap' }, [1000, 100000, 1000000].map(n => button('+' + fmtNum(n), () => addMoney(n), 'small')))),
      card('Rank', numField(fk, 'level', 'Rank', { min: 1, max: LIMITS.level, hint: 'Rank 50 is the highest.' }), numField(fk, 'xp', 'XP in this rank', { min: 0 })),
      card('Camp', field('Camp tier', h('select', { onchange: e => commit(fk, 'Set camp tier', () => { const t = Number(e.target.value); setNum(tier, t); setNum(get(f.root, 'loan_left'), LOAN_AMOUNT[t]); }) },
        [0, 1, 2, 3].map(i => h('option', { value: i, selected: Number(tier.v) === i }, 'Tier ' + (i + 1)))), 'Higher tiers open more of the shop.'),
      Number(tier.v) < 3 ? numField(fk, 'loan_left', 'Left to pay for the next tier', { min: 0 }) : null),
      card('First visit', checkbox('Skip the tutorial', tutorialDone(f.root), v => commit(fk, v ? 'Skip tutorial' : 'Replay tutorial', () => setTutorialDone(f.root, v))), h('p', { class: 'muted small' }, 'Untick it to be sent to the tutorial island on your next visit.')),
      card('Totals and voice', numField(fk, 'fish_caught', 'Fish caught', { min: 0 }), h('div', { class: 'two' }, numField(fk, 'voice_pitch', 'Voice pitch', { step: 0.1 }), numField(fk, 'voice_speed', 'Voice speed', { step: 0.1 }))),
      f.sample ? null : card('This file', h('dl', { class: 'facts' },
        h('dt', null, 'Name'), h('dd', null, f.name), h('dt', null, 'Size'), h('dd', null, fmtBytes(f.u8.length)),
        h('dt', null, 'Game version'), h('dd', null, fmtNum(val(f.root, 'version') || 0, 2)),
        h('dt', null, 'Rewrites exactly'), h('dd', null, f.lossless ? 'Yes, byte for byte' : 'No, so saving is off'),
        h('dt', null, 'Backup'), h('dd', null, f.vaultError ? 'Not stored: ' + f.vaultError : f.backedUp ? 'In this browser and downloaded' : 'In this browser')))));
}

function unlockDialog() {
  const parts = Object.fromEntries(UNLOCK_PARTS.map(([k]) => [k, true]));
  const m = modal('Unlock everything', [
    h('p', { class: 'muted' }, 'Only adds or raises. Your outfit is not touched.'),
    h('p', { class: 'note small' }, h('b', null, 'Canvas Prop: '), ITEM_WARNINGS.prop_canvas),
    h('div', { class: 'optgrid' }, UNLOCK_PARTS.map(([k, label, desc]) => checkbox(h('span', null, h('b', null, label), h('span', { class: 'muted small block' }, desc)), true, v => { parts[k] = v; }))),
    h('div', { class: 'row end' }, button('Cancel', () => m.close(), 'ghost'), button('Unlock', () => { m.close(); askAndUnlock(parts); }, 'primary'))
  ], { wide: true });
}
