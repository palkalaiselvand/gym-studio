import { Router, Request, Response } from 'express';
import { membersDb } from '../db.js';
import type { Member, MembershipTier, MembershipStatus, PaymentStatus } from '../types.js';

const router = Router();

// GET /api/members - List members with optional query filtering
router.get('/', async (req: Request, res: Response) => {
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const member = await membersDb.findOneAsync({ id });

    if (!member) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }

    res.json({ success: true, data: member });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/members - Register new member
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.name || !body.email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    // Check for duplicate email
    const existing = await membersDb.findOneAsync({ email: body.email });
    if (existing) {
      return res.status(409).json({ success: false, error: `Email ${body.email} is already registered` });
    }

    const id = body.id || `MEM-${Math.floor(1000 + Math.random() * 9000)}`;

    const newMember: Member = {
      id,
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      avatar:
        body.avatar ||
        `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?auto=format&fit=crop&w=200&q=80`,
      joinDate: body.joinDate || new Date().toISOString().split('T')[0],
      attendanceStreak: body.attendanceStreak || 0,
      totalCheckIns: body.totalCheckIns || 0,
      emergencyContact: {
        name: body.emergencyContact?.name || '',
        phone: body.emergencyContact?.phone || '',
        relation: body.emergencyContact?.relation || 'Emergency Contact'
      },
      membership: {
        id: body.membership?.id || `MS-${Date.now().toString().slice(-6)}`,
        tier: body.membership?.tier || 'Gold',
        status: body.membership?.status || 'active',
        startDate: body.membership?.startDate || new Date().toISOString().split('T')[0],
        endDate: body.membership?.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        pricePerMonth: body.membership?.pricePerMonth || 89,
        paymentStatus: body.membership?.paymentStatus || 'paid',
        autoRenew: body.membership?.autoRenew !== undefined ? body.membership.autoRenew : true,
        perks: body.membership?.perks || [],
        notes: body.membership?.notes || ''
      },
      recentVisits: body.recentVisits || [
        {
          id: `v-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          time: '10:00 AM',
          activity: 'Welcome Orientation & Assessment'
        }
      ]
    };

    const inserted = await membersDb.insertAsync(newMember);
    res.status(201).json({ success: true, data: inserted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/members/:id - Update member details
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const current = await membersDb.findOneAsync({ id });

    if (!current) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }

    const updates = req.body;

    const updatedDocument: Member = {
      ...current,
      ...updates,
      id: current.id, // prevent overwriting ID
      emergencyContact: updates.emergencyContact
        ? { ...current.emergencyContact, ...updates.emergencyContact }
        : current.emergencyContact,
      membership: updates.membership
        ? { ...current.membership, ...updates.membership }
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
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const removedCount = await membersDb.removeAsync({ id }, {});

    if (removedCount === 0) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }

    res.json({ success: true, message: `Member ${id} deleted successfully` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/members/:id/renew - Quick renew (+N months)
router.post('/:id/renew', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const months = parseInt(req.body.months as string) || 1;

    const current = await membersDb.findOneAsync({ id });
    if (!current) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }

    const currentEnd = new Date(current.membership.endDate);
    const newEnd = new Date(currentEnd);
    newEnd.setMonth(newEnd.getMonth() + months);

    const updatedDocument: Member = {
      ...current,
      membership: {
        ...current.membership,
        endDate: newEnd.toISOString().split('T')[0],
        status: 'active',
        paymentStatus: 'paid'
      }
    };

    await membersDb.updateAsync({ id }, updatedDocument, {});
    const refreshed = await membersDb.findOneAsync({ id });

    res.json({
      success: true,
      message: `Renewed membership for ${months} month(s)`,
      data: refreshed
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/members/:id/check-in - Turnstile NFC check-in simulation
router.post('/:id/check-in', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const current = await membersDb.findOneAsync({ id });

    if (!current) {
      return res.status(404).json({ success: false, error: `Member ${id} not found` });
    }

    const today = new Date().toISOString().split('T')[0];
    const newVisit = {
      id: `v-${Date.now()}`,
      date: today,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activity: req.body.activity || 'Studio Turnstile Access Verified'
    };

    const updatedVisits = [newVisit, ...(current.recentVisits || [])];
    const streak = (current.attendanceStreak || 0) + 1;
    const totalVisits = (current.totalCheckIns || 0) + 1;

    const updatedDocument: Member = {
      ...current,
      attendanceStreak: streak,
      totalCheckIns: totalVisits,
      recentVisits: updatedVisits
    };

    await membersDb.updateAsync({ id }, updatedDocument, {});
    const refreshed = await membersDb.findOneAsync({ id });

    res.json({
      success: true,
      message: `Access granted! Streak is now ${streak} days`,
      data: refreshed
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
