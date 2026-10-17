import { useState, type FormEvent } from 'react';
import { friendly, passwordProblem } from './AuthForm';

interface Props {
  /** Shown above the form; differs for a recovery link vs a routine change. */
  intro: string;
  submitLabel: string;
  onSubmit: (password: string) => Promise<void>;
  onCancel?: () => void;
  onDone: () => void;
}

/**
 * Sets a new password on the signed-in user. Reached either by following a
 * reset link (the recovery token signs you in first) or from Settings.
 */
export function PasswordForm({ intro, submitLabel, onSubmit, onCancel, onDone }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }

    setError('');
    setBusy(true);
    try {
      await onSubmit(password);
      setPassword('');
      setConfirm('');
      onDone();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <p className="muted">{intro}</p>

      <label className="field">
        <span className="field-label">New password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          placeholder="At least 8 characters"
        />
      </label>

      <label className="field">
        <span className="field-label">Confirm new password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setError('');
          }}
        />
      </label>

      {error && <p className="field-error">{error}</p>}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
