# Component Kitchen

A cooking planner built on a dependency graph. Raw ingredients feed preparations
(sauces, pastes, stock, pickles); preparations plus bases plus fresh items
compose into dishes. Every node carries shelf life, yield, time cost and
nutrition, so the app can say what to cook, what to restock and what to buy
without you recalculating anything.

Cooking for one, 30 hands-on minutes on a weekday, one weekly shop plus a
midweek top-up.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

To build static files you can host anywhere, or just open from disk:

```bash
npm run build      # validates the library, typechecks, then writes dist/
npm run preview    # serve dist/ locally
```

The build produces a **single self-contained `dist/index.html`** (~330 kB) with
the CSS and JS inlined. Double-click it, or drop it on any static host — no
server, no build step, no network.

That inlining is deliberate rather than cosmetic: browsers refuse to load
`<script type="module">` over `file://`, so an ordinary bundle shows a blank
page when opened from disk. `scripts/inline.mjs` folds everything into one
classic script at the end of `<body>`.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Validate → typecheck → build to `dist/` |
| `npm run validate` | Check the content graph on its own |
| `npm run typecheck` | Types only |

### Your data

Everything lives in this browser under a named profile — there is no account and
no server, so nothing leaves your machine. **Data → Export to JSON** is both how
you move a profile to your phone and how you back it up; do it before clearing
your browser data. Import offers to merge (keeps both sets of ticks, the more
recently made batch wins) or replace.

The only things you maintain by hand are ticking pantry items and marking
preparations stocked / low / empty. Everything else is derived.

## How the graph works

```
Dish ──┬─> Preparation ─> Ingredient      made in house, tracked, has a shelf life
       ├─> Base ────────> Ingredient      made to order, never blocks a dish
       └─> Ingredient                     fresh, straight into the pan
```

Both directions matter. Forwards gives you the shopping list, the prep schedule
and the nutrition. Backwards answers "the salsa expires in two days — what uses
it?", which is what the Blocks view is for.

**Nutrition is never typed by hand.** Each ingredient carries kcal and protein
per 100 g/ml and everything above it is computed. Change a quantity and every
figure moves; halve a batch and it is genuinely halved.

**Shelf life is a live countdown** from the date you marked something stocked,
computed against today — never a stored label.

## Editing the library

Content lives in typed data files with no UI imports, so you can edit them by
hand:

| File | Contents |
|---|---|
| `src/data/ingredients.ts` | ~155 ingredients: tier, aisle, shelf life, nutrition |
| `src/data/preparations.ts` | 18 preparations |
| `src/data/bases.ts` | 8 bases (rice, noodles, tortillas, potatoes) |
| `src/data/dishes.ts` | 30 dishes |
| `src/data/techniques.ts` | 14 techniques |
| `src/data/types.ts` | The schema, with every field commented |

After any edit, run `npm run validate`. It lists every problem at once rather
than failing on the first.

### Adding a dish

Copy an existing entry in `src/data/dishes.ts`, give it a unique `id`, and point
`preparations`, `bases` and `freshIngredients` at ids that exist.

```ts
{
  id: 'my-new-dish',
  name: 'My new dish',
  lane: 'asian',                     // asian | latin | peri | technique
  protein: 'chicken thigh',          // free text; the planner uses it to avoid repeats
  slots: ['dinner'],                 // add 'lunch' for batch-cooked freezer meals
  preparations: [{ id: 'chicken-stock', qty: 200 }],   // qty is in the prep's yieldUnit
  bases: [{ id: 'rice-steamed-jasmine', qty: 200 }],
  freshIngredients: [
    { ingredientId: 'chicken-thigh', qty: 200, unit: 'g', prep: 'in 3 cm pieces' },
  ],
  activeMinutes: 20,                 // hands-on time — this is what the 30-min budget spends
  totalMinutes: 35,                  // wall clock, including unattended oven and simmer time
  techniques: ['velveting'],         // must exist in techniques.ts
  difficulty: 2,
  method: ['Step one.', 'Step two.'],
  notes: 'What to watch for, how to tell it is done.',
}
```

Quantities are always **for one portion**. A batch-cooked lunch dish adds
`batch: { portions: 4, freezerLifeDays: 90 }` and the planner multiplies —
do not write the quantities for the whole batch.

