'use strict';
/* rewards can carry a "$" (item) or "*" (both fur colours) mark */
function rewardName(id) { return nameOf(String(id).replace(/^[$*]/, '')); }
function QuestsView() {
  const fk = 'save', f = S.files.save;
  if (!f) return needFile(fk, 'Quests');
  const quests = get(f.root, 'quests'), done = get(f.root, 'completed_quests');
  const ready = (q) => Number(val(q, 'progress')) >= Number(val(q, 'goal_amt'));
  const cards = [...quests.m.entries()].map(([key, q]) => {
    const prog = get(q, 'progress'), goal = get(q, 'goal_amt'), title = val(q, 'title') || 'Quest ' + key, tier = Number(val(q, 'tier') || 0);
    const bar = h('div', { class: 'bar' }, h('i'));
    const setBar = () => { bar.firstChild.style.width = (goal.v ? Math.min(100, (Number(prog.v) / Number(goal.v)) * 100) : 0) + '%'; };
    setBar();
    const rewards = (val(q, 'rewards') || []).slice(tier);
    return h('section', { class: 'card px quest' }, h('div', { class: 'qhead' }, h('h3', null, title), h('span', { class: 'chip static' }, 'Tier ' + tier)), bar,
      h('div', { class: 'two' }, field('Progress', numInput(fk, prog, { label: title + ' progress', min: 0, path: ['quests', key, 'progress'], onChange: setBar })), field('Goal', numInput(fk, goal, { label: title + ' goal', min: 1, path: ['quests', key, 'goal_amt'], onChange: setBar }))),
      h('p', { class: 'muted small' }, 'Pays $' + fmtNum(val(q, 'gold_reward') || 0) + ' and ' + fmtNum(val(q, 'xp_reward') || 0) + ' XP' + (rewards.length ? '. Next: ' + rewardName(rewards[0].v) : '')),
      h('div', { class: 'row wrap' }, ready(q) ? h('span', { class: 'tag good' }, 'Ready to claim') : button('Fill to goal', () => commit(fk, 'Complete quest', () => setNum(prog, goal.v)), 'small'),
        (!isRepeating(q) || tier < QUEST_TOP_TIER) ? button(isRepeating(q) ? 'Max out' : 'Finish', () => commit(fk, 'Max out quest', () => maxQuest(f.root, key)), 'small') : null));
  });
  return h('div', { class: 'page' }, pageHead('Quests', 'One-time quests leave the board once finished. Repeating quests double each tier and stop at tier 9, which you can keep claiming.',
    button('Max out all', () => commit(fk, 'Max out all quests', () => maxQuests(f.root)), 'primary'),
    button('Fill all', () => commit(fk, 'Fill all quests', () => { for (const q of quests.m.values()) if (!ready(q)) setNum(get(q, 'progress'), val(q, 'goal_amt')); }))),
  cards.length ? h('div', { class: 'cols' }, cards) : card(null, h('p', null, 'No open quests.')),
  card('Finished quests', h('p', { class: 'muted' }, done ? fmtNum(done.v.length) + ' finished so far.' : 'No history in this save.'),
    done && done.v.length ? h('details', null, h('summary', null, 'Show list'), h('ul', { class: 'plain' }, done.v.map(x => h('li', null, x.v)))) : null));
}
