import React, { useState, useEffect } from 'react';
import { X, UserCheck, Save } from 'lucide-react';
import type { Member } from '../../types';

interface EditProfileModalProps {
  isOpen: boolean;
  member: Member;
  onClose: () => void;
  onSave: (updates: {
    phone: string;
    email: string;
    emergencyContact: { name: string; phone: string; relation: string };
  }) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  member,
  onClose,
  onSave
}) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  useEffect(() => {
    if (member) {
      setEmail(member.email);
      setPhone(member.phone);
      setEmergencyName(member.emergencyContact?.name || '');
      setEmergencyPhone(member.emergencyContact?.phone || '');
      setEmergencyRelation(member.emergencyContact?.relation || '');
    }
  }, [member, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      email,
      phone,
      emergencyContact: {
        name: emergencyName,
        phone: emergencyPhone,
        relation: emergencyRelation || 'Emergency Contact'
      }
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserCheck size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.2rem' }}>Update My Contact Profile</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Keep your contact and emergency information up-to-date for studio communications and safety.
            </p>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Phone</label>
              <input
                type="tel"
                className="form-input"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.3rem' }}>
              Emergency Contact Person
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Spouse / Parent"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Relationship</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Partner, Sister, Friend"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Save size={16} />
              <span>Update Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
