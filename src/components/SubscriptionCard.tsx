import { useState } from 'react';
import type { Account, Category, Subscription } from '../types';
import { FREQUENCIES, getSchedule } from '../lib/billing';
import { formatDate, formatRelative, today } from '../lib/dates';
import { formatMoney } from '../lib/money';

interface Props {
  subscription: Subscription;
  category?: Category;
  account?: Account;
  onEdit: () => void;
  onPause: (on: string) => void;
  onResume: (on: string) => void;
  onCancel: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  canceled: 'Canceled',
  completed: 'Paid off',
  scheduled: 'Starts soon',
};

export function SubscriptionCard({
  subscription: sub,
  category,
  account,
  onEdit,
  onPause,
  onResume,
  onCancel,
  onReactivate,
  onDelete,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const schedule = getSchedule(sub);
  const cycle = FREQUENCIES[sub.frequency];
  const dueSoon =
    schedule.nextBillingDate !== null &&
    schedule.nextBillingDate <= formatSoonThreshold();

  return (
    <article className={`card status-${schedule.status}`}>
      <div className="card-head">
        <div className="card-title">
          <h3>{sub.company}</h3>
          {sub.plan && <span className="card-plan">{sub.plan}</span>}
        </div>
        <div className="card-price">
          <strong>{formatMoney(sub.amount, sub.currency)}</strong>
          <span className="per">/{cycle.short}</span>
        </div>
      </div>

      <div className="chips">
        {category && (
          <span className="chip" style={{ '--chip': category.color } as React.CSSProperties}>
            {category.name}
          </span>
        )}
        <span className={`chip chip-status chip-${schedule.status}`}>
          {STATUS_LABEL[schedule.status]}
        </span>
        {account && (
          <span className="chip chip-muted">
            {account.name}
            {account.last4 ? ` ••${account.last4}` : ''}
          </span>
        )}
      </div>

      <dl className="card-facts">
        {schedule.nextBillingDate ? (
          <div>
            <dt>Next charge</dt>
            <dd className={dueSoon ? 'due-soon' : undefined}>
              {formatDate(schedule.nextBillingDate)}
              <span className="muted"> · {formatRelative(schedule.nextBillingDate)}</span>
            </dd>
          </div>
        ) : (
          <div>
            <dt>Next charge</dt>
            <dd className="muted">
              {schedule.status === 'paused'
                ? `Paused${sub.pausedOn ? ` since ${formatDate(sub.pausedOn)}` : ''}`
                : schedule.status === 'completed'
                  ? 'Fully paid'
                  : 'None'}
            </dd>
          </div>
        )}

        {sub.termType === 'fixed' && sub.totalPayments ? (
          <div className="card-progress">
            <dt>
              Payments {schedule.paymentsMade} of {sub.totalPayments}
            </dt>
            <dd>
              <div className="progress">
                <div
                  className="progress-bar"
                  style={{ width: `${(schedule.paymentsMade / sub.totalPayments) * 100}%` }}
                />
              </div>
              <span className="muted">
                {schedule.remainingCost
                  ? `${formatMoney(schedule.remainingCost, sub.currency)} left`
                  : 'Paid off'}
                {schedule.finalPaymentDate && schedule.paymentsRemaining
                  ? ` · ends ${formatDate(schedule.finalPaymentDate)}`
                  : ''}
              </span>
            </dd>
          </div>
        ) : (
          <div>
            <dt>Cost</dt>
            <dd>
              {formatMoney(schedule.monthlyCost, sub.currency)}/mo ·{' '}
              {formatMoney(schedule.annualCost, sub.currency)}/yr
            </dd>
          </div>
        )}

        {sub.resumeReminder && schedule.status === 'paused' && (
          <div>
            <dt>Resume reminder</dt>
            <dd>{formatDate(sub.resumeReminder)}</dd>
          </div>
        )}
      </dl>

      {sub.notes && <p className="card-notes">{sub.notes}</p>}

      <div className="card-actions">
        <button className="btn btn-small" onClick={onEdit}>
          Edit
        </button>
        {schedule.status === 'paused' ? (
          <button className="btn btn-small" onClick={() => onResume(today())}>
            Resume
          </button>
        ) : schedule.status === 'canceled' ? (
          <button className="btn btn-small" onClick={onReactivate}>
            Reactivate
          </button>
        ) : (
          schedule.status !== 'completed' && (
            <button className="btn btn-small" onClick={() => onPause(today())}>
              Pause
            </button>
          )
        )}
        {/* A finished plan has nothing left to cancel. */}
        {schedule.status !== 'canceled' && schedule.status !== 'completed' && (
          <button className="btn btn-small" onClick={onCancel}>
            Cancel
          </button>
        )}
        {confirmDelete ? (
          <span className="confirm">
            Delete for good?
            <button className="btn btn-small btn-danger" onClick={onDelete}>
              Yes
            </button>
            <button className="btn btn-small" onClick={() => setConfirmDelete(false)}>
              No
            </button>
          </span>
        ) : (
          <button className="btn btn-small btn-ghost" onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        )}
      </div>
    </article>
  );
}

/** Charges within a week get highlighted. */
function formatSoonThreshold(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}
