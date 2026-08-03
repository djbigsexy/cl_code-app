import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Account, AppData, Category, Subscription } from './types';
import { cancel, pause, reactivate, resume } from './lib/billing';
import * as cloud from './lib/cloud';
import { isCloudConfigured, supabase } from './lib/supabase';
import {
  DEFAULT_CATEGORIES,
  emptyData,
  hasLocalData,
  load,
  loadCache,
  newId,
  normalize,
  save,
  saveCache,
} from './lib/storage';
import { today } from './lib/dates';
import { friendly } from './components/AuthForm';

export type SyncStatus = 'local' | 'loading' | 'synced' | 'offline' | 'error';

export interface SyncState {
  /** Whether cloud credentials are present in the build at all. */
  configured: boolean;
  status: SyncStatus;
  user: User | null;
  household: cloud.Household | null;
  members: cloud.Member[];
  /** Set when a write or refresh failed; shown as a banner, not a crash. */
  error: string | null;
  /** True when local-only data exists that could be uploaded on first sign-in. */
  localDataPending: boolean;
}

/**
 * Single owner of app state.
 *
 * Runs in one of two modes. Without cloud credentials — or while signed out —
 * everything lives in this browser's local storage, exactly as before. Signed
 * in to a household, the household's rows are the source of truth: writes go
 * out optimistically, and the other person's changes arrive over realtime.
 */
