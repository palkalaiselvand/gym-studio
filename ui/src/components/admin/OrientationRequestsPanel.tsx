import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock, X } from 'lucide-react';
import type { OrientationRequest } from '../../types';
import { apiService } from '../../services/apiService';

interface OrientationRequestsPanelProps {
  onToast: (title: string, message: string, type: 'success' | 'error') => void;
}

function formatPreferredDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export const OrientationRequestsPanel: React.FC<OrientationRequestsPanelProps> = ({ onToast }) => {
  const [requests, setRequests] = useState<OrientationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const onToastRef = useRef(onToast);

  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  useEffect(() => {
    let active = true;
    apiService.getOrientationRequests()
      .then((items) => {
        if (active) setRequests(items);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(true);
          onToastRef.current('Orientation requests unavailable', error instanceof Error ? error.message : 'Could not load requests.', 'error');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updateStatus = async (request: OrientationRequest, status: 'confirmed' | 'declined') => {
    setUpdatingId(request.id);
    try {
      const updated = await apiService.updateOrientationRequestStatus(request.id, status);
      setRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
      onToast(
        status === 'confirmed' ? 'Orientation confirmed' : 'Orientation declined',
        `${request.memberName}'s preferred orientation time was ${status}.`,
        'success'
      );
    } catch (error) {
      onToast('Request could not be updated', error instanceof Error ? error.message : 'Please try again.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
        <Clock size={20} color="var(--accent-primary)" />
        New-member orientation requests
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Review member-submitted preferred times. Confirming means staff has manually accepted that requested time; no calendar or notification integration is connected.
      </p>
      {loading ? (
        <p role="status" style={{ color: 'var(--text-muted)' }}>Loading requests...</p>
      ) : loadError ? (
        <p role="alert" style={{ color: 'var(--text-secondary)' }}>Requests could not be loaded. Refresh the page to try again.</p>
      ) : requests.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No orientation requests have been submitted.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {requests.map((request) => (
            <article key={request.id} style={{ padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <strong>{request.memberName}</strong>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{request.memberEmail}</div>
                  <div style={{ marginTop: '0.5rem', fontWeight: 600 }}>
                    {formatPreferredDate(request.preferredDate)} at {request.preferredTime} (studio local time)
                  </div>
                  {request.notes && <p style={{ marginTop: '0.35rem', color: 'var(--text-secondary)' }}>{request.notes}</p>}
                  <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    Status: {request.status}
                  </div>
                </div>
                {request.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={updatingId === request.id}
                      onClick={() => void updateStatus(request, 'confirmed')}
                    >
                      <Check size={15} /> Confirm
                    </button>
                    <button
                      type="button"
                      className="btn-secondary-sm"
                      disabled={updatingId === request.id}
                      onClick={() => void updateStatus(request, 'declined')}
                    >
                      <X size={15} /> Decline
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
