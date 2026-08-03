export type Frequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual';

/** Stored status. `completed` is *derived*, not stored — see `deriveStatus`. */
export type SubscriptionStatus = 'active' | 'paused' | 'canceled';

/** How the subscription terminates. */
export type TermType =
  /** Renews forever until canceled (Netflix, Spotify, a supplement refill). */
  | 'ongoing'
  /** Ends automatically after a set number of charges (a 12-payment plugin plan). */
  | 'fixed';

export interface Subscription {
  id: string;
  /** Vendor name, e.g. "Netflix", "Factor", "Splice". */
  company: string;
  /** Category id (see `Category`). Free-form so you can add your own. */
  categoryId: string;
  /** Optional plan/tier label, e.g. "Premium 4K", "8 meals/week". */
  plan: string;
  /** Amount charged each billing cycle, in `currency`. */
  amount: number;
  currency: string;
  frequency: Frequency;
  /**
   * The date the subscription began. Informational only — it is never shifted,
   * so "member since" stays accurate across pauses.
   */
  startDate: string; // YYYY-MM-DD
  /**
   * First charge of the *current* billing run. Every charge in the run falls on
   * `billingAnchor + n * frequency`. Resuming from a pause starts a new run, so
   * this moves forward while `paymentsCarried` keeps the history.
   */
  billingAnchor: string; // YYYY-MM-DD
  /**
   * Charges completed in earlier billing runs, before the most recent pause.
   * Kept separately so a pause can never make the paid count go backwards.
   */
  paymentsCarried: number;
  /** Id of the account/card that gets charged. */
  accountId: string;
  status: SubscriptionStatus;
  /** Set while `status === 'paused'`; the day billing was frozen. */
  pausedOn?: string; // YYYY-MM-DD
  /**
   * Days of already-paid service left at the moment of pausing. Resuming grants
   * those days back before the next charge, so pausing right after a charge
   * doesn't throw away the month you just paid for.
   */
  pauseCycleDaysRemaining?: number;
  /** Optional reminder for when you mean to turn it back on. */
  resumeReminder?: string; // YYYY-MM-DD
  /** Set when `status === 'canceled'`. */
  canceledOn?: string; // YYYY-MM-DD
  termType: TermType;
  /** Total number of charges when `termType === 'fixed'`. */
  totalPayments?: number;
  notes: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface Category {
  id: string;
  name: string;
  /** Hex color used for the chip and the category breakdown bar. */
  color: string;
}

export interface Account {
  id: string;
  /** e.g. "Chase Sapphire", "Checking", "Apple Card". */
  name: string;
  /** Last 4 digits, optional — enough to tell two cards apart. */
  last4: string;
}

export interface AppData {
  version: number;
  subscriptions: Subscription[];
  categories: Category[];
  accounts: Account[];
}
