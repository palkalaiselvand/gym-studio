import React from 'react';
import { Dumbbell, LogOut, RotateCcw, Database, UserPlus } from 'lucide-react';
import type { AuthenticatedUser } from '../types';

interface HeaderProps {
  user: AuthenticatedUser | null;
  onLogout: () => void;
  onResetData: () => void;
  isApiOnline?: boolean;
  onStartEnrollment: () => void;
  enrollmentOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onResetData,
  isApiOnline = false,
  onStartEnrollment,
  enrollmentOpen
}) => {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-wrapper">
          <div className="brand-logo-icon">
            <Dumbbell size={24} strokeWidth={2.5} />
          </div>
          <div className="brand-title">
            <span>APEX STUDIO</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
              <span className="brand-subtitle">Gym & Athletic Club</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '9999px',
                  background: isApiOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: isApiOnline ? '#34d399' : '#fbbf24',
                  border: isApiOnline ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                }}
                title={isApiOnline ? 'Connected to the live Gym Studio API' : 'Gym Studio API is offline'}
              >
                <Database size={10} />
                <span>{isApiOnline ? 'Live DB' : 'API Offline'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          {!user && !enrollmentOpen && (
            <button className="btn-primary" onClick={onStartEnrollment}>
              <UserPlus size={16} />
              <span>Join the studio</span>
            </button>
          )}
          {user && (
            <>
              <span className="header-user-label">{user.email} · {user.role}</span>
              {!enrollmentOpen && (user.role === 'admin' || user.role === 'staff') && (
                <button className="btn-primary" onClick={onStartEnrollment}>
                  <UserPlus size={16} /><span>Enroll member</span>
                </button>
              )}
              {user.role === 'admin' && (
                <button className="btn-secondary-sm" onClick={onResetData} title="Reset demo database">
                  <RotateCcw size={14} /><span>Reset Demo Data</span>
                </button>
              )}
              <button className="btn-secondary-sm" onClick={onLogout}>
                <LogOut size={14} /><span>Sign out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
