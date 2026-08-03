import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Account, AppData, Category, Subscription } from './types';
import { cancel, pause, reactivate, resume } from './lib/billing';
import { load, newId, normalize, save } from './lib/storage';
import { today } from './lib/dates';

/**
 * Single owner of app state. Everything is held in memory and mirrored to
 * localStorage on change — there is no server, so the browser is the database.
 */
export function useAppData() {
  const [data, setData] = useState<AppData>(() => load());

  useEffect(() => {
    save(data);
  }, [data]);

  const update = useCallback(
    (id: string, fn: (sub: Subscription) => Subscription) => {
      setData((d) => ({
        ...d,
        subscriptions: d.subscriptions.map((s) => (s.id === id ? fn(s) : s)),
      }));
    },
    [],
  );

  const actions = useMemo(
    () => ({
      addSubscription(
        input: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>,
      ): void {
        const now = new Date().toISOString();
        setData((d) => ({
          ...d,
          subscriptions: [
            ...d.subscriptions,
            { ...input, id: newId(), createdAt: now, updatedAt: now },
          ],
        }));
      },

      updateSubscription(id: string, patch: Partial<Subscription>): void {
        update(id, (s) => ({ ...s, ...patch, updatedAt: new Date().toISOString() }));
      },

      removeSubscription(id: string): void {
        setData((d) => ({
          ...d,
          subscriptions: d.subscriptions.filter((s) => s.id !== id),
        }));
      },

      pauseSubscription(id: string, on: string = today()): void {
        update(id, (s) => pause(s, on));
      },

      resumeSubscription(id: string, on: string = today()): void {
        update(id, (s) => resume(s, on));
      },

      cancelSubscription(id: string, on: string = today()): void {
        update(id, (s) => cancel(s, on));
      },

      reactivateSubscription(id: string): void {
        update(id, (s) => reactivate(s));
      },

      addCategory(name: string, color: string): Category {
        const category: Category = { id: newId(), name, color };
        setData((d) => ({ ...d, categories: [...d.categories, category] }));
        return category;
      },

      removeCategory(id: string): void {
        setData((d) => ({
          ...d,
          categories: d.categories.filter((c) => c.id !== id),
        }));
      },

      addAccount(name: string, last4: string): Account {
        const account: Account = { id: newId(), name, last4 };
        setData((d) => ({ ...d, accounts: [...d.accounts, account] }));
        return account;
      },

      removeAccount(id: string): void {
        setData((d) => ({
          ...d,
          accounts: d.accounts.filter((a) => a.id !== id),
        }));
      },

      /** Replace everything — used by JSON import. */
      replaceAll(raw: unknown): void {
        setData(normalize(raw));
      },
    }),
    [update],
  );

  return { data, actions };
}
