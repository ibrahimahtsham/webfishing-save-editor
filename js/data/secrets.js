'use strict';
/* What the Secret items page says. Checked against the 1.12 game files: no shop, quest, rank, chest
   or starting set hands out the cosmetics and items in the first two lists. */
const SECRET_COSMETICS = [
  { id: 'accessory_gloves_black', note: 'A finished accessory that no shop sells.', look: 'Outfit, Clothes tab' },
  { id: 'accessory_shoes', note: 'A finished accessory that no shop sells. It has the same description as the rain boots.', look: 'Outfit, Clothes tab' },
  { id: 'eye_bagged', note: 'Eyes that no quest, chest or shop gives.', look: 'Outfit, Face tab' },
  { id: 'title_fishpilled', note: 'A title that nothing awards.', look: 'Outfit, Misc tab' },
  { id: 'pcolor_west', note: 'The developer’s own fur colour. The game only gives it to their account.', look: 'Outfit, Body tab' }
];
const SECRET_ITEMS = [
  { id: 'shovel', note: 'From a cut digging feature. Digging up a mound would have given a spider. The code is still there, but the item is not connected to it.', look: 'Inventory, Items' },
  { id: 'net', note: 'From a cut bug-catching feature. The code is still there, but the item is not connected to it.', look: 'Inventory, Items' },
  { id: 'paint_brush', note: '“Bring out your inner artist!” From a cut painting feature. It has no action.', look: 'Inventory, Items' },
  { id: 'painting', note: '“A masterpiece!” Goes with the paint brush. It has no action.', look: 'Inventory, Items' },
  { id: 'prop_test', note: 'A developer test prop. It uses the same placement code as the beer prop.', look: 'Props menu' },
  { id: 'fish_deep_test', note: 'A test fish for a “deep” zone that is not in the game. Its name, picture and text are the Axolotl’s.', look: 'Inventory, Creatures' },
  { id: 'fish_deep_testb', note: 'The second deep test fish, a copy of the first.', look: 'Inventory, Creatures' },
  { id: 'fish_deep_testc', note: 'The third deep test fish, a copy of the first.', look: 'Inventory, Creatures' }
];
/* Not marked as unused, but nothing in the game sells or gives it. */
const UNSOLD_ITEMS = [
  { id: 'prop_canvas', note: '“Place a canvas for all your chalk desires!” A working prop that no shop sells.', look: 'Props menu' }
];
/* Shown wherever the item can be added or edited. */
const ITEM_WARNINGS = {
  prop_canvas: 'Placing this can get you kicked. Servers that run Cove kick anyone who places a canvas unless the owner allows it. Use it in your own lobby.'
};
/* Secrets any player can get. */
const FINDABLE_SECRETS = [
  { id: 'fishing_rod_skeleton', how: 'Collect five spectral bones: skull, rib, spine, humerus and femur. Picking up the first one opens a hidden shop that trades the set for this rod.' },
  { id: 'fish_alien_dog', how: 'Fish where a meteor has come down. Chat says “what was that...?” when one lands. It is rare.' },
  { id: 'fish_void_voidfish', how: 'Find a void portal, which appears rarely at a hidden spot, and fish in the void.' },
  { id: 'hat_tophat', how: 'Trade three Hat Fragments from the metal detector.' },
  { id: 'accessory_monocle', how: 'Trade three Monocle Fragments from the metal detector.' },
  { id: 'accessory_watch', how: 'Trade three Watch Fragments from the metal detector.' },
  { id: 'accessory_sword', how: 'Trade three Blade Fragments from the metal detector.' },
  { id: 'accessory_ring', how: 'Buy a Ring Box and open it.' },
  { id: 'fishing_rod_travelers', how: 'Catch one of every fish in the journal. The shop then sells it.' },
  { id: 'fishing_rod_collectors_alpha', how: 'Catch every fish in Alpha. The shop then sells it. Each rarity opens its own Collector’s rod.' },
  { id: 'pcolor_midnight_special', how: 'Second reward of the Squid quest, with the matching second fur. Octopus gives a pink pair and Coelacanth a stone pair.' },
  { id: 'title_lamedev', how: 'Can come out of a treasure chest. Its description says “due to a bug, this exists now.”' }
];
if (typeof module !== 'undefined') module.exports = { SECRET_COSMETICS, SECRET_ITEMS, UNSOLD_ITEMS, ITEM_WARNINGS, FINDABLE_SECRETS };
