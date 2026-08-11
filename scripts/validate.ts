/**
 * Graph validator. Run by `npm run validate`, and by `npm run build` before it
 * will produce any output.
 *
 * Errors block the build: dangling references, duplicate ids, impossible units.
 * These break the app at runtime, so they must never ship.
 *
 * Warnings do not block: unused ingredients, preparations no dish uses,
 * techniques pointing at content not yet written, nutrition outside the
 * plausible band. These mean the library is incomplete or something looks odd,
 * not that it is broken.
 *
 * Every problem is reported at once rather than failing on the first, because
 * fixing a data file one error per run is miserable.
 */

import { library } from '../src/data/index';
import type { Component, Dish, IngredientRef } from '../src/data/types';
import { buildIndex } from '../src/lib/graph';
import { dishNutrition } from '../src/lib/nutrition';
import { toBaseAmount, UnitConversionError } from '../src/lib/units';

const errors: string[] = [];
const warnings: string[] = [];

const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
const warn = (where: string, msg: string) => warnings.push(`${where}: ${msg}`);

const index = buildIndex(library);

// ── 1. Duplicate ids ───────────────────────────────────────────────────────
function checkDuplicates(label: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) err(label, `duplicate id '${id}'`);
    seen.add(id);
  }
}

checkDuplicates('ingredients', library.ingredients.map((i) => i.id));
checkDuplicates('preparations', library.preparations.map((p) => p.id));
checkDuplicates('bases', library.bases.map((b) => b.id));
checkDuplicates('dishes', library.dishes.map((d) => d.id));
checkDuplicates('techniques', library.techniques.map((t) => t.id));

// A preparation and a base sharing an id would make component lookups ambiguous.
for (const b of library.bases) {
  if (index.preparation.has(b.id)) err(`base '${b.id}'`, 'id collides with a preparation');
}

// ── 2. Ingredient references resolve, and units are convertible ────────────
function checkIngredientRefs(where: string, refs: IngredientRef[]): void {
  // The same ingredient listed twice in one list still rolls up correctly, but
  // it renders as two lines in the parts list and is nearly always a mistake.
  const seenIds = new Set<string>();
  for (const ref of refs) {
    if (seenIds.has(ref.ingredientId)) {
      warn(where, `lists '${ref.ingredientId}' more than once — merge the quantities`);
    }
    seenIds.add(ref.ingredientId);
  }

  for (const ref of refs) {
    const ing = index.ingredient.get(ref.ingredientId);
    if (!ing) {
      err(where, `unknown ingredientId '${ref.ingredientId}'`);
      continue;
    }
    if (ref.qty <= 0) err(where, `'${ref.ingredientId}' has qty ${ref.qty}`);
    try {
      toBaseAmount(ref.qty, ref.unit, ing);
    } catch (e) {
      if (e instanceof UnitConversionError) err(where, e.message);
      else throw e;
    }
  }
}

function checkComponent(c: Component, kind: string): void {
  const where = `${kind} '${c.id}'`;
  checkIngredientRefs(where, c.ingredients);

  if (c.ingredients.length === 0) err(where, 'has no ingredients');
  if (c.method.length === 0) warn(where, 'has no method steps');
  if (c.yieldAmount <= 0) err(where, `yieldAmount is ${c.yieldAmount}`);
  if (c.servingSize <= 0) err(where, `servingSize is ${c.servingSize}`);
  if (c.servingSize > c.yieldAmount) {
    err(where, `servingSize ${c.servingSize} exceeds yieldAmount ${c.yieldAmount}`);
  }
  if (c.activeMinutes > c.totalMinutes) {
    err(where, `activeMinutes ${c.activeMinutes} exceeds totalMinutes ${c.totalMinutes}`);
  }
  if (c.shelfLifeDays <= 0) err(where, `shelfLifeDays is ${c.shelfLifeDays}`);
  if (c.nutritionOverride && !c.nutritionOverride.reason.trim()) {
    err(where, 'nutritionOverride without a reason');
  }

  for (const t of c.techniques) {
    if (!index.technique.has(t)) err(where, `unknown technique '${t}'`);
  }
}

for (const p of library.preparations) checkComponent(p, 'preparation');
for (const b of library.bases) checkComponent(b, 'base');

