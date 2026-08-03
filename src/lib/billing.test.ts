import { describe, expect, it } from 'vitest';
import { billingsElapsed, cancel, getSchedule, nthBillingDate, pause, resume } from './billing';
import { addMonths, daysBetween, formatRelative } from './dates';
import type { Subscription } from '../types';

function sub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'test',
    company: 'Netflix',
    categoryId: 'streaming',
    plan: '',
    amount: 15.49,
    currency: 'USD',
    frequency: 'monthly',
    startDate: '2026-01-15',
    billingAnchor: '2026-01-15',
    paymentsCarried: 0,
    accountId: 'card',
    status: 'active',
    termType: 'ongoing',
    notes: '',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('addMonths', () => {
  it('clamps the day-of-month to the target month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29'); // leap year
    expect(addMonths('2026-03-31', 1)).toBe('2026-04-30');
  });

  it('does not compound the clamp when stepping from the anchor', () => {
    // Jan 31 + 2 months is Mar 31, not Feb 28 + 1 month (Mar 28).
    expect(addMonths('2026-01-31', 2)).toBe('2026-03-31');
  });

  it('crosses year boundaries', () => {
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
    expect(addMonths('2026-01-15', -2)).toBe('2025-11-15');
  });
});

describe('nthBillingDate', () => {
  it('treats the anchor as charge 0', () => {
    expect(nthBillingDate('2026-01-15', 'monthly', 0)).toBe('2026-01-15');
  });

  it('steps day-based cycles exactly', () => {
    expect(nthBillingDate('2026-01-01', 'weekly', 3)).toBe('2026-01-22');
    expect(nthBillingDate('2026-01-01', 'biweekly', 2)).toBe('2026-01-29');
  });

  it('steps month-based cycles', () => {
    expect(nthBillingDate('2026-01-15', 'quarterly', 2)).toBe('2026-07-15');
    expect(nthBillingDate('2026-01-15', 'annual', 1)).toBe('2027-01-15');
  });
});

describe('billingsElapsed', () => {
  it('is 0 before the schedule starts', () => {
    expect(billingsElapsed('2026-06-01', 'monthly', '2026-05-31')).toBe(0);
  });

  it('counts the anchor day itself as charged', () => {
    expect(billingsElapsed('2026-01-15', 'monthly', '2026-01-15')).toBe(1);
  });

  it('counts monthly charges up to the given day', () => {
    expect(billingsElapsed('2026-01-15', 'monthly', '2026-03-14')).toBe(2);
    expect(billingsElapsed('2026-01-15', 'monthly', '2026-03-15')).toBe(3);
  });

  it('handles anchors on the 31st, where clamping shifts the billing day', () => {
    // Charges: Jan 31, Feb 28, Mar 31, Apr 30.
    expect(billingsElapsed('2026-01-31', 'monthly', '2026-02-27')).toBe(1);
    expect(billingsElapsed('2026-01-31', 'monthly', '2026-02-28')).toBe(2);
    expect(billingsElapsed('2026-01-31', 'monthly', '2026-03-30')).toBe(2);
    expect(billingsElapsed('2026-01-31', 'monthly', '2026-03-31')).toBe(3);
  });

  it('counts weekly charges', () => {
    expect(billingsElapsed('2026-01-01', 'weekly', '2026-01-07')).toBe(1);
    expect(billingsElapsed('2026-01-01', 'weekly', '2026-01-08')).toBe(2);
  });

  it('counts quarterly and annual charges', () => {
    expect(billingsElapsed('2026-01-15', 'quarterly', '2026-12-31')).toBe(4);
    expect(billingsElapsed('2026-01-15', 'annual', '2028-01-15')).toBe(3);
  });
});

