/**
 * Unit conversion.
 *
 * Every ingredient has a "base" measure implied by its defaultUnit:
 *   'g'    -> grams,  nutrition is per 100 g
 *   'ml'   -> millilitres, nutrition is per 100 ml
 *   'each' -> units,  nutrition is per single unit
 *
 * Recipes are allowed to call for an ingredient in a different unit from its
 * default (a tablespoon of tomato purée, two cloves of garlic), so everything
 * is normalised to the base measure before nutrition is calculated.
 */

import type { Ingredient, Unit } from '../data/types';

export const ML_PER_TBSP = 15;
export const ML_PER_TSP = 5;

export class UnitConversionError extends Error {}

/**
 * Convert a recipe quantity into the ingredient's base measure.
 * Throws rather than guessing — a silent wrong conversion would quietly
 * corrupt every nutrition figure downstream, which is worse than a build
 * failure. The validator turns these throws into readable messages.
 */
export function toBaseAmount(qty: number, unit: Unit, ing: Ingredient): number {
  const base = ing.defaultUnit;

  if (unit === base) return qty;

  // Spoon measures.
  if (unit === 'tbsp' || unit === 'tsp') {
    const spoons = unit === 'tbsp' ? qty : qty / 3;
    if (base === 'ml') return qty * (unit === 'tbsp' ? ML_PER_TBSP : ML_PER_TSP);
    if (base === 'g') {
      if (ing.gramsPerTbsp === undefined) {
        throw new UnitConversionError(
          `${ing.id}: measured in ${unit} but has no gramsPerTbsp`,
        );
      }
      return spoons * ing.gramsPerTbsp;
    }
    throw new UnitConversionError(`${ing.id}: cannot express ${unit} as '${base}'`);
  }

  // Counted units.
  if (unit === 'each') {
    if (ing.gramsPerEach === undefined) {
      throw new UnitConversionError(`${ing.id}: measured 'each' but has no gramsPerEach`);
    }
    // Grams per each doubles as ml per each for liquid items; density ~1 is
    // close enough for the volumes involved here.
    return qty * ing.gramsPerEach;
  }

  // Converting into a counted ingredient, e.g. 30 g of garlic on an 'each' item.
  if (base === 'each') {
    if (ing.gramsPerEach === undefined) {
      throw new UnitConversionError(`${ing.id}: counted item with no gramsPerEach`);
    }
    if (unit === 'g' || unit === 'ml') return qty / ing.gramsPerEach;
  }

  // g <-> ml, assuming density 1. True enough for stock, milk and thin sauces.
  if ((unit === 'g' && base === 'ml') || (unit === 'ml' && base === 'g')) return qty;

  throw new UnitConversionError(`${ing.id}: cannot convert ${unit} to ${base}`);
}

/** Human-readable quantity for the parts list: "1 tbsp", "250 ml", "2". */
export function formatQty(qty: number, unit: Unit): string {
  const n = Math.round(qty * 100) / 100;
  if (unit === 'each') return `${n}`;
  if (unit === 'tbsp' || unit === 'tsp') return `${n} ${unit}`;
  return `${n} ${unit}`;
}
