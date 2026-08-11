/**
 * Bases — the starch layer. Same shape as a preparation, simpler content.
 *
 * Kept separate from preparations only because the UI groups them differently
 * and because they are usually made to order rather than batched. The shelf
 * life and batch-sizing logic treats them identically.
 */

import type { Base } from './types';

export const bases: Base[] = [
  {
    id: 'rice-steamed-jasmine',
    kind: 'base',
    name: 'Steamed jasmine rice',
    lane: 'asian',
    ingredients: [
      { ingredientId: 'rice-jasmine', qty: 150, unit: 'g', prep: 'rinsed until the water runs clear' },
      { ingredientId: 'water', qty: 270, unit: 'ml' },
      { ingredientId: 'salt', qty: 2, unit: 'g' },
    ],
    yieldAmount: 400,
    yieldUnit: 'g',
    servingSize: 200,
    activeMinutes: 5,
    totalMinutes: 25,
    shelfLifeDays: 2,
    storage: 'fridge',
    techniques: [],
    freezable: true,
    method: [
      'Rinse the rice in cold water three or four times, swirling with your hand, until the water runs nearly clear. This is surface starch — leave it on and the grains glue together.',
      'Drain well, add the measured water and salt, and bring to a boil uncovered.',
      'The moment it boils, put the lid on and drop to the lowest heat your hob will hold. 12 minutes.',
      'Off the heat, lid still on, 10 minutes. Do not lift the lid during either stage — the steam trapped in there is doing the last of the cooking.',
      'Fluff with a fork, not a spoon.',
    ],
    notes:
      'Cooked rice keeps two days in the fridge at most, and must be cooled fast and refrigerated within an hour. Reheat until piping hot throughout. It freezes better than it refrigerates.',
  },

  {
    id: 'crushed-potatoes',
    kind: 'base',
    name: 'Crushed potatoes',
    lane: 'universal',
    ingredients: [
      { ingredientId: 'potato', qty: 500, unit: 'g', prep: 'waxy, skin on, in even 4 cm pieces' },
      { ingredientId: 'olive-oil', qty: 30, unit: 'ml' },
      { ingredientId: 'flaky-salt', qty: 5, unit: 'g' },
      { ingredientId: 'black-pepper', qty: 1, unit: 'g' },
    ],
    yieldAmount: 480,
    yieldUnit: 'g',
    servingSize: 150,
    activeMinutes: 10,
    totalMinutes: 30,
    shelfLifeDays: 3,
    storage: 'fridge',
    techniques: [],
    method: [
      'Start the potatoes in cold, well-salted water — as salty as soup. Starting them in boiling water cooks the outsides to mush before the middles are done.',
      'Simmer until a knife slides in with no resistance, about 18 minutes for 4 cm pieces.',
      'Drain and leave them in the colander for 2 minutes to steam dry. Wet potatoes will not take on the oil.',
      'Return to the dry pan, add the oil, and crush each piece once with the back of a fork — you want craggy edges and intact middles, not mash.',
      'Season heavily with flaky salt and coarse pepper.',
    ],
    freezable: false,
    notes:
      'The craggy edges are the point: they are the surface area that crisps if you finish them in the air fryer for 8 minutes at 200 °C. Worth doing when the dish has a sauce to mop.',
  },

  {
    id: 'rice-steamed-short-grain',
    kind: 'base',
    name: 'Steamed short-grain rice',
    lane: 'asian',
    ingredients: [
      { ingredientId: 'rice-short-grain', qty: 150, unit: 'g', prep: 'rinsed until the water runs clear' },
      { ingredientId: 'water', qty: 200, unit: 'ml' },
    ],
    yieldAmount: 390,
    yieldUnit: 'g',
    servingSize: 200,
    activeMinutes: 5,
    totalMinutes: 40,
    shelfLifeDays: 2,
    storage: 'fridge',
    techniques: [],
    freezable: true,
    method: [
      'Rinse hard — short-grain rice carries far more surface starch than jasmine. Four or five changes of water until it runs almost clear.',
      'Soak in the measured water for 20 minutes before cooking. This is what gives you evenly cooked, glossy grains rather than chalky centres.',
      'Bring to a boil, lid on, then lowest heat for 12 minutes.',
      'Off the heat, lid on, 10 minutes. Fold gently with a wet spatula — cutting motions, not stirring, or you will crush the grains.',
    ],
    notes:
      'The stickiness is the point for donburi and rice bowls: it holds together under a glaze instead of scattering. Do not substitute jasmine and expect the same bowl.',
  },

  {
    id: 'rice-steamed-basmati',
    kind: 'base',
    name: 'Steamed basmati rice',
    lane: 'universal',
    ingredients: [
      { ingredientId: 'rice-basmati', qty: 150, unit: 'g', prep: 'rinsed' },
      { ingredientId: 'water', qty: 280, unit: 'ml' },
      { ingredientId: 'salt', qty: 2, unit: 'g' },
      { ingredientId: 'butter', qty: 10, unit: 'g' },
    ],
    yieldAmount: 410,
    yieldUnit: 'g',
    servingSize: 200,
    activeMinutes: 5,
    totalMinutes: 30,
    shelfLifeDays: 2,
    storage: 'fridge',
    techniques: [],
    freezable: true,
    method: [
      'Rinse and then soak for 15 minutes if you have it. Basmati is prized for length and soaking lets the grains extend without breaking.',
      'Melt the butter in the pan, add the drained rice and stir for a minute to coat every grain.',
      'Add the water and salt, boil, lid on, lowest heat, 11 minutes. Then 10 minutes off the heat with the lid on.',
      'Fluff with a fork.',
    ],
    notes:
      'The butter step is not decoration — coating the grains in fat before the water goes in keeps them separate. Use this under the curries and the Latin lane.',
  },

  {
    id: 'noodles-egg-boiled',
    kind: 'base',
    name: 'Boiled egg noodles',
    lane: 'asian',
    ingredients: [
      { ingredientId: 'noodles-egg', qty: 150, unit: 'g' },
      { ingredientId: 'sesame-oil', qty: 8, unit: 'ml', prep: 'to stop them welding together' },
    ],
    yieldAmount: 340,
    yieldUnit: 'g',
    servingSize: 170,
    activeMinutes: 6,
    totalMinutes: 10,
    shelfLifeDays: 2,
    storage: 'fridge',
    techniques: [],
    freezable: false,
    method: [
      'Boil in plenty of unsalted water — the noodles are already salted — for a minute less than the packet says.',
      'Drain and rinse under cold water to stop the cooking and wash off the loose starch.',
      'Toss with the sesame oil immediately. Undressed noodles fuse into a single block within two minutes.',
    ],
    notes:
      'Always undercook noodles that are going into a hot wok or a broth, because they keep cooking. The packet time assumes you are eating them straight from the pot.',
  },

  {
    id: 'noodles-rice-soaked',
    kind: 'base',
    name: 'Soaked flat rice noodles',
    lane: 'asian',
    ingredients: [
      { ingredientId: 'noodles-rice', qty: 150, unit: 'g' },
      { ingredientId: 'water', qty: 1500, unit: 'ml', prep: 'hot, not boiling' },
    ],
    yieldAmount: 380,
    yieldUnit: 'g',
    servingSize: 190,
    activeMinutes: 4,
    totalMinutes: 30,
    shelfLifeDays: 2,
    storage: 'fridge',
    techniques: [],
    freezable: false,
    method: [
      'Soak in hot tap water — not boiling — for 25 minutes, until pliable but still firm and slightly chalky at the core.',
      'Drain. They finish cooking in the wok or the broth in about 90 seconds.',
      'If you boil them instead, they turn to paste. This is the single most common way to ruin a plate of noodles.',
    ],
    notes:
      'Soaked noodles will sit happily in the fridge for a day, which makes them a genuinely useful get-ahead job for a weeknight.',
  },

  {
    id: 'tortillas-corn-warmed',
    kind: 'base',
    name: 'Warmed corn tortillas',
    lane: 'latin',
    ingredients: [
      { ingredientId: 'tortilla-corn', qty: 6, unit: 'each' },
    ],
    yieldAmount: 6,
    yieldUnit: 'each',
    servingSize: 3,
    activeMinutes: 6,
    totalMinutes: 6,
    shelfLifeDays: 1,
    storage: 'fridge',
    techniques: [],
    freezable: false,
    method: [
      'Dry pan, medium-high, no oil. 30 seconds a side until they blister in spots and smell toasted.',
      'Stack them in a clean tea towel as you go. They steam each other soft — a tortilla straight off the pan is stiff, one that has sat in the towel for two minutes is pliable.',
      'Do all of them before you start assembling. A warm tortilla waits happily; a cold one cracks.',
    ],
    notes:
      'Never microwave them naked — they go leathery. The dry pan plus the towel is thirty seconds more work and the difference is enormous.',
  },

  {
    id: 'tortillas-flour-warmed',
    kind: 'base',
    name: 'Warmed flour tortillas',
    lane: 'latin',
    ingredients: [
      { ingredientId: 'tortilla-flour', qty: 4, unit: 'each' },
    ],
    yieldAmount: 4,
    yieldUnit: 'each',
    servingSize: 2,
    activeMinutes: 4,
    totalMinutes: 4,
    shelfLifeDays: 1,
    storage: 'fridge',
    techniques: [],
    freezable: false,
    method: [
      'Dry pan, medium-high. 20 seconds a side — flour tortillas need less than corn and go crisp if you overdo it.',
      'Stack in a tea towel.',
    ],
    notes:
      'Use these for burrito bowls and anything wet. Corn tortillas are better tasting but structurally weaker.',
  },
];
