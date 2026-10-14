import { Router, Request, Response } from 'express';
import { recordCheckIn } from '../attendance.js';
import {
  addCalendarDays,
  addMembershipMonths,
  getMembershipTierPrice,
  getMembershipTierRank,
  hasStudioAccess,
  isCalendarDate,
  reconcileMemberLifecycle
} from '../membership.js';
import {
  classBookingsDb,
  classesDb,
  enrollmentsDb,
  membersDb,
  orientationRequestsDb,
  sessionsDb,
  usersDb
} from '../db.js';
import type {
  Member,
  MembershipCancellationReason,
  MembershipFreezeReason,
  MembershipTier
} from '../types.js';
import { canAccessMember, requireAuth, requireRoles } from '../auth.js';

const router = Router();

const VALID_TIERS = new Set<MembershipTier>(['Basic', 'Silver', 'Gold', 'Platinum', 'VIP']);

function normalizeDateField(value: unknown): string | undefined {
  return isCalendarDate(value) ? value : undefined;
}

function readMemberMembershipChange(payload: Record<string, unknown>): { tier?: MembershipTier; reason?: string; startDate?: string; endDate?: string; effectiveDate?: string } {
  const tierValue = payload.tier;
  const tier = typeof tierValue === 'string' && VALID_TIERS.has(tierValue as MembershipTier)
    ? tierValue as MembershipTier
    : undefined;
  const reason = typeof payload.reason === 'string' && payload.reason.trim() ? payload.reason.trim() : undefined;
  const startDate = normalizeDateField(payload.startDate);
  const endDate = normalizeDateField(payload.endDate);
  const effectiveDate = normalizeDateField(payload.effectiveDate);

  return { tier, reason, startDate, endDate, effectiveDate };
}

const CANCELLATION_REASONS = new Set<MembershipCancellationReason>([
  'price', 'relocation', 'injury', 'dissatisfaction', 'competitor', 'other'
]);
const FREEZE_REASONS = new Set<MembershipFreezeReason>([
  'travel', 'medical', 'military', 'other', 'retention'
]);
const FREEZE_MIN_DAYS = 14;
const FREEZE_MAX_DAYS_PER_YEAR = 90;

function durationDays(startDate: string, endDate: string): number {
  return Math.floor(
    (Date.parse(`${endDate}T00:00:00.000Z`) - Date.parse(`${startDate}T00:00:00.000Z`)) / 86_400_000
  );
}

function overlapDaysInYear(startDate: string, endDate: string, year: number): number {
  const yearStart = `${year}-01-01`;
  const yearEndExclusive = `${year + 1}-01-01`;
  const overlapStart = startDate > yearStart ? startDate : yearStart;
  const overlapEnd = endDate < yearEndExclusive ? endDate : yearEndExclusive;
  return overlapStart < overlapEnd ? durationDays(overlapStart, overlapEnd) : 0;
}

function getMemberForLifecycle(member: Member): Member {
  return reconcileMemberLifecycle(member);
}

async function saveLifecycleMember(member: Member): Promise<void> {
  await membersDb.updateAsync({ id: member.id }, member, {});
}

function canChangeLifecycle(member: Member): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return member.membership.status === 'active' &&
    member.membership.paymentStatus === 'paid' &&
    member.membership.startDate <= today &&
    member.membership.endDate >= today &&
    member.membership.cancellation?.status !== 'requested';
}

async function updateEnrollmentPayment(
  memberId: string,
  actorId: string,
  confirmedAt: string,
  status: 'ACTIVE' | 'RENEWED',
  renewalMonths?: number
): Promise<void> {
  const enrollment = await enrollmentsDb.findOneAsync({ memberId });
  if (!enrollment) return;
  await enrollmentsDb.updateAsync(
    { id: enrollment.id },
    {
      ...enrollment,
      status,
      payment: {
        status: 'OFFLINE_CONFIRMED',
        confirmedAt,
        confirmedBy: actorId,
        ...(renewalMonths ? { renewalMonths } : {})
      }
    },
    {}
  );
}

