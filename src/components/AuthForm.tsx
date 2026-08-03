import { useState, type FormEvent } from 'react';

/**
 * Turns the raw errors into something a person can act on. "Failed to fetch" in
 * particular means the browser never reached the server at all — usually no
 * connection, or credentials pointing at a project that doesn't exist.
 */
export function friendly(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? '');
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  if (/invalid login credentials/i.test(raw)) {
    return 'That email and password combination is incorrect.';
  }
  if (/user already registered/i.test(raw)) {
    return 'There is already an account with that email — sign in instead.';
  }
  if (/email not confirmed/i.test(raw)) {
    return 'Confirm your email address first — check your inbox for the link.';
  }
  return raw || 'Something went wrong.';
}

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  onDone: () => void;
}

export function AuthForm({ onSignIn, onSignUp, onDone }: Props) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!email.trim() || !password) {
      setError('Enter your email and a password.');
      return;
    }
    if (mode === 'up' && password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'in') {
        await onSignIn(email.trim(), password);
        onDone();
      } else {
        const { needsConfirmation } = await onSignUp(email.trim(), password);
        if (needsConfirmation) {
          setNotice('Check your email for a confirmation link, then sign in.');
          setMode('in');
        } else {
          onDone();
        }
      }
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <p className="muted">
        {mode === 'in'
          ? 'Sign in to sync your subscriptions across devices and share them.'
          : 'Create an account to sync across devices and share with someone else.'}
      </p>

      <label className="field">
        <span className="field-label">Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <label className="field">
        <span className="field-label">Password</span>
        <input
          type="password"
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'up' ? 'At least 8 characters' : ''}
        />
      </label>

      {error && <p className="field-error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setError('');
            setNotice('');
          }}
        >
          {mode === 'in' ? 'Create an account' : 'I already have an account'}
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Working…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
      </div>
    </form>
  );
}
