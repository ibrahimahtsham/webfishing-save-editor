'use strict';
/* The order "Organize" puts items in, so each kind sits together. Fish are ordered by rule instead, see actions.js. */
const ITEM_ORDER = [
  /* rods */ 'fishing_rod_simple', 'fishing_rod_travelers', 'fishing_rod_collectors', 'fishing_rod_collectors_shining', 'fishing_rod_collectors_glistening',
  'fishing_rod_collectors_opulent', 'fishing_rod_collectors_radiant', 'fishing_rod_collectors_alpha', 'fishing_rod_skeleton', 'fishing_rod_prosperous',
  /* fishing gear */ 'portable_bait', 'fish_trap', 'fish_trap_ocean', 'metal_detector',
  /* finds */ 'treasure_chest', 'scratch_off', 'scratch_off_2', 'scratch_off_3',
  /* drinks */ 'potion_catch', 'potion_catch_big', 'potion_catch_deluxe', 'potion_speed', 'potion_speed_burst', 'potion_bounce', 'potion_bouncebig',
  'potion_small', 'potion_grow', 'potion_revert', 'potion_beer', 'potion_wine',
  /* instruments */ 'guitar', 'guitar_gradient', 'guitar_stickers', 'guitar_black', 'guitar_pink', 'guitar_gold', 'tambourine',
  /* chalk */ 'chalk_eraser', 'chalk_white', 'chalk_black', 'chalk_red', 'chalk_yellow', 'chalk_green', 'chalk_blue', 'chalk_special',
  /* gadgets */ 'boxing_glove', 'boxing_glove_super', 'hand_labeler', 'ringbox',
  /* unused */ 'shovel', 'net', 'paint_brush', 'painting',
  /* props */ 'prop_island_tiny', 'prop_island_med', 'prop_island_big', 'prop_campfire', 'prop_picnic', 'prop_table', 'prop_chair', 'prop_therapy_seat',
  'prop_bush', 'prop_rock', 'prop_well', 'prop_toilet', 'prop_boombox', 'prop_whoopie', 'prop_beer', 'prop_greenscreen', 'prop_canvas', 'prop_test'
];
if (typeof module !== 'undefined') module.exports = ITEM_ORDER;