router.post('/:id/freeze', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!canAccessMember(req, id)) {
      return res.status(403).json({ success: false, error: 'You are not authorized to manage this member' });
    }

    const found = await membersDb.findOneAsync({ id });
    if (!found) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }
    const current = getMemberForLifecycle(found);
    if (!canChangeLifecycle(current)) {
      return res.status(409).json({ success: false, error: 'Only a current, paid membership without a pending cancellation can be paused' });
    }
    if (current.membership.freeze || current.membership.pendingPlanChange || current.membership.pendingDowngradeTier) {
      return res.status(409).json({ success: false, error: 'Resolve the existing pause or scheduled plan change first' });
    }

    const payload = readMemberMembershipChange(req.body || {});
    if ((req.body?.startDate !== undefined && !isCalendarDate(req.body.startDate)) ||
      (req.body?.endDate !== undefined && !isCalendarDate(req.body.endDate))) {
      return res.status(400).json({ success: false, error: 'Freeze dates must be valid calendar dates' });
    }
    const startDate = payload.startDate || new Date().toISOString().slice(0, 10);
    const endDate = payload.endDate;
    const reason = req.body?.reason;
    if (!isCalendarDate(startDate) || !endDate || !isCalendarDate(endDate) || endDate < startDate) {
      return res.status(400).json({ success: false, error: 'Enter valid freeze start and resume dates' });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (startDate < today) {
      return res.status(400).json({ success: false, error: 'A freeze cannot start in the past' });
    }
    if (typeof reason !== 'string' || !FREEZE_REASONS.has(reason as MembershipFreezeReason) || reason === 'retention') {
      return res.status(400).json({ success: false, error: 'Choose travel, medical, military, or other as the freeze reason' });
    }
    const requestedDays = durationDays(startDate, endDate);
    if (requestedDays < FREEZE_MIN_DAYS) {
      return res.status(400).json({ success: false, error: 'A freeze must be at least 14 days' });
    }
    if (requestedDays > FREEZE_MAX_DAYS_PER_YEAR) {
      return res.status(400).json({ success: false, error: 'A single freeze cannot exceed 90 days' });
    }
    for (let year = Number(startDate.slice(0, 4)); year <= Number(endDate.slice(0, 4)); year += 1) {
      const usedDays = (current.membership.freezeHistory || []).reduce(
        (total, window) => total + overlapDaysInYear(window.startDate, window.endDate, year),
        0
      );
      const requestedInYear = overlapDaysInYear(startDate, endDate, year);
      if (usedDays + requestedInYear > FREEZE_MAX_DAYS_PER_YEAR) {
        return res.status(400).json({ success: false, error: `Freezes are limited to 90 days per calendar year (${year})` });
      }
    }

    const updated = {
      ...current,
      membership: {
        ...current.membership,
        status: startDate <= today ? 'frozen' as const : 'active' as const,
        freeze: {
          startDate,
          endDate,
          reason: reason as MembershipFreezeReason
        },
        notes: `Access pause scheduled from ${startDate} until ${endDate}. Payment processing is not configured.`
      }
    };

    await saveLifecycleMember(updated);
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to freeze membership', error);
    return res.status(500).json({ success: false, error: 'Membership freeze could not be saved' });
  }
});

router.post('/:id/resume', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!canAccessMember(req, id)) {
      return res.status(403).json({ success: false, error: 'You are not authorized to manage this member' });
    }

    const found = await membersDb.findOneAsync({ id });
    if (!found) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }
    const current = getMemberForLifecycle(found);

    if (!current.membership.freeze) {
      return res.status(409).json({ success: false, error: 'This membership has no scheduled or active pause' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const history = [...(current.membership.freezeHistory || [])];
    if (current.membership.freeze.startDate <= today) {
      history.push({
        ...current.membership.freeze,
        endDate: today < current.membership.freeze.endDate ? today : current.membership.freeze.endDate,
        resumedAt: new Date().toISOString()
      });
    }
    const updated = {
      ...current,
      membership: {
        ...current.membership,
        status: current.membership.endDate < today ? 'expired' as const : 'active' as const,
        freeze: undefined,
        freezeHistory: history,
        notes: 'Membership access pause ended. Payment processing is not configured.'
      }
    };

    await saveLifecycleMember(updated);
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to resume membership', error);
    return res.status(500).json({ success: false, error: 'Membership resume could not be saved' });
  }
});

