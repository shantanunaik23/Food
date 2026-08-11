/**
 * Dishes — the top layer.
 *
 * Quantities are ALWAYS for one portion. Batch-cooked lunch dishes carry a
 * `batch` block saying how many portions one cook produces; the planner
 * multiplies. That way nutrition never needs dividing and a dish can serve
 * both slots without two sets of numbers.
 *
 * kcal and protein are not stored — they roll up from the components via
 * lib/nutrition.ts. Use `nutritionOverride` only where the rollup is genuinely
 * wrong (discarded frying oil, poured-away brine), and always say why.
 *
 * To add a dish: copy one below, give it a unique id, reference real prep,
 * base and ingredient ids, then run `npm run validate`.
 */

import type { Dish } from './types';

export const dishes: Dish[] = [
  {
    id: 'peri-peri-thighs',
    name: 'Peri-peri thighs with rice and charred peppers',
    lane: 'peri',
    protein: 'chicken thigh',
    slots: ['dinner'],
    preparations: [{ id: 'peri-peri-sauce', qty: 60 }],
    bases: [{ id: 'rice-steamed-jasmine', qty: 200 }],
    freshIngredients: [
      { ingredientId: 'chicken-thigh', qty: 200, unit: 'g', prep: 'boneless, opened out flat' },
      { ingredientId: 'pepper-red', qty: 120, unit: 'g', prep: 'in thick strips' },
      { ingredientId: 'onion-red', qty: 60, unit: 'g', prep: 'in thick wedges, root left on' },
      { ingredientId: 'veg-oil', qty: 10, unit: 'ml' },
      { ingredientId: 'lime', qty: 0.5, unit: 'each', prep: 'to finish' },
      { ingredientId: 'coriander-fresh', qty: 5, unit: 'g', prep: 'roughly torn' },
      { ingredientId: 'salt', qty: 2, unit: 'g' },
    ],
    activeMinutes: 22,
    totalMinutes: 30,
    techniques: [],
    difficulty: 2,
    method: [
      'Toss the thighs with a third of the peri sauce and a pinch of salt. Leave them while you do everything else — 15 minutes is plenty, and more than 4 hours starts to cure the surface.',
      'Heat the air fryer to 200 °C. Toss the pepper strips and onion wedges with the oil and a pinch of salt.',
      'Air-fry the peppers and onion for 6 minutes, shake, then push them to one side and lay the thighs on top, smooth side up. 12 minutes more.',
      'Check the thighs at 12 minutes: 75 °C at the thickest point, and the juices should run clear. Thigh is forgiving, so err on the side of a minute longer rather than shorter.',
      'Brush a second third of the sauce over the hot chicken and let it sit for 3 minutes off the heat. The residual heat sets it into a glaze rather than leaving it as a raw dressing.',
      'Plate on the rice, spoon the last of the sauce over, squeeze the lime across and scatter the coriander.',
    ],
    notes:
      'Get real char on the peppers — blistered black in patches, not evenly softened. If your air fryer runs cool, do them for 4 minutes before the chicken goes in. The sauce goes on in three stages for a reason: marinade, glaze, dressing. All at the start and it burns; all at the end and it tastes raw.',
  },

  {
    id: 'reverse-seared-ribeye',
    name: 'Reverse-seared ribeye with compound butter and pan sauce',
    lane: 'technique',
    protein: 'ribeye',
    slots: ['dinner'],
    learning: true,
    preparations: [
      { id: 'garlic-herb-butter', qty: 12 },
      { id: 'chicken-stock', qty: 80 },
    ],
    bases: [{ id: 'crushed-potatoes', qty: 150 }],
    freshIngredients: [
      { ingredientId: 'ribeye', qty: 200, unit: 'g', prep: 'one thick steak, at least 4 cm' },
      { ingredientId: 'veg-oil', qty: 3, unit: 'ml', prep: 'just to slick the pan' },
      { ingredientId: 'shallot', qty: 30, unit: 'g', prep: 'finely diced' },
      { ingredientId: 'wine-white', qty: 50, unit: 'ml' },
      { ingredientId: 'broccoli-tenderstem', qty: 100, unit: 'g' },
      { ingredientId: 'flaky-salt', qty: 3, unit: 'g' },
      { ingredientId: 'black-pepper', qty: 1, unit: 'g' },
    ],
    activeMinutes: 25,
    totalMinutes: 75,
    techniques: ['reverse-sear', 'pan-sauce'],
    difficulty: 3,
    method: [
      'Salt the steak on all sides and leave it uncovered on a rack in the fridge for at least an hour, ideally overnight. A dry surface is the whole game — a wet steak steams instead of browning.',
      'Oven to 110 °C. Steak on a rack over a tray. Cook until the centre reads 46 °C for medium rare — 35 to 45 minutes for a 4 cm steak, but go by the thermometer, never the clock.',
      'Rest it for 10 minutes while you get a heavy pan properly, frighteningly hot. Steam the tenderstem for 4 minutes in the meantime.',
      'Slick the pan with the oil. Sear the steak 60 seconds a side, then hold it on its fat edge with tongs for 30 seconds to render it. It should be loud the entire time; if it is quiet, the pan is not hot enough.',
      'Steak onto a warm plate with a disc of the compound butter on top. It rests while you make the sauce, and it will not go cold.',
      'Pour off all but a film of fat. Shallot into the pan, 60 seconds until translucent. Deglaze with the wine, scraping up every brown speck with a wooden spoon — that residue is the sauce.',
      'Reduce the wine until nearly dry, add the stock and reduce by half again. It should coat the back of a spoon.',
      'Off the heat, swirl in the butter that has melted off the steak plus any resting juices. Do not let it boil after this or it will split.',
      'Slice the steak against the grain, spoon the sauce over, serve with the crushed potatoes and tenderstem.',
    ],
    notes:
      'The two failure modes are a pan that is not hot enough at the sear, and boiling the sauce after the butter goes in. Buy a probe thermometer before you buy anything else for this dish — reverse searing without one is guesswork, and a £30 steak is an expensive guess. Target temperatures: 46 °C out of the oven, 52–54 °C after searing and resting.',
  },
];
