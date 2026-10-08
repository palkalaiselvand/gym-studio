import { Router, Request, Response } from 'express';
import { recordCheckIn } from '../attendance.js';
import { addMembershipMonths, calculateProratedCharge, getMembershipTierPrice, hasStudioAccess } from '../membership.js';
import { classBookingsDb, classesDb, enrollmentsDb, membersDb, sessionsDb, usersDb } from '../db.js';
import type { Member, MembershipTier, MembershipStatus, PaymentStatus } from '../types.js';
import { canAccessMember, requireAuth, requireRoles } from '../auth.js';

const router = Router();

const TIER_PRICE_MAP: Record<MembershipTier, number> = {
  Basic: 79,
  Silver: 129,
  Gold: 179,
  Platinum: 249,
  VIP: 329
};

function normalizeDateField(value: unknown): string | undefined {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return undefined;
}

function readMemberMembershipChange(payload: Record<string, any>): { tier?: MembershipTier; reason?: string; startDate?: string; endDate?: string; effectiveDate?: string } {
  const tierValue = payload?.tier;
  const tier = typeof tierValue === 'string' && tierValue in TIER_PRICE_MAP ? tierValue as MembershipTier : undefined;
  const reason = typeof payload?.reason === 'string' && payload.reason.trim() ? payload.reason.trim() : undefined;
  const startDate = normalizeDateField(payload?.startDate);
  const endDate = normalizeDateField(payload?.endDate);
  const effectiveDate = normalizeDateField(payload?.effectiveDate);

  return { tier, reason, startDate, endDate, effectiveDate };
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

    const current = await membersDb.findOneAsync({ id });
    if (!current) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }

    if (current.membership.status === 'cancelled') {
      return res.status(409).json({ success: false, error: 'Cancelled memberships cannot be frozen' });
    }

    const payload = readMemberMembershipChange(req.body || {});
    const startDate = payload.startDate || new Date().toISOString().slice(0, 10);
    const endDate = payload.endDate;
    if (!endDate || endDate < startDate) {
      return res.status(400).json({ success: false, error: 'Freeze end date must be after the start date' });
    }

    const freezeDurationDays = Math.max(0, (new Date(`${endDate}T00:00:00.000Z`).getTime() - new Date(`${startDate}T00:00:00.000Z`).getTime()) / (1000 * 60 * 60 * 24));
    if (freezeDurationDays > 90) {
      return res.status(400).json({ success: false, error: 'Freezes are limited to 90 days in the current prototype' });
    }

    const updated = {
      ...current,
      membership: {
        ...current.membership,
        status: 'frozen',
        paymentStatus: 'paid',
        autoRenew: false,
        freeze: {
          startDate,
          endDate,
          reason: payload.reason || 'Requested by member'
        },
        notes: `Membership paused from ${startDate} to ${endDate}. Billing is suspended until resume.`
      }
    };

    await membersDb.updateAsync({ id }, updated, {});
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

    const current = await membersDb.findOneAsync({ id });
    if (!current) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }

    if (current.membership.status !== 'frozen') {
      return res.status(409).json({ success: false, error: 'Only frozen memberships can be resumed' });
    }

    const updated = {
      ...current,
      membership: {
        ...current.membership,
        status: 'active',
        paymentStatus: 'paid',
        autoRenew: false,
        freeze: undefined,
        notes: 'Membership resumed after a freeze.'
      }
    };

    await membersDb.updateAsync({ id }, updated, {});
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

    const current = await membersDb.findOneAsync({ id });
    if (!current) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }

    const payload = readMemberMembershipChange(req.body || {});
    if (!payload.tier) {
      return res.status(400).json({ success: false, error: 'A valid membership tier is required for an upgrade' });
    }

    if (payload.tier === current.membership.tier) {
      return res.status(409).json({ success: false, error: 'This member is already on the selected tier' });
    }

    const remainingDays = Math.max(1, Math.ceil((new Date(`${current.membership.endDate}T00:00:00.000Z`).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const targetedCharge = calculateProratedCharge(current.membership.tier, payload.tier, remainingDays);
    const updated = {
      ...current,
      membership: {
        ...current.membership,
        tier: payload.tier,
        pricePerMonth: getMembershipTierPrice(payload.tier),
        status: 'active',
        paymentStatus: 'paid',
        autoRenew: false,
        pendingDowngradeTier: null,
        freeze: undefined,
        notes: `Upgraded to ${payload.tier}. Estimated prorated charge: $${targetedCharge.toFixed(2)}.`
      }
    };

    await membersDb.updateAsync({ id }, updated, {});
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

    const current = await membersDb.findOneAsync({ id });
    if (!current) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }

    const payload = readMemberMembershipChange(req.body || {});
    if (!payload.tier) {
      return res.status(400).json({ success: false, error: 'A valid membership tier is required for a downgrade' });
    }

    if (payload.tier === current.membership.tier) {
      return res.status(409).json({ success: false, error: 'This member is already on the selected tier' });
    }

    const updated = {
      ...current,
      membership: {
        ...current.membership,
        status: 'active',
        autoRenew: false,
        pendingDowngradeTier: payload.tier,
        notes: `${current.name} will switch to ${payload.tier} at the next renewal date.`
      }
    };

    await membersDb.updateAsync({ id }, updated, {});
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to schedule downgrade', error);
    return res.status(500).json({ success: false, error: 'Membership downgrade could not be saved' });
  }
});

router.post('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!canAccessMember(req, id)) {
      return res.status(403).json({ success: false, error: 'You are not authorized to manage this member' });
    }

    const current = await membersDb.findOneAsync({ id });
    if (!current) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }

    const payload = readMemberMembershipChange(req.body || {});
    const effectiveDate = payload.effectiveDate || new Date().toISOString().slice(0, 10);
    const reason = payload.reason || 'Self-service cancellation';

    const updated = {
      ...current,
      membership: {
        ...current.membership,
        status: 'cancelled',
        paymentStatus: 'pending',
        autoRenew: false,
        freeze: undefined,
        pendingDowngradeTier: null,
        cancellation: {
          requestedAt: new Date().toISOString(),
          effectiveDate,
          reason,
          status: 'requested'
        },
        notes: `Cancelled effective ${effectiveDate}. Reason: ${reason}`
      }
    };

    await membersDb.updateAsync({ id }, updated, {});
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

    const query: Record<string, any> = {};

    if (tier && tier !== 'ALL') {
      query['membership.tier'] = tier as MembershipTier;
    }

    if (status && status !== 'ALL') {
      query['membership.status'] = status as MembershipStatus;
    }

    if (payment && payment !== 'ALL') {
      query['membership.paymentStatus'] = payment as PaymentStatus;
    }

    let members = await membersDb.findAsync(query);

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
    const member = await membersDb.findOneAsync({ id });

    if (!member) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }

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