router.post('/:id/upgrade', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!canAccessMember(req, id)) {
      return res.status(403).json({ success: false, error: 'You are not authorized to manage this member' });
    }

    const found = await membersDb.findOneAsync({ id });
    if (!found) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }
    const current = getMemberForLifecycle(found);

    const payload = readMemberMembershipChange(req.body || {});
    if (!payload.tier) {
      return res.status(400).json({ success: false, error: 'A valid membership tier is required for an upgrade' });
    }

    if (!canChangeLifecycle(current)) {
      return res.status(409).json({ success: false, error: 'Only a current, paid membership without a pending cancellation can change tiers' });
    }
    if (getMembershipTierRank(payload.tier) <= getMembershipTierRank(current.membership.tier)) {
      return res.status(400).json({ success: false, error: 'Choose a tier above the current tier to schedule an upgrade' });
    }
    if (current.membership.freeze || current.membership.pendingPlanChange || current.membership.pendingDowngradeTier) {
      return res.status(409).json({ success: false, error: 'Resolve the existing pause or scheduled plan change first' });
    }
    const updated = {
      ...current,
      membership: {
        ...current.membership,
        pendingPlanChange: {
          tier: payload.tier,
          effectiveDate: addCalendarDays(current.membership.endDate, 1),
          requestedAt: new Date().toISOString()
        },
        notes: `Upgrade to ${payload.tier} scheduled for ${addCalendarDays(current.membership.endDate, 1)}. No payment has been collected or scheduled.`
      }
    };

    await saveLifecycleMember(updated);
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to upgrade membership', error);
    return res.status(500).json({ success: false, error: 'Membership upgrade could not be saved' });
  }
});

router.post('/:id/downgrade', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!canAccessMember(req, id)) {
      return res.status(403).json({ success: false, error: 'You are not authorized to manage this member' });
    }

    const found = await membersDb.findOneAsync({ id });
    if (!found) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }
    const current = getMemberForLifecycle(found);

    const payload = readMemberMembershipChange(req.body || {});
    if (!payload.tier) {
      return res.status(400).json({ success: false, error: 'A valid membership tier is required for a downgrade' });
    }

    if (!canChangeLifecycle(current)) {
      return res.status(409).json({ success: false, error: 'Only a current, paid membership without a pending cancellation can change tiers' });
    }
    if (getMembershipTierRank(payload.tier) >= getMembershipTierRank(current.membership.tier)) {
      return res.status(400).json({ success: false, error: 'Choose a tier below the current tier to schedule a downgrade' });
    }
    if (current.membership.freeze || current.membership.pendingPlanChange) {
      return res.status(409).json({ success: false, error: 'Resolve the existing pause or scheduled plan change first' });
    }
    const effectiveDate = addCalendarDays(current.membership.endDate, 1);
    const updated = {
      ...current,
      membership: {
        ...current.membership,
        pendingPlanChange: {
          tier: payload.tier,
          effectiveDate,
          requestedAt: new Date().toISOString()
        },
        pendingDowngradeTier: payload.tier,
        notes: `${current.name} will switch to ${payload.tier} on ${effectiveDate}. No payment has been collected or scheduled.`
      }
    };

    await saveLifecycleMember(updated);
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to schedule downgrade', error);
    return res.status(500).json({ success: false, error: 'Membership downgrade could not be saved' });
  }
});

router.post('/:id/cancel-plan-change', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!canAccessMember(req, id)) {
      return res.status(403).json({ success: false, error: 'You are not authorized to manage this member' });
    }
    const found = await membersDb.findOneAsync({ id });
    if (!found) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }
    const current = getMemberForLifecycle(found);
    if (!current.membership.pendingPlanChange) {
      return res.status(409).json({ success: false, error: 'There is no scheduled plan change to cancel' });
    }
    const updated = {
      ...current,
      membership: {
        ...current.membership,
        pendingPlanChange: undefined,
        pendingDowngradeTier: null,
        notes: 'Scheduled plan change cancelled.'
      }
    };
    await saveLifecycleMember(updated);
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to cancel scheduled plan change', error);
    return res.status(500).json({ success: false, error: 'Scheduled plan change could not be cancelled' });
  }
});

