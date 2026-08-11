/**
 * Dates are stored as plain 'YYYY-MM-DD' strings throughout.
 *
 * Deliberately not Date objects: shelf-life countdowns are about calendar days,
 * not instants, and a Date carries a time and a timezone that make "made on
 * Tuesday, keeps 4 days" ambiguous across a clock change.
 */

export type ISODate = string;

export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISO(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: ISODate, days: number): ISODate {
  const dt = parseISO(date);
  dt.setDate(dt.getDate() + days);
  return todayISO(dt);
}

/** Whole calendar days from `from` to `to`. Negative if `to` is in the past. */
export function daysBetween(from: ISODate, to: ISODate): number {
  const a = parseISO(from).getTime();
  const b = parseISO(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** The Monday of the week containing `date`. */
export function startOfWeek(date: ISODate): ISODate {
  const dt = parseISO(date);
  const day = dt.getDay(); // 0 = Sunday
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayName(date: ISODate): string {
  return DAY_NAMES[parseISO(date).getDay()] ?? '';
}

export function shortDayName(date: ISODate): string {
  return dayName(date).slice(0, 3).toUpperCase();
}

export function formatShort(date: ISODate): string {
  const dt = parseISO(date);
  return `${dt.getDate()} ${MONTH_NAMES[dt.getMonth()] ?? ''}`;
}

/** Saturday and Sunday get a longer cooking budget. */
export function isWeekend(date: ISODate): boolean {
  const day = parseISO(date).getDay();
  return day === 0 || day === 6;
}