// ── 3. Dish references resolve ─────────────────────────────────────────────
function checkDish(d: Dish): void {
  const where = `dish '${d.id}'`;
  checkIngredientRefs(where, d.freshIngredients);

  for (const ref of d.preparations) {
    const p = index.preparation.get(ref.id);
    if (!p) {
      err(where, `unknown prepId '${ref.id}'`);
      continue;
    }
    if (ref.qty <= 0) err(where, `draws ${ref.qty} of '${ref.id}'`);
    if (ref.qty > p.yieldAmount) {
      warn(where, `draws ${ref.qty}${p.yieldUnit} of '${ref.id}', more than one ${p.yieldAmount}${p.yieldUnit} batch`);
    }
  }

  for (const ref of d.bases) {
    const b = index.base.get(ref.id);
    if (!b) {
      err(where, `unknown baseId '${ref.id}'`);
      continue;
    }
    if (ref.qty <= 0) err(where, `draws ${ref.qty} of '${ref.id}'`);
  }

  for (const t of d.techniques) {
    if (!index.technique.has(t)) err(where, `unknown technique '${t}'`);
  }

  if (d.slots.length === 0) err(where, 'has no slots');
  if (d.method.length === 0) err(where, 'has no method steps');
  if (d.activeMinutes > d.totalMinutes) {
    err(where, `activeMinutes ${d.activeMinutes} exceeds totalMinutes ${d.totalMinutes}`);
  }
  if (d.slots.includes('lunch') && !d.batch) {
    err(where, 'is a lunch dish but has no batch block');
  }
  if (d.nutritionOverride && !d.nutritionOverride.reason.trim()) {
    err(where, 'nutritionOverride without a reason');
  }

  // Plausibility. This is what catches a quantity typed with an extra zero.
  const n = dishNutrition(index, d);
  if (d.slots.includes('dinner')) {
    if (n.kcal < 500 || n.kcal > 1300) {
      warn(where, `computes to ${Math.round(n.kcal)} kcal, outside the 500–1300 band for a dinner`);
    }
    if (n.proteinG < 30) {
      warn(where, `computes to ${n.proteinG.toFixed(1)} g protein, under the 30 g floor`);
    }
  }
}

for (const d of library.dishes) checkDish(d);

// ── 4. Techniques point at real content ────────────────────────────────────
for (const t of library.techniques) {
  if (!index.dish.has(t.firstTaughtBy) && !index.component.has(t.firstTaughtBy)) {
    warn(`technique '${t.id}'`, `firstTaughtBy '${t.firstTaughtBy}' does not exist yet`);
  }
}

// ── 5. Orphans — untidy rather than broken ─────────────────────────────────
for (const i of library.ingredients) {
  const usedByComponent = index.componentsByIngredient.has(i.id);
  const usedByDish = library.dishes.some((d) =>
    d.freshIngredients.some((r) => r.ingredientId === i.id),
  );
  if (!usedByComponent && !usedByDish) warn(`ingredient '${i.id}'`, 'not used by anything');
}

for (const p of library.preparations) {
  if (!index.dishesByComponent.has(p.id)) warn(`preparation '${p.id}'`, 'no dish uses it');
}
for (const b of library.bases) {
  if (!index.dishesByComponent.has(b.id)) warn(`base '${b.id}'`, 'no dish uses it');
}

// ── 6. Acyclicity ──────────────────────────────────────────────────────────
// Components may not reference other components today, so the only way to get a
// cycle is a component listing itself as an ingredient. Cheap to check, and it
// keeps the guarantee explicit if the schema ever grows nested components.
for (const c of index.component.values()) {
  if (c.ingredients.some((r) => r.ingredientId === c.id)) {
    err(`component '${c.id}'`, 'references itself');
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
const counts =
  `${library.ingredients.length} ingredients · ` +
  `${library.preparations.length} preparations · ` +
  `${library.bases.length} bases · ` +
  `${library.dishes.length} dishes · ` +
  `${library.techniques.length} techniques`;

console.log(`\nComponent Kitchen — library check`);
console.log(`  ${counts}\n`);

if (warnings.length) {
  console.log(`  ${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`);
  for (const w of warnings) console.log(`    · ${w}`);
  console.log('');
}

if (errors.length) {
  console.error(`  ${errors.length} error${errors.length === 1 ? '' : 's'}:`);
  for (const e of errors) console.error(`    ✕ ${e}`);
  console.error('\n  Graph is broken — build blocked.\n');
  process.exit(1);
}

console.log('  Graph OK — every reference resolves.\n');
