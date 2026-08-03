import { useMemo, useState } from 'react';
import type { Subscription } from './types';
import { useAppData } from './useAppData';
import { getSchedule, type DerivedStatus } from './lib/billing';
import { Summary } from './components/Summary';
import { SubscriptionCard } from './components/SubscriptionCard';
import { SubscriptionForm } from './components/SubscriptionForm';
import { Settings } from './components/Settings';
import { Modal } from './components/Modal';

type StatusFilter = 'all' | DerivedStatus;
type SortKey = 'next' | 'cost' | 'name' | 'category';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Paid off' },
  { value: 'canceled', label: 'Canceled' },
];

export default function App() {
  const { data, actions } = useAppData();
  const [editing, setEditing] = useState<Subscription | 'new' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [categoryId, setCategoryId] = useState('all');
  const [accountId, setAccountId] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('next');

  const categoriesById = useMemo(
    () => new Map(data.categories.map((c) => [c.id, c])),
    [data.categories],
  );
  const accountsById = useMemo(
    () => new Map(data.accounts.map((a) => [a.id, a])),
    [data.accounts],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const rows = data.subscriptions
      .map((sub) => ({ sub, schedule: getSchedule(sub) }))
      .filter(({ sub, schedule }) => {
        if (status !== 'all') {
          // "Active" covers not-yet-started subscriptions too — they're live,
          // just waiting on their first charge.
          const matches =
            status === 'active'
              ? schedule.status === 'active' || schedule.status === 'scheduled'
              : schedule.status === status;
          if (!matches) return false;
        }
        if (categoryId !== 'all' && sub.categoryId !== categoryId) return false;
        if (accountId !== 'all' && sub.accountId !== accountId) return false;
        if (needle) {
          const haystack =
            `${sub.company} ${sub.plan} ${sub.notes} ${categoriesById.get(sub.categoryId)?.name ?? ''}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        return true;
      });

    rows.sort((a, b) => {
      switch (sortKey) {
        case 'cost':
          return b.schedule.monthlyCost - a.schedule.monthlyCost;
        case 'name':
          return a.sub.company.localeCompare(b.sub.company);
        case 'category':
          return (categoriesById.get(a.sub.categoryId)?.name ?? '').localeCompare(
            categoriesById.get(b.sub.categoryId)?.name ?? '',
          );
        case 'next':
        default:
          // Anything without a next charge sorts to the bottom.
          if (!a.schedule.nextBillingDate && !b.schedule.nextBillingDate) {
            return a.sub.company.localeCompare(b.sub.company);
          }
          if (!a.schedule.nextBillingDate) return 1;
          if (!b.schedule.nextBillingDate) return -1;
          return a.schedule.nextBillingDate.localeCompare(b.schedule.nextBillingDate);
      }
    });

    return rows;
  }, [data.subscriptions, query, status, categoryId, accountId, sortKey, categoriesById]);

  const hasAny = data.subscriptions.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Subscriptions</h1>
          <p className="muted">
            {hasAny
              ? `${data.subscriptions.length} tracked across ${data.accounts.length} account${data.accounts.length === 1 ? '' : 's'}`
              : 'Everything you pay for on a schedule, in one place.'}
          </p>
        </div>
        <div className="button-row">
          <button className="btn" onClick={() => setShowSettings(true)}>
            Settings
          </button>
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            Add subscription
          </button>
        </div>
      </header>

      {hasAny && <Summary subscriptions={data.subscriptions} categories={data.categories} />}

      {hasAny && (
        <div className="toolbar">
          <input
            className="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, plan, notes…"
          />
          <div className="segmented">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                className={status === f.value ? 'seg active' : 'seg'}
                onClick={() => setStatus(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="all">All categories</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="all">All accounts</option>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.last4 ? ` ••${a.last4}` : ''}
              </option>
            ))}
          </select>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="next">Sort: next charge</option>
            <option value="cost">Sort: monthly cost</option>
            <option value="name">Sort: name</option>
            <option value="category">Sort: category</option>
          </select>
        </div>
      )}

      {!hasAny ? (
        <div className="empty">
          <h2>Nothing tracked yet</h2>
          <p className="muted">
            Add your streaming services, meal boxes, supplements, plugin plans — anything that
            charges you on a repeat. You'll get the monthly damage, what's due next, and a countdown
            on anything that ends after a set number of payments.
          </p>
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            Add your first subscription
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <h2>No matches</h2>
          <p className="muted">Nothing fits those filters.</p>
        </div>
      ) : (
        <div className="grid">
          {visible.map(({ sub }) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              category={categoriesById.get(sub.categoryId)}
              account={accountsById.get(sub.accountId)}
              onEdit={() => setEditing(sub)}
              onPause={(on) => actions.pauseSubscription(sub.id, on)}
              onResume={(on) => actions.resumeSubscription(sub.id, on)}
              onCancel={() => actions.cancelSubscription(sub.id)}
              onReactivate={() => actions.reactivateSubscription(sub.id)}
              onDelete={() => actions.removeSubscription(sub.id)}
            />
          ))}
        </div>
      )}

      {editing && (
        <Modal
          title={editing === 'new' ? 'Add subscription' : `Edit ${editing.company}`}
          onClose={() => setEditing(null)}
        >
          <SubscriptionForm
            initial={editing === 'new' ? undefined : editing}
            categories={data.categories}
            accounts={data.accounts}
            onAddCategory={actions.addCategory}
            onAddAccount={actions.addAccount}
            onCancel={() => setEditing(null)}
            onSubmit={(draft) => {
              if (editing === 'new') actions.addSubscription(draft);
              else actions.updateSubscription(editing.id, draft);
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {showSettings && (
        <Modal title="Settings" onClose={() => setShowSettings(false)}>
          <Settings
            data={data}
            onAddAccount={actions.addAccount}
            onRemoveAccount={actions.removeAccount}
            onAddCategory={actions.addCategory}
            onRemoveCategory={actions.removeCategory}
            onImport={actions.replaceAll}
            onClose={() => setShowSettings(false)}
          />
        </Modal>
      )}
    </div>
  );
}
