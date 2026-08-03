import { useEffect, useState } from 'react';
import type { SyncState } from '../useAppData';

interface Props {
  sync: SyncState;
  onSignInClick: () => void;
  onSignOut: () => Promise<void>;
  onRotateCode: () => Promise<void>;
  onReloadMembers: () => Promise<void>;
}

export function SharingPanel({
  sync,
  onSignInClick,
  onSignOut,
  onRotateCode,
  onReloadMembers,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void onReloadMembers();
    // Only on mount — the members list is small and rarely changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (!sync.configured) {
    return (
      <section>
        <h3>Sharing</h3>
        <p className="muted">
          Cloud sync isn't set up for this build, so subscriptions stay in this browser. See
          <code> README.md</code> for the setup steps — it takes a Supabase project URL and anon key
          in a <code>.env</code> file.
        </p>
      </section>
    );
  }

  if (!sync.user) {
    return (
      <section>
        <h3>Sharing</h3>
        <p className="muted">
          You're working offline in this browser. Sign in to sync across your devices and share
          everything with someone else — your current data comes with you.
        </p>
        <div className="button-row">
          <button className="btn btn-primary" onClick={onSignInClick}>
            Sign in to sync
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h3>Sharing</h3>
      <p className="muted">
        Signed in as {sync.user.email}. Everyone below sees and edits the same subscriptions.
      </p>

      {sync.household && (
        <>
          <ul className="manage-list">
            {sync.members.map((m) => (
              <li key={m.userId}>
                <span>{m.email}</span>
                <span className="muted">
                  {m.role === 'owner' ? 'owner' : 'member'}
                  {m.userId === sync.user?.id ? ' · you' : ''}
                </span>
              </li>
            ))}
            {sync.members.length === 0 && <li className="muted">Just you so far.</li>}
          </ul>

          <div className="invite">
            <div>
              <span className="field-label">Invite code</span>
              <code className="invite-code">{sync.household.inviteCode}</code>
            </div>
            <div className="button-row">
              <button
                className="btn btn-small"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(sync.household!.inviteCode)
                    .then(() => setCopied(true))
                    .catch(() => undefined);
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                className="btn btn-small btn-ghost"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void onRotateCode().finally(() => setBusy(false));
                }}
              >
                Reset
              </button>
            </div>
          </div>
          <p className="muted small">
            Have them create an account, then enter this code to join. Resetting it stops the old
            code working — anyone already joined stays.
          </p>
        </>
      )}

      <div className="button-row">
        <button className="btn" onClick={() => void onSignOut()}>
          Sign out
        </button>
      </div>
    </section>
  );
}
