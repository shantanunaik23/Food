/**
 * Graph indexing and traversal.
 *
 * Forward:  dish -> preparations/bases -> ingredients   (shopping, nutrition)
 * Backward: ingredient/preparation -> dishes that need it
 *           ("the salsa expires in two days — what uses it?")
 */

import type {
  Base,
  Component,
  Dish,
  Ingredient,
  Library,
  Preparation,
  Technique,
} from '../data/types';

export interface LibraryIndex {
  ingredient: Map<string, Ingredient>;
  preparation: Map<string, Preparation>;
  base: Map<string, Base>;
  /** Preparations and bases together — both are made in-house. */
  component: Map<string, Component>;
  dish: Map<string, Dish>;
  technique: Map<string, Technique>;
  /** Backward edges: component id -> dishes that draw on it. */
  dishesByComponent: Map<string, Dish[]>;
  /** Backward edges: ingredient id -> components that contain it. */
  componentsByIngredient: Map<string, Component[]>;
  /** Backward edges: ingredient id -> dishes needing it, directly or via a component. */
  dishesByIngredient: Map<string, Dish[]>;
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const existing = map.get(key);
  if (existing) {
    if (!existing.includes(value)) existing.push(value);
  } else {
    map.set(key, [value]);
  }
}

export function buildIndex(library: Library): LibraryIndex {
  const ingredient = new Map(library.ingredients.map((i) => [i.id, i]));
  const preparation = new Map(library.preparations.map((p) => [p.id, p]));
  const base = new Map(library.bases.map((b) => [b.id, b]));
  const component = new Map<string, Component>([...preparation, ...base]);
  const dish = new Map(library.dishes.map((d) => [d.id, d]));
  const technique = new Map(library.techniques.map((t) => [t.id, t]));

  const componentsByIngredient = new Map<string, Component[]>();
  for (const c of component.values()) {
    for (const ref of c.ingredients) push(componentsByIngredient, ref.ingredientId, c);
  }

  const dishesByComponent = new Map<string, Dish[]>();
  const dishesByIngredient = new Map<string, Dish[]>();
  for (const d of dish.values()) {
    for (const ref of [...d.preparations, ...d.bases]) {
      push(dishesByComponent, ref.id, d);
      const c = component.get(ref.id);
      if (c) for (const ing of c.ingredients) push(dishesByIngredient, ing.ingredientId, d);
    }
    for (const ref of d.freshIngredients) push(dishesByIngredient, ref.ingredientId, d);
  }

  return {
    ingredient,
    preparation,
    base,
    component,
    dish,
    technique,
    dishesByComponent,
    componentsByIngredient,
    dishesByIngredient,
  };
}

/** Which dishes does this preparation unblock? Drives the Blocks view. */
export function dependentDishes(index: LibraryIndex, componentId: string): Dish[] {
  return index.dishesByComponent.get(componentId) ?? [];
}

/**
 * A dish flattened to raw ingredient demand, for shopping lists and batch
 * sizing. Component quantities scale their whole ingredient list: drawing
 * 60 ml from a 250 ml batch charges 60/250 of every ingredient in it.
 */
export interface FlatDemand {
  ingredientId: string;
  /** In the ingredient's own base measure (g, ml or units). */
  amount: number;
  /** Where the demand came from, for "why is this on my list?". */
  via: 'fresh' | { componentId: string };
}

export function flattenDish(
  index: LibraryIndex,
  dish: Dish,
  toBase: (qty: number, unit: string, ing: Ingredient) => number,
): FlatDemand[] {
  const out: FlatDemand[] = [];

  for (const ref of dish.freshIngredients) {
    const ing = index.ingredient.get(ref.ingredientId);
    if (!ing) continue;
    out.push({
      ingredientId: ref.ingredientId,
      amount: toBase(ref.qty, ref.unit, ing),
      via: 'fresh',
    });
  }

  for (const ref of [...dish.preparations, ...dish.bases]) {
    const c = index.component.get(ref.id);
    if (!c || c.yieldAmount === 0) continue;
    const fraction = ref.qty / c.yieldAmount;
    for (const cref of c.ingredients) {
      const ing = index.ingredient.get(cref.ingredientId);
      if (!ing) continue;
      out.push({
        ingredientId: cref.ingredientId,
        amount: toBase(cref.qty, cref.unit, ing) * fraction,
        via: { componentId: c.id },
      });
    }
  }

  return out;
}

/** Sum flattened demand across many dishes into one amount per ingredient. */
export function totalDemand(demands: FlatDemand[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const d of demands) {
    totals.set(d.ingredientId, (totals.get(d.ingredientId) ?? 0) + d.amount);
  }
  return totals;
}
