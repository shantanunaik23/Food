/**
 * Batch sizing — "do I make a full jar, half a jar, or skip it?"
 *
 * The brief is explicit: no full jar of curry paste for one dish. So demand is
 * taken from the dishes actually planned, compared against what a batch yields,
 * and then clamped by shelf life so the app never recommends making more than
 * can be eaten before it dies.
 *
 * Because the user does not log what is in the fridge, on-hand quantity is
 * inferred from the status they do maintain:
 *   stocked -> assume a full batch remains
 *   low     -> assume a quarter of a batch remains
 *   empty   -> nothing
 * That inference is stated in the rationale so the recommendation is auditable
 * rather than magic.
 */

import type { Component } from '../data/types';
import type { LibraryIndex } from './graph';
import type { UserState } from '../state/userState';
import { componentState } from '../state/userState';
import { daysBetween, todayISO } from './dates';
import type { ISODate } from './dates';
import { daysRemaining } from './shelfLife';

export const DEFAULT_HORIZON_DAYS = 14;

/** One occurrence of a dish on the plan. */
export interface PlannedDish {
  dishId: string;
  date: ISODate;
  /** Batch cooks draw several portions' worth of every component. */
  portions: number;
}

export type BatchSize = 'full' | 'half' | 'skip';

export interface DemandLine {
  dishId: string;
  dishName: string;
  date: ISODate;
  qty: number;
}

export interface BatchRecommendation {
  componentId: string;
  component: Component;
  /** Total drawn by planned dishes inside the horizon. */
  demand: number;
  /** Demand that actually falls within this batch's shelf life. */
  demandInShelfLife: number;
  /** Inferred from status — not logged by the user. */
  onHand: number;
  shortfall: number;
  size: BatchSize;
  /** Whole batches to make. 0 when skipping, >1 when one batch is not enough. */
  batches: number;
  /** The arithmetic, shown to the user rather than hidden. */
  rationale: string;
  lines: DemandLine[];
  /** Sorts the Blocks view: higher is more urgent. */
  urgency: number;
}

/** Fraction of a batch assumed present for each status. */
const ON_HAND_FRACTION: Record<string, number> = { stocked: 1, low: 0.25, empty: 0 };

export function demandFor(
  index: LibraryIndex,
  componentId: string,
  planned: PlannedDish[],
): DemandLine[] {
  const lines: DemandLine[] = [];
  for (const p of planned) {
    const dish = index.dish.get(p.dishId);
    if (!dish) continue;
    for (const ref of [...dish.preparations, ...dish.bases]) {
      if (ref.id !== componentId) continue;
      lines.push({
        dishId: dish.id,
        dishName: dish.name,
        date: p.date,
        qty: ref.qty * p.portions,
      });
    }
  }
  return lines;
}

export function recommendBatch(
  index: LibraryIndex,
  component: Component,
  planned: PlannedDish[],
  state: UserState,
  today: ISODate = todayISO(),
  horizonDays: number = DEFAULT_HORIZON_DAYS,
): BatchRecommendation {
  const cs = componentState(state, component.id);
  const unit = component.yieldUnit;

  const lines = demandFor(index, component.id, planned).filter((l) => {
    const offset = daysBetween(today, l.date);
    return offset >= 0 && offset <= horizonDays;
  });

  const demand = lines.reduce((sum, l) => sum + l.qty, 0);

  // A fresh batch made today lasts shelfLifeDays; demand beyond that cannot be
  // served by this batch however much you make.
  const demandInShelfLife = lines
    .filter((l) => daysBetween(today, l.date) < component.shelfLifeDays)
    .reduce((sum, l) => sum + l.qty, 0);

  const remaining = daysRemaining(component, cs, today);
  const expired = remaining !== null && remaining <= 0;
  const onHandFraction = expired ? 0 : (ON_HAND_FRACTION[cs.status] ?? 0);
  const onHand = component.yieldAmount * onHandFraction;

  const shortfall = Math.max(0, Math.min(demandInShelfLife, demand) - onHand);

  let size: BatchSize;
  let rationale: string;
  /** How many whole batches to make, when one is not enough. */
  let batches = 0;

  const dishCount = lines.length;
  const demandStr = `${dishCount} dish${dishCount === 1 ? '' : 'es'} × ${unit === 'each' ? '' : ''}${round(demand / Math.max(dishCount, 1))}${unit} = ${round(demand)}${unit}`;

  if (dishCount === 0) {
    size = 'skip';
    rationale = expired
      ? `Nothing planned needs this in the next ${horizonDays} days, but the batch has expired — bin it.`
      : `Nothing planned needs this in the next ${horizonDays} days → SKIP`;
  } else if (shortfall <= 0) {
    size = 'skip';
    rationale =
      onHand > 0
        ? `${demandStr}, and you have about ${round(onHand)}${unit} (${cs.status}) → SKIP`
        : `${demandStr}, none needed within shelf life → SKIP`;
  } else {
    const ratio = shortfall / component.yieldAmount;
    size = ratio > 0.6 ? 'full' : 'half';
    batches = ratio > 1 ? Math.ceil(ratio) : 1;

    const batchLabel =
      batches > 1
        ? `${batches} × ${round(component.yieldAmount)}${unit} batch`
        : `${round(component.yieldAmount)}${unit} batch`;
    const parts = [`${demandStr} of ${batchLabel}`];
    if (onHand > 0) parts.push(`${round(onHand)}${unit} on hand (${cs.status})`);
    if (demandInShelfLife < demand) {
      parts.push(
        `only ${round(demandInShelfLife)}${unit} falls inside the ${component.shelfLifeDays} d shelf life`,
      );
    } else {
      parts.push(`${component.shelfLifeDays} d shelf life covers the ${horizonDays} d horizon`);
    }
    const verdict =
      batches > 1 ? `${batches} FULL BATCHES` : size === 'full' ? 'FULL BATCH' : 'HALF BATCH';
    rationale = `${parts.join(' · ')} → ${verdict}`;
  }

  // Urgency: blocking something planned beats merely expiring.
  let urgency = 0;
  if (size !== 'skip') urgency += 50;
  if (cs.status === 'empty' && dishCount > 0) urgency += 40;
  if (expired) urgency += 30;
  if (remaining !== null && remaining > 0 && remaining <= 2) urgency += 20;
  urgency += Math.min(dishCount * 3, 15);
  // The keystone: whatever the most depended-on preparation is, it matters more.
  urgency += Math.min((index.dishesByComponent.get(component.id)?.length ?? 0), 10);

  return {
    componentId: component.id,
    component,
    demand,
    demandInShelfLife,
    onHand,
    shortfall,
    size,
    batches,
    rationale,
    lines,
    urgency,
  };
}

export function allBatchRecommendations(
  index: LibraryIndex,
  planned: PlannedDish[],
  state: UserState,
  today: ISODate = todayISO(),
  horizonDays: number = DEFAULT_HORIZON_DAYS,
): BatchRecommendation[] {
  return [...index.component.values()]
    .map((c) => recommendBatch(index, c, planned, state, today, horizonDays))
    .sort((a, b) => b.urgency - a.urgency);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
