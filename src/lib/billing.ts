import type { Frequency, Subscription } from '../types';
import { addDays, addMonths, daysBetween, toUTC, today, type ISODate } from './dates';

interface CycleInfo {
  label: string;
  /** Short suffix for prices, e.g. "$12.99/mo". */
  short: string;
  /** Day-stepped cycles are exact; month-stepped ones clamp the day-of-month. */
  kind: 'day' | 'month';
  step: number;
  /** Used to normalize different cadences onto a common monthly/yearly figure. */
  perYear: number;
}

export const FREQUENCIES: Record<Frequency, CycleInfo> = {
  weekly: { label: 'Weekly', short: 'wk', kind: 'day', step: 7, perYear: 365.25 / 7 },
  biweekly: { label: 'Every 2 weeks', short: '2wk', kind: 'day', step: 14, perYear: 365.25 / 14 },
  monthly: { label: 'Monthly', short: 'mo', kind: 'month', step: 1, perYear: 12 },
  quarterly: { label: 'Quarterly', short: 'qtr', kind: 'month', step: 3, perYear: 4 },
  semiannual: { label: 'Every 6 months', short: '6mo', kind: 'month', step: 6, perYear: 2 },
  annual: { label: 'Annually', short: 'yr', kind: 'month', step: 12, perYear: 1 },
};

export const FREQUENCY_ORDER: Frequency[] = [
  'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual',
];

/** The date of the `n`-th charge (0-indexed: charge 0 is the anchor itself). */
export function nthBillingDate(anchor: ISODate, frequency: Frequency, n: number): ISODate {
  const cycle = FREQUENCIES[frequency];
  return cycle.kind === 'day'
    ? addDays(anchor, cycle.step * n)
    : addMonths(anchor, cycle.step * n);
}

/**
 * How many charges have landed on or before `asOf`, counting the anchor as
 * charge #1. Returns 0 when the schedule hasn't started yet.
 */
export function billingsElapsed(
  anchor: ISODate,
  frequency: Frequency,
  asOf: ISODate,
): number {
  if (asOf < anchor) return 0;
  const cycle = FREQUENCIES[frequency];

  if (cycle.kind === 'day') {
    return Math.floor(daysBetween(anchor, asOf) / cycle.step) + 1;
  }

  // Month-stepped: estimate from the raw month difference, then correct for
  // day-of-month clamping (which can put the estimate one cycle off).
  const a = toUTC(anchor);
  const b = toUTC(asOf);
  const monthDiff =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  let k = Math.floor(monthDiff / cycle.step);
  while (k > 0 && nthBillingDate(anchor, frequency, k) > asOf) k--;
  while (nthBillingDate(anchor, frequency, k + 1) <= asOf) k++;
  return k + 1;
}

export type DerivedStatus = 'active' | 'paused' | 'canceled' | 'completed' | 'scheduled';

export interface Schedule {
  status: DerivedStatus;
  /** Charges that have already gone through. */
  paymentsMade: number;
  /** Only meaningful for fixed-term plans. */
  paymentsRemaining: number | null;
  /** `null` when nothing further is scheduled (paused, canceled, or finished). */
  nextBillingDate: ISODate | null;
  /** Last charge of a fixed-term plan; `null` for ongoing subscriptions. */
  finalPaymentDate: ISODate | null;
  /** Cost per cycle normalized to a month, and to a year. */
  monthlyCost: number;
  annualCost: number;
  /** What's left to pay on a fixed-term plan. */
  remainingCost: number | null;
}

/**
 * Everything time-dependent about a subscription, computed fresh rather than
 * stored — so a plan that finishes its last payment reports itself as complete
 * without anything having to run on a schedule.
 */
export function getSchedule(sub: Subscription, asOf: ISODate = today()): Schedule {
  const cycle = FREQUENCIES[sub.frequency];
  const monthlyCost = (sub.amount * cycle.perYear) / 12;
  const annualCost = sub.amount * cycle.perYear;

  // Paused and canceled subscriptions stop accruing charges on the day they
  // stopped, so the counts freeze rather than drifting upward.
  const effectiveAsOf =
    sub.status === 'paused' && sub.pausedOn
      ? sub.pausedOn
      : sub.status === 'canceled' && sub.canceledOn
        ? sub.canceledOn
        : asOf;

  // While paused there is no active run to count — `paymentsCarried` already
  // holds everything charged up to the moment it was paused.
  const runElapsed =
    sub.status === 'paused'
      ? 0
      : billingsElapsed(sub.billingAnchor, sub.frequency, effectiveAsOf);
  const elapsed = sub.paymentsCarried + runElapsed;

  const isFixed = sub.termType === 'fixed' && !!sub.totalPayments;
  const total = sub.totalPayments ?? 0;

  const paymentsMade = isFixed ? Math.min(elapsed, total) : elapsed;
  const paymentsRemaining = isFixed ? Math.max(0, total - elapsed) : null;
  // The last charge of the plan, counting from the current run's anchor and
  // discounting whatever was already paid in earlier runs.
  const finalPaymentDate = isFixed
    ? nthBillingDate(sub.billingAnchor, sub.frequency, Math.max(0, total - sub.paymentsCarried - 1))
    : null;

  let status: DerivedStatus;
  if (sub.status === 'canceled') status = 'canceled';
  else if (isFixed && paymentsRemaining === 0) status = 'completed';
  else if (sub.status === 'paused') status = 'paused';
  else if (elapsed === 0) status = 'scheduled';
  else status = 'active';

  const nextBillingDate =
    status === 'active' || status === 'scheduled'
      ? nthBillingDate(sub.billingAnchor, sub.frequency, runElapsed)
      : null;

  return {
    status,
    paymentsMade,
    paymentsRemaining,
    nextBillingDate,
    finalPaymentDate,
    monthlyCost,
    annualCost,
    remainingCost: paymentsRemaining === null ? null : paymentsRemaining * sub.amount,
  };
}

/** True when this subscription is currently costing money. */
export function isBilling(status: DerivedStatus): boolean {
  return status === 'active' || status === 'scheduled';
}

/**
 * Freeze billing. Charges made so far are banked into `paymentsCarried`, and
 * the unused remainder of the current paid period is recorded so `resume` can
 * give it back.
 */
export function pause(sub: Subscription, on: ISODate = today()): Subscription {
  if (sub.status === 'paused') return sub;
  const schedule = getSchedule(sub, on);
  return {
    ...sub,
    status: 'paused',
    pausedOn: on,
    paymentsCarried: schedule.paymentsMade,
    pauseCycleDaysRemaining: schedule.nextBillingDate
      ? Math.max(0, daysBetween(on, schedule.nextBillingDate))
      : 0,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Restart billing. The next charge lands after the service you had already paid
 * for runs out, so the whole schedule slides by the length of the pause without
 * any completed payment being undone — a 6-of-12 plan resumes at 6 of 12.
 */
export function resume(sub: Subscription, on: ISODate = today()): Subscription {
  if (sub.status !== 'paused') return sub;
  return {
    ...sub,
    status: 'active',
    // The new run's anchor *is* the next charge.
    billingAnchor: addDays(on, sub.pauseCycleDaysRemaining ?? 0),
    pausedOn: undefined,
    pauseCycleDaysRemaining: undefined,
    resumeReminder: undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function cancel(sub: Subscription, on: ISODate = today()): Subscription {
  return {
    ...sub,
    status: 'canceled',
    canceledOn: on,
    pausedOn: undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function reactivate(sub: Subscription): Subscription {
  return {
    ...sub,
    status: 'active',
    canceledOn: undefined,
    updatedAt: new Date().toISOString(),
  };
}
