/**
 * Preparations — the made-in-house layer: sauces, pastes, stock, pickles.
 *
 * Quantities are for ONE BATCH. `yieldAmount` is what you actually end up with
 * after reduction and losses, not the sum of the inputs — the batch-sizing
 * maths depends on that being honest.
 *
 * `servingSize` is what one dish typically draws, so yieldAmount / servingSize
 * tells you how many dishes a batch covers.
 *
 * To add a preparation: copy an existing one, give it a unique id, and make
 * sure every ingredientId exists in ingredients.ts. Run `npm run validate`.
 */

import type { Preparation } from './types';

export const preparations: Preparation[] = [
  {
    id: 'chicken-stock',
    kind: 'preparation',
    name: 'Chicken stock',
    lane: 'universal',
    ingredients: [
      { ingredientId: 'chicken-wings', qty: 1500, unit: 'g', prep: 'whole, no need to joint' },
      { ingredientId: 'onion-brown', qty: 320, unit: 'g', prep: 'halved, skin on' },
      { ingredientId: 'carrot', qty: 160, unit: 'g', prep: 'halved' },
      { ingredientId: 'celery', qty: 120, unit: 'g', prep: 'in thirds' },
      { ingredientId: 'garlic', qty: 40, unit: 'g', prep: 'whole head, halved across' },
      { ingredientId: 'bay-leaves', qty: 2, unit: 'each' },
      { ingredientId: 'black-pepper', qty: 5, unit: 'g', prep: 'whole' },
      { ingredientId: 'water', qty: 3000, unit: 'ml', prep: 'cold' },
    ],
    yieldAmount: 2000,
    yieldUnit: 'ml',
    servingSize: 250,
    activeMinutes: 20,
    totalMinutes: 240,
    shelfLifeDays: 4,
    storage: 'fridge',
    techniques: [],
    freezable: true,
    nutritionOverride: {
      kcal: 340,
      proteinG: 50,
      reason:
        'The wings and vegetables are strained out and binned. Only dissolved gelatine and a little rendered fat stay in the liquid, so a rollup of the raw inputs would overstate this by roughly ten times.',
    },
    method: [
      'Put the wings in your largest pot in a single-ish layer and cover with the cold water. Starting cold draws more out of the bones than starting hot.',
      'Bring it slowly to a bare simmer over medium heat — this should take 20 minutes or so. Do not let it boil at any point, or you will emulsify the fat and end up with cloudy, greasy stock.',
      'Skim off the grey foam that rises in the first ten minutes. After that it stops.',
      'Add the vegetables, garlic, bay and peppercorns. Do not add salt — you will reduce this later and salt now means an inedible sauce in a fortnight.',
      'Hold at a bare simmer, lid ajar, for 3 hours. A bubble breaking the surface every second or two is right.',
      'Strain through the finest sieve you have and do not press the solids — pressing pushes through the particles that make it cloudy.',
      'Cool it fast: a sink of cold water, stirring occasionally. Refrigerate overnight, then lift the set fat off the top and keep it for roasting potatoes.',
      'Freeze in 250 ml portions. Good stock should set to a wobble in the fridge; if it does not, you either boiled it or used too much water.',
    ],
    notes:
      'The keystone of the whole library. A seared chop with a pan sauce made from this is a different dish from a seared chop without it. Make it on a weekend when you are in anyway — it is 20 minutes of work spread over four hours.',
  },

  {
    id: 'peri-peri-sauce',
    kind: 'preparation',
    name: 'Peri-peri sauce',
    lane: 'peri',
    ingredients: [
      { ingredientId: 'chilli-red', qty: 90, unit: 'g', prep: 'stemmed, roughly chopped' },
      { ingredientId: 'chilli-birdseye', qty: 9, unit: 'g', prep: 'stemmed — this is the heat, adjust it' },
      { ingredientId: 'pepper-red', qty: 160, unit: 'g', prep: 'one large, whole' },
      { ingredientId: 'garlic', qty: 25, unit: 'g', prep: '5 cloves, peeled' },
      { ingredientId: 'smoked-paprika', qty: 8, unit: 'g' },
      { ingredientId: 'oregano-dried', qty: 3, unit: 'g' },
      { ingredientId: 'red-wine-vinegar', qty: 60, unit: 'ml' },
      { ingredientId: 'lemon', qty: 1, unit: 'each', prep: 'juice and zest' },
      { ingredientId: 'olive-oil', qty: 100, unit: 'ml' },
      { ingredientId: 'salt', qty: 8, unit: 'g' },
      { ingredientId: 'sugar-caster', qty: 5, unit: 'g' },
    ],
    yieldAmount: 350,
    yieldUnit: 'ml',
    servingSize: 60,
    activeMinutes: 20,
    totalMinutes: 30,
    shelfLifeDays: 21,
    storage: 'fridge',
    techniques: ['emulsifying'],
    freezable: true,
    method: [
      'Blacken the whole red pepper directly over a gas flame, turning with tongs, until the skin is charred all over — about 8 minutes. Put it in a bowl covered with a plate for 10 minutes, then rub the skin off. Do not rinse it under the tap; you will wash away the smoke you just spent 8 minutes making.',
      'Meanwhile, dry-toast the smoked paprika and oregano in a small pan for 30 seconds until fragrant. Tip them straight out of the pan so they stop cooking.',
      'Put the peeled pepper, both chillies, garlic, toasted spices, vinegar, lemon juice and zest, salt and sugar in the processor. Blend to a smooth purée, scraping down once.',
      'With the motor running, pour the olive oil in a thin steady stream. This is the emulsion: added slowly it thickens and turns glossy and opaque; dumped in at once it stays thin and separates within the hour.',
      'Taste. It should be sharp first, then hot, then sweet underneath. If it is flat, more salt. If it is harsh, another pinch of sugar.',
      'Decant into a clean jar and top with a thin film of olive oil to seal the surface.',
    ],
    notes:
      'If it splits — you will see it go grainy and weep oil — do not throw it out. Start a clean bowl with a tablespoon of the split sauce and whisk the rest in slowly. It comes back every time.',
  },

  {
    id: 'garlic-herb-butter',
    kind: 'preparation',
    name: 'Garlic-herb compound butter',
    lane: 'universal',
    ingredients: [
      { ingredientId: 'butter', qty: 250, unit: 'g', prep: 'soft, not melted' },
      { ingredientId: 'garlic', qty: 20, unit: 'g', prep: '4 cloves, grated to a paste' },
      { ingredientId: 'parsley-flat', qty: 20, unit: 'g', prep: 'finely chopped' },
      { ingredientId: 'thyme-fresh', qty: 4, unit: 'g', prep: 'leaves only' },
      { ingredientId: 'lemon', qty: 0.5, unit: 'each', prep: 'zest only' },
      { ingredientId: 'flaky-salt', qty: 4, unit: 'g' },
      { ingredientId: 'black-pepper', qty: 2, unit: 'g', prep: 'coarsely ground' },
    ],
    yieldAmount: 280,
    yieldUnit: 'g',
    servingSize: 15,
    activeMinutes: 10,
    totalMinutes: 70,
    shelfLifeDays: 21,
    storage: 'fridge',
    techniques: [],
    freezable: true,
    method: [
      'Leave the butter out until it takes a fingerprint easily but is nowhere near melting. Melted butter will not hold the herbs in suspension and they sink to one end of the log.',
      'Grate the garlic on a microplane rather than chopping it — you want it dispersed, not in pieces that catch and burn.',
      'Beat everything together with a fork until evenly green-flecked. Taste it; compound butter should taste slightly over-seasoned on its own, because it gets spread across a whole portion.',
      'Scrape onto greaseproof paper, roll into a log about 4 cm across, twist the ends like a cracker and chill for at least an hour.',
      'Slice discs off as needed. Freeze half the log — it slices straight from frozen and melts on hot meat just as well.',
    ],
    notes:
      'The one-ingredient upgrade to almost anything seared. A disc melting over a rested steak is doing the same job as a sauce for none of the work.',
  },
];
