import React, { useState } from 'react';
import { Dumbbell, Wifi, QrCode, CheckCircle2 } from 'lucide-react';
import type { Member } from '../../types';
import { TIER_CONFIG } from '../../data/mockData';

interface DigitalPassCardProps {
  member: Member;
  onCheckInSimulation?: () => void;
}

export const DigitalPassCard: React.FC<DigitalPassCardProps> = ({ member, onCheckInSimulation }) => {
  const [justScanned, setJustScanned] = useState(false);
  const tierConfig = TIER_CONFIG[member.membership.tier] || TIER_CONFIG.Gold;

  const handleSimulateScan = () => {
    setJustScanned(true);
    if (onCheckInSimulation) onCheckInSimulation();
    setTimeout(() => {
      setJustScanned(false);
    }, 2500);
  };

  return (
    <div className="digital-pass-wrapper">
      <div
        className="digital-pass-card"
        style={{
          background: tierConfig.bgGradient,
          boxShadow: `0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 25px ${tierConfig.badgeColor}40`
        }}
      >
        {/* Pass Top */}
        <div className="pass-header">
          <div className="pass-studio-name">
            <Dumbbell size={20} strokeWidth={2.5} />
            <span>APEX ATHLETIC</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                background: 'rgba(255, 255, 255, 0.25)',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                letterSpacing: '0.08em'
              }}
            >
              {member.membership.tier} PASS
            </span>
            <Wifi size={18} style={{ opacity: 0.8 }} />
          </div>
        </div>

        {/* Pass Body */}
        <div className="pass-body">
          <img
            src={member.avatar}
            alt={member.name}
            className="pass-avatar"
          />
          <div style={{ flex: 1 }}>
            <div className="pass-member-name">{member.name}</div>
            <div className="pass-member-id">MEMBER #{member.id}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.2rem' }}>
              Valid Thru: <strong>{member.membership.endDate}</strong>
            </div>
          </div>
        </div>

        {/* Barcode & Status Footer */}
        <div className="pass-footer">
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.75, marginBottom: '4px' }}>
              Access Code
            </div>
            {/* Visual Barcode bars */}
            <div className="barcode-strip">
              <div className="barcode-bar" style={{ width: '3px' }} />
              <div className="barcode-bar" style={{ width: '1px' }} />
              <div className="barcode-bar" style={{ width: '4px' }} />
              <div className="barcode-bar" style={{ width: '2px' }} />
              <div className="barcode-bar" style={{ width: '1px' }} />
              <div className="barcode-bar" style={{ width: '3px' }} />
              <div className="barcode-bar" style={{ width: '5px' }} />
              <div className="barcode-bar" style={{ width: '2px' }} />
              <div className="barcode-bar" style={{ width: '3px' }} />
              <div className="barcode-bar" style={{ width: '1px' }} />
              <div className="barcode-bar" style={{ width: '4px' }} />
              <div className="barcode-bar" style={{ width: '2px' }} />
              <div className="barcode-bar" style={{ width: '6px' }} />
              <div className="barcode-bar" style={{ width: '2px' }} />
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>Access Status</div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                marginTop: '2px'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: member.membership.status === 'active' ? '#4ade80' : '#f87171'
                }}
              />
              {member.membership.status}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Scan Simulator Button */}
      <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
        <button
          className="btn-secondary-sm"
          style={{
            margin: '0 auto',
            borderColor: justScanned ? 'var(--accent-primary)' : 'var(--border-light)',
            color: justScanned ? 'var(--accent-primary)' : 'var(--text-secondary)'
          }}
          onClick={handleSimulateScan}
        >
          {justScanned ? (
            <>
              <CheckCircle2 size={14} color="var(--accent-primary)" />
              <span>Gate Verified: Access Granted!</span>
            </>
          ) : (
            <>
              <QrCode size={14} />
              <span>Simulate NFC / Turnstile Check-In</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
