/**
 * Shopping list generation.
 *
 * The weekly/top-up split is not a hardcoded tier rule — it is derived from
 * physics. An ingredient goes in the midweek top-up when its shelf life is
 * shorter than the gap between the weekend shop and the day you actually need
 * it. That is why fresh fish, steak and soft herbs land in the top-up on their
 * own, without anything being labelled "top-up" by hand.
 *
 * Anything already ticked in the pantry is excluded; unticked tier-0 items that
 * the week's plan requires are surfaced, because a missing cupboard staple is
 * exactly the failure that ruins a Tuesday.
 */

import type { Ingredient, Section } from '../data/types';
import type { LibraryIndex } from './graph';
import { flattenDish } from './graph';
import type { UserState } from '../state/userState';
import { isOwned } from '../state/userState';
import type { PlannedDish } from './batching';
import { addDays, daysBetween } from './dates';
import type { ISODate } from './dates';
import { toBaseAmount } from './units';

/** Aisle order, so the list walks the shop rather than the alphabet. */
export const SECTION_ORDER: Section[] = [
  'produce',
  'meat',
  'fish',
  'dairy',
  'bakery',
  'tinned',
  'dry goods',
  'spices',
  'asian aisle',
  'world foods',
  'condiments',
  'freezer',
];

export interface ShoppingItem {
  ingredientId: string;
  name: string;
  section: Section;
  tier: number;
  amount: number;
  unit: string;
  /** Dish names that drove this line, for "why is this on my list?". */
  neededFor: string[];
  /** Earliest date it is needed. */
  neededBy: ISODate;
  /** True for tier-0 cupboard items not yet ticked in the pantry. */
  isPantryGap: boolean;
}

export interface SectionGroup {
  section: Section;
  items: ShoppingItem[];
}

export interface ShoppingList {
  /** Bought at the weekend shop. */
  weekly: SectionGroup[];
  /** Bought at the midweek top-up, because it will not survive from the weekend. */
  topUp: SectionGroup[];
  /** Date the top-up is assumed to happen. */
  topUpDate: ISODate;
  shopDate: ISODate;
  totalLines: number;
}

interface Accumulated {
  ingredient: Ingredient;
  amount: number;
  neededFor: Set<string>;
  neededBy: ISODate;
}

export function buildShoppingList(
  index: LibraryIndex,
  planned: PlannedDish[],
  state: UserState,
  weekStart: ISODate,
  /**
   * Preparations you are actually going to make this week, from the batch
   * sizing pass. Ingredients for a preparation you already have stocked must
   * not appear on the list — otherwise the plan sends you out for 1.5 kg of
   * chicken wings to make stock that is sitting in the freezer.
   *
   * Bases (rice, noodles, tortillas) are always made to order, so their
   * ingredients are always included.
   */
  componentsToMake: ReadonlySet<string> = new Set(),
): ShoppingList {
  // The weekend shop happens the day before the week starts; the top-up
  // partway through.
  const shopDate = addDays(weekStart, -1);
  const topUpDate = addDays(weekStart, 3);

  const acc = new Map<string, Accumulated>();

  for (const p of planned) {
    const dish = index.dish.get(p.dishId);
    if (!dish) continue;

    const demands = flattenDish(index, dish, (qty, unit, ing) =>
      toBaseAmount(qty, unit as Parameters<typeof toBaseAmount>[1], ing),
    );

    for (const d of demands) {
      const ingredient = index.ingredient.get(d.ingredientId);
      if (!ingredient) continue;

      // Skip ingredients that only exist to build a preparation we already have.
      if (d.via !== 'fresh') {
        const component = index.component.get(d.via.componentId);
        const madeToOrder = component?.kind === 'base';
        if (!madeToOrder && !componentsToMake.has(d.via.componentId)) continue;
      }

      const existing = acc.get(d.ingredientId);
      const amount = d.amount * p.portions;
      if (existing) {
        existing.amount += amount;
        existing.neededFor.add(dish.name);
        if (p.date < existing.neededBy) existing.neededBy = p.date;
      } else {
        acc.set(d.ingredientId, {
          ingredient,
          amount,
          neededFor: new Set([dish.name]),
          neededBy: p.date,
        });
      }
    }
  }

  const weekly: ShoppingItem[] = [];
  const topUp: ShoppingItem[] = [];

  for (const entry of acc.values()) {
    const ing = entry.ingredient;

    // Cupboard staples you already own are not shopping.
    const owned = isOwned(state, ing.id);
    const isPantryGap = ing.tier === 0 && !owned;
    if (owned) continue;
    // Water is listed in recipes so quantities balance; nobody shops for it.
    if (ing.id === 'water') continue;

    const item: ShoppingItem = {
      ingredientId: ing.id,
      name: ing.name,
      section: ing.section,
      tier: ing.tier,
      amount: roundForShopping(entry.amount, ing.defaultUnit),
      unit: ing.defaultUnit,
      neededFor: [...entry.neededFor],
      neededBy: entry.neededBy,
      isPantryGap,
    };

    // Will it survive from the weekend shop to the day it is needed?
    const daysOnShelf = daysBetween(shopDate, entry.neededBy);
    const survivesWeeklyShop = ing.shelfLifeDays >= daysOnShelf;
    // No point putting something in the top-up that is needed before it.
    const neededAfterTopUp = entry.neededBy >= topUpDate;

    if (!survivesWeeklyShop && neededAfterTopUp) topUp.push(item);
    else weekly.push(item);
  }

  return {
    weekly: group(weekly),
    topUp: group(topUp),
    shopDate,
    topUpDate,
    totalLines: weekly.length + topUp.length,
  };
}

function group(items: ShoppingItem[]): SectionGroup[] {
  const bySection = new Map<Section, ShoppingItem[]>();
  for (const item of items) {
    const list = bySection.get(item.section);
    if (list) list.push(item);
    else bySection.set(item.section, [item]);
  }

  return SECTION_ORDER.filter((s) => bySection.has(s)).map((section) => ({
    section,
    items: (bySection.get(section) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

/**
 * Round up to something you can actually buy. Nobody weighs out 43 g of onion,
 * and a list that says 43 g reads as false precision.
 */
function roundForShopping(amount: number, unit: string): number {
  if (unit === 'each') return Math.ceil(amount * 2) / 2;
  if (amount < 10) return Math.ceil(amount);
  if (amount < 100) return Math.ceil(amount / 5) * 5;
  return Math.ceil(amount / 10) * 10;
}
