/**
 * User state — everything the app knows that is not content.
 *
 * Kept entirely separate from src/data and referencing it only by id, so
 * editing the library by hand never invalidates saved state. Unknown ids are
 * ignored on read rather than throwing, which means a dish you delete from the
 * library does not brick a saved plan.
 *
 * The design constraint from the brief: the only state the user maintains by
 * hand is ticking pantry items and marking preparations stocked/low/empty.
 * Everything else is derived or recorded automatically.
 */

import type { ISODate } from '../lib/dates';
import { todayISO, startOfWeek } from '../lib/dates';

export const STATE_VERSION = 1;

export type StockStatus = 'stocked' | 'low' | 'empty';

export interface ComponentState {
  status: StockStatus;
  /** ISO date the current batch was made. Drives the shelf-life countdown. */
  madeOn: ISODate | null;
}

/**
 * A secondary task is the one extra job that fits in what is left of the
 * 30-minute budget after the day's dinner.
 */
export type SecondaryTask =
  | {
      kind: 'restock';
      componentId: string;
      size: 'full' | 'half';
      minutes: number;
      /** Why now — shown on the day card. */
      reason: string;
    }
  | {
      kind: 'batch-cook';
      dishId: string;
      portions: number;
      minutes: number;
      reason: string;
    }
  | {
      kind: 'prep-ahead';
      componentId: string;
      forDishId: string;
      minutes: number;
      reason: string;
    };

export interface DayPlan {
  date: ISODate;
  dinnerId: string | null;
  /** Lunch is eaten from the freezer; null means nothing banked for that day. */
  lunchId: string | null;
  secondaryTask: SecondaryTask | null;
  /** A locked day is a fixed point the generator plans around. */
  locked: boolean;
}

export interface WeekPlan {
  startDate: ISODate;
  days: DayPlan[];
}

export interface Settings {
  /** Hands-on minutes available on a weekday. Unattended oven time is free. */
  weekdayBudgetMin: number;
  weekendBudgetMin: number;
  /** Breakfast is out of scope but still counts toward the daily total. */
  breakfastKcal: number;
  breakfastProteinG: number;
  targetKcal: number;
  targetProteinG: number;
  maxChickenDaysPerWeek: number;
}

export interface CookedEntry {
  dishId: string;
  date: ISODate;
}

export interface UserState {
  version: number;
  profileName: string;
  /** ingredientId -> owned. Absent means not owned. */
  pantry: Record<string, boolean>;
  /** preparation or base id -> stock state. */
  components: Record<string, ComponentState>;
  /** dishId -> portions currently in the freezer. */
  freezer: Record<string, number>;
  cooked: CookedEntry[];
  plan: WeekPlan | null;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  weekdayBudgetMin: 30,
  weekendBudgetMin: 90,
  breakfastKcal: 500,
  breakfastProteinG: 25,
  targetKcal: 2300,
  targetProteinG: 150,
  maxChickenDaysPerWeek: 3,
};

export function createUserState(profileName: string): UserState {
  return {
    version: STATE_VERSION,
    profileName,
    pantry: {},
    components: {},
    freezer: {},
    cooked: [],
    plan: null,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function componentState(state: UserState, id: string): ComponentState {
  return state.components[id] ?? { status: 'empty', madeOn: null };
}

export function isOwned(state: UserState, ingredientId: string): boolean {
  return state.pantry[ingredientId] === true;
}

export function freezerPortions(state: UserState, dishId: string): number {
  return state.freezer[dishId] ?? 0;
}

/** Technique ids the user has actually cooked, derived from the cooked log. */
export function learnedTechniques(
  state: UserState,
  dishTechniques: (dishId: string) => string[],
): Set<string> {
  const learned = new Set<string>();
  for (const entry of state.cooked) {
    for (const t of dishTechniques(entry.dishId)) learned.add(t);
  }
  return learned;
}

export function currentWeekStart(): ISODate {
  return startOfWeek(todayISO());
}

/**
 * Migrate a state object loaded from storage or an import file. Returns null if
 * it is not recognisably our shape, so the caller can refuse it rather than
 * half-loading something and corrupting the profile.
 */
export function migrateState(raw: unknown): UserState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Partial<UserState>;
  if (typeof obj.version !== 'number') return null;

  const base = createUserState(
    typeof obj.profileName === 'string' ? obj.profileName : 'default',
  );

  return {
    ...base,
    pantry: isRecordOf(obj.pantry, 'boolean') ? obj.pantry : {},
    components: sanitiseComponents(obj.components),
    freezer: isRecordOf(obj.freezer, 'number') ? obj.freezer : {},
    cooked: Array.isArray(obj.cooked)
      ? obj.cooked.filter(
          (c): c is CookedEntry =>
            typeof c === 'object' && c !== null &&
            typeof (c as CookedEntry).dishId === 'string' &&
            typeof (c as CookedEntry).date === 'string',
        )
      : [],
    plan: sanitisePlan(obj.plan),
    settings: { ...DEFAULT_SETTINGS, ...(obj.settings ?? {}) },
    version: STATE_VERSION,
  };
}

function isRecordOf(v: unknown, type: 'boolean' | 'number'): v is Record<string, never> {
  if (typeof v !== 'object' || v === null) return false;
  return Object.values(v).every((x) => typeof x === type);
}

function sanitiseComponents(v: unknown): Record<string, ComponentState> {
  if (typeof v !== 'object' || v === null) return {};
  const out: Record<string, ComponentState> = {};
  for (const [key, value] of Object.entries(v)) {
    if (typeof value !== 'object' || value === null) continue;
    const cs = value as Partial<ComponentState>;
    if (cs.status !== 'stocked' && cs.status !== 'low' && cs.status !== 'empty') continue;
    out[key] = {
      status: cs.status,
      madeOn: typeof cs.madeOn === 'string' ? cs.madeOn : null,
    };
  }
  return out;
}

function sanitisePlan(v: unknown): WeekPlan | null {
  if (typeof v !== 'object' || v === null) return null;
  const plan = v as Partial<WeekPlan>;
  if (typeof plan.startDate !== 'string' || !Array.isArray(plan.days)) return null;
  return {
    startDate: plan.startDate,
    days: plan.days.filter(
      (d): d is DayPlan => typeof d === 'object' && d !== null && typeof d.date === 'string',
    ),
  };
}
