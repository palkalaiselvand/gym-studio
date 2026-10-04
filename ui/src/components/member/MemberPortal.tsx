import React, { useEffect, useRef, useState } from 'react';
import {
  User,
  Calendar,
  CreditCard,
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Activity,
  Edit3,
  Dumbbell,
  Shield,
  Sparkles,
  Phone,
  Mail
} from 'lucide-react';
import type { Member, StudioDetails } from '../../types';
import { DigitalPassCard } from './DigitalPassCard';
import { StudioDetailsView } from './StudioDetailsView';
import { ClassScheduleView } from './ClassScheduleView';
import { EditProfileModal } from './EditProfileModal';
import { TIER_CONFIG } from '../../data/mockData';
import { apiService } from '../../services/apiService';
import { hasStudioAccess } from '../../utils/membership';

interface MemberPortalProps {
  member: Member;
  studio: StudioDetails;
  onUpdateMember: (id: string, updates: Partial<Member>) => Promise<void>;
  onToast: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export const MemberPortal: React.FC<MemberPortalProps> = ({
  member,
  studio,
  onUpdateMember,
  onToast
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'studio' | 'classes' | 'rules'>('profile');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [bookedClassIds, setBookedClassIds] = useState<string[]>([]);
  const onToastRef = useRef(onToast);

  const tierInfo = TIER_CONFIG[member.membership.tier] || TIER_CONFIG.Gold;
  const membershipAllowsAccess = hasStudioAccess(member);

  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  useEffect(() => {
    let cancelled = false;
    apiService.getClassBookings()
      .then((ids) => { if (!cancelled) setBookedClassIds(ids); })
      .catch((error: unknown) => {
        if (!cancelled) onToastRef.current('Class bookings unavailable', error instanceof Error ? error.message : 'Could not load reservations.', 'error');
      });
    return () => { cancelled = true; };
  }, [member.id]);

  const handleProfileSave = (updates: {
    email: string;
    phone: string;
    emergencyContact: { name: string; phone: string; relation: string };
  }) => {
    void onUpdateMember(member.id, { phone: updates.phone, emergencyContact: updates.emergencyContact })
      .then(() => onToast('Profile Updated', 'Your contact and emergency information have been saved.', 'success'))
      .catch((error: unknown) => onToast('Profile update failed', error instanceof Error ? error.message : 'Your changes could not be saved.', 'error'));
  };

  const handleBookClass = async (classId: string, className: string): Promise<boolean> => {
    try {
      await apiService.bookClass(classId);
      setBookedClassIds((current) => current.includes(classId) ? current : [...current, classId]);
      onToast('Class Booked!', `You have reserved a spot for "${className}". See you on the floor!`, 'success');
      return true;
    } catch (error) {
      onToast('Class booking failed', error instanceof Error ? error.message : 'The class could not be booked.', 'error');
      return false;
    }
  };

  const handleCancelClass = async (classId: string, className: string): Promise<boolean> => {
    try {
      await apiService.cancelClass(classId);
      setBookedClassIds((current) => current.filter((id) => id !== classId));
      onToast('Booking Cancelled', `Your reservation for "${className}" has been cancelled.`, 'info');
      return true;
    } catch (error) {
      onToast('Cancellation failed', error instanceof Error ? error.message : 'The reservation could not be cancelled.', 'error');
      return false;
    }
  };

  return (
    <div>
      {/* Member Banner & Digital Pass */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
        <DigitalPassCard
          member={member}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="tabs-navigation">
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={18} />
          <span>My Membership & Profile</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
          onClick={() => setActiveTab('studio')}
        >
          <Dumbbell size={18} />
          <span>Studio Info & Amenities</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
          onClick={() => setActiveTab('classes')}
        >
          <Calendar size={18} />
          <span>Class Schedule & Booking</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <Shield size={18} />
          <span>Rules & Etiquette</span>
        </button>
      </div>

      {/* Tab 1: Profile & Membership */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Stats Bar */}
          <div className="metrics-grid" style={{ marginBottom: '0.5rem' }}>
            <div className="glass-panel stat-card highlight">
              <div className="stat-header">
                <span className="stat-title">Workout Streak</span>
                <Flame size={18} color="#f59e0b" />
              </div>
              <div className="stat-value" style={{ color: '#fbbf24' }}>
                {member.attendanceStreak} Days 🔥
              </div>
              <div className="stat-footer">
                <span>Active consecutive attendance</span>
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span className="stat-title">Total Studio Visits</span>
                <Activity size={18} color="var(--accent-primary)" />
              </div>
              <div className="stat-value">{member.totalCheckIns}</div>
              <div className="stat-footer">
                <span>Check-ins since {member.joinDate}</span>
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span className="stat-title">Current Plan</span>
                <Award size={18} color="#a78bfa" />
              </div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                {member.membership.tier}
              </div>
              <div className="stat-footer">
                <span>${member.membership.pricePerMonth} / month</span>
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span className="stat-title">Membership Status</span>
                <CheckCircle2 size={18} color="#34d399" />
              </div>
              <div className="stat-value" style={{ textTransform: 'capitalize', fontSize: '1.4rem' }}>
                {member.membership.status}
              </div>
              <div className="stat-footer">
                <span>Expires: {member.membership.endDate}</span>
              </div>
            </div>
          </div>

          {/* Details Row: Plan details & Personal info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Membership Plan Details Card */}
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CreditCard size={20} color="var(--accent-primary)" />
                  <span>My Membership Details</span>
                </h3>
                <span className={`badge badge-tier-${member.membership.tier}`}>
                  {member.membership.tier} Plan
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Monthly Rate:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>${member.membership.pricePerMonth}/mo</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Member Since:</span>
                  <span style={{ fontWeight: 600 }}>{member.joinDate}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Renewal / Expiration:</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{member.membership.endDate}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Auto-Renewal:</span>
                  <span style={{ fontWeight: 600, color: member.membership.autoRenew ? '#34d399' : '#f59e0b' }}>
                    {member.membership.autoRenew ? 'Active (Auto-bills on renewal)' : 'Disabled (Requires manual payment)'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Billing Status:</span>
                  <span style={{ fontWeight: 700, textTransform: 'capitalize', color: member.membership.paymentStatus === 'paid' ? '#10b981' : '#f43f5e' }}>
                    {member.membership.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Included Perks */}
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={16} color="var(--accent-primary)" />
                  <span>Included Benefits with {member.membership.tier}:</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {tierInfo.perks.map((perk, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={15} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Personal & Emergency Contact Card */}
            <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={20} color="var(--accent-primary)" />
                    <span>My Contact Information</span>
                  </h3>
                  <button className="btn-secondary-sm" onClick={() => setIsEditProfileOpen(true)}>
                    <Edit3 size={14} />
                    <span>Edit Profile</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <img
                    src={member.avatar}
                    alt={member.name}
                    style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
                  />
                  <div>
                    <h4 style={{ fontSize: '1.15rem' }}>{member.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Member ID: {member.id}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={16} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-secondary)' }}>Email:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{member.email}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={16} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-secondary)' }}>Phone:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{member.phone}</strong>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div style={{ marginTop: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-amber)', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Emergency Contact
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    {member.emergencyContact?.name || 'None listed'}
                    {member.emergencyContact?.relation ? ` (${member.emergencyContact.relation})` : ''}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {member.emergencyContact?.phone || 'No phone provided'}
                  </div>
                </div>
              </div>

              {/* Notes from coach */}
              {member.membership.notes && (
                <div style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <strong>Trainer Note:</strong> "{member.membership.notes}"
                </div>
              )}
            </div>
          </div>

          {/* Recent Check-Ins & Activity Timeline */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} color="var(--accent-primary)" />
              <span>Recent Studio Check-In History</span>
            </h3>

            {member.recentVisits && member.recentVisits.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {member.recentVisits.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-secondary)',
                      padding: '0.85rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(16, 185, 129, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent-primary)'
                        }}
                      >
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          {v.activity}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Turnstile Check-In Verified
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {v.date}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No recent studio visits recorded yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Studio Details */}
      {activeTab === 'studio' && <StudioDetailsView studio={studio} />}

      {/* Tab 3: Class Schedule */}
      {activeTab === 'classes' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Studio Group Class Schedule</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Reserve your spot in high-performance conditioning, barbell power, and recovery flows.
            </p>
          </div>
          {!membershipAllowsAccess && (
            <div className="enrollment-notice enrollment-notice-warning" role="status">
              <Shield size={19} />
              <p>Class booking is unavailable until your membership is activated after payment setup.</p>
            </div>
          )}
          {member.healthScreening?.physicianClearanceRequired && (
            <div className="enrollment-notice enrollment-notice-warning" role="status">
              <Shield size={19} />
              <p>Your screening recommends physician clearance before high-intensity classes. Please contact the studio before booking those classes.</p>
            </div>
          )}
          <ClassScheduleView
            classes={studio.classes}
            bookedClassIds={bookedClassIds}
            bookingDisabled={!membershipAllowsAccess}
            highIntensityRestricted={member.healthScreening?.physicianClearanceRequired ?? false}
            onBookClass={handleBookClass}
            onCancelClass={handleCancelClass}
          />
        </div>
      )}

      {/* Tab 4: Rules & Etiquette */}
      {activeTab === 'rules' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Shield size={22} color="var(--accent-primary)" />
            <span>Studio Rules & Community Etiquette</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            To preserve a clean, elite training atmosphere and ensure maximum athlete safety, all members and guests are expected to uphold the following standards:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {studio.rules.map((rule, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  gap: '0.75rem'
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    flexShrink: 0
                  }}
                >
                  {idx + 1}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  {rule}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        member={member}
        onClose={() => setIsEditProfileOpen(false)}
        onSave={handleProfileSave}
      />
    </div>
  );
};
