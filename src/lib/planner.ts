/**
 * Week generation.
 *
 * A constraint-satisfying greedy pass rather than a solver: the search space is
 * 30 dishes over 7 days, and a greedy pass with a scoring function produces
 * good plans instantly and stays explainable, which matters more here than
 * optimality. Every rejection reason is recoverable, so the generator degrades
 * by relaxing soft preferences rather than failing to produce a week.
 *
 * Hard constraints (never violated):
 *   · the dish fits the day's hands-on budget
 *   · never the same protein two days running
 *   · no more than N chicken days per week (default 3)
 *   · no dish twice in one week
 *   · locked days are untouched
 *
 * Soft preferences (scored):
 *   · prefer dishes whose preparations are stocked
 *   · bonus for techniques not yet cooked, so the stocked-preps preference
 *     cannot starve the learning dishes
 *   · penalty for anything cooked recently
 *   · at least one learning dish per week, enforced by a repair pass
 */

import type { Dish } from '../data/types';
import type { LibraryIndex } from './graph';
import type { DayPlan, SecondaryTask, UserState, WeekPlan } from '../state/userState';
import { componentState, freezerPortions, learnedTechniques } from '../state/userState';
import { addDays, daysBetween, isWeekend, todayISO } from './dates';
import type { ISODate } from './dates';
import { isAvailable } from './shelfLife';
import { allBatchRecommendations, type PlannedDish } from './batching';

export interface PlanContext {
  index: LibraryIndex;
  state: UserState;
  today: ISODate;
}

const RECENT_DAYS = 21;

export function budgetFor(state: UserState, date: ISODate): number {
  return isWeekend(date) ? state.settings.weekendBudgetMin : state.settings.weekdayBudgetMin;
}

function isChicken(dish: Dish): boolean {
  return dish.protein.toLowerCase().includes('chicken');
}

/** Are all the preparations this dish needs actually usable today? */
export function preparationsAvailable(ctx: PlanContext, dish: Dish): boolean {
  return missingPreparations(ctx, dish).length === 0;
}

/** Which of a dish's preparations are empty or expired right now. */
export function missingPreparations(ctx: PlanContext, dish: Dish): string[] {
  const missing: string[] = [];
  for (const ref of [...dish.preparations, ...dish.bases]) {
    const component = ctx.index.component.get(ref.id);
    if (!component) continue;
    // Bases are made to order, so an empty base never blocks a dish.
    if (component.kind === 'base') continue;
    if (!isAvailable(component, componentState(ctx.state, ref.id), ctx.today)) {
      missing.push(ref.id);
    }
  }
  return missing;
}

function daysSinceCooked(state: UserState, dishId: string, today: ISODate): number | null {
  let newest: ISODate | null = null;
  for (const entry of state.cooked) {
    if (entry.dishId !== dishId) continue;
    if (!newest || entry.date > newest) newest = entry.date;
  }
  return newest ? daysBetween(newest, today) : null;
}

function scoreDish(
  ctx: PlanContext,
  dish: Dish,
  learned: Set<string>,
  needLearning: boolean,
  /**
   * Minutes a batch cook needs on this day, when the freezer is low enough that
   * one is due. A 25-minute dinner leaves no room for it, so quick dinners are
   * worth more on the days lunch has to be banked.
   */
  batchCookPressure = 0,
): number {
  let score = 0;

  if (batchCookPressure > 0) {
    const room = ctx.state.settings.weekdayBudgetMin - dish.activeMinutes;
    score += room >= batchCookPressure ? 35 : -25;
  }

  const missing = missingPreparations(ctx, dish);
  score += missing.length === 0 ? 30 : -15 * missing.length;

  const newTechniques = dish.techniques.filter((t) => !learned.has(t)).length;
  score += Math.min(newTechniques * 25, 50);

  if (dish.learning) score += needLearning ? 45 : 10;

  const since = daysSinceCooked(ctx.state, dish.id, ctx.today);
  if (since !== null && since < RECENT_DAYS) score -= 30 - since;

  // Break ties differently on each regenerate.
  score += Math.random() * 12;

  return score;
}

