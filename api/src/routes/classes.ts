import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { hasStudioAccess } from '../membership.js';
import { classBookingsDb, classesDb, membersDb } from '../db.js';
import { requireAuth, requireRoles } from '../auth.js';

const router = Router();

// GET /api/classes - List all classes
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const query: Record<string, any> = {};

    if (category && category !== 'ALL') {
      query.category = category;
    }

    const classes = await classesDb.findAsync(query);
    res.json({ success: true, count: classes.length, data: classes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/bookings/me', requireAuth, requireRoles('member'), async (req: Request, res: Response) => {
  try {
    const bookings = await classBookingsDb.findAsync({ memberId: req.authUser!.memberId });
    res.json({ success: true, data: bookings.map((booking: { classId: string }) => booking.classId) });
  } catch (error) {
    console.error('Failed to load class bookings', error);
    res.status(500).json({ success: false, error: 'Class bookings could not be loaded' });
  }
});

// POST /api/classes/:id/book - Reserve spot in a class
router.post('/:id/book', requireAuth, requireRoles('member'), async (req: Request, res: Response) => {
  let insertedBookingId: string | undefined;
  let reservedSpot = false;
  try {
    const { id } = req.params;
    const cls = await classesDb.findOneAsync({ id });
    const actor = req.authUser!;
    if (!cls) {
      return res.status(404).json({ success: false, error: `Class ${id} not found` });
    }
    const member = actor.memberId ? await membersDb.findOneAsync({ id: actor.memberId }) : null;
    if (!member || !hasStudioAccess(member)) {
      return res.status(403).json({ success: false, error: 'Membership must be active and paid before booking classes' });
    }
    if (member.healthScreening?.physicianClearanceRequired && ['High', 'Extreme'].includes(cls.intensity)) {
      return res.status(403).json({ success: false, error: 'Physician clearance is required before booking high-intensity classes' });
    }
    const bookingKey = `${member.id}:${id}`;
    if (await classBookingsDb.findOneAsync({ bookingKey })) {
      return res.status(409).json({ success: false, error: 'You already have a reservation for this class' });
    }
    const booking = {
      id: randomUUID(),
      bookingKey,
      classId: id,
      memberId: member.id,
      cancellationStarted: false,
      createdAt: new Date().toISOString()
    };
    await classBookingsDb.insertAsync(booking);
    insertedBookingId = booking.id;
    const { numAffected } = await classesDb.updateAsync({ id, spotsLeft: { $gt: 0 } }, { $inc: { spotsLeft: -1 } }, {});
    if (numAffected === 0) {
      await classBookingsDb.removeAsync({ id: booking.id }, {});
      insertedBookingId = undefined;
      return res.status(409).json({ success: false, error: 'Class is completely booked' });
    }
    reservedSpot = true;
    const refreshed = await classesDb.findOneAsync({ id });
    res.json({
      success: true,
      message: `Spot booked in ${cls.name}`,
      data: { class: refreshed, booking }
    });
  } catch (error) {
    if (insertedBookingId) {
      if (reservedSpot) {
        try {
          await classesDb.updateAsync({ id: req.params.id }, { $inc: { spotsLeft: 1 } }, {});
        } catch (rollbackError) {
          console.error('Failed to restore class capacity after reservation error', rollbackError);
        }
      }
      try {
        await classBookingsDb.removeAsync({ id: insertedBookingId }, {});
      } catch (rollbackError) {
        console.error('Failed to remove incomplete class reservation', rollbackError);
      }
    }
    console.error('Failed to reserve class spot', error);
    res.status(500).json({ success: false, error: 'Class reservation could not be saved' });
  }
});

// POST /api/classes/:id/cancel - Cancel reservation in a class
router.post('/:id/cancel', requireAuth, requireRoles('member'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cls = await classesDb.findOneAsync({ id });
    if (!cls) {
      return res.status(404).json({ success: false, error: `Class ${id} not found` });
    }
    const memberId = req.authUser!.memberId;
    if (!memberId) {
      return res.status(403).json({ success: false, error: 'Member account is not linked to a membership' });
    }
    const booking = await classBookingsDb.findOneAsync({ bookingKey: `${memberId}:${id}` });
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Class reservation was not found' });
    }
    const claimed = await classBookingsDb.updateAsync(
      { id: booking.id, cancellationStarted: false },
      { $set: { cancellationStarted: true } },
      {}
    );
    if (claimed.numAffected === 0) {
      return res.status(409).json({ success: false, error: 'This class reservation is already being cancelled' });
    }
    const { numAffected } = await classesDb.updateAsync(
      { id, spotsLeft: { $lt: cls.capacity } },
      { $inc: { spotsLeft: 1 } },
      {}
    );
    if (numAffected === 0) {
      await classBookingsDb.updateAsync({ id: booking.id }, { $set: { cancellationStarted: false } }, {});
      return res.status(409).json({ success: false, error: 'Class capacity is already restored; contact studio staff' });
    }
    try {
      await classBookingsDb.removeAsync({ id: booking.id }, {});
    } catch (error) {
      await classesDb.updateAsync({ id, spotsLeft: { $gt: 0 } }, { $inc: { spotsLeft: -1 } }, {});
      await classBookingsDb.updateAsync({ id: booking.id }, { $set: { cancellationStarted: false } }, {});
      throw error;
    }
    const refreshed = await classesDb.findOneAsync({ id });
    res.json({
      success: true,
      message: `Reservation cancelled for ${cls.name}`,
      data: { class: refreshed }
    });
  } catch (error) {
    console.error('Failed to cancel class reservation', error);
    res.status(500).json({ success: false, error: 'Class reservation could not be cancelled' });
  }
});

export default router;
