'use strict';
/* Baits, lures and limits, transcribed from WEBFISHING 1.12. */
const GAME_BAITS = {
  worms: { name: 'Worms', desc: 'Low tier fish only', icon: 'bait_icons2.webp' },
  cricket: { name: 'Crickets', desc: 'All tiers, low chance of Shining', icon: 'bait_icons3.webp' },
  leech: { name: 'Leeches', desc: 'All tiers, low chance of Glistening', icon: 'bait_icons4.webp' },
  minnow: { name: 'Minnows', desc: 'All tiers, low chance of Opulent', icon: 'bait_icons5.webp' },
  squid: { name: 'Squid', desc: 'All tiers, low chance of Radiant', icon: 'bait_icons6.webp' },
  nautilus: { name: 'Nautiluses', desc: 'All tiers, low chance of Alpha', icon: 'bait_icons7.webp' },
  gildedworm: { name: 'Gilded Worm', desc: 'All tiers, best chance of Alpha', icon: 'bait_icons25.webp' }
};
const GAME_LURES = {
  fly_hook: { name: 'Fly Hook', desc: 'More small fish', icon: 'bait_icons10.webp' },
  lucky_hook: { name: 'Lucky Hook', desc: 'A little cash on every catch', icon: 'bait_icons11.webp' },
  patient_lure: { name: 'Patient Lure', desc: 'Waits for you before reeling', icon: 'bait_icons12.webp' },
  quick_jig: { name: 'Quick Jig', desc: 'Faster reeling and more power', icon: 'bait_icons13.webp' },
  salty_lure: { name: 'Salty Lure', desc: 'Always saltwater fish', icon: 'bait_icons19.webp' },
  fresh_lure: { name: 'Fresh Lure', desc: 'Always freshwater fish', icon: 'bait_icons21.webp' },
  efficient_lure: { name: 'Efficient Lure', desc: 'Sometimes keeps your bait', icon: 'bait_icons14.webp' },
  magnet_lure: { name: 'Magnet Lure', desc: 'More treasure, and more trash', icon: 'bait_icons15.webp' },
  large_lure: { name: 'Large Lure', desc: 'More big fish, may use extra bait', icon: 'bait_icons16.webp' },
  attractive_angler: { name: 'Attractive Angler', desc: 'Higher catch chance', icon: 'bait_icons17.webp' },
  sparkling_lure: { name: 'Sparkling Lure', desc: 'Higher tiers, may use extra bait', icon: 'bait_icons18.webp' },
  double_hook: { name: 'Double Hook', desc: 'Sometimes doubles the catch', icon: 'bait_icons20.webp' },
  gold_hook: { name: 'Golden Hook', desc: 'Extremely rare fish, always uses 3 bait', icon: 'bait_icons22.webp' },
  challenge_lure: { name: 'Challenge Lure', desc: 'Pop-ups give cash, missing them hurts', icon: 'bait_icons23.webp' },
  rain_lure: { name: 'Shower Lure', desc: 'Small chance of a rain cloud on a catch', icon: 'bait_icons24.webp' }
};

const LIMITS = {
  rod_power: 8, rod_speed: 5, rod_chance: 5, rod_luck: 5, buddy_level: 5, buddy_speed: 5,
  max_bait: 50, level: 50, money: 999999999, loan_level: 3, stack: 99, nameLength: 28,
  accessories: 4, inventory: 10000, quality: 5
};
const LOAN_AMOUNT = [250, 2500, 10000, 10000];

const RARITY = [
  { n: 'Normal', c: 'r0', worth: 1 }, { n: 'Shining', c: 'r1', worth: 1.8 }, { n: 'Glistening', c: 'r2', worth: 4 },
  { n: 'Opulent', c: 'r3', worth: 6 }, { n: 'Radiant', c: 'r4', worth: 10 }, { n: 'Alpha', c: 'r5', worth: 15 }
];

/* The game shows these titles as plain "Scout" unless the account is on its contributor list. */
const CONTRIBUTOR_TITLES = new Set(['title_stupididiotbaby', 'title_imnormal', 'title_bipedalanimaldrawer', 'title_hazard', 'title_cadaverdog',
  'title_nitrousoxide', 'title_admiral', 'title_igloo', 'title_zed', 'title_specialforces', 'title_candy', 'title_lamedev_real']);
/* In the game files, but no shop, quest, chest or rank gives them to a normal player. */
const HIDDEN_COSMETICS = new Set(['accessory_gloves_black', 'accessory_shoes', 'eye_bagged', 'title_fishpilled', 'pcolor_west']);

/* Every key the game reads without checking when it opens a slot, and the type it expects. */
const REQUIRED_KEYS = {
  inventory: 'arr', hotbar: 'dict', cosmetics_unlocked: 'arr', cosmetics_equipped: 'dict', money: 'num', muted_players: 'arr', hidden_players: 'arr',
  bait_inv: 'dict', bait_selected: 'str', bait_unlocked: 'arr', max_bait: 'num', lure_unlocked: 'arr', lure_selected: 'str', journal: 'dict',
  quests: 'dict', level: 'num', xp: 'num', saved_aqua_fish: 'dict', inbound_mail: 'arr', saved_tags: 'arr', loan_level: 'num', loan_left: 'num',
  rod_power: 'num', rod_speed: 'num', rod_chance: 'num', buddy_level: 'num', buddy_speed: 'num'
};

const JOURNAL_SECTIONS = [
  { key: 'lake', name: 'Freshwater' }, { key: 'ocean', name: 'Saltwater' }, { key: 'rain', name: 'Rain' },
  { key: 'water_trash', name: 'Junk' }, { key: 'alien', name: 'Alien' }, { key: 'void', name: 'Void' }
];
const COS_SLOTS = [
  ['species', 'Species'], ['primary_color', 'Main fur'], ['secondary_color', 'Second fur'], ['pattern', 'Pattern'], ['tail', 'Tail'],
  ['eye', 'Eyes'], ['nose', 'Nose'], ['mouth', 'Mouth'], ['hat', 'Hat'], ['undershirt', 'Undershirt'], ['overshirt', 'Overshirt'],
  ['legs', 'Pants'], ['accessory', 'Accessories'], ['title', 'Title'], ['bobber', 'Bobber']
];
if (typeof module !== 'undefined') module.exports = { GAME_BAITS, GAME_LURES, LIMITS, LOAN_AMOUNT, RARITY, CONTRIBUTOR_TITLES, HIDDEN_COSMETICS, REQUIRED_KEYS, JOURNAL_SECTIONS, COS_SLOTS };
