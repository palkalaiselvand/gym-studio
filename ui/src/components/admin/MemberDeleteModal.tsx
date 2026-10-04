import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { Member } from '../../types';

interface MemberDeleteModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export const MemberDeleteModal: React.FC<MemberDeleteModalProps> = ({
  member,
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !member) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fb7185' }}>
            <AlertTriangle size={20} />
            <h3 style={{ fontSize: '1.15rem' }}>Cancel & Delete Membership</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Are you sure you want to permanently cancel and delete the membership record for:
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: 'var(--bg-secondary)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <img
              src={member.avatar}
              alt={member.name}
              style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{member.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {member.email} • Plan: <span style={{ color: 'var(--accent-primary)' }}>{member.membership.tier}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                ID: {member.id}
              </div>
            </div>
          </div>

          <p style={{ color: '#fb7185', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Warning: This action will purge all their pass credentials, check-in history, and assigned gym benefits.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-danger"
            onClick={() => {
              onConfirm(member.id);
              onClose();
            }}
          >
            <Trash2 size={16} />
            <span>Confirm Deletion</span>
          </button>
        </div>
      </div>
    </div>
  );
};
