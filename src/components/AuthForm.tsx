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
  if (/for security purposes|rate limit|too many requests/i.test(raw)) {
    return 'Too many attempts just now. Wait a minute and try again.';
  }
  if (/same.*password|should be different/i.test(raw)) {
    return 'That is already your password — pick a different one.';
  }
  return raw || 'Something went wrong.';
}

/** Shared rule so the sign-up and the set-new-password screens agree. */
export function passwordProblem(password: string, confirm?: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (confirm !== undefined && password !== confirm) return "Those two passwords don't match.";
  return null;
}

type Mode = 'in' | 'up' | 'forgot';

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  onSendReset: (email: string) => Promise<void>;
  onDone: () => void;
}

export function AuthForm({ onSignIn, onSignUp, onSendReset, onDone }: Props) {
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function switchTo(next: Mode) {
    setMode(next);
    setError('');
    setNotice('');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    if (mode !== 'forgot' && !password) {
      setError('Enter your password.');
      return;
    }
    if (mode === 'up') {
      const problem = passwordProblem(password);
      if (problem) {
        setError(problem);
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'forgot') {
        await onSendReset(email.trim());
        // Deliberately the same message whether or not an account exists, so
        // the form can't be used to find out who has signed up.
        setNotice(
          "If there's an account for that address, a reset link is on its way. Open it on this device.",
        );
      } else if (mode === 'in') {
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

  const blurb =
    mode === 'in'
      ? 'Sign in to sync your subscriptions across devices and share them.'
      : mode === 'up'
        ? 'Create an account to sync across devices and share with someone else.'
        : "Enter your email and we'll send you a link to set a new password.";

  return (
    <form className="form" onSubmit={handleSubmit}>
      <p className="muted">{blurb}</p>

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

      {mode !== 'forgot' && (
        <label className="field">
          <span className="field-label">Password</span>
          <input
            type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'up' ? 'At least 8 characters' : ''}
          />
          {mode === 'in' && (
            <button type="button" className="link-button" onClick={() => switchTo('forgot')}>
              Forgot your password?
            </button>
          )}
        </label>
      )}

      {error && <p className="field-error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => switchTo(mode === 'in' ? 'up' : 'in')}
        >
          {mode === 'in' ? 'Create an account' : 'Back to sign in'}
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy
            ? 'Working…'
            : mode === 'in'
              ? 'Sign in'
              : mode === 'up'
                ? 'Create account'
                : 'Send reset link'}
        </button>
      </div>
    </form>
  );
}
