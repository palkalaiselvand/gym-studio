import React from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Dumbbell,
  Flame,
  Zap,
  Activity,
  Coffee,
  ShieldCheck,
  Award,
  Bell,
  CheckCircle2
} from 'lucide-react';
import type { StudioDetails } from '../../types';

interface StudioDetailsViewProps {
  studio: StudioDetails;
}

export const StudioDetailsView: React.FC<StudioDetailsViewProps> = ({ studio }) => {
  const getAmenityIcon = (iconName: string) => {
    switch (iconName) {
      case 'Dumbbell':
        return <Dumbbell size={24} color="#10b981" />;
      case 'Flame':
        return <Flame size={24} color="#f59e0b" />;
      case 'Zap':
        return <Zap size={24} color="#06b6d4" />;
      case 'Activity':
        return <Activity size={24} color="#ec4899" />;
      case 'Coffee':
        return <Coffee size={24} color="#a78bfa" />;
      default:
        return <ShieldCheck size={24} color="#38bdf8" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Studio Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.04) 100%)',
          borderColor: 'rgba(16, 185, 129, 0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
          <Award size={18} />
          <span>Flagship Training Center</span>
        </div>
        <h2 style={{ fontSize: '1.85rem', marginBottom: '0.5rem', fontWeight: 800 }}>{studio.name}</h2>
        <p style={{ color: 'var(--accent-cyan)', fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>
          "{studio.tagline}"
        </p>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '850px', fontSize: '0.95rem', lineHeight: '1.6' }}>
          {studio.description}
        </p>
      </div>

      {/* Announcements Section */}
      {studio.announcements && studio.announcements.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Bell size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.2rem' }}>Studio Announcements</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {studio.announcements.map((ann) => (
              <div
                key={ann.id}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  borderLeft: '4px solid var(--accent-amber)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px'
                    }}
                  >
                    {ann.tag}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ann.date}</span>
                </div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.35rem', color: 'var(--text-main)' }}>{ann.title}</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {ann.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column: Location/Hours & Amenities */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Location & Hours */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={20} color="var(--accent-primary)" />
            <span>Studio Location & Hours</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '2px' }}>
                Address
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{studio.address}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{studio.cityStateZip}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Concierge Desk
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)' }}>
                  <Phone size={14} color="var(--accent-primary)" />
                  <span>{studio.phone}</span>
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Support Email
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)' }}>
                  <Mail size={14} color="var(--accent-cyan)" />
                  <span>{studio.email}</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <Clock size={16} color="var(--accent-primary)" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Hours of Operation
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Monday – Friday:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{studio.hours.weekdays}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Saturday:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{studio.hours.saturday}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Sunday:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{studio.hours.sunday}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Amenities Highlights */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={20} color="var(--accent-primary)" />
            <span>Studio Facilities & Amenities</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {studio.amenities.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: item.highlight ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {getAmenityIcon(item.icon)}
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    {item.name}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trainers Gallery */}
      <div>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Certified Studio Coaches</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {studio.trainers.map((tr) => (
            <div key={tr.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <img
                  src={tr.avatar}
                  alt={tr.name}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
                />
                <div>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{tr.name}</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {tr.specialty}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tr.experience}</div>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {tr.bio}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Studio Rules */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} color="var(--accent-primary)" />
          <span>Studio Etiquette & Member Guidelines</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {studio.rules.map((rule, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={16} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '3px' }} />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
