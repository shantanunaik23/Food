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
];
