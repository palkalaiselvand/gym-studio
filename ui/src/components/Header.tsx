import React from 'react';
import { Dumbbell, ShieldCheck, User, RotateCcw } from 'lucide-react';
import type { UserRole, Member } from '../types';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  members: Member[];
  selectedMemberId: string;
  onSelectMember: (id: string) => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  members,
  selectedMemberId,
  onSelectMember,
  onResetData
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
            <span className="brand-subtitle">Gym & Athletic Club</span>
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