interface DinnerSelection {
  byDate: Map<ISODate, string>;
  chickenDays: number;
}

function selectDinners(
  ctx: PlanContext,
  dates: ISODate[],
  locked: Map<ISODate, DayPlan>,
): DinnerSelection {
  const learned = learnedTechniques(ctx.state, (id) => ctx.index.dish.get(id)?.techniques ?? []);
  const candidates = [...ctx.index.dish.values()].filter((d) => d.slots.includes('dinner'));

  const byDate = new Map<ISODate, string>();
  const used = new Set<string>();
  let chickenDays = 0;

  // How much banked lunch there is, and the cheapest batch cook that could top
  // it up. Both feed the time-pressure nudge below.
  const bankedLunches = [...ctx.index.dish.values()]
    .filter((d) => d.slots.includes('lunch'))
    .reduce((sum, d) => sum + freezerPortions(ctx.state, d.id), 0);
  const cheapestBatchCook = Math.min(
    ...[...ctx.index.dish.values()]
      .filter((d) => d.slots.includes('lunch') && d.batch)
      .map(
        (d) =>
          d.activeMinutes +
          missingPreparations(ctx, d).reduce(
            (sum, id) => sum + (ctx.index.component.get(id)?.activeMinutes ?? 0),
            0,
          ),
      ),
  );

  // Locked days are fixed points; count them against the constraints.
  for (const date of dates) {
    const lockedDay = locked.get(date);
    if (lockedDay?.locked && lockedDay.dinnerId) {
      byDate.set(date, lockedDay.dinnerId);
      used.add(lockedDay.dinnerId);
      const dish = ctx.index.dish.get(lockedDay.dinnerId);
      if (dish && isChicken(dish)) chickenDays += 1;
    }
  }

  const hasLearning = () =>
    [...byDate.values()].some((id) => ctx.index.dish.get(id)?.learning === true);

  for (const date of dates) {
    if (byDate.has(date)) continue;

    const budget = budgetFor(ctx.state, date);
    const prevDate = addDays(date, -1);
    const nextDate = addDays(date, 1);
    const prevProtein = proteinOn(ctx, byDate, prevDate);
    const nextProtein = proteinOn(ctx, byDate, nextDate);

    const remainingSlots = dates.filter((d) => !byDate.has(d)).length;
    const needLearning = !hasLearning() && remainingSlots <= 3;

    const feasible = candidates.filter((dish) => {
      if (used.has(dish.id)) return false;
      if (dish.activeMinutes > budget) return false;
      if (prevProtein !== null && dish.protein === prevProtein) return false;
      if (nextProtein !== null && dish.protein === nextProtein) return false;
      if (isChicken(dish) && chickenDays >= ctx.state.settings.maxChickenDaysPerWeek) return false;
      return true;
    });

    if (feasible.length === 0) continue;

    // Leave room for a batch cook on days the freezer will still be low — but
    // only when some dish actually leaves that much room. On a 30-minute day
    // where the quickest dinner is 14 minutes and the cheapest batch is 20,
    // nudging toward quick dinners buys nothing and distorts the choice.
    const dayIndex = dates.indexOf(date);
    const quickest = Math.min(...feasible.map((d) => d.activeMinutes));
    const achievable = budget - quickest >= cheapestBatchCook;
    const pressure =
      !isWeekend(date) &&
      achievable &&
      bankedLunches - dayIndex < FREEZER_TARGET &&
      Number.isFinite(cheapestBatchCook)
        ? cheapestBatchCook
        : 0;

    const best = feasible
      .map((dish) => ({ dish, score: scoreDish(ctx, dish, learned, needLearning, pressure) }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best) continue;

    byDate.set(date, best.dish.id);
    used.add(best.dish.id);
    if (isChicken(best.dish)) chickenDays += 1;
  }

  repairLearning(ctx, dates, byDate, locked, used);

  return { byDate, chickenDays };
}

function proteinOn(
  ctx: PlanContext,
  byDate: Map<ISODate, string>,
  date: ISODate,
): string | null {
  const id = byDate.get(date);
  if (!id) return null;
  return ctx.index.dish.get(id)?.protein ?? null;
}

/**
 * Guarantee at least one learning dish. If the greedy pass produced none — it
 * can happen when the stocked-preparation bonus dominates — swap one in over
 * the least interesting unlocked day rather than regenerating the whole week.
 */
function repairLearning(
  ctx: PlanContext,
  dates: ISODate[],
  byDate: Map<ISODate, string>,
  locked: Map<ISODate, DayPlan>,
  used: Set<string>,
): void {
  const hasLearning = [...byDate.values()].some(
    (id) => ctx.index.dish.get(id)?.learning === true,
  );
  if (hasLearning) return;

  const learningDishes = [...ctx.index.dish.values()].filter(
    (d) => d.learning && d.slots.includes('dinner') && !used.has(d.id),
  );
  if (learningDishes.length === 0) return;

  for (const date of [...dates].reverse()) {
    if (locked.get(date)?.locked) continue;
    const budget = budgetFor(ctx.state, date);
    const prevProtein = proteinOn(ctx, byDate, addDays(date, -1));
    const nextProtein = proteinOn(ctx, byDate, addDays(date, 1));

    const fit = learningDishes.find(
      (d) =>
        d.activeMinutes <= budget &&
        d.protein !== prevProtein &&
        d.protein !== nextProtein,
    );
    if (!fit) continue;

    const displaced = byDate.get(date);
    if (displaced) used.delete(displaced);
    byDate.set(date, fit.id);
    used.add(fit.id);
    return;
  }
}

/**
 * Lunches come out of the freezer. Walk the week decrementing a projected
 * freezer count; where a day has nothing banked, that is a signal for a batch
 * cook, which is scheduled as a secondary task on an earlier day.
 */
/**
 * Target number of lunch portions to keep banked — a week's worth.
 *
 * This is a ceiling to cook toward, not a quota that forces cooking: a batch is
 * only ever scheduled on a day that has the spare minutes for it, which in
 * practice means the weekend. A 30-minute weekday cannot fit a dinner and a
 * 20-minute batch cook, and the plan should say so rather than pretend.
 */
const FREEZER_TARGET = 7;

/**
 * Walk the week forward, eating banked lunches and cooking a new batch whenever
 * the freezer runs low and the day has the spare minutes to do it.
 *
 * A batch cooked on a given day is banked that evening, so it is available from
 * the next day onward — which is why portions are added after that day's lunch
 * has already been drawn. An empty freezer on Monday genuinely means no packed
 * lunch on Monday; the plan shows that rather than inventing one.
 */
function simulateLunches(
  ctx: PlanContext,
  dates: ISODate[],
  dinnerByDate: Map<ISODate, string>,
): { lunchByDate: Map<ISODate, string>; batchTasks: Map<ISODate, SecondaryTask> } {
  const projected = new Map<string, number>();
  const lunchDishes = [...ctx.index.dish.values()].filter(
    (d) => d.slots.includes('lunch') && d.batch,
  );
  for (const dish of lunchDishes) {
    projected.set(dish.id, freezerPortions(ctx.state, dish.id));
  }

  const lunchByDate = new Map<ISODate, string>();
  const batchTasks = new Map<ISODate, SecondaryTask>();
  const cookedThisWeek = new Set<string>();

  for (const date of dates) {
    // Eat from whichever banked lunch has the most portions, for variety.
    const pick = [...projected.entries()]
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])[0];

    if (pick) {
      lunchByDate.set(date, pick[0]);
      projected.set(pick[0], pick[1] - 1);
    }

    // Cook another batch if the freezer is running down and today has room.
    const banked = [...projected.values()].reduce((sum, n) => sum + n, 0);
    if (banked >= FREEZER_TARGET) continue;

    const dinnerId = dinnerByDate.get(date);
    const dinner = dinnerId ? ctx.index.dish.get(dinnerId) : undefined;
    const free = budgetFor(ctx.state, date) - (dinner?.activeMinutes ?? 0);

    // A batch cook has to include making any preparation it needs but does not
    // have — otherwise the plan schedules a green curry on a day when the paste
    // does not exist yet.
    const costOf = (dish: Dish): number =>
      dish.activeMinutes +
      missingPreparations(ctx, dish).reduce(
        (sum, id) => sum + (ctx.index.component.get(id)?.activeMinutes ?? 0),
        0,
      );

    const onDinnerPlan = new Set(dinnerByDate.values());

    const candidate = lunchDishes
      .filter(
        (d) =>
          !cookedThisWeek.has(d.id) &&
          // Don't bank lunches of something already on the dinner plan — you
          // would be eating the same dish twice in one week.
          !onDinnerPlan.has(d.id) &&
          costOf(d) <= free,
      )
      // Most portions banked per minute of work, all-in.
      .sort((a, b) => (b.batch?.portions ?? 0) / costOf(b) - (a.batch?.portions ?? 0) / costOf(a))[0];

    if (!candidate?.batch) continue;

    const missing = missingPreparations(ctx, candidate);
    const missingNames = missing
      .map((id) => ctx.index.component.get(id)?.name)
      .filter((n): n is string => Boolean(n));

    const base =
      banked === 0
        ? `Nothing banked for lunch — cooks ${candidate.batch.portions} portions`
        : `Only ${banked} lunch${banked === 1 ? '' : 'es'} left — cooks ${candidate.batch.portions} more`;

    batchTasks.set(date, {
      kind: 'batch-cook',
      dishId: candidate.id,
      portions: candidate.batch.portions,
      minutes: costOf(candidate),
      reason: missingNames.length
        ? `${base} · includes making ${missingNames.join(' and ')}`
        : base,
    });
    cookedThisWeek.add(candidate.id);
    projected.set(candidate.id, (projected.get(candidate.id) ?? 0) + candidate.batch.portions);
  }

  return { lunchByDate, batchTasks };
}

