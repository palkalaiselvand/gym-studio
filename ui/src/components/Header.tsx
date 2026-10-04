import React from 'react';
import { Dumbbell, ShieldCheck, User, RotateCcw, Database } from 'lucide-react';
import type { UserRole, Member } from '../types';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  members: Member[];
  selectedMemberId: string;
  onSelectMember: (id: string) => void;
  onResetData: () => void;
  isApiOnline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  members,
  selectedMemberId,
  onSelectMember,
  onResetData,
  isApiOnline = false
}) => {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-wrapper" onClick={() => onRoleChange('admin')}>
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
                title={isApiOnline ? 'Connected to Open-Source Document DB at http://localhost:5000/api' : 'API offline: using local cache'}
              >
                <Database size={10} />
                <span>{isApiOnline ? 'Live DB' : 'Local Cache'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          {/* Member selector when in Member role */}
          {currentRole === 'member' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Viewing as:</span>
              <select
                className="member-select-dropdown"
                value={selectedMemberId}
                onChange={(e) => onSelectMember(e.target.value)}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.membership.tier})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Role Toggle Switcher */}
          <div className="role-switcher-pill">
            <button
              className={`role-pill-btn ${currentRole === 'admin' ? 'active' : ''}`}
              onClick={() => onRoleChange('admin')}
              title="Admin mode: Manage gym memberships, payments and members"
            >
              <ShieldCheck size={16} />
              <span>Admin Management</span>
            </button>
            <button
              className={`role-pill-btn ${currentRole === 'member' ? 'active' : ''}`}
              onClick={() => onRoleChange('member')}
              title="Member mode: View your pass, attendance and studio details"
            >
              <User size={16} />
              <span>Member Portal</span>
            </button>
          </div>

          {/* Reset Demo Data Button */}
          <button
            className="btn-secondary-sm"
            onClick={onResetData}
            title="Reset data back to initial stub members & studio information"
          >
            <RotateCcw size={14} />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </header>
  );
};
