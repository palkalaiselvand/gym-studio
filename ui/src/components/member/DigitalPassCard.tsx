import React, { useEffect, useState } from 'react';
import { Dumbbell, LoaderCircle, QrCode, Wifi } from 'lucide-react';
import QRCode from 'qrcode';
import type { Member } from '../../types';
import { TIER_CONFIG } from '../../data/mockData';
import { apiService } from '../../services/apiService';
import { hasStudioAccess } from '../../utils/membership';

interface DigitalPassCardProps {
  member: Member;
}

export const DigitalPassCard: React.FC<DigitalPassCardProps> = ({ member }) => {
  const [qrCode, setQrCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const tierConfig = TIER_CONFIG[member.membership.tier] || TIER_CONFIG.Gold;
  const canAccess = hasStudioAccess(member);

  useEffect(() => {
    if (!canAccess) return;

    let cancelled = false;
    const issuePass = async () => {
      try {
        const pass = await apiService.getAccessPass();
        const image = await QRCode.toDataURL(pass.token, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 184
        });
        if (!cancelled) {
          setQrCode(image);
          setExpiresAt(pass.expiresAt);
          setError('');
        }
      } catch (passError) {
        if (!cancelled) {
          setQrCode('');
          setError(passError instanceof Error ? passError.message : 'The access pass could not be issued.');
        }
      }
    };

    void issuePass();
    const refreshTimer = window.setInterval(() => { void issuePass(); }, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [canAccess, member.id]);

  return (
    <div className="digital-pass-wrapper">
      <div
        className="digital-pass-card"
        style={{
          background: tierConfig.bgGradient,
          boxShadow: `0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 25px ${tierConfig.badgeColor}40`
        }}
      >
        <div className="pass-header">
          <div className="pass-studio-name">
            <Dumbbell size={20} strokeWidth={2.5} />
            <span>APEX ATHLETIC</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="pass-tier-label">{member.membership.tier} PASS</span>
            <Wifi size={18} style={{ opacity: 0.8 }} />
          </div>
        </div>

        <div className="pass-body">
          <img src={member.avatar} alt="" className="pass-avatar" />
          <div style={{ flex: 1 }}>
            <div className="pass-member-name">{member.name}</div>
            <div className="pass-member-id">MEMBER #{member.id}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.2rem' }}>
              Valid Thru: <strong>{member.membership.endDate}</strong>
            </div>
          </div>
        </div>

        <div className="pass-footer">
          <div className="pass-qr-area" aria-live="polite">
            {canAccess && qrCode ? (
              <img src={qrCode} alt="Short-lived studio access QR code" className="pass-qr-code" />
            ) : canAccess && !error ? (
              <LoaderCircle size={26} className="enrollment-spinner" aria-label="Preparing access QR code" />
            ) : (
              <QrCode size={28} />
            )}
            <span>{canAccess && qrCode ? `Refreshes at ${new Date(expiresAt).toLocaleTimeString()}` : 'Access QR'}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>Access Status</div>
            <div className="pass-access-status">
              <span className={`pass-status-dot ${canAccess ? 'active' : ''}`} />
              {member.membership.status}
            </div>
          </div>
        </div>
      </div>

      {!canAccess && (
        <p className="enrollment-pass-pending" role="status">
          Access is unavailable until the membership is active and paid.
        </p>
      )}
      {error && <p className="enrollment-pass-pending" role="alert">{error}</p>}
      {canAccess && qrCode && (
        <p className="enrollment-pass-pending">Present this rotating QR code to a studio staff access reader.</p>
      )}
    </div>
  );
};
