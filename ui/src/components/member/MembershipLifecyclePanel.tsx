import { useState, type FormEvent } from 'react';
import { useBranding } from '../../branding/branding';
import { TIER_CONFIG } from '../../data/mockData';
import type { Member, MembershipCancellationReason, MembershipFreezeReason, MembershipTier } from '../../types';
import { apiService } from '../../services/apiService';

const TIERS: MembershipTier[] = ['Basic', 'Silver', 'Gold', 'Platinum', 'VIP'];
const CANCELLATION_REASONS: { value: MembershipCancellationReason; label: string }[] = [
  { value: 'price', label: 'Price or affordability' },
  { value: 'relocation', label: 'Moving away' },
  { value: 'injury', label: 'Injury or health' },
  { value: 'dissatisfaction', label: 'Studio experience' },
  { value: 'competitor', label: 'Joining another gym' },
  { value: 'other', label: 'Other' }
];
const FREEZE_REASONS: { value: MembershipFreezeReason; label: string }[] = [
  { value: 'travel', label: 'Travel' },
  { value: 'medical', label: 'Medical' },
  { value: 'military', label: 'Military deployment' },
  { value: 'other', label: 'Other' }
];

type LifecycleAction = 'freeze' | 'upgrade' | 'downgrade' | 'cancel' | null;

