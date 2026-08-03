import { useRef, useState, type ReactNode } from 'react';
import type { AppData } from '../types';
import { toJSON } from '../lib/storage';

interface Props {
  data: AppData;
  /** The sharing/sync section, rendered first. */
  sharing: ReactNode;
  /** True when data lives in the cloud rather than only in this browser. */
  synced: boolean;
  onAddAccount: (name: string, last4: string) => void;
  onRemoveAccount: (id: string) => void;
  onAddCategory: (name: string, color: string) => void;
  onRemoveCategory: (id: string) => void;
  onImport: (raw: unknown) => void;
  onClose: () => void;
}

export function Settings({
  data,
  sharing,
  synced,
  onAddAccount,
  onRemoveAccount,
  onAddCategory,
  onRemoveCategory,
  onImport,
  onClose,
}: Props) {
  const [accountName, setAccountName] = useState('');
  const [last4, setLast4] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#3b82f6');
  const [importError, setImportError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  function handleExport() {
    const blob = new Blob([toJSON(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    setImportError('');
    try {
      onImport(JSON.parse(await file.text()));
      onClose();
    } catch {
      setImportError("That file couldn't be read as subscription data.");
    }
  }

  return (
    <div className="settings">
      {sharing}

      <section>
        <h3>Accounts</h3>
        <p className="muted">The cards and accounts your subscriptions are charged to.</p>
        <ul className="manage-list">
          {data.accounts.map((account) => {
            const inUse = data.subscriptions.filter((s) => s.accountId === account.id).length;
            return (
              <li key={account.id}>
                <span>
                  {account.name}
                  {account.last4 ? <span className="muted"> ••{account.last4}</span> : null}
                </span>
                <span className="muted">{inUse} subscription{inUse === 1 ? '' : 's'}</span>
                <button
                  className="btn btn-small btn-ghost"
                  disabled={inUse > 0}
                  title={inUse > 0 ? 'Still in use' : 'Remove'}
                  onClick={() => onRemoveAccount(account.id)}
                >
                  Remove
                </button>
              </li>
            );
          })}
          {data.accounts.length === 0 && <li className="muted">No accounts yet.</li>}
        </ul>
        <div className="inline-add">
          <input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Chase Sapphire"
          />
          <input
            className="last4"
            value={last4}
            onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••1234"
            inputMode="numeric"
          />
          <button
            className="btn btn-small"
            onClick={() => {
              if (!accountName.trim()) return;
              onAddAccount(accountName.trim(), last4.trim());
              setAccountName('');
              setLast4('');
            }}
          >
            Add account
          </button>
        </div>
      </section>

      <section>
        <h3>Categories</h3>
        <ul className="manage-list">
          {data.categories.map((category) => {
            const inUse = data.subscriptions.filter((s) => s.categoryId === category.id).length;
            return (
              <li key={category.id}>
                <span>
                  <span className="dot" style={{ background: category.color }} />
                  {category.name}
                </span>
                <span className="muted">{inUse} subscription{inUse === 1 ? '' : 's'}</span>
                <button
                  className="btn btn-small btn-ghost"
                  disabled={inUse > 0}
                  title={inUse > 0 ? 'Still in use' : 'Remove'}
                  onClick={() => onRemoveCategory(category.id)}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
        <div className="inline-add">
          <input
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Podcasts"
          />
          <input
            type="color"
            className="color-input"
            value={categoryColor}
            onChange={(e) => setCategoryColor(e.target.value)}
          />
          <button
            className="btn btn-small"
            onClick={() => {
              if (!categoryName.trim()) return;
              onAddCategory(categoryName.trim(), categoryColor);
              setCategoryName('');
            }}
          >
            Add category
          </button>
        </div>
      </section>

      <section>
        <h3>Your data</h3>
        <p className="muted">
          {synced
            ? 'Your subscriptions are synced to your account, so they survive clearing this browser. An export is still a handy offline backup.'
            : 'Everything is stored in this browser only — nothing is uploaded anywhere. Export a copy if you clear your browser data or want it on another device.'}
        </p>
        <div className="button-row">
          <button className="btn" onClick={handleExport}>
            Export JSON
          </button>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
              e.target.value = '';
            }}
          />
        </div>
        {importError && <p className="field-error">{importError}</p>}
        <p className="muted small">
          Importing replaces everything currently tracked{synced ? ', for everyone sharing it' : ''}.
          Export first if you're not sure.
        </p>
      </section>
    </div>
  );
}