/**
 * Fit one secondary task into what is left of the budget after the dinner.
 * A 28-minute dish on a 30-minute day gets nothing, which is the point.
 */
function assignSecondaryTasks(
  ctx: PlanContext,
  dates: ISODate[],
  dinnerByDate: Map<ISODate, string>,
  batchTasks: Map<ISODate, SecondaryTask>,
): Map<ISODate, SecondaryTask> {
  // Batch cooks are already placed and already checked against the budget.
  const tasks = new Map<ISODate, SecondaryTask>(batchTasks);

  /** Minutes still free on a day after the dinner and anything already placed. */
  const freeMinutes = (date: ISODate): number => {
    const dinnerId = dinnerByDate.get(date);
    const dinner = dinnerId ? ctx.index.dish.get(dinnerId) : undefined;
    const placed = tasks.get(date)?.minutes ?? 0;
    return budgetFor(ctx.state, date) - (dinner?.activeMinutes ?? 0) - placed;
  };

  const planned: PlannedDish[] = [
    ...dates
      .map((date) => ({ date, dishId: dinnerByDate.get(date) }))
      .filter((p): p is { date: ISODate; dishId: string } => Boolean(p.dishId))
      .map((p) => ({ dishId: p.dishId, date: p.date, portions: 1 })),
    ...[...batchTasks.entries()]
      .map(([date, task]) =>
        task.kind === 'batch-cook'
          ? { dishId: task.dishId, date, portions: task.portions }
          : null,
      )
      .filter((p): p is PlannedDish => p !== null),
  ];

  const recommendations = allBatchRecommendations(
    ctx.index,
    planned,
    ctx.state,
    ctx.today,
  ).filter((r) => r.size !== 'skip' && r.component.kind === 'preparation');

  const assigned = new Set<string>();

  for (const date of dates) {
    if (tasks.has(date)) continue;

    const remaining = freeMinutes(date);
    if (remaining < 5) continue;

    const rec = recommendations.find(
      (r) => !assigned.has(r.componentId) && r.component.activeMinutes <= remaining,
    );
    if (!rec) continue;

    assigned.add(rec.componentId);

    // Is it blocking something later this week, or just running low?
    const blockedDish = dates
      .filter((d) => d > date)
      .map((d) => dinnerByDate.get(d))
      .map((id) => (id ? ctx.index.dish.get(id) : undefined))
      .find((dish) => dish?.preparations.some((p) => p.id === rec.componentId));

    tasks.set(date, {
      kind: blockedDish ? 'prep-ahead' : 'restock',
      componentId: rec.componentId,
      size: rec.size,
      minutes: rec.component.activeMinutes,
      forDishId: blockedDish?.id ?? '',
      reason: blockedDish
        ? `Needed for ${blockedDish.name}`
        : rec.rationale,
    } as SecondaryTask);
  }

  return tasks;
}