Set `learning: true` on dishes using unfamiliar proteins or techniques; the
planner guarantees at least one of those a week.

### Adding a preparation

Copy an entry in `src/data/preparations.ts`. The fields that matter most:

- `yieldAmount` / `yieldUnit` — what you actually end up with **after** reduction
  and losses, not the sum of the inputs. The batch-sizing maths depends on this
  being honest.
- `servingSize` — how much one dish typically draws, so
  `yieldAmount / servingSize` is how many dishes a batch covers.
- `activeMinutes` — used to decide whether it fits in a day's leftover minutes.
- `shelfLifeDays` and `storage` — drive the countdown and the restock nagging.

### Adding an ingredient

Copy a line in `src/data/ingredients.ts`. Nutrition is per 100 g/ml, except for
`each` items where it is per unit.

- `tier` — `0` cupboard, `1` made in-house, `2` weekly fresh, `3` buy-for-purpose.
- `section` — the supermarket aisle, so the shopping list walks the shop.
- `gramsPerTbsp` — needed on gram-measured items that recipes call for by the
  spoon; `gramsPerEach` on countable ones. The validator will tell you if you
  forget.
- `pantryPhase` — tier 0 only: `1` working minimum, `2` depth, `3` refinement.

### When a rollup would be wrong

Some dishes do not eat everything that goes into them — stock discards its
bones, a brine is poured away, most frying oil stays in the pan. Both components
and dishes accept a `nutritionOverride`, and the validator rejects one without a
stated `reason`:

```ts
nutritionOverride: {
  kcal: 340, proteinG: 50,
  reason: 'The wings and vegetables are strained out and binned.',
}
```

Prefer fixing quantities where you can — an override freezes that node, so
editing its ingredients no longer moves the numbers. For fried dishes the
library lists the oil actually *absorbed*, with the frying quantity in the
`prep` note, which keeps the rollup live.

## What the validator checks

`npm run validate` blocks the build on anything that would break at runtime:
dangling ingredient/prep/base ids, duplicate ids, impossible unit conversions,
`activeMinutes` above `totalMinutes`, a serving larger than a batch, a component
referencing itself.

It warns, without blocking, on things that are untidy rather than broken:
ingredients nothing uses, preparations no dish needs, a technique pointing at
content not written yet, an ingredient listed twice in one recipe, and dinners
whose computed nutrition falls outside 500–1300 kcal or under 30 g protein —
which is what catches a quantity typed with an extra zero.

## The planning rules

Hard constraints, never violated: the dish fits the day's hands-on budget; the
same protein never appears two days running; at most three chicken days a week;
no dish twice in one week; locked days are left alone.

Preferences, scored: prefer dishes whose preparations are stocked, with a bonus
for techniques you have not cooked so that preference cannot starve the learning
dishes, and a penalty for anything cooked in the last three weeks.

**Secondary tasks only ever occupy time that exists.** The day's spare minutes
are `budget − dinner.activeMinutes`; a 28-minute dish on a 30-minute day gets no
secondary task. A batch cook also has to pay for any preparation it needs but
does not have, which is why they usually land at the weekend.

**Batch sizing** compares demand from the next fortnight's plan against what a
batch yields, clamped by shelf life so it never suggests making more than you
can eat in time. On-hand quantity is inferred from stocked / low / empty (a full
batch, a quarter, none) since you never log fridge contents. The arithmetic is
printed on the card so you can check it.

**The weekly/top-up shopping split is derived, not hardcoded.** An item goes in
the midweek top-up when its shelf life is shorter than the gap from the weekend
shop to the day it is needed — which is why fresh fish, steak and soft herbs
land there on their own.

## Assumptions you can change

Under **Data → Assumptions**: the weekday and weekend hands-on budgets, the
assumed breakfast (out of scope for planning but it still counts toward the
daily total), the daily targets, and the chicken cap.

The weekday budget is **hands-on** minutes. Unattended oven and simmer time does
not count against it, which is what keeps the reverse-seared ribeye — 25 minutes
active, 75 wall-clock — legal on a Tuesday.

## Stack

Vite + React + TypeScript, no UI framework and no router library. Hash routing
in about twenty lines, so the build runs from `file://` or any subdirectory
without server rewrites. Styling is plain CSS with custom properties.
