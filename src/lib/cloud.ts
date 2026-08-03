import type { Account, AppData, Category, Subscription } from '../types';
import { requireClient } from './supabase';

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
}

export interface Member {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

/* -------------------------------------------------- row <-> app mapping */

// Postgres columns are snake_case and dates come back as strings; the app types
// are camelCase. These two functions are the only place that gap is bridged.

type Row = Record<string, unknown>;

function toSubscription(row: Row): Subscription {
  return {
    id: String(row.id),
    company: String(row.company ?? ''),
    categoryId: (row.category_id as string) ?? '',
    plan: (row.plan as string) ?? '',
    amount: Number(row.amount) || 0,
    currency: (row.currency as string) ?? 'USD',
    frequency: row.frequency as Subscription['frequency'],
    startDate: String(row.start_date),
    billingAnchor: String(row.billing_anchor),
    paymentsCarried: Number(row.payments_carried) || 0,
    accountId: (row.account_id as string) ?? '',
    status: row.status as Subscription['status'],
    pausedOn: (row.paused_on as string) ?? undefined,
    pauseCycleDaysRemaining:
      row.pause_cycle_days_remaining === null || row.pause_cycle_days_remaining === undefined
        ? undefined
        : Number(row.pause_cycle_days_remaining),
    resumeReminder: (row.resume_reminder as string) ?? undefined,
    canceledOn: (row.canceled_on as string) ?? undefined,
    termType: row.term_type as Subscription['termType'],
    totalPayments:
      row.total_payments === null || row.total_payments === undefined
        ? undefined
        : Number(row.total_payments),
    notes: (row.notes as string) ?? '',
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function fromSubscription(sub: Subscription, householdId: string): Row {
  return {
    household_id: householdId,
    id: sub.id,
    company: sub.company,
    category_id: sub.categoryId || null,
    account_id: sub.accountId || null,
    plan: sub.plan,
    amount: sub.amount,
    currency: sub.currency,
    frequency: sub.frequency,
    start_date: sub.startDate,
    billing_anchor: sub.billingAnchor,
    payments_carried: sub.paymentsCarried,
    status: sub.status,
    paused_on: sub.pausedOn ?? null,
    pause_cycle_days_remaining: sub.pauseCycleDaysRemaining ?? null,
    resume_reminder: sub.resumeReminder ?? null,
    canceled_on: sub.canceledOn ?? null,
    term_type: sub.termType,
    total_payments: sub.totalPayments ?? null,
    notes: sub.notes,
  };
}

/* -------------------------------------------------- household */

export async function loadHousehold(): Promise<Household | null> {
  const db = requireClient();
  const { data, error } = await db
    .from('households')
    .select('id, name, invite_code')
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  return row ? { id: row.id, name: row.name, inviteCode: row.invite_code } : null;
}

export async function createHousehold(name?: string): Promise<Household> {
  const db = requireClient();
  const { data, error } = await db.rpc('create_household', { p_name: name ?? '' });
  if (error) throw error;
  return { id: data.id, name: data.name, inviteCode: data.invite_code };
}

export async function joinHousehold(code: string): Promise<Household> {
  const db = requireClient();
  const { data, error } = await db.rpc('join_household', { p_code: code });
  if (error) throw error;
  return { id: data.id, name: data.name, inviteCode: data.invite_code };
}

export async function loadMembers(householdId: string): Promise<Member[]> {
  const db = requireClient();
  const { data, error } = await db.rpc('household_member_emails', { hid: householdId });
  if (error) throw error;
  return (data ?? []).map((r: Row) => ({
    userId: String(r.user_id),
    email: String(r.email ?? ''),
    role: String(r.role ?? 'member'),
    joinedAt: String(r.joined_at ?? ''),
  }));
}

export async function rotateInviteCode(householdId: string): Promise<string> {
  const db = requireClient();
  const { data, error } = await db.rpc('rotate_invite_code', { hid: householdId });
  if (error) throw error;
  return String(data);
}

/* -------------------------------------------------- data */

export async function loadAll(householdId: string): Promise<Omit<AppData, 'version'>> {
  const db = requireClient();
  const [subs, cats, accts] = await Promise.all([
    db.from('subscriptions').select('*').eq('household_id', householdId),
    db.from('categories').select('*').eq('household_id', householdId).order('created_at'),
    db.from('accounts').select('*').eq('household_id', householdId).order('created_at'),
  ]);
  if (subs.error) throw subs.error;
  if (cats.error) throw cats.error;
  if (accts.error) throw accts.error;

  return {
    subscriptions: (subs.data ?? []).map(toSubscription),
    categories: (cats.data ?? []).map((r) => ({ id: r.id, name: r.name, color: r.color })),
    accounts: (accts.data ?? []).map((r) => ({ id: r.id, name: r.name, last4: r.last4 ?? '' })),
  };
}

export async function upsertSubscription(sub: Subscription, householdId: string): Promise<void> {
  const db = requireClient();
  const { error } = await db
    .from('subscriptions')
    .upsert(fromSubscription(sub, householdId), { onConflict: 'household_id,id' });
  if (error) throw error;
}

export async function deleteSubscription(id: string, householdId: string): Promise<void> {
  const db = requireClient();
  const { error } = await db
    .from('subscriptions')
    .delete()
    .eq('household_id', householdId)
    .eq('id', id);
  if (error) throw error;
}

export async function upsertCategory(category: Category, householdId: string): Promise<void> {
  const db = requireClient();
  const { error } = await db
    .from('categories')
    .upsert({ household_id: householdId, ...category }, { onConflict: 'household_id,id' });
  if (error) throw error;
}

export async function deleteCategory(id: string, householdId: string): Promise<void> {
  const db = requireClient();
  const { error } = await db
    .from('categories')
    .delete()
    .eq('household_id', householdId)
    .eq('id', id);
  if (error) throw error;
}

export async function upsertAccount(account: Account, householdId: string): Promise<void> {
  const db = requireClient();
  const { error } = await db
    .from('accounts')
    .upsert({ household_id: householdId, ...account }, { onConflict: 'household_id,id' });
  if (error) throw error;
}

export async function deleteAccount(id: string, householdId: string): Promise<void> {
  const db = requireClient();
  const { error } = await db
    .from('accounts')
    .delete()
    .eq('household_id', householdId)
    .eq('id', id);
  if (error) throw error;
}

/**
 * Push a whole local dataset into an empty household. Used once, when someone
 * who has been tracking locally signs in for the first time.
 */
export async function uploadAll(data: AppData, householdId: string): Promise<void> {
  const db = requireClient();

  if (data.categories.length) {
    const { error } = await db.from('categories').upsert(
      data.categories.map((c) => ({ household_id: householdId, ...c })),
      { onConflict: 'household_id,id' },
    );
    if (error) throw error;
  }
  if (data.accounts.length) {
    const { error } = await db.from('accounts').upsert(
      data.accounts.map((a) => ({ household_id: householdId, ...a })),
      { onConflict: 'household_id,id' },
    );
    if (error) throw error;
  }
  if (data.subscriptions.length) {
    const { error } = await db.from('subscriptions').upsert(
      data.subscriptions.map((s) => fromSubscription(s, householdId)),
      { onConflict: 'household_id,id' },
    );
    if (error) throw error;
  }
}

/**
 * Live updates from the other person's device. Any change to the household's
 * rows re-runs the loader — the dataset is small enough that a refetch is
 * simpler and less error-prone than patching rows individually.
 */
export function subscribeToChanges(householdId: string, onChange: () => void): () => void {
  const db = requireClient();
  const channel = db
    .channel(`household:${householdId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'subscriptions', filter: `household_id=eq.${householdId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'categories', filter: `household_id=eq.${householdId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'accounts', filter: `household_id=eq.${householdId}` },
      onChange,
    )
    .subscribe();

  return () => {
    void db.removeChannel(channel);
  };
}
