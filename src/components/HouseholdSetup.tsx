import { useState } from 'react';
import { friendly } from './AuthForm';

interface Props {
  email: string;
  onCreate: (name: string) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

/**
 * Shown once, to a signed-in user who isn't in a household yet. One of you
 * creates the shared space; the other joins it with the invite code.
 */
export function HouseholdSetup({ email, onCreate, onJoin, onSignOut }: Props) {
  const [name, setName] = useState('Our subscriptions');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="setup">
      <div className="setup-card">
        <h1>One more step</h1>
        <p className="muted">
          Signed in as {email}. Subscriptions live in a shared space that you and your partner both
          have access to.
        </p>

        <section>
          <h2>Start a new one</h2>
          <p className="muted small">
            Pick this if you're setting things up first. You'll get an invite code to pass along.
          </p>
          <div className="inline-add">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Our subscriptions" />
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void run(() => onCreate(name))}
            >
              Create
            </button>
          </div>
        </section>

        <div className="setup-or">
          <span>or</span>
        </div>

        <section>
          <h2>Join an existing one</h2>
          <p className="muted small">
            Pick this if your partner already set it up and gave you a code.
          </p>
          <div className="inline-add">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              placeholder="Invite code"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button
              className="btn"
              disabled={busy || !code}
              onClick={() => void run(() => onJoin(code))}
            >
              Join
            </button>
          </div>
        </section>

        {error && <p className="field-error">{error}</p>}

        <button className="btn btn-ghost btn-small" onClick={() => void onSignOut()}>
          Sign out
        </button>
      </div>
    </div>
  );
}
