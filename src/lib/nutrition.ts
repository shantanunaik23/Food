/**
 * Nutrition rollup: ingredient -> component -> dish -> day -> week.
 *
 * Nothing here is hand-typed content. Change a quantity in the data files and
 * every figure above it moves, which is the point of deriving rather than
 * writing the numbers on the dish.
 *
 * Overrides exist because a rollup assumes you eat everything you put in.
 * Stock does not work that way — the bones and vegetables are strained out and
 * binned — so `nutritionOverride` on a component replaces the batch figure, and
 * on a dish replaces the per-portion figure. Both require a stated reason.
 */

import type { Component, Dish, Ingredient, IngredientRef, Nutrition } from '../data/types';
import type { LibraryIndex } from './graph';
import { toBaseAmount } from './units';

export const ZERO: Nutrition = { kcal: 0, proteinG: 0 };

export function add(a: Nutrition, b: Nutrition): Nutrition {
  return { kcal: a.kcal + b.kcal, proteinG: a.proteinG + b.proteinG };
}

export function scale(n: Nutrition, factor: number): Nutrition {
  return { kcal: n.kcal * factor, proteinG: n.proteinG * factor };
}

export function round(n: Nutrition): Nutrition {
  return { kcal: Math.round(n.kcal), proteinG: Math.round(n.proteinG * 10) / 10 };
}

/** Nutrition contributed by one ingredient line. */
export function ingredientLineNutrition(ref: IngredientRef, ing: Ingredient): Nutrition {
  if (!ing.nutrition) return ZERO;
  const amount = toBaseAmount(ref.qty, ref.unit, ing);
  // 'each' ingredients carry nutrition per unit; everything else per 100.
  const factor = ing.defaultUnit === 'each' ? amount : amount / 100;
  return scale(ing.nutrition, factor);
}

/** Nutrition for one whole batch of a preparation or base. */
export function componentBatchNutrition(index: LibraryIndex, c: Component): Nutrition {
  if (c.nutritionOverride) {
    return { kcal: c.nutritionOverride.kcal, proteinG: c.nutritionOverride.proteinG };
  }
  let total = ZERO;
  for (const ref of c.ingredients) {
    const ing = index.ingredient.get(ref.ingredientId);
    if (!ing) continue;
    total = add(total, ingredientLineNutrition(ref, ing));
  }
  return total;
}

/** Nutrition per single unit of a component's yield (per ml, per g, per each). */
export function componentPerYieldUnit(index: LibraryIndex, c: Component): Nutrition {
  if (c.yieldAmount === 0) return ZERO;
  return scale(componentBatchNutrition(index, c), 1 / c.yieldAmount);
}

/** Nutrition for the amount a dish typically draws — one serving of the component. */
export function componentServingNutrition(index: LibraryIndex, c: Component): Nutrition {
  return scale(componentPerYieldUnit(index, c), c.servingSize);
}

/**
 * Nutrition for one portion of a dish. For batch-cooked lunch dishes the data
 * files always express quantities per portion, so no division happens here.
 */
export function dishNutrition(index: LibraryIndex, dish: Dish): Nutrition {
  if (dish.nutritionOverride) {
    return { kcal: dish.nutritionOverride.kcal, proteinG: dish.nutritionOverride.proteinG };
  }

  let total = ZERO;

  for (const ref of dish.freshIngredients) {
    const ing = index.ingredient.get(ref.ingredientId);
    if (!ing) continue;
    total = add(total, ingredientLineNutrition(ref, ing));
  }

  for (const ref of [...dish.preparations, ...dish.bases]) {
    const c = index.component.get(ref.id);
    if (!c) continue;
    total = add(total, scale(componentPerYieldUnit(index, c), ref.qty));
  }

  return total;
}

/**
 * Where a dish's calories and protein actually come from, for the
 * decomposition view. Sorted heaviest first — usually a useful surprise.
 */
export interface NutritionContribution {
  label: string;
  source: 'preparation' | 'base' | 'fresh';
  nutrition: Nutrition;
}

export function dishNutritionBreakdown(
  index: LibraryIndex,
  dish: Dish,
): NutritionContribution[] {
  const rows: NutritionContribution[] = [];

  for (const ref of dish.preparations) {
    const c = index.component.get(ref.id);
    if (!c) continue;
    rows.push({
      label: c.name,
      source: 'preparation',
      nutrition: scale(componentPerYieldUnit(index, c), ref.qty),
    });
  }

  for (const ref of dish.bases) {
    const c = index.component.get(ref.id);
    if (!c) continue;
    rows.push({
      label: c.name,
      source: 'base',
      nutrition: scale(componentPerYieldUnit(index, c), ref.qty),
    });
  }

  for (const ref of dish.freshIngredients) {
    const ing = index.ingredient.get(ref.ingredientId);
    if (!ing) continue;
    rows.push({
      label: ing.name,
      source: 'fresh',
      nutrition: ingredientLineNutrition(ref, ing),
    });
  }

  return rows.sort((a, b) => b.nutrition.kcal - a.nutrition.kcal);
}