router.post('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!canAccessMember(req, id)) {
      return res.status(403).json({ success: false, error: 'You are not authorized to manage this member' });
    }

    const found = await membersDb.findOneAsync({ id });
    if (!found) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }
    const current = getMemberForLifecycle(found);

    const payload = readMemberMembershipChange(req.body || {});
    const reason = req.body?.reason;
    const retentionOffer = req.body?.retentionOffer;
    const offerTier = readMemberMembershipChange({ tier: req.body?.offerTier }).tier;
    const today = new Date().toISOString().slice(0, 10);
    if (!canChangeLifecycle(current) && current.membership.status !== 'frozen') {
      return res.status(409).json({ success: false, error: 'Only a current membership can be cancelled' });
    }
    if (typeof reason !== 'string' || !CANCELLATION_REASONS.has(reason as MembershipCancellationReason)) {
      return res.status(400).json({ success: false, error: 'Choose a cancellation reason' });
    }
    if (!['pause', 'downgrade', 'declined'].includes(retentionOffer)) {
      return res.status(400).json({ success: false, error: 'Choose a retention offer or decline the offer before cancelling' });
    }
    const retentionHistory = [
      ...(current.membership.retentionHistory || []),
      {
        requestedAt: new Date().toISOString(),
        reason: reason as MembershipCancellationReason,
        offer: retentionOffer as 'pause' | 'downgrade' | 'declined',
        accepted: retentionOffer !== 'declined'
      }
    ];

    if (retentionOffer === 'pause') {
      if (current.membership.freeze || current.membership.status !== 'active' || current.membership.endDate < today) {
        return res.status(409).json({ success: false, error: 'A pause offer is unavailable for this membership' });
      }
      const endDate = addCalendarDays(today, 30);
      for (let year = Number(today.slice(0, 4)); year <= Number(endDate.slice(0, 4)); year += 1) {
        const usedDays = (current.membership.freezeHistory || []).reduce(
          (total, window) => total + overlapDaysInYear(window.startDate, window.endDate, year),
          0
        );
        if (usedDays + overlapDaysInYear(today, endDate, year) > FREEZE_MAX_DAYS_PER_YEAR) {
          return res.status(409).json({ success: false, error: `The annual pause allowance for ${year} has already been used` });
        }
      }
      const updated = {
        ...current,
        membership: {
          ...current.membership,
          status: 'frozen' as const,
          freeze: { startDate: today, endDate, reason: 'retention' as const },
          pendingPlanChange: undefined,
          pendingDowngradeTier: null,
          retentionHistory,
          notes: `Membership pause accepted until ${endDate}. Payment processing is not configured.`
        }
      };
      await saveLifecycleMember(updated);
      return res.json({ success: true, data: updated });
    }

    if (retentionOffer === 'downgrade') {
      if (!offerTier || !canChangeLifecycle(current) ||
        getMembershipTierRank(offerTier) >= getMembershipTierRank(current.membership.tier) ||
        current.membership.pendingPlanChange || current.membership.pendingDowngradeTier || current.membership.freeze) {
        return res.status(409).json({ success: false, error: 'Choose an available lower tier for the retention offer' });
      }
      const effectiveDate = addCalendarDays(current.membership.endDate, 1);
      const updated = {
        ...current,
        membership: {
          ...current.membership,
          pendingPlanChange: { tier: offerTier, effectiveDate, requestedAt: new Date().toISOString() },
          pendingDowngradeTier: offerTier,
          retentionHistory,
          notes: `Retention downgrade to ${offerTier} scheduled for ${effectiveDate}. No payment has been collected or scheduled.`
        }
      };
      await saveLifecycleMember(updated);
      return res.json({ success: true, data: updated });
    }

    const effectiveDate = current.membership.endDate;
    const updated = {
      ...current,
      membership: {
        ...current.membership,
        autoRenew: false,
        cancellation: {
          requestedAt: new Date().toISOString(),
          effectiveDate,
          reason: reason as MembershipCancellationReason,
          status: 'requested' as const
        },
        pendingDowngradeTier: null,
        pendingPlanChange: undefined,
        retentionHistory,
        notes: `Cancellation requested for ${effectiveDate}. Access remains available through that date. No refund or future charge was processed.`
      }
    };

    await saveLifecycleMember(updated);
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to cancel membership', error);
    return res.status(500).json({ success: false, error: 'Membership cancellation could not be saved' });
  }
});

