import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { ApiError } from '../api';

export function SignIn(): JSX.Element {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(username, password);
    } catch (err) {
      // Generic failure (does not reveal whether the account exists or is locked).
      setError(err instanceof ApiError ? 'Sign-in failed. Check your details and try again.' : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main" style={{ maxWidth: 420, margin: '48px auto', padding: '0 16px' }}>
      <h1>Event Analytics</h1>
      <p>Sign in to view application analytics.</p>
      {error ? (
        <div role="alert" className="notice error">
          <p>{error}</p>
        </div>
      ) : null}
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
      <details className="protohint">
        <summary>Demo accounts</summary>
        <div>
          <p>admin / admin12345 (admin; both applications)</p>
          <p>analyst / analyst12345 (user; web-portal only)</p>
        </div>
      </details>
    </main>
  );
}
