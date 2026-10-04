import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Filter,
  Check
} from 'lucide-react';
import type { StudioClass } from '../../types';

interface ClassScheduleViewProps {
  classes: StudioClass[];
  bookedClassIds: string[];
  bookingDisabled?: boolean;
  highIntensityRestricted?: boolean;
  onBookClass?: (classId: string, className: string) => Promise<boolean>;
  onCancelClass?: (classId: string, className: string) => Promise<boolean>;
}

export const ClassScheduleView: React.FC<ClassScheduleViewProps> = ({
  classes,
  bookedClassIds,
  bookingDisabled = false,
  highIntensityRestricted = false,
  onBookClass,
  onCancelClass
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [busyClassIds, setBusyClassIds] = useState<string[]>([]);
  const [bookingError, setBookingError] = useState('');

  const categories = ['ALL', 'HIIT', 'Strength', 'Yoga', 'Boxing', 'Spin'];

  const filteredClasses = classes.filter((cls) => {
    if (selectedCategory === 'ALL') return true;
    return cls.category === selectedCategory;
  });

  const toggleBooking = async (cls: StudioClass) => {
    const isBooked = bookedClassIds.includes(cls.id);
    if (busyClassIds.includes(cls.id)) return;
    setBookingError('');
    setBusyClassIds((current) => [...current, cls.id]);
    try {
      if (isBooked) {
        await onCancelClass?.(cls.id, cls.name);
      } else {
        if (cls.spotsLeft <= 0) return;
        await onBookClass?.(cls.id, cls.name);
      }
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Class booking could not be updated.');
    } finally {
      setBusyClassIds((current) => current.filter((id) => id !== cls.id));
    }
  };

  const getIntensityBadge = (intensity: string) => {
    switch (intensity) {
      case 'Extreme':
        return { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' };
      case 'High':
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'Medium':
        return { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' };
      default:
        return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    }
  };

  return (
    <div>
      {bookingError && <div className="enrollment-error" role="alert">{bookingError}</div>}
      {/* Category Filter Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginRight: '0.5rem' }}>
          <Filter size={16} />
          <span>Category:</span>
        </div>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`btn-secondary-sm ${selectedCategory === cat ? 'active' : ''}`}
            style={{
              borderRadius: '9999px',
              background: selectedCategory === cat ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: selectedCategory === cat ? '#0b0f19' : 'var(--text-secondary)',
              fontWeight: 600,
              borderColor: selectedCategory === cat ? 'transparent' : 'var(--border-subtle)'
            }}
          >
            {cat === 'ALL' ? 'All Classes' : cat}
          </button>
        ))}
      </div>

      {/* Grid of Classes */}
      <div className="classes-grid">
        {filteredClasses.map((cls) => {
          const isBooked = bookedClassIds.includes(cls.id);
          const requiresClearance = highIntensityRestricted && ['High', 'Extreme'].includes(cls.intensity);
          const dynamicSpotsLeft = isBooked ? cls.spotsLeft - 1 : cls.spotsLeft;
          const intensityStyle = getIntensityBadge(cls.intensity);

          return (
            <div key={cls.id} className="glass-panel class-card">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="class-category-tag">{cls.category}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      color: intensityStyle.color,
                      background: intensityStyle.bg
                    }}
                  >
                    {cls.intensity} Intensity
                  </span>
                </div>

                <h3 className="class-title">{cls.name}</h3>

                <div className="class-meta-row">
                  <User size={15} color="var(--accent-primary)" />
                  <span>Instructor: <strong>{cls.trainer}</strong></span>
                </div>

                <div className="class-meta-row">
                  <Clock size={15} />
                  <span>{cls.time} ({cls.duration})</span>
                </div>

                <div className="class-meta-row">
                  <Calendar size={15} />
                  <span>Days: {cls.days.join(', ')}</span>
                </div>

                <div className="class-meta-row">
                  <MapPin size={15} />
                  <span>{cls.room}</span>
                </div>
              </div>

              <div className="class-footer">
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Capacity</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: dynamicSpotsLeft <= 2 ? '#fbbf24' : 'var(--text-main)' }}>
                    {dynamicSpotsLeft} spots available
                  </div>
                </div>

                <button
                  className={isBooked ? 'btn-secondary' : 'btn-primary'}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                    background: isBooked ? 'rgba(16, 185, 129, 0.2)' : undefined,
                    borderColor: isBooked ? 'var(--accent-primary)' : undefined,
                    color: isBooked ? '#34d399' : undefined
                  }}
                  onClick={() => toggleBooking(cls)}
                  disabled={busyClassIds.includes(cls.id) || (!isBooked && (bookingDisabled || requiresClearance || dynamicSpotsLeft <= 0))}
                  title={requiresClearance ? 'Physician clearance is recommended before booking high-intensity classes' : undefined}
                >
                  {busyClassIds.includes(cls.id) ? (
                    <span>Saving…</span>
                  ) : isBooked ? (
                    <>
                      <Check size={14} />
                      <span>Booked</span>
                    </>
                  ) : bookingDisabled ? (
                    <span>Activation Required</span>
                  ) : requiresClearance ? (
                    <span>Clearance Required</span>
                  ) : dynamicSpotsLeft <= 0 ? (
                    <span>Waitlist Full</span>
                  ) : (
                    <span>Book Spot</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