// GET /api/members - List members with optional query filtering
router.get('/', requireAuth, requireRoles('admin', 'staff', 'franchise-owner'), async (req: Request, res: Response) => {
  try {
    const { search, tier, status, payment } = req.query;

    let members: Member[] = await membersDb.findAsync({});
    members = await Promise.all(members.map(async (member) => {
      const refreshed = getMemberForLifecycle(member);
      if (refreshed !== member) await saveLifecycleMember(refreshed);
      return refreshed;
    }));

    if (typeof tier === 'string' && tier !== 'ALL') {
      members = members.filter((member) => member.membership.tier === tier);
    }
    if (typeof status === 'string' && status !== 'ALL') {
      members = members.filter((member) => member.membership.status === status);
    }
    if (typeof payment === 'string' && payment !== 'ALL') {
      members = members.filter((member) => member.membership.paymentStatus === payment);
    }

    // Apply text search filtering if provided
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      members = members.filter(
        (m: Member) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.phone.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/members/:id - Get single member
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!canAccessMember(req, id)) {
      return res.status(403).json({ success: false, error: 'You are not authorized to view this member' });
    }
    const found = await membersDb.findOneAsync({ id });

    if (!found) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }
    const member = getMemberForLifecycle(found);
    if (member !== found) await saveLifecycleMember(member);

    res.json({ success: true, data: member });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:id/duplicate-review', requireAuth, requireRoles('admin', 'staff'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const current = await membersDb.findOneAsync({ id });
    if (!current) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }
    const status = req.body?.status;
    if (status !== 'reviewed' && status !== 'review_required') {
      return res.status(400).json({ success: false, error: 'Duplicate review status must be reviewed or review_required' });
    }
    const updated = {
      ...current,
      duplicateReview: {
        status,
        candidateMemberIds: current.duplicateReview?.candidateMemberIds || [],
        reviewedAt: new Date().toISOString(),
        reviewedBy: req.authUser!.id
      }
    };
    await membersDb.updateAsync({ id }, updated, {});
    const enrollment = await enrollmentsDb.findOneAsync({ memberId: id });
    if (enrollment) {
      await enrollmentsDb.updateAsync(
        { id: enrollment.id },
        { ...enrollment, identityReview: { ...enrollment.identityReview, status: status === 'reviewed' ? 'REVIEWED' : 'REVIEW_REQUIRED', reviewedAt: updated.duplicateReview.reviewedAt, reviewedBy: req.authUser!.id } },
        {}
      );
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update identity review', error);
    return res.status(500).json({ success: false, error: 'Identity review could not be saved' });
  }
});

// PUT /api/members/:id - Update member details
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actor = req.authUser!;
    if (!canAccessMember(req, id)) {
      return res.status(403).json({ success: false, error: 'You are not authorized to update this member' });
    }
    const current = await membersDb.findOneAsync({ id });

    if (!current) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }

    const updates = req.body;
    const isMemberSelfService = actor.role === 'member';
    if (isMemberSelfService && Object.keys(updates).some((key) => !['phone', 'emergencyContact'].includes(key))) {
      return res.status(403).json({ success: false, error: 'Members may only update their phone and emergency contact' });
    }
    if (!isMemberSelfService && updates.email !== undefined && updates.email !== current.email) {
      return res.status(409).json({ success: false, error: 'Member account email cannot be changed from the profile editor' });
    }
    if (!isMemberSelfService && updates.membership) {
      const requested = updates.membership;
      const today = new Date().toISOString().slice(0, 10);
      if (
        (requested.status === 'active' && current.membership.status !== 'active' &&
          (current.membership.paymentStatus !== 'paid' || current.membership.endDate < today)) ||
        (requested.paymentStatus === 'paid' && current.membership.paymentStatus !== 'paid') ||
        (requested.endDate && requested.endDate !== current.membership.endDate) ||
        (requested.tier && requested.tier !== current.membership.tier) ||
        (requested.pricePerMonth !== undefined && requested.pricePerMonth !== current.membership.pricePerMonth)
      ) {
        return res.status(409).json({ success: false, error: 'Membership activation, renewal, and plan changes require payment setup' });
      }
    }

    const updatedDocument: Member = {
      ...current,
      ...(isMemberSelfService ? {
        phone: typeof updates.phone === 'string' ? updates.phone.trim() : current.phone
      } : updates),
      id: current.id, // prevent overwriting ID
      emergencyContact: updates.emergencyContact
        ? { ...current.emergencyContact, ...updates.emergencyContact }
        : current.emergencyContact,
      membership: updates.membership
        ? { ...current.membership, ...updates.membership, autoRenew: false }
        : current.membership
    };

    await membersDb.updateAsync({ id }, updatedDocument, {});
    const refreshed = await membersDb.findOneAsync({ id });

    res.json({ success: true, data: refreshed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/members/:id - Delete member document
router.delete('/:id', requireAuth, requireRoles('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const removedCount = await membersDb.removeAsync({ id }, {});

    if (removedCount === 0) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }
    await orientationRequestsDb.removeAsync({ memberId: id }, { multi: true });

    const memberUser = await usersDb.findOneAsync({ memberId: id });
    if (memberUser) {
      await usersDb.updateAsync({ id: memberUser.id }, { ...memberUser, active: false }, {});
      await sessionsDb.removeAsync({ userId: memberUser.id }, { multi: true });
    }
    const bookings = await classBookingsDb.findAsync({ memberId: id });
    for (const booking of bookings) {
      const cls = await classesDb.findOneAsync({ id: booking.classId });
      if (cls) {
        await classesDb.updateAsync(
          { id: cls.id, spotsLeft: { $lt: cls.capacity } },
          { $inc: { spotsLeft: 1 } },
          {}
        );
      }
      await classBookingsDb.removeAsync({ id: booking.id }, {});
    }

    res.json({ success: true, message: `Member ${id} deleted successfully` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/activate', requireAuth, requireRoles('admin', 'staff'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (req.body?.offlinePaymentConfirmed !== true) {
      return res.status(400).json({ success: false, error: 'Confirm that payment was collected outside this system before activation' });
    }
    const current = await membersDb.findOneAsync({ id });
    if (!current) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }
    if (hasStudioAccess(current)) {
      return res.status(409).json({ success: false, error: 'Membership is already active and paid' });
    }
    if (current.duplicateReview?.status === 'review_required') {
      return res.status(409).json({ success: false, error: 'Complete the possible-duplicate review before activating this member' });
    }
    const confirmedAt = new Date().toISOString();
    const today = confirmedAt.slice(0, 10);
    const endDate = current.membership.endDate >= today
      ? current.membership.endDate
      : addMembershipMonths(today, 1);
    const updated = {
      ...current,
      membership: {
        ...current.membership,
        status: 'active',
        paymentStatus: 'paid',
        endDate,
        autoRenew: false,
        lastOfflinePaymentConfirmation: { confirmedAt, confirmedBy: req.authUser!.id }
      }
    };
    await membersDb.updateAsync({ id }, updated, {});
    await updateEnrollmentPayment(id, req.authUser!.id, confirmedAt, 'ACTIVE');
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to activate membership', error);
    return res.status(500).json({ success: false, error: 'Membership could not be activated' });
  }
});

