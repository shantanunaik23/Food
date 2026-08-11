/**
 * Techniques — the skills the library is designed to teach.
 *
 * Dishes and preparations tag themselves with technique ids. The planner biases
 * toward dishes carrying techniques not yet cooked, and the Techniques panel
 * tracks progress. `firstTaughtBy` must point at a real dish or preparation id;
 * the validator enforces this.
 */

import type { Technique } from './types';

export const techniques: Technique[] = [
  {
    id: 'velveting',
    name: 'Velveting',
    description:
      'Marinate sliced meat in cornflour, a little liquid and a pinch of bicarbonate of soda for 20 minutes before cooking. The starch holds moisture at the surface and the alkali interrupts protein bonding, so the meat stays soft at stir-fry heat.',
    whyItMatters:
      'It is the single reason restaurant stir-fries taste different from yours. Cheap chicken breast becomes silky rather than stringy, and it costs you twenty minutes of doing nothing.',
    firstTaughtBy: 'velveted-chicken-stir-fry',
  },
  {
    id: 'chilli-toasting',
    name: 'Toasting and rehydrating dried chillies',
    description:
      'Stem and seed dried chillies, press them flat in a dry pan for 20–30 seconds a side until they smell of raisins and tobacco, then steep in hot water for 20 minutes and blend with the soaking liquid.',
    whyItMatters:
      'Toasting converts flat dried heat into layered fruit and smoke. Burn them, though, and the whole batch turns bitter and cannot be rescued — the margin is about ten seconds, which is why it is worth learning deliberately.',
    firstTaughtBy: 'toasted-chilli-paste',
  },
  {
    id: 'pan-sauce',
    name: 'Building a pan sauce',
    description:
      'After searing, pour off excess fat, soften an aromatic in the pan, deglaze with wine, cider or stock, reduce by half, then take the pan off the heat and swirl in cold butter until glossy.',
    whyItMatters:
      'This is the technique that turns a cooked piece of meat into a dish, using the browned residue you would otherwise wash off. It takes four minutes and needs no recipe once the shape is in your hands.',
    firstTaughtBy: 'reverse-seared-ribeye',
  },
  {
    id: 'reverse-sear',
    name: 'Reverse sear',
    description:
      'Cook a thick steak slowly in a low oven to an internal temperature about 10 °C below target, rest it briefly, then sear hard in a ripping-hot pan for a minute a side.',
    whyItMatters:
      'Cooking gently first means the steak is evenly pink edge to edge instead of grey-banded, and a dry surface browns faster, so the crust forms before the interior overcooks. It also makes the timing forgiving, which matters when you are learning.',
    firstTaughtBy: 'reverse-seared-ribeye',
  },
  {
    id: 'brining',
    name: 'Brining',
    description:
      'Soak lean meat in a salt solution — roughly 60 g salt per litre of water — for one to four hours, then dry the surface thoroughly before cooking.',
    whyItMatters:
      'Salt travels inward and helps the muscle hold water, so a pork chop stays juicy past the point where an unbrined one would be chalky. It buys you a margin of error on exactly the cuts you are least confident cooking.',
    firstTaughtBy: 'brined-pork-chop',
  },
  {
    id: 'emulsifying',
    name: 'Emulsifying',
    description:
      'Force oil and a water-based liquid into a stable suspension by adding the oil slowly to a moving base, using mustard, egg or starch as the bridge between them.',
    whyItMatters:
      'It is the difference between a sauce that clings and a sauce that pools next to the food. Once you can see an emulsion break and know to fix it with a splash of cold liquid and hard whisking, a lot of sauces stop being intimidating.',
    firstTaughtBy: 'peri-peri-sauce',
  },
  {
    id: 'breading',
    name: 'Breading and shallow frying',
    description:
      'Set up flour, beaten egg and panko in three trays, keep one hand dry and one wet, press the crumb on firmly, then fry in 1–2 cm of oil at 170–180 °C.',
    whyItMatters:
      'The three-stage coating is a system, not a recipe, and it works on chicken, fish and vegetables alike. Keeping one hand dry is the part nobody tells you, and it is why your first attempt ends with breaded fingers.',
    firstTaughtBy: 'chicken-katsu-curry',
  },
  {
    id: 'braising',
    name: 'Braising',
    description:
      'Brown the meat hard, build a liquid base that comes no more than halfway up it, then hold it at a bare simmer — a bubble every second or two — until the connective tissue turns to gelatine.',
    whyItMatters:
      'It converts the cheapest, toughest cuts into the richest results, and it is almost entirely unattended time. The common failure is boiling rather than simmering, which squeezes the meat dry instead of softening it.',
    firstTaughtBy: 'chicken-adobo',
  },
  {
    id: 'rendering',
    name: 'Rendering fat',
    description:
      'Start fatty skin-on cuts in a cold, dry pan over low-medium heat and let the fat liquefy slowly before raising the heat to crisp the surface.',
    whyItMatters:
      'A hot start seizes the skin and traps the fat underneath, so it stays flabby. Starting cold gives you crisp skin and a pan of clean cooking fat as a by-product — you get both, or neither.',
    firstTaughtBy: 'twice-cooked-pork-belly',
  },
  {
    id: 'steaming-shellfish',
    name: 'Steaming shellfish',
    description:
      'Build an aromatic liquid in a large pot, bring it to a hard boil, add scrubbed shellfish, clamp the lid on and cook for three to five minutes until they open.',
    whyItMatters:
      'Shellfish tell you when they are done — they open — so the skill is in what you steam them in and in stopping immediately. Overcooked mussels shrink to rubber in about ninety seconds past the mark.',
    firstTaughtBy: 'mussels-coconut-lemongrass',
  },
  {
    id: 'brown-butter',
    name: 'Brown butter',
    description:
      'Melt butter and keep it moving over medium heat until the water boils off, the foam subsides and the milk solids toast to hazelnut brown, then stop it immediately with an acid.',
    whyItMatters:
      'It is thirty seconds between nutty and burnt, and you have to go by smell and the colour of the solids rather than the clock. Master it and a plain fillet of white fish becomes a restaurant plate.',
    firstTaughtBy: 'white-fish-brown-butter',
  },
  {
    id: 'high-heat-stir-fry',
    name: 'High-heat stir frying',
    description:
      'Have every component cut, measured and within arm’s reach, get the pan hotter than feels sensible, cook in small batches and keep the food moving.',
    whyItMatters:
      'Without a wok burner your only lever is pan temperature, so crowding the pan is fatal — it drops the heat and the food steams in its own liquid. Batching and prepping ahead is the whole technique.',
    firstTaughtBy: 'pad-krapow',
  },
  {
    id: 'dumpling-folding',
    name: 'Dumpling folding',
    description:
      'Wet half the wrapper rim, place a modest spoon of filling in the centre, then pleat one side only against the flat side, pressing each pleat closed as you go.',
    whyItMatters:
      'Pure hand skill that only improves by repetition — the first dozen look wrong and the rest are fine. Overfilling is the usual cause of blowouts, and it is the one thing that ruins the pan-steam.',
    firstTaughtBy: 'pork-ginger-gyoza',
  },
  {
    id: 'toasted-rice-powder',
    name: 'Making toasted rice powder',
    description:
      'Toast raw glutinous rice in a dry pan over medium heat, shaking constantly, until it is deep golden and smells of popcorn, then grind to a coarse sand.',
    whyItMatters:
      'It provides the texture and nutty backbone of a larb — without it the dish is just wet mince. Five minutes of work, keeps for months, and there is no shop-bought substitute worth using.',
    firstTaughtBy: 'larb-moo',
  },
];