export function generateWeek(
  ctx: PlanContext,
  startDate: ISODate,
  existing?: WeekPlan | null,
): WeekPlan {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const locked = new Map<ISODate, DayPlan>();
  if (existing) {
    for (const day of existing.days) locked.set(day.date, day);
  }

  const { byDate: dinnerByDate } = selectDinners(ctx, dates, locked);
  const { lunchByDate, batchTasks } = simulateLunches(ctx, dates, dinnerByDate);
  const tasks = assignSecondaryTasks(ctx, dates, dinnerByDate, batchTasks);

  return {
    startDate,
    days: dates.map((date) => {
      const lockedDay = locked.get(date);
      if (lockedDay?.locked) return lockedDay;
      return {
        date,
        dinnerId: dinnerByDate.get(date) ?? null,
        lunchId: lunchByDate.get(date) ?? null,
        secondaryTask: tasks.get(date) ?? null,
        locked: false,
      };
    }),
  };
}

/** Swap a single day for a different dinner, respecting the same constraints. */
export function alternativesFor(
  ctx: PlanContext,
  plan: WeekPlan,
  date: ISODate,
): Dish[] {
  const budget = budgetFor(ctx.state, date);
  const dayIndex = plan.days.findIndex((d) => d.date === date);
  const prev = plan.days[dayIndex - 1]?.dinnerId;
  const next = plan.days[dayIndex + 1]?.dinnerId;
  const prevProtein = prev ? ctx.index.dish.get(prev)?.protein : undefined;
  const nextProtein = next ? ctx.index.dish.get(next)?.protein : undefined;
  const usedElsewhere = new Set(
    plan.days.filter((d) => d.date !== date).map((d) => d.dinnerId),
  );

  const learned = learnedTechniques(ctx.state, (id) => ctx.index.dish.get(id)?.techniques ?? []);

  return [...ctx.index.dish.values()]
    .filter(
      (dish) =>
        dish.slots.includes('dinner') &&
        !usedElsewhere.has(dish.id) &&
        dish.activeMinutes <= budget &&
        dish.protein !== prevProtein &&
        dish.protein !== nextProtein,
    )
    .sort((a, b) => scoreDish(ctx, b, learned, false) - scoreDish(ctx, a, learned, false));
}

/** Every dish occurrence on the plan, for batch sizing and shopping. */
export function plannedDishes(plan: WeekPlan): PlannedDish[] {
  const out: PlannedDish[] = [];
  for (const day of plan.days) {
    if (day.dinnerId) out.push({ dishId: day.dinnerId, date: day.date, portions: 1 });
    if (day.secondaryTask?.kind === 'batch-cook') {
      out.push({
        dishId: day.secondaryTask.dishId,
        date: day.date,
        portions: day.secondaryTask.portions,
      });
    }
  }
  return out;
}

export function emptyPlan(startDate: ISODate = todayISO()): WeekPlan {
  return {
    startDate,
    days: Array.from({ length: 7 }, (_, i) => ({
      date: addDays(startDate, i),
      dinnerId: null,
      lunchId: null,
      secondaryTask: null,
      locked: false,
    })),
  };
}
