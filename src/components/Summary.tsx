import { useMemo } from 'react';
import type { Category, Subscription } from '../types';
import { getSchedule, isBilling } from '../lib/billing';
import { formatMoney } from '../lib/money';
import { addDays, formatDate, formatRelative, today } from '../lib/dates';

interface Props {
  subscriptions: Subscription[];
  categories: Category[];
}

export function Summary({ subscriptions, categories }: Props) {
  const stats = useMemo(() => {
    const now = today();
    const horizon = addDays(now, 30);

    // Totals are grouped by currency — converting between them would require an
    // exchange rate this app has no business inventing.
    const monthlyByCurrency = new Map<string, number>();
    const byCategory = new Map<string, number>();
    const remainingByCurrency = new Map<string, number>();
    const upcoming: { sub: Subscription; date: string }[] = [];
    let activeCount = 0;
    let pausedCount = 0;

    for (const sub of subscriptions) {
      const schedule = getSchedule(sub, now);
      if (schedule.status === 'paused') pausedCount++;
      if (schedule.status === 'canceled' || schedule.status === 'completed') continue;

      if (isBilling(schedule.status)) {
        activeCount++;
        monthlyByCurrency.set(
          sub.currency,
          (monthlyByCurrency.get(sub.currency) ?? 0) + schedule.monthlyCost,
        );
        byCategory.set(sub.categoryId, (byCategory.get(sub.categoryId) ?? 0) + schedule.monthlyCost);
      }

      if (schedule.remainingCost) {
        remainingByCurrency.set(
          sub.currency,
          (remainingByCurrency.get(sub.currency) ?? 0) + schedule.remainingCost,
        );
      }

      if (schedule.nextBillingDate && schedule.nextBillingDate <= horizon) {
        upcoming.push({ sub, date: schedule.nextBillingDate });
      }
    }

    upcoming.sort((a, b) => a.date.localeCompare(b.date));

    const totalMonthly = [...byCategory.values()].reduce((a, b) => a + b, 0);
    const breakdown = categories
      .map((c) => ({ category: c, amount: byCategory.get(c.id) ?? 0 }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return {
      monthlyByCurrency,
      remainingByCurrency,
      upcoming,
      activeCount,
      pausedCount,
      totalMonthly,
      breakdown,
    };
  }, [subscriptions, categories]);

  const currencies = [...stats.monthlyByCurrency.entries()];

  return (
    <section className="summary">
      <div className="stat-grid">
        <div className="stat">
          <span className="stat-label">Monthly spend</span>
          <span className="stat-value">
            {currencies.length === 0
              ? '—'
              : currencies.map(([currency, amount]) => (
                  <span key={currency} className="stat-line">
                    {formatMoney(amount, currency)}
                  </span>
                ))}
          </span>
          <span className="stat-sub">{stats.activeCount} active</span>
        </div>

        <div className="stat">
          <span className="stat-label">Yearly spend</span>
          <span className="stat-value">
            {currencies.length === 0
              ? '—'
              : currencies.map(([currency, amount]) => (
                  <span key={currency} className="stat-line">
                    {formatMoney(amount * 12, currency)}
                  </span>
                ))}
          </span>
          <span className="stat-sub">
            {stats.pausedCount > 0 ? `${stats.pausedCount} paused, not counted` : 'at current rates'}
          </span>
        </div>

        <div className="stat">
          <span className="stat-label">Left on payment plans</span>
          <span className="stat-value">
            {stats.remainingByCurrency.size === 0
              ? '—'
              : [...stats.remainingByCurrency.entries()].map(([currency, amount]) => (
                  <span key={currency} className="stat-line">
                    {formatMoney(amount, currency)}
                  </span>
                ))}
          </span>
          <span className="stat-sub">until fixed terms end</span>
        </div>

        <div className="stat">
          <span className="stat-label">Due in 30 days</span>
          <span className="stat-value">{stats.upcoming.length}</span>
          <span className="stat-sub">
            {stats.upcoming[0]
              ? `next: ${stats.upcoming[0].sub.company} ${formatRelative(stats.upcoming[0].date)}`
              : 'nothing scheduled'}
          </span>
        </div>
      </div>

      {stats.breakdown.length > 0 && (
        <div className="panel">
          <h2 className="panel-title">Where it goes each month</h2>
          <div className="bar">
            {stats.breakdown.map(({ category, amount }) => (
              <div
                key={category.id}
                className="bar-seg"
                style={{
                  width: `${(amount / stats.totalMonthly) * 100}%`,
                  background: category.color,
                }}
                title={`${category.name}: ${Math.round((amount / stats.totalMonthly) * 100)}%`}
              />
            ))}
          </div>
          <ul className="legend">
            {stats.breakdown.map(({ category, amount }) => (
              <li key={category.id}>
                <span className="dot" style={{ background: category.color }} />
                <span className="legend-name">{category.name}</span>
                <span className="muted">
                  {formatMoney(amount)} · {Math.round((amount / stats.totalMonthly) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.upcoming.length > 0 && (
        <div className="panel">
          <h2 className="panel-title">Coming up</h2>
          <ul className="upcoming">
            {stats.upcoming.slice(0, 8).map(({ sub, date }) => (
              <li key={sub.id}>
                <span className="upcoming-date">{formatDate(date)}</span>
                <span className="upcoming-name">{sub.company}</span>
                <span className="upcoming-amount">{formatMoney(sub.amount, sub.currency)}</span>
                <span className="muted">{formatRelative(date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
