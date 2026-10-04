import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, Sparkles } from 'lucide-react';
import type { Member, MembershipTier, MembershipStatus, PaymentStatus } from '../../types';
import { TIER_CONFIG } from '../../data/mockData';

interface MemberModalProps {
  isOpen: boolean;
  memberToEdit: Member | null;
  onClose: () => void;
  onSave: (memberData: Partial<Member>) => void;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  memberToEdit,
  onClose,
  onSave
}) => {
  const isEditing = !!memberToEdit;

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tier, setTier] = useState<MembershipTier>('Gold');
  const [status, setStatus] = useState<MembershipStatus>('pending');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (memberToEdit) {
      setName(memberToEdit.name);
      setEmail(memberToEdit.email);
      setPhone(memberToEdit.phone);
      setTier(memberToEdit.membership.tier);
      setStatus(memberToEdit.membership.status);
      setPaymentStatus(memberToEdit.membership.paymentStatus);
      setStartDate(memberToEdit.membership.startDate);
      setEndDate(memberToEdit.membership.endDate);
      setAutoRenew(false);
      setEmergencyName(memberToEdit.emergencyContact?.name || '');
      setEmergencyPhone(memberToEdit.emergencyContact?.phone || '');
      setEmergencyRelation(memberToEdit.emergencyContact?.relation || '');
      setNotes(memberToEdit.membership.notes || '');
    } else {
      // Default new member values
      setName('');
      setEmail('');
      setPhone('');
      setTier('Gold');
      setStatus('pending');
      setPaymentStatus('pending');
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      const oneYear = new Date();
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      setEndDate(oneYear.toISOString().split('T')[0]);
      setAutoRenew(false);
      setEmergencyName('');
      setEmergencyPhone('');
      setEmergencyRelation('');
      setNotes('');
    }
    setErrors({});
  }, [memberToEdit, isOpen]);

  if (!isOpen) return null;

  const handleDurationPreset = (months: number) => {
    if (!startDate) return;
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Validation
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Full name is required';
    if (!email.trim()) errs.email = 'Valid email is required';
    if (!startDate) errs.startDate = 'Start date is required';
    if (!endDate) errs.endDate = 'End date is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const tierInfo = TIER_CONFIG[tier] || TIER_CONFIG.Gold;

    const memberPayload: Partial<Member> = {
      ...(memberToEdit ? { id: memberToEdit.id } : {}),
      name,
      email,
      phone,
      emergencyContact: {
        name: emergencyName,
        phone: emergencyPhone,
        relation: emergencyRelation || 'Family'
      },
      membership: {
        id: memberToEdit?.membership.id || `MS-${Date.now().toString().slice(-6)}`,
        tier,
        status,
        startDate,
        endDate,
        pricePerMonth: tierInfo.monthlyPrice,
        paymentStatus,
        autoRenew,
        perks: tierInfo.perks,
        notes
      }
    };

    onSave(memberPayload);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {isEditing ? (
              <Save size={20} color="var(--accent-primary)" />
            ) : (
              <UserPlus size={20} color="var(--accent-primary)" />
            )}
            <h3 style={{ fontSize: '1.25rem' }}>
              {isEditing ? `Edit Member: ${memberToEdit.name}` : 'Register New Member'}
            </h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="modal-body">
            {/* Personal Details */}
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
              1. Member Identity
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Jordan Miller"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <span style={{ color: '#fb7185', fontSize: '0.75rem' }}>{errors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. jordan.m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isEditing}
                />
                {errors.email && <span style={{ color: '#fb7185', fontSize: '0.75rem' }}>{errors.email}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. +1 (555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Membership Tier</label>
                <select
                  className="form-select"
                  value={tier}
                  onChange={(e) => setTier(e.target.value as MembershipTier)}
                >
                  <option value="Basic">Basic (${TIER_CONFIG.Basic.monthlyPrice}/mo)</option>
                  <option value="Silver">Silver (${TIER_CONFIG.Silver.monthlyPrice}/mo)</option>
                  <option value="Gold">Gold (${TIER_CONFIG.Gold.monthlyPrice}/mo)</option>
                  <option value="Platinum">Platinum (${TIER_CONFIG.Platinum.monthlyPrice}/mo)</option>
                  <option value="VIP">VIP All-Inclusive (${TIER_CONFIG.VIP.monthlyPrice}/mo)</option>
                </select>
              </div>
            </div>

            {/* Tier Highlights preview */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <Sparkles size={16} color="var(--accent-primary)" />
              <div>
                <strong style={{ color: 'var(--text-main)' }}>{tier} Plan Highlights:</strong>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>
                  {TIER_CONFIG[tier]?.description} Includes {TIER_CONFIG[tier]?.perks.slice(0, 2).join(', ')}...
                </span>
              </div>
            </div>

            {/* Membership Status & Timing */}
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem', marginTop: '0.5rem' }}>
              2. Membership Status & Duration
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Membership Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MembershipStatus)}
                >
                  <option
                    value="active"
                    disabled={
                      memberToEdit
                        ? memberToEdit.membership.status !== 'active' || memberToEdit.membership.paymentStatus !== 'paid'
                        : true
                    }
                  >
                    Active
                  </option>
                  <option value="pending">Pending Approval</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended (Pause)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select
                  className="form-select"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                >
                  <option value="paid" disabled={!memberToEdit || memberToEdit.membership.paymentStatus !== 'paid'}>Paid</option>
                  <option value="pending">Pending Invoice</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
            <p className="enrollment-muted">
              Payment is handled outside this app. Use the directory's offline payment confirmation action to activate or renew access.
            </p>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expiration / Renewal Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Quick duration presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Duration:</span>
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => handleDurationPreset(1)}
              >
                +1 Month
              </button>
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => handleDurationPreset(3)}
              >
                +3 Months
              </button>
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => handleDurationPreset(6)}
              >
                +6 Months
              </button>
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => handleDurationPreset(12)}
              >
                +1 Year
              </button>
            </div>

            <div className="form-group">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  disabled
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                />
                <span>Automatic renewal requires payment integration</span>
              </label>
            </div>

            {/* Emergency Contact */}
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem', marginTop: '0.5rem' }}>
              3. Emergency Contact & Internal Notes
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Alex Miller"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. +1 (555) 999-8888"
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
                placeholder="e.g. Spouse / Sibling / Friend"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Admin Notes</label>
              <textarea
                className="form-textarea"
                placeholder="Special medical considerations, preferred training schedule, locker number, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isEditing ? <Save size={16} /> : <UserPlus size={16} />}
              <span>{isEditing ? 'Save Changes' : 'Register Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
