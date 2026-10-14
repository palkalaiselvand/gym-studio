import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { membersDb, orientationRequestsDb } from '../db.js';
import { requireAuth, requireRoles } from '../auth.js';
import type { OrientationRequest } from '../types.js';

const router = Router();
let writeLock: Promise<void> = Promise.resolve();

async function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = writeLock;
  let release!: () => void;
  writeLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isFuturePreferredTime(date: string, time: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return date > today || (date === today && time > `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
}

router.get('/me', requireAuth, requireRoles('member'), async (req: Request, res: Response) => {
  try {
    const memberId = req.authUser!.memberId;
    if (!memberId) {
      return res.status(403).json({ success: false, error: 'Member account is not linked to a membership' });
    }
    const requests: OrientationRequest[] = await orientationRequestsDb.findAsync({ memberId });
    requests.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Failed to load orientation requests', error);
    return res.status(500).json({ success: false, error: 'Orientation requests could not be loaded' });
  }
});

router.post('/', requireAuth, requireRoles('member'), async (req: Request, res: Response) => {
  try {
    const memberId = req.authUser!.memberId;
    if (!memberId) {
      return res.status(403).json({ success: false, error: 'Member account is not linked to a membership' });
    }
    const { preferredDate, preferredTime, notes = '' } = req.body ?? {};
    if (!isCalendarDate(preferredDate) ||
      typeof preferredTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime) ||
      !isFuturePreferredTime(preferredDate, preferredTime)) {
      return res.status(400).json({ success: false, error: 'Choose a future preferred date and time' });
    }
    if (typeof notes !== 'string' || notes.trim().length > 300) {
      return res.status(400).json({ success: false, error: 'Notes must be 300 characters or fewer' });
    }
    const member = await membersDb.findOneAsync({ id: memberId });
    if (!member) {
      return res.status(404).json({ success: false, error: 'Member profile was not found' });
    }

    const orientationRequest = await withWriteLock(async () => {
      const existing: OrientationRequest | null = await orientationRequestsDb.findOneAsync({ memberId, status: 'pending' });
      if (existing) return null;
      const now = new Date().toISOString();
      const created: OrientationRequest = {
        id: randomUUID(),
        memberId,
        memberName: member.name,
        memberEmail: member.email,
        preferredDate,
        preferredTime,
        notes: notes.trim(),
        status: 'pending',
        createdAt: now,
        updatedAt: now
      };
      await orientationRequestsDb.insertAsync(created);
      return created;
    });

    if (!orientationRequest) {
      return res.status(409).json({ success: false, error: 'You already have a pending orientation request' });
    }
    return res.status(201).json({ success: true, data: orientationRequest });
  } catch (error) {
    console.error('Failed to create orientation request', error);
    return res.status(500).json({ success: false, error: 'Orientation request could not be saved' });
  }
});

router.delete('/:id', requireAuth, requireRoles('member'), async (req: Request, res: Response) => {
  try {
    const memberId = req.authUser!.memberId;
    if (!memberId) {
      return res.status(403).json({ success: false, error: 'Member account is not linked to a membership' });
    }
    const result = await withWriteLock(async () => {
      const existing: OrientationRequest | null = await orientationRequestsDb.findOneAsync({
        id: req.params.id,
        memberId,
        status: 'pending'
      });
      if (!existing) return null;
      const updated: OrientationRequest = { ...existing, status: 'cancelled', updatedAt: new Date().toISOString() };
      await orientationRequestsDb.updateAsync({ id: existing.id }, updated, {});
      return updated;
    });
    if (!result) {
      return res.status(404).json({ success: false, error: 'Pending orientation request was not found' });
    }
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Failed to cancel orientation request', error);
    return res.status(500).json({ success: false, error: 'Orientation request could not be cancelled' });
  }
});

router.get('/', requireAuth, requireRoles('admin', 'staff'), async (_req: Request, res: Response) => {
  try {
    const requests: OrientationRequest[] = await orientationRequestsDb.findAsync({});
    requests.sort((left, right) =>
      Number(right.status === 'pending') - Number(left.status === 'pending') ||
      right.createdAt.localeCompare(left.createdAt)
    );
    return res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Failed to load orientation requests for staff', error);
    return res.status(500).json({ success: false, error: 'Orientation requests could not be loaded' });
  }
});

router.patch('/:id/status', requireAuth, requireRoles('admin', 'staff'), async (req: Request, res: Response) => {
  try {
    const { status } = req.body ?? {};
    if (status !== 'confirmed' && status !== 'declined') {
      return res.status(400).json({ success: false, error: 'Status must be confirmed or declined' });
    }
    const updated = await withWriteLock(async () => {
      const existing: OrientationRequest | null = await orientationRequestsDb.findOneAsync({
        id: req.params.id,
        status: 'pending'
      });
      if (!existing) return null;
      const now = new Date().toISOString();
      const request: OrientationRequest = {
        ...existing,
        status,
        updatedAt: now,
        ...(status === 'confirmed' ? { confirmedAt: now, confirmedBy: req.authUser!.id } : {})
      };
      await orientationRequestsDb.updateAsync({ id: existing.id }, request, {});
      return request;
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Pending orientation request was not found' });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update orientation request', error);
    return res.status(500).json({ success: false, error: 'Orientation request could not be updated' });
  }
});

export default router;