describe('getSchedule', () => {
  it('reports the next charge for an ongoing subscription', () => {
    const s = getSchedule(sub(), '2026-03-20');
    expect(s.status).toBe('active');
    expect(s.paymentsMade).toBe(3);
    expect(s.nextBillingDate).toBe('2026-04-15');
    expect(s.paymentsRemaining).toBeNull();
  });

  it('marks a subscription that has not started yet as scheduled', () => {
    const s = getSchedule(sub({ billingAnchor: '2026-09-01' }), '2026-08-01');
    expect(s.status).toBe('scheduled');
    expect(s.paymentsMade).toBe(0);
    expect(s.nextBillingDate).toBe('2026-09-01');
  });

  it('normalizes cost onto a monthly figure', () => {
    expect(getSchedule(sub({ amount: 120, frequency: 'annual' })).monthlyCost).toBeCloseTo(10);
    expect(getSchedule(sub({ amount: 30, frequency: 'quarterly' })).monthlyCost).toBeCloseTo(10);
    expect(getSchedule(sub({ amount: 10, frequency: 'monthly' })).annualCost).toBeCloseTo(120);
  });

  describe('fixed-term plans', () => {
    const plan = sub({
      company: 'Splice',
      termType: 'fixed',
      totalPayments: 12,
      amount: 49,
      billingAnchor: '2026-01-10',
    });

    it('counts down the remaining payments', () => {
      const s = getSchedule(plan, '2026-04-10');
      expect(s.paymentsMade).toBe(4);
      expect(s.paymentsRemaining).toBe(8);
      expect(s.remainingCost).toBeCloseTo(8 * 49);
      expect(s.status).toBe('active');
    });

    it('knows the date of the final payment', () => {
      expect(getSchedule(plan, '2026-04-10').finalPaymentDate).toBe('2026-12-10');
    });

    it('completes itself after the last payment, with no next charge', () => {
      const s = getSchedule(plan, '2026-12-10');
      expect(s.status).toBe('completed');
      expect(s.paymentsMade).toBe(12);
      expect(s.paymentsRemaining).toBe(0);
      expect(s.nextBillingDate).toBeNull();
      expect(s.remainingCost).toBe(0);
    });

    it('never counts more payments than the plan has', () => {
      const s = getSchedule(plan, '2030-01-01');
      expect(s.paymentsMade).toBe(12);
      expect(s.paymentsRemaining).toBe(0);
    });
  });

  describe('paused subscriptions', () => {
    it('stops accruing charges while paused', () => {
      const paused = pause(sub(), '2026-02-20');
      const s = getSchedule(paused, '2026-06-01');
      expect(s.status).toBe('paused');
      expect(s.paymentsMade).toBe(2); // Jan 15 and Feb 15 only
      expect(s.nextBillingDate).toBeNull();
    });

    it('hands back the unused part of the paid period on resume', () => {
      // Billed Feb 15, paused Feb 20 with 23 days of service still paid for.
      const paused = pause(sub(), '2026-02-20');
      expect(paused.pauseCycleDaysRemaining).toBe(daysBetween('2026-02-20', '2026-03-15'));

      const resumed = resume(paused, '2026-04-20');
      expect(resumed.status).toBe('active');
      expect(resumed.pausedOn).toBeUndefined();
      // Those 23 days are served from Apr 20, then billing picks back up.
      expect(getSchedule(resumed, '2026-04-20').nextBillingDate).toBe('2026-05-13');
    });

    it('never lets a pause undo a completed payment', () => {
      const plan = sub({ termType: 'fixed', totalPayments: 6, billingAnchor: '2026-01-10' });
      const paused = pause(plan, '2026-03-10');
      expect(getSchedule(paused, '2026-03-10').paymentsMade).toBe(3);

      const resumed = resume(paused, '2026-06-10');
      // Still 3 of 6 paid — the pause bought time, it did not consume payments,
      // and resuming did not give any back either.
      expect(getSchedule(resumed, '2026-06-10').paymentsMade).toBe(3);
      expect(getSchedule(resumed, '2026-06-10').paymentsRemaining).toBe(3);
    });

    it('still ends a paused fixed-term plan after its full payment count', () => {
      const plan = sub({ termType: 'fixed', totalPayments: 6, billingAnchor: '2026-01-10' });
      const resumed = resume(pause(plan, '2026-03-10'), '2026-06-10');
      // 3 paid. Resuming spends the 31 unused days first, so the run restarts
      // on Jul 11 and the last three charges are Jul 11, Aug 11, Sep 11.
      expect(getSchedule(resumed, '2026-06-10').finalPaymentDate).toBe('2026-09-11');
      expect(getSchedule(resumed, '2026-09-10').paymentsMade).toBe(5);

      const s = getSchedule(resumed, '2026-09-11');
      expect(s.paymentsMade).toBe(6);
      expect(s.status).toBe('completed');
      expect(s.nextBillingDate).toBeNull();
    });

    it('is a no-op to pause twice or resume something not paused', () => {
      const paused = pause(sub(), '2026-02-20');
      expect(pause(paused, '2026-03-01')).toBe(paused);
      const active = sub();
      expect(resume(active, '2026-03-01')).toBe(active);
    });
  });

  describe('canceled subscriptions', () => {
    it('freezes the count at the cancellation date', () => {
      const canceled = cancel(sub(), '2026-02-20');
      const s = getSchedule(canceled, '2026-08-01');
      expect(s.status).toBe('canceled');
      expect(s.paymentsMade).toBe(2);
      expect(s.nextBillingDate).toBeNull();
    });
  });
});

describe('formatRelative', () => {
  it('describes nearby days in words', () => {
    expect(formatRelative('2026-03-10', '2026-03-10')).toBe('today');
    expect(formatRelative('2026-03-11', '2026-03-10')).toBe('tomorrow');
    expect(formatRelative('2026-03-09', '2026-03-10')).toBe('yesterday');
    expect(formatRelative('2026-03-20', '2026-03-10')).toBe('in 10 days');
    expect(formatRelative('2026-03-01', '2026-03-10')).toBe('9 days ago');
  });
});
