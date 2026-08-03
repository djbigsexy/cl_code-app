import type { AppData, Account, Category, Subscription } from '../types';

const STORAGE_KEY = 'subscription-tracker:data';
export const DATA_VERSION = 1;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'streaming', name: 'Streaming', color: '#e0455f' },
  { id: 'music', name: 'Music Production', color: '#8b5cf6' },
  { id: 'meals', name: 'Meal Delivery', color: '#f59e0b' },
  { id: 'health', name: 'Health & Supplements', color: '#10b981' },
  { id: 'software', name: 'Software & Tools', color: '#3b82f6' },
  { id: 'fitness', name: 'Fitness', color: '#ec4899' },
  { id: 'other', name: 'Other', color: '#64748b' },
];

/** Palette offered when adding a category. */
export const CATEGORY_COLORS = [
  '#e0455f', '#8b5cf6', '#f59e0b', '#10b981',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316',
  '#6366f1', '#64748b',
];

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    subscriptions: [],
    categories: DEFAULT_CATEGORIES,
    accounts: [],
  };
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Coerce parsed JSON into a usable `AppData`. Anything unrecognized is dropped
 * rather than trusted, so a hand-edited or older export can't wedge the app.
 */
export function normalize(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<AppData>;

  const categories = Array.isArray(data.categories)
    ? data.categories.filter((c): c is Category => !!c && typeof c.id === 'string')
    : base.categories;
  const accounts = Array.isArray(data.accounts)
    ? data.accounts.filter((a): a is Account => !!a && typeof a.id === 'string')
    : [];
  const subscriptions = Array.isArray(data.subscriptions)
    ? data.subscriptions
        .filter((s): s is Subscription => !!s && typeof s.id === 'string')
        .map((s) => ({
          ...s,
          amount: Number(s.amount) || 0,
          // Added after v1 shipped; older records simply had no pause history.
          paymentsCarried: Number(s.paymentsCarried) || 0,
          currency: s.currency || 'USD',
          notes: s.notes ?? '',
          plan: s.plan ?? '',
        }))
    : [];

  return {
    version: DATA_VERSION,
    categories: categories.length ? categories : base.categories,
    accounts,
    subscriptions,
  };
}

export function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    return normalize(JSON.parse(raw));
  } catch {
    // A corrupt blob shouldn't leave the user staring at a blank screen.
    return emptyData();
  }
}

export function save(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota or private-mode failure — the session still works in memory.
  }
}

export function toJSON(data: AppData): string {
  return JSON.stringify(data, null, 2);
}
