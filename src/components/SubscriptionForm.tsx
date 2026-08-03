import { useState, type FormEvent } from 'react';
import type { Account, Category, Frequency, Subscription, TermType } from '../types';
import { FREQUENCIES, FREQUENCY_ORDER } from '../lib/billing';
import { CURRENCIES } from '../lib/money';
import { isValidDate, today } from '../lib/dates';
import { CATEGORY_COLORS } from '../lib/storage';

type Draft = Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>;

interface Props {
  initial?: Subscription;
  categories: Category[];
  accounts: Account[];
  onSubmit: (draft: Draft) => void;
  onCancel: () => void;
  onAddCategory: (name: string, color: string) => Category;
  onAddAccount: (name: string, last4: string) => Account;
}

function blankDraft(categories: Category[], accounts: Account[]): Draft {
  return {
    company: '',
    categoryId: categories[0]?.id ?? '',
    plan: '',
    amount: 0,
    currency: 'USD',
    frequency: 'monthly',
    startDate: today(),
    billingAnchor: today(),
    paymentsCarried: 0,
    accountId: accounts[0]?.id ?? '',
    status: 'active',
    termType: 'ongoing',
    notes: '',
  };
}

export function SubscriptionForm({
  initial,
  categories,
  accounts,
  onSubmit,
  onCancel,
  onAddCategory,
  onAddAccount,
}: Props) {
  const [draft, setDraft] = useState<Draft>(() => initial ?? blankDraft(categories, accounts));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newCategory, setNewCategory] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [newAccountLast4, setNewAccountLast4] = useState('');

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    // Clear the field's complaint as soon as it's touched, rather than leaving
    // "Company is required" sitting under a filled-in company.
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _cleared, ...rest } = prev;
      return rest;
    });
  };

  function handleAddCategory() {
    const name = newCategory.trim();
    if (!name) return;
    const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length] ?? '#64748b';
    const created = onAddCategory(name, color);
    set('categoryId', created.id);
    setNewCategory('');
  }

  function handleAddAccount() {
    const name = newAccount.trim();
    if (!name) return;
    const created = onAddAccount(name, newAccountLast4.trim());
    set('accountId', created.id);
    setNewAccount('');
    setNewAccountLast4('');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!draft.company.trim()) found.company = 'Company is required.';
    if (!(draft.amount > 0)) found.amount = 'Enter an amount greater than zero.';
    if (!isValidDate(draft.billingAnchor)) found.billingAnchor = 'Pick a valid date.';
    if (!draft.categoryId) found.categoryId = 'Pick a category.';
    if (!draft.accountId) found.accountId = 'Add the account this is charged to.';
    if (draft.termType === 'fixed' && !(Number(draft.totalPayments) > 0)) {
      found.totalPayments = 'How many payments in total?';
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    onSubmit({
      ...draft,
      company: draft.company.trim(),
      plan: draft.plan.trim(),
      notes: draft.notes.trim(),
      // A new subscription's start date and billing anchor are the same day;
      // an edit keeps the original start date for "member since".
      startDate: initial ? draft.startDate : draft.billingAnchor,
      totalPayments: draft.termType === 'fixed' ? Number(draft.totalPayments) : undefined,
    });
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Company</span>
          <input
            autoFocus
            value={draft.company}
            onChange={(e) => set('company', e.target.value)}
            placeholder="Netflix, Factor, Splice…"
          />
          {errors.company && <span className="field-error">{errors.company}</span>}
        </label>

        <label className="field">
          <span className="field-label">
            Plan <span className="field-optional">optional</span>
          </span>
          <input
            value={draft.plan}
            onChange={(e) => set('plan', e.target.value)}
            placeholder="Premium 4K, 8 meals/week…"
          />
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          <span className="field-label">Category</span>
          <select
            value={draft.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
          >
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.categoryId && <span className="field-error">{errors.categoryId}</span>}
          <div className="inline-add">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              placeholder="New category"
            />
            <button type="button" className="btn btn-small" onClick={handleAddCategory}>
              Add
            </button>
          </div>
        </label>

        <label className="field">
          <span className="field-label">Charged to</span>
          <select value={draft.accountId} onChange={(e) => set('accountId', e.target.value)}>
            <option value="">Select an account…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.last4 ? ` ••${a.last4}` : ''}
              </option>
            ))}
          </select>
          {errors.accountId && <span className="field-error">{errors.accountId}</span>}
          <div className="inline-add">
            <input
              value={newAccount}
              onChange={(e) => setNewAccount(e.target.value)}
              placeholder="New account"
            />
            <input
              className="last4"
              value={newAccountLast4}
              onChange={(e) => setNewAccountLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••1234"
              inputMode="numeric"
            />
            <button type="button" className="btn btn-small" onClick={handleAddAccount}>
              Add
            </button>
          </div>
        </label>
      </div>

      <div className="form-row">
        <label className="field field-narrow">
          <span className="field-label">Amount</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.amount || ''}
            onChange={(e) => set('amount', Number(e.target.value))}
            placeholder="0.00"
          />
          {errors.amount && <span className="field-error">{errors.amount}</span>}
        </label>

        <label className="field field-narrow">
          <span className="field-label">Currency</span>
          <select value={draft.currency} onChange={(e) => set('currency', e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Billing frequency</span>
          <select
            value={draft.frequency}
            onChange={(e) => set('frequency', e.target.value as Frequency)}
          >
            {FREQUENCY_ORDER.map((f) => (
              <option key={f} value={f}>
                {FREQUENCIES[f].label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">First billing date</span>
          <input
            type="date"
            value={draft.billingAnchor}
            onChange={(e) => set('billingAnchor', e.target.value)}
          />
          {errors.billingAnchor && <span className="field-error">{errors.billingAnchor}</span>}
        </label>
      </div>

      <p className="form-hint">
        Charges repeat from the first billing date. If you've been subscribed a while, enter the
        original date — payments already made get counted for you.
      </p>

      <fieldset className="field">
        <legend className="field-label">Term</legend>
        <div className="radio-row">
          {(['ongoing', 'fixed'] as TermType[]).map((term) => (
            <label key={term} className="radio">
              <input
                type="radio"
                name="termType"
                checked={draft.termType === term}
                onChange={() => set('termType', term)}
              />
              <span>
                {term === 'ongoing' ? 'Renews until I cancel' : 'Ends after a set number of payments'}
              </span>
            </label>
          ))}
        </div>
        {draft.termType === 'fixed' && (
          <label className="field field-narrow term-count">
            <span className="field-label">Total payments</span>
            <input
              type="number"
              min="1"
              step="1"
              value={draft.totalPayments ?? ''}
              onChange={(e) => set('totalPayments', Number(e.target.value))}
              placeholder="12"
            />
            {errors.totalPayments && <span className="field-error">{errors.totalPayments}</span>}
          </label>
        )}
      </fieldset>

      <label className="field">
        <span className="field-label">
          Notes <span className="field-optional">optional</span>
        </span>
        <textarea
          rows={2}
          value={draft.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Cancellation link, shared with, promo price ends…"
        />
      </label>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {initial ? 'Save changes' : 'Add subscription'}
        </button>
      </div>
    </form>
  );
}
