'use strict';
/* Things you collect to trade, and other odd finds. Amounts come from the 1.12 shops. */
const FRAGMENTS_PER_TRADE = 3;
const FRAGMENTS = [
  { id: 'mdl_piece_hat', gives: 'hat_tophat' }, { id: 'mdl_piece_monocle', gives: 'accessory_monocle' },
  { id: 'mdl_piece_watch', gives: 'accessory_watch' }, { id: 'mdl_piece_sword', gives: 'accessory_sword' }
];
const BONES = ['spectral_skull', 'spectral_rib', 'spectral_spine', 'spectral_humerus', 'spectral_femur'];
const METAL_FINDS = ['mdl_button', 'mdl_casing', 'mdl_coin', 'mdl_ring', 'mdl_sodatab'];
/* A coin bag's rarity is the rod luck it was found with, 1 to 5. */
const COIN_BAG = 'luck_moneybag', COIN_BAG_LEVELS = [1, 2, 3, 4, 5];
const CHEST = 'treasure_chest';
/* How many the shops let you own, where it is more than one. */
const OWN_LIMIT = { prop_chair: 4 };
/* order of everything in Creatures that is not a catch */
const FIND_ORDER = [...FRAGMENTS.map(f => f.id), ...BONES, ...METAL_FINDS, COIN_BAG];
if (typeof module !== 'undefined') module.exports = { FRAGMENTS, FRAGMENTS_PER_TRADE, BONES, METAL_FINDS, COIN_BAG, COIN_BAG_LEVELS, CHEST, OWN_LIMIT, FIND_ORDER };
