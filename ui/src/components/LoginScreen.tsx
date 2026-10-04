import React, { useState } from 'react';
import { Dumbbell, KeyRound, LoaderCircle } from 'lucide-react';
interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onJoin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onJoin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onLogin(email, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Sign-in failed. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="login-shell glass-panel">
      <div className="enrollment-success-icon"><Dumbbell size={28} /></div>
      <p className="enrollment-eyebrow">Apex Studio</p>
      <h1>Sign in</h1>
      <p className="enrollment-lead">Member and staff access is protected by your studio account.</p>
      {error && <div className="enrollment-error" role="alert">{error}</div>}
      <form onSubmit={submit} className="login-form">
        <label className="form-group"><span className="form-label">Email address</span><input className="form-input" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="form-group"><span className="form-label">Password</span><input className="form-input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <button className="btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle size={17} className="enrollment-spinner" /> : <KeyRound size={17} />}
          <span>{isSubmitting ? 'Signing in…' : 'Sign in'}</span>
        </button>
      </form>
      <div className="login-divider" />
      <p className="enrollment-muted">New to Apex?</p>
      <button className="btn-secondary" type="button" onClick={onJoin}>Join the studio</button>
    </section>
  );
};
