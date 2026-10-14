import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, Clock, X } from 'lucide-react';
import type { OrientationRequest } from '../../types';
import { apiService } from '../../services/apiService';

interface OrientationRequestPanelProps {
  memberId: string;
  onToast: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

function todayAsLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatPreferredDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export const OrientationRequestPanel: React.FC<OrientationRequestPanelProps> = ({ memberId, onToast }) => {
  const [requests, setRequests] = useState<OrientationRequest[]>([]);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const onToastRef = useRef(onToast);

  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  useEffect(() => {
    let active = true;
    apiService.getMyOrientationRequests()
      .then((items) => {
        if (active) setRequests(items);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(true);
          onToastRef.current('Orientation requests unavailable', error instanceof Error ? error.message : 'Could not load your requests.', 'error');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [memberId]);

  const pendingRequest = requests.find((request) => request.status === 'pending');

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const request = await apiService.createOrientationRequest({ preferredDate, preferredTime, notes });
      setRequests((current) => [request, ...current]);
      setPreferredDate('');
      setPreferredTime('');
      setNotes('');
      onToast('Request submitted', 'Your preferred orientation time has been sent to studio staff for confirmation.', 'success');
    } catch (error) {
      onToast('Request could not be submitted', error instanceof Error ? error.message : 'Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelRequest = async (request: OrientationRequest) => {
    setUpdatingId(request.id);
    try {
      const updated = await apiService.cancelOrientationRequest(request.id);
      setRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
      onToast('Request cancelled', 'You can submit another preferred time whenever you are ready.', 'info');
    } catch (error) {
      onToast('Request could not be cancelled', error instanceof Error ? error.message : 'Please try again.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="glass-panel" style={{ padding: '1.5rem', maxWidth: '820px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
        <CalendarClock size={22} color="var(--accent-primary)" />
        New-member orientation
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        Request a preferred time to meet the studio team and get familiar with the facility. This is a request, not a confirmed booking; staff will follow up here with a decision. Times are interpreted in the studio&apos;s local time.
      </p>

      {loading ? (
        <p role="status" style={{ color: 'var(--text-muted)' }}>Loading your orientation requests...</p>
      ) : loadError ? (
        <p role="alert" style={{ color: 'var(--text-secondary)' }}>Your requests could not be loaded. Refresh the page to try again.</p>
      ) : (
        <>
          {pendingRequest ? (
            <div className="enrollment-notice" role="status" style={{ marginBottom: '1.25rem' }}>
              <Clock size={18} />
              <div style={{ flex: 1 }}>
                <strong>Awaiting staff confirmation</strong>
                <div>{formatPreferredDate(pendingRequest.preferredDate)} at {pendingRequest.preferredTime}</div>
                {pendingRequest.notes && <div>{pendingRequest.notes}</div>}
              </div>
              <button
                type="button"
                className="btn-secondary-sm"
                disabled={updatingId === pendingRequest.id}
                onClick={() => void cancelRequest(pendingRequest)}
              >
                <X size={14} /> Cancel
              </button>
            </div>
          ) : (
            <form onSubmit={(event) => void submitRequest(event)} style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <label>
                  <span style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Preferred date</span>
                  <input
                    type="date"
                    required
                    min={todayAsLocalDate()}
                    value={preferredDate}
                    onChange={(event) => setPreferredDate(event.target.value)}
                    className="form-input"
                  />
                </label>
                <label>
                  <span style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Preferred time</span>
                  <input
                    type="time"
                    required
                    value={preferredTime}
                    onChange={(event) => setPreferredTime(event.target.value)}
                    className="form-input"
                  />
                </label>
              </div>
              <label>
                <span style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Anything staff should know? (optional)</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={300}
                  rows={3}
                  className="form-input"
                  placeholder="Share a brief note for the orientation team."
                />
              </label>
              <div>
                <button type="submit" className="btn-primary" disabled={submitting || !preferredDate || !preferredTime}>
                  {submitting ? 'Submitting request...' : 'Request orientation'}
                </button>
              </div>
            </form>
          )}

          {requests.some((request) => request.status !== 'pending') && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>Previous requests</h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {requests.filter((request) => request.status !== 'pending').map((request) => (
                  <div key={request.id} style={{ padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: '0.6rem' }}>
                    <strong style={{ textTransform: 'capitalize' }}>{request.status}</strong>
                    <span style={{ color: 'var(--text-secondary)' }}> · {formatPreferredDate(request.preferredDate)} at {request.preferredTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
