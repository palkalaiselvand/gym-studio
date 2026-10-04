import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, UserPlus, Users } from 'lucide-react';
import { apiService } from '../../services/apiService';
import type { StaffAccount } from '../../types';

interface TeamAccessPanelProps {
  onBack: () => void;
}

export const TeamAccessPanel: React.FC<TeamAccessPanelProps> = ({ onBack }) => {
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffAccount['role']>('staff');
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      setAccounts(await apiService.getStaffAccounts());
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Staff accounts could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiService.getStaffAccounts()
      .then((users) => { if (!cancelled) setAccounts(users); })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Staff accounts could not be loaded.');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await apiService.createStaffAccount({ email, password, role });
      setEmail('');
      setPassword('');
      await loadAccounts();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Staff account could not be created.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateAccount = async (id: string, updates: { active?: boolean; password?: string }) => {
    setIsSaving(true);
    try {
      const updated = await apiService.updateStaffAccount(id, updates);
      setAccounts((current) => current.map((account) => account.id === id ? updated : account));
      setResetPasswords((current) => ({ ...current, [id]: '' }));
      setError('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Staff account could not be updated.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} /> Team access</h2>
          <p className="enrollment-muted">Staff credentials are database-backed. Share passwords with staff securely and out of band.</p>
        </div>
        <button className="btn-secondary-sm" onClick={onBack}><ArrowLeft size={14} /> Back to directory</button>
      </div>

      {error && <div className="enrollment-error" role="alert">{error}</div>}

      <form onSubmit={createAccount} className="login-form" style={{ maxWidth: '720px', marginBottom: '1.5rem' }}>
        <h3>Create a staff account</h3>
        <div className="form-row">
          <label className="form-group"><span className="form-label">Email</span><input className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></label>
          <label className="form-group"><span className="form-label">Initial password (12+ characters)</span><input className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={128} required /></label>
        </div>
        <label className="form-group">
          <span className="form-label">Role</span>
          <select className="form-select" value={role} onChange={(event) => setRole(event.target.value as StaffAccount['role'])}>
            <option value="staff">Staff (directory and member operations)</option>
            <option value="franchise-owner">Franchise owner (read-only directory)</option>
          </select>
        </label>
        <button className="btn-primary" type="submit" disabled={isSaving}>
          <UserPlus size={16} /><span>Create account</span>
        </button>
      </form>

      <h3 style={{ marginBottom: '0.75rem' }}>Existing staff accounts</h3>
      {isLoading ? <p className="enrollment-muted">Loading team accounts…</p> : accounts.length === 0 ? (
        <p className="enrollment-muted">No staff accounts have been created.</p>
      ) : (
        <div className="table-container">
          <table className="members-table">
            <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Reset password</th><th>Actions</th></tr></thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.email}</td>
                  <td>{account.role}</td>
                  <td>{account.active ? 'Active' : 'Disabled'}</td>
                  <td>
                    <input
                      className="form-input"
                      type="password"
                      aria-label={`New password for ${account.email}`}
                      placeholder="12+ characters"
                      minLength={12}
                      maxLength={128}
                      value={resetPasswords[account.id] || ''}
                      onChange={(event) => setResetPasswords((current) => ({ ...current, [account.id]: event.target.value }))}
                    />
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn-secondary-sm"
                        disabled={isSaving || (resetPasswords[account.id] || '').length < 12}
                        onClick={() => { void updateAccount(account.id, { password: resetPasswords[account.id] }); }}
                        title="Reset password and revoke existing sessions"
                      >
                        <KeyRound size={14} /> Reset
                      </button>
                      <button
                        className="btn-secondary-sm"
                        disabled={isSaving}
                        onClick={() => { void updateAccount(account.id, { active: !account.active }); }}
                      >
                        {account.active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