// POST /api/members/:id/renew - Record externally collected payment and renew
router.post('/:id/renew', requireAuth, requireRoles('admin', 'staff'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const months = req.body?.months;
    if (req.body?.offlinePaymentConfirmed !== true) {
      return res.status(400).json({ success: false, error: 'Confirm that payment was collected outside this system before renewal' });
    }
    if (!Number.isInteger(months) || months < 1 || months > 12) {
      return res.status(400).json({ success: false, error: 'Renewal duration must be between 1 and 12 months' });
    }
    const current = await membersDb.findOneAsync({ id });
    if (!current) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }
    if (current.membership.status === 'pending') {
      return res.status(409).json({ success: false, error: 'Activate the pending enrollment before renewing it' });
    }
    const today = new Date().toISOString().slice(0, 10);
    const baseDate = current.membership.endDate > today ? current.membership.endDate : today;
    const endDate = addMembershipMonths(baseDate, months);
    const confirmedAt = new Date().toISOString();
    const updated = {
      ...current,
      membership: {
        ...current.membership,
        status: 'active',
        paymentStatus: 'paid',
        endDate,
        autoRenew: false,
        lastOfflinePaymentConfirmation: { confirmedAt, confirmedBy: req.authUser!.id, renewalMonths: months }
      }
    };
    await membersDb.updateAsync({ id }, updated, {});
    await updateEnrollmentPayment(id, req.authUser!.id, confirmedAt, 'RENEWED', months);
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to process renewal request', error);
    return res.status(500).json({ success: false, error: 'Renewal request could not be processed' });
  }
});

// POST /api/members/:id/check-in - Turnstile NFC check-in simulation
router.post('/:id/check-in', requireAuth, requireRoles('admin', 'staff'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!canAccessMember(req, id)) {
      return res.status(403).json({ success: false, error: 'You are not authorized to check in this member' });
    }
    const current = await membersDb.findOneAsync({ id });

    if (!current) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }
    if (!hasStudioAccess(current)) {
      return res.status(403).json({ success: false, error: 'Membership must be active and paid before studio access is granted' });
    }

    const updatedDocument = recordCheckIn(current, req.body.activity || 'Staff-recorded studio access');

    await membersDb.updateAsync({ id }, updatedDocument, {});
    const refreshed = await membersDb.findOneAsync({ id });

    res.json({
      success: true,
      message: `Access recorded! Streak is now ${updatedDocument.attendanceStreak} days`,
      data: refreshed
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