export function useAppData() {
  const [data, setData] = useState<AppData>(() => (isCloudConfigured ? emptyData() : load()));
  const [session, setSession] = useState<Session | null>(null);
  const [household, setHousehold] = useState<cloud.Household | null>(null);
  const [members, setMembers] = useState<cloud.Member[]>([]);
  const [status, setStatus] = useState<SyncStatus>(isCloudConfigured ? 'loading' : 'local');
  const [error, setError] = useState<string | null>(null);
  const [localDataPending, setLocalDataPending] = useState(false);

  // Read by the action callbacks so they never close over stale state.
  const dataRef = useRef(data);
  dataRef.current = data;
  const householdRef = useRef<cloud.Household | null>(null);
  householdRef.current = household;

  const cloudMode = Boolean(isCloudConfigured && session && household);

  /* ------------------------------------------------ persistence */

  useEffect(() => {
    if (!isCloudConfigured) {
      save(data);
    } else if (household) {
      saveCache(household.id, data);
    }
  }, [data, household]);

  /* ------------------------------------------------ auth */

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ------------------------------------------------ household + data */

  /** Pulls the household's rows. Returns them so callers don't refetch. */
  const refresh = useCallback(async (h: cloud.Household): Promise<AppData | null> => {
    try {
      const fresh = await cloud.loadAll(h.id);
      const next: AppData = { version: 1, ...fresh };
      setData(next);
      setStatus('synced');
      setError(null);
      return next;
    } catch (e) {
      // Most likely offline. The cached copy stays on screen.
      setStatus('offline');
      setError(messageFor(e));
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isCloudConfigured) return;

    if (!session) {
      // Signed out: fall back to whatever is stored locally.
      setHousehold(null);
      setMembers([]);
      setData(load());
      setStatus('local');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    void (async () => {
      try {
        const h = await cloud.loadHousehold();
        if (cancelled) return;
        setHousehold(h);

        if (!h) {
          // Signed in but not in a household yet — the setup screen takes over.
          setStatus('synced');
          setLocalDataPending(hasLocalData());
          return;
        }

        const cached = loadCache(h.id);
        if (cached && !cancelled) setData(cached);

        const remote = await refresh(h);
        if (cancelled) return;

        setMembers(await cloud.loadMembers(h.id).catch(() => [] as cloud.Member[]));
        if (cancelled) return;
        // Offer to upload local data only into a household that has none.
        setLocalDataPending(hasLocalData() && !!remote && remote.subscriptions.length === 0);
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setError(messageFor(e));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, refresh]);

  /* ------------------------------------------------ realtime */

  useEffect(() => {
    if (!cloudMode || !household) return;
    return cloud.subscribeToChanges(household.id, () => {
      void refresh(household);
    });
  }, [cloudMode, household, refresh]);

  /* ------------------------------------------------ write helpers */

  const push = useCallback(async (fn: (householdId: string) => Promise<void>) => {
    const h = householdRef.current;
    if (!h) return; // local mode — the localStorage effect already persisted it
    try {
      await fn(h.id);
      setError(null);
      setStatus('synced');
    } catch (e) {
      setStatus('error');
      setError(`Couldn't save that change: ${messageFor(e)}`);
    }
  }, []);

  const updateSub = useCallback(
    (id: string, fn: (sub: Subscription) => Subscription) => {
      const current = dataRef.current.subscriptions.find((s) => s.id === id);
      if (!current) return;
      const next = fn(current);
      setData((d) => ({
        ...d,
        subscriptions: d.subscriptions.map((s) => (s.id === id ? next : s)),
      }));
      void push((hid) => cloud.upsertSubscription(next, hid));
    },
    [push],
  );

  /* ------------------------------------------------ actions */

  const actions = useMemo(
    () => ({
      addSubscription(input: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): void {
        const now = new Date().toISOString();
        const sub: Subscription = { ...input, id: newId(), createdAt: now, updatedAt: now };
        setData((d) => ({ ...d, subscriptions: [...d.subscriptions, sub] }));
        void push((hid) => cloud.upsertSubscription(sub, hid));
      },

      updateSubscription(id: string, patch: Partial<Subscription>): void {
        updateSub(id, (s) => ({ ...s, ...patch, updatedAt: new Date().toISOString() }));
      },

      removeSubscription(id: string): void {
        setData((d) => ({ ...d, subscriptions: d.subscriptions.filter((s) => s.id !== id) }));
        void push((hid) => cloud.deleteSubscription(id, hid));
      },

      pauseSubscription(id: string, on: string = today()): void {
        updateSub(id, (s) => pause(s, on));
      },

      resumeSubscription(id: string, on: string = today()): void {
        updateSub(id, (s) => resume(s, on));
      },

      cancelSubscription(id: string, on: string = today()): void {
        updateSub(id, (s) => cancel(s, on));
      },

      reactivateSubscription(id: string): void {
        updateSub(id, (s) => reactivate(s));
      },

      addCategory(name: string, color: string): Category {
        const category: Category = { id: newId(), name, color };
        setData((d) => ({ ...d, categories: [...d.categories, category] }));
        void push((hid) => cloud.upsertCategory(category, hid));
        return category;
      },

      removeCategory(id: string): void {
        setData((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) }));
        void push((hid) => cloud.deleteCategory(id, hid));
      },

      addAccount(name: string, last4: string): Account {
        const account: Account = { id: newId(), name, last4 };
        setData((d) => ({ ...d, accounts: [...d.accounts, account] }));
        void push((hid) => cloud.upsertAccount(account, hid));
        return account;
      },

      removeAccount(id: string): void {
        setData((d) => ({ ...d, accounts: d.accounts.filter((a) => a.id !== id) }));
        void push((hid) => cloud.deleteAccount(id, hid));
      },

      /** Replace everything — used by JSON import. */
      replaceAll(raw: unknown): void {
        const next = normalize(raw);
        setData(next);
        void push((hid) => cloud.uploadAll(next, hid));
      },
    }),
    [push, updateSub],
  );

  /* ------------------------------------------------ auth + household actions */

  const auth = useMemo(
    () => ({
      async signIn(email: string, password: string): Promise<void> {
        if (!supabase) throw new Error('Cloud sync is not configured');
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw new Error(e.message);
      },

      async signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
        if (!supabase) throw new Error('Cloud sync is not configured');
        const { data: result, error: e } = await supabase.auth.signUp({ email, password });
        if (e) throw new Error(e.message);
        // With email confirmation on, Supabase returns a user but no session.
        return { needsConfirmation: !result.session };
      },

      async signOut(): Promise<void> {
        if (!supabase) return;
        await supabase.auth.signOut();
      },

      async createHousehold(name: string): Promise<void> {
        const h = await cloud.createHousehold(name);
        setHousehold(h);
        await refresh(h);
        setMembers(await cloud.loadMembers(h.id).catch(() => []));
        setLocalDataPending(hasLocalData());
      },

      async joinHousehold(code: string): Promise<void> {
        const h = await cloud.joinHousehold(code);
        setHousehold(h);
        await refresh(h);
        setMembers(await cloud.loadMembers(h.id).catch(() => []));
        setLocalDataPending(false);
      },

      /** Copy this browser's local-only data into the household. */
      async uploadLocalData(): Promise<void> {
        const h = householdRef.current;
        if (!h) return;
        const local = load();
        // Drop seeded categories the household already has, so the starter set
        // isn't duplicated with different ids.
        const existing = new Set(dataRef.current.categories.map((c) => c.id));
        const defaults = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
        await cloud.uploadAll(
          {
            ...local,
            categories: local.categories.filter((c) => !existing.has(c.id) || !defaults.has(c.id)),
          },
          h.id,
        );
        await refresh(h);
        setLocalDataPending(false);
      },

      dismissLocalData(): void {
        setLocalDataPending(false);
      },

      async rotateInviteCode(): Promise<void> {
        const h = householdRef.current;
        if (!h) return;
        const code = await cloud.rotateInviteCode(h.id);
        setHousehold({ ...h, inviteCode: code });
      },

      async reloadMembers(): Promise<void> {
        const h = householdRef.current;
        if (!h) return;
        setMembers(await cloud.loadMembers(h.id).catch(() => []));
      },

      refreshNow(): void {
        const h = householdRef.current;
        if (h) void refresh(h);
      },
    }),
    [refresh],
  );

  const sync: SyncState = {
    configured: isCloudConfigured,
    status,
    user: session?.user ?? null,
    household,
    members,
    error,
    localDataPending,
  };

  return { data, actions, sync, auth };
}

function messageFor(e: unknown): string {
  if (e instanceof Error) return friendly(e);
  if (e && typeof e === 'object' && 'message' in e) {
    return friendly(new Error(String((e as { message: unknown }).message)));
  }
  return 'Unknown error';
}