interface MembershipLifecyclePanelProps {
  member: Member;
  onMemberChanged: (member: Member) => void;
  onToast: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function displayDate(dateText: string): string {
  return new Date(`${dateText}T00:00:00.000Z`).toLocaleDateString(undefined, { timeZone: 'UTC' });
}

function daysUntil(dateText: string): number {
  return Math.ceil((Date.parse(`${dateText}T00:00:00.000Z`) - Date.parse(`${todayDate()}T00:00:00.000Z`)) / 86_400_000);
}

export function MembershipLifecyclePanel({ member, onMemberChanged, onToast }: MembershipLifecyclePanelProps) {
  const { money } = useBranding();
  const membership = member.membership;
  const [action, setAction] = useState<LifecycleAction>(null);
  const [startDate, setStartDate] = useState(todayDate());
  const [endDate, setEndDate] = useState(addDays(todayDate(), 14));
  const [freezeReason, setFreezeReason] = useState<MembershipFreezeReason>('travel');
  const [targetTier, setTargetTier] = useState<MembershipTier>('Silver');
  const [cancellationReason, setCancellationReason] = useState<MembershipCancellationReason>('other');
  const [retentionOffer, setRetentionOffer] = useState<'pause' | 'downgrade' | 'declined'>('declined');
  const [isSaving, setIsSaving] = useState(false);

  const currentTierIndex = TIERS.indexOf(membership.tier);
  const availableToChange = membership.status === 'active' &&
    membership.paymentStatus === 'paid' &&
    membership.endDate >= todayDate() &&
    !membership.freeze &&
    !membership.cancellation &&
    !membership.pendingPlanChange;
  const lowerTier = currentTierIndex > 0 ? TIERS[currentTierIndex - 1] : null;
  const pauseAvailable = membership.status === 'active' &&
    membership.endDate >= todayDate() &&
    !membership.freeze &&
    !membership.cancellation;
  const canRequestCancellation = ['active', 'frozen'].includes(membership.status) &&
    membership.endDate >= todayDate() &&
    !membership.pendingPlanChange &&
    !membership.cancellation;
  const daysUntilResume = membership.freeze ? daysUntil(membership.freeze.endDate) : 0;

  const closeAction = () => {
    if (!isSaving) setAction(null);
  };

  const saveMember = (updated: Member, title: string, message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    onMemberChanged(updated);
    setAction(null);
    onToast(title, message, type);
  };

  const handleResume = async () => {
    setIsSaving(true);
    try {
      const updated = await apiService.resumeMembership(member.id);
      saveMember(updated, 'Pause ended', 'Your studio access pause has ended. No payment was processed.', 'success');
    } catch (error) {
      onToast('Resume failed', error instanceof Error ? error.message : 'The pause could not be ended.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelPlanChange = async () => {
    setIsSaving(true);
    try {
      const updated = await apiService.cancelScheduledPlanChange(member.id);
      saveMember(updated, 'Plan change cancelled', 'Your current plan will remain in place.', 'info');
    } catch (error) {
      onToast('Plan change could not be cancelled', error instanceof Error ? error.message : 'Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (action === 'freeze') {
        const updated = await apiService.freezeMembership(member.id, {
          startDate,
          endDate,
          reason: freezeReason
        });
        saveMember(updated, 'Pause scheduled', `Studio access will pause from ${displayDate(startDate)} until ${displayDate(endDate)}.`, 'info');
      } else if (action === 'upgrade' || action === 'downgrade') {
        const updated = action === 'upgrade'
          ? await apiService.upgradeMembership(member.id, targetTier)
          : await apiService.downgradeMembership(member.id, targetTier);
        saveMember(updated, 'Plan change scheduled', `${targetTier} takes effect after your current term on ${displayDate(addDays(membership.endDate, 1))}. No payment was processed.`, 'info');
      } else if (action === 'cancel') {
        const updated = await apiService.cancelMembership(member.id, {
          reason: cancellationReason,
          retentionOffer,
          ...(retentionOffer === 'downgrade' && lowerTier ? { offerTier: lowerTier } : {})
        });
        if (retentionOffer === 'pause') {
          saveMember(updated, 'Pause offer accepted', 'Your membership is paused for 30 days. No payment was processed.', 'success');
        } else if (retentionOffer === 'downgrade' && lowerTier) {
          saveMember(updated, 'Lower plan scheduled', `${lowerTier} is scheduled for your next term. No payment was processed.`, 'success');
        } else {
          saveMember(updated, 'Cancellation scheduled', `Your access remains available through ${displayDate(membership.endDate)}. No payment or refund was processed.`, 'warning');
        }
      }
    } catch (error) {
      onToast('Membership update failed', error instanceof Error ? error.message : 'The request could not be saved.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const title = action === 'freeze'
    ? 'Pause membership'
    : action === 'upgrade'
      ? 'Schedule an upgrade'
      : action === 'downgrade'
        ? 'Schedule a downgrade'
        : 'Cancel membership';

  const selectedOffer = cancellationReason === 'price' && lowerTier ? 'downgrade' : 'pause';
  const suggestedOfferLabel = selectedOffer === 'downgrade'
    ? `Schedule a switch to ${lowerTier} for your next term`
    : 'Take a 30-day pause instead';

  return (
    <>
      <section className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Manage your membership</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {pauseAvailable && !membership.pendingPlanChange && (
              <button type="button" className="btn-secondary" onClick={() => {
                setStartDate(todayDate());
                setEndDate(addDays(todayDate(), 14));
                setAction('freeze');
              }}>Pause membership</button>
            )}
            {membership.freeze && (
              <button type="button" className="btn-secondary" disabled={isSaving} onClick={() => { void handleResume(); }}>
                {membership.freeze.startDate > todayDate() ? 'Cancel scheduled pause' : 'Resume early'}
              </button>
            )}
            {availableToChange && (
              <>
                {currentTierIndex < TIERS.length - 1 && (
                  <button type="button" className="btn-secondary" onClick={() => {
                    setTargetTier(TIERS[currentTierIndex + 1]);
                    setAction('upgrade');
                  }}>Upgrade plan</button>
                )}
                {lowerTier && (
                  <button type="button" className="btn-secondary" onClick={() => {
                    setTargetTier(lowerTier);
                    setAction('downgrade');
                  }}>Downgrade plan</button>
                )}
              </>
            )}
            {canRequestCancellation && (
              <button type="button" className="btn-secondary" onClick={() => {
                setCancellationReason('other');
                setRetentionOffer('declined');
                setAction('cancel');
              }}>Cancel</button>
            )}
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
          This app does not collect payment details or process charges. Plan changes take effect after the current term.
        </p>

        {membership.freeze && (
          <p role="status" style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: '0.5rem 0' }}>
            {membership.freeze.startDate > todayDate() ? 'Pause scheduled' : 'Access paused'}: {displayDate(membership.freeze.startDate)}; access resumes {displayDate(membership.freeze.endDate)}.
          </p>
        )}
        {membership.freeze && membership.freeze.startDate <= todayDate() && daysUntilResume > 0 && daysUntilResume <= 3 && (
          <p role="status" style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', margin: '0.5rem 0' }}>
            Reminder: your pause ends in {daysUntilResume} {daysUntilResume === 1 ? 'day' : 'days'}. Access resumes {displayDate(membership.freeze.endDate)}.
          </p>
        )}
        {membership.pendingPlanChange && (
          <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.9rem', marginTop: '0.75rem' }}>
            <span>{membership.pendingPlanChange.tier} plan scheduled for {displayDate(membership.pendingPlanChange.effectiveDate)}.</span>
            <button type="button" className="btn-secondary-sm" disabled={isSaving} onClick={() => { void handleCancelPlanChange(); }}>Cancel scheduled change</button>
          </div>
        )}
        {membership.cancellation?.status === 'requested' && membership.cancellation.effectiveDate && (
          <p role="status" style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: '0.75rem 0 0' }}>
            Cancellation scheduled for {displayDate(membership.cancellation.effectiveDate)}. Access remains through that date.
          </p>
        )}
        {!availableToChange && !membership.freeze && !membership.pendingPlanChange && !membership.cancellation && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Membership changes are unavailable while this membership is {membership.status} or unpaid.
          </p>
        )}
      </section>

      {action && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeAction();
        }}>
          <form className="modal-dialog" onSubmit={(event) => { void handleSubmit(event); }} aria-label={title}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h2>
              <button type="button" className="btn-secondary-sm" onClick={closeAction} disabled={isSaving}>Close</button>
            </div>
            <div className="modal-body">
              {action === 'freeze' && (
                <>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    Studio access will pause during the selected dates. Payment processing is not available in this app.
                  </p>
                  <div className="form-row">
                    <label className="form-group">
                      <span className="form-label">Start date</span>
                      <input className="form-input" type="date" min={todayDate()} value={startDate} required onChange={(event) => {
                        const next = event.target.value;
                        setStartDate(next);
                        if (next && endDate < addDays(next, 14)) setEndDate(addDays(next, 14));
                      }} />
                    </label>
                    <label className="form-group">
                      <span className="form-label">Resume date</span>
                      <input className="form-input" type="date" min={startDate ? addDays(startDate, 14) : undefined} value={endDate} required onChange={(event) => setEndDate(event.target.value)} />
                    </label>
                  </div>
                  <label className="form-group">
                    <span className="form-label">Reason</span>
                    <select className="form-select" value={freezeReason} onChange={(event) => setFreezeReason(event.target.value as MembershipFreezeReason)}>
                      {FREEZE_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                    </select>
                  </label>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Pauses are at least 14 days and limited to 90 days per calendar year. Access resumes automatically on the selected end date.</p>
                </>
              )}

              {(action === 'upgrade' || action === 'downgrade') && (
                <>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    With payment processing deferred, the change will take effect after your current term ends on {displayDate(addDays(membership.endDate, 1))}. No proration or charge will be calculated.
                  </p>
                  <label className="form-group">
                    <span className="form-label">New plan</span>
                    <select className="form-select" value={targetTier} onChange={(event) => setTargetTier(event.target.value as MembershipTier)}>
                      {TIERS.filter((tier) => action === 'upgrade'
                        ? TIERS.indexOf(tier) > currentTierIndex
                        : TIERS.indexOf(tier) < currentTierIndex
                      ).map((tier) => (
                        <option key={tier} value={tier}                                                >{tier} — {money(TIER_CONFIG[tier].monthlyPrice)}/month</option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {action === 'cancel' && (
                <>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    Cancellation will take effect after your current paid term on {displayDate(membership.endDate)}. You keep access through that date. This app will not issue refunds or process future charges.
                  </p>
                  <label className="form-group">
                    <span className="form-label">Why are you leaving?</span>
                    <select className="form-select" value={cancellationReason} onChange={(event) => {
                      setCancellationReason(event.target.value as MembershipCancellationReason);
                      setRetentionOffer('declined');
                    }}>
                      {CANCELLATION_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                    </select>
                  </label>
                  <div className="glass-panel" style={{ padding: '1rem' }}>
                    <strong>Would you like to stay?</strong>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>{suggestedOfferLabel}. This option is recorded as a retention offer and does not process payment.</p>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.6rem 0' }}>
                      <input type="radio" name="retention-offer" checked={retentionOffer === selectedOffer} onChange={() => setRetentionOffer(selectedOffer)} />
                      Accept this offer
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="radio" name="retention-offer" checked={retentionOffer === 'declined'} onChange={() => setRetentionOffer('declined')} />
                      Continue with cancellation
                    </label>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={closeAction} disabled={isSaving}>Keep current plan</button>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? 'Saving…' : action === 'cancel' && retentionOffer === 'declined' ? 'Schedule cancellation' : action === 'cancel' ? 'Accept offer' : action === 'freeze' ? 'Schedule pause' : 'Schedule plan change'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
