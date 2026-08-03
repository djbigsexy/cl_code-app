/**
 * Date helpers for billing math.
 *
 * Dates are handled as calendar days (`YYYY-MM-DD`) in UTC, never as local
 * `Date` objects, so a user in UTC-8 doesn't see a bill land a day early.
 */

export type ISODate = string; // YYYY-MM-DD

const DAY_MS = 86_400_000;

export function toUTC(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

export function fromUTC(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function today(): ISODate {
  return new Date().toISOString().slice(0, 10);
}

export function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toUTC(value).getTime());
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(new Date(toUTC(date).getTime() + days * DAY_MS));
}

/**
 * Add whole months, clamping the day-of-month to the target month's length.
 * Jan 31 + 1 month === Feb 28 (or 29). This matches how billing systems roll a
 * charge that falls on a day the next month doesn't have.
 */
export function addMonths(date: ISODate, months: number): ISODate {
  const d = toUTC(date);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const daysInTarget = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, daysInTarget));
  return fromUTC(target);
}

/** Whole days from `a` to `b`; negative when `b` is earlier. */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / DAY_MS);
}

export function compareDates(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "Mar 14, 2026" — formatted from the string, so no timezone shifting. */
export function formatDate(date: ISODate): string {
  if (!isValidDate(date)) return '—';
  const d = toUTC(date);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "in 3 days", "today", "12 days ago". */
export function formatRelative(date: ISODate, from: ISODate = today()): string {
  const diff = daysBetween(from, date);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}
