import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { hasStudioAccess } from '../membership.js';
import { classBookingsDb, classWaitlistDb, classesDb, membersDb } from '../db.js';
import { requireAuth, requireLicenseFeature, requireRoles } from '../auth.js';

const router = Router();

async function getWaitlistEntries(classId: string): Promise<any[]> {
  const entries = await classWaitlistDb.findAsync({ classId, status: 'waiting' });
  return entries.sort((left: any, right: any) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

async function promoteNextWaitlistedMember(classId: string): Promise<any | null> {
  const cls = await classesDb.findOneAsync({ id: classId });
  if (!cls || cls.spotsLeft <= 0) {
    return null;
  }

  const entries = await getWaitlistEntries(classId);
  const next = entries[0];
  if (!next) {
    return null;
  }

  const member = await membersDb.findOneAsync({ id: next.memberId });
  if (!member) {
    await classWaitlistDb.updateAsync({ id: next.id }, {
      $set: { status: 'cancelled', cancelledAt: new Date().toISOString() }
    }, {});
    return null;
  }

  const bookingKey = `${member.id}:${classId}`;
  if (await classBookingsDb.findOneAsync({ bookingKey })) {
    await classWaitlistDb.updateAsync({ id: next.id }, {
      $set: { status: 'cancelled', cancelledAt: new Date().toISOString() }
    }, {});
    return null;
  }

  const booking = {
    id: randomUUID(),
    bookingKey,
    classId,
    memberId: member.id,
    cancellationStarted: false,
    createdAt: new Date().toISOString()
  };

  await classBookingsDb.insertAsync(booking);
  await classWaitlistDb.updateAsync({ id: next.id }, {
    $set: {
      status: 'promoted',
      position: 0,
      promotedAt: new Date().toISOString()
    }
  }, {});

  await classesDb.updateAsync({ id: classId, spotsLeft: { $gt: 0 } }, {
    $inc: { spotsLeft: -1 }
  }, {});

  const remaining = await getWaitlistEntries(classId);
  for (let index = 0; index < remaining.length; index += 1) {
    const entry = remaining[index];
    if (entry.position !== index + 1) {
      await classWaitlistDb.updateAsync({ id: entry.id }, {
        $set: { position: index + 1 }
      }, {});
    }
  }

  return { booking, memberId: member.id };
}

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

router.get('/waitlist/me', requireAuth, requireRoles('member'), async (req: Request, res: Response) => {
  try {
    const waitlist = await classWaitlistDb.findAsync({ memberId: req.authUser!.memberId, status: 'waiting' });
    res.json({ success: true, data: waitlist.map((entry: { classId: string }) => entry.classId) });
  } catch (error) {
    console.error('Failed to load class waitlist', error);
    res.status(500).json({ success: false, error: 'Class waitlist could not be loaded' });
  }
});

router.get('/:id/waitlist', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const classRow = await classesDb.findOneAsync({ id });
    if (!classRow) {
      return res.status(404).json({ success: false, error: `Class ${id} not found` });
    }

    const entries = await classWaitlistDb.findAsync({ classId: id, status: 'waiting' });
    const members = await membersDb.findAsync({ id: { $in: entries.map((entry: any) => entry.memberId) } });
    const memberLookup = new Map(members.map((member: any) => [member.id, member.name]));

    res.json({
      success: true,
      data: entries
        .sort((left: any, right: any) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
        .map((entry: any) => ({
          ...entry,
          memberName: memberLookup.get(entry.memberId) || 'Member'
        }))
    });
  } catch (error) {
    console.error('Failed to load class waitlist', error);
    res.status(500).json({ success: false, error: 'Class waitlist could not be loaded' });
  }
});

router.post('/:id/waitlist', requireAuth, requireRoles('member'), requireLicenseFeature('class-booking'), async (req: Request, res: Response) => {
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

    const member = await membersDb.findOneAsync({ id: memberId });
    if (!member || !hasStudioAccess(member)) {
      return res.status(403).json({ success: false, error: 'Membership must be active and paid before joining a waitlist' });
    }

    const waitlistKey = `${memberId}:${id}`;
    if (await classBookingsDb.findOneAsync({ bookingKey: waitlistKey })) {
      return res.status(409).json({ success: false, error: 'You already have a reservation for this class' });
    }
    if (await classWaitlistDb.findOneAsync({ waitlistKey })) {
      return res.status(409).json({ success: false, error: 'You are already on the waitlist for this class' });
    }
    if (cls.spotsLeft > 0) {
      return res.status(409).json({ success: false, error: 'This class still has open spots. Please book directly instead of joining the waitlist.' });
    }

    const entries = await classWaitlistDb.findAsync({ classId: id, status: 'waiting' });
    const waitlistEntry = {
      id: randomUUID(),
      classId: id,
      memberId,
      waitlistKey,
      status: 'waiting',
      position: entries.length + 1,
      createdAt: new Date().toISOString()
    };

    await classWaitlistDb.insertAsync(waitlistEntry);
    res.json({
      success: true,
      message: `You joined the waitlist for ${cls.name}`,
      data: { classId: id, position: waitlistEntry.position }
    });
  } catch (error) {
    console.error('Failed to add class waitlist entry', error);
    res.status(500).json({ success: false, error: 'Class waitlist could not be updated' });
  }
});

router.delete('/:id/waitlist', requireAuth, requireRoles('member'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const memberId = req.authUser!.memberId;
    if (!memberId) {
      return res.status(403).json({ success: false, error: 'Member account is not linked to a membership' });
    }

    const waitlistEntry = await classWaitlistDb.findOneAsync({ waitlistKey: `${memberId}:${id}` });
    if (!waitlistEntry) {
      return res.status(404).json({ success: false, error: 'You are not on the waitlist for this class' });
    }

    await classWaitlistDb.updateAsync({ id: waitlistEntry.id }, {
      $set: { status: 'cancelled', cancelledAt: new Date().toISOString() }
    }, {});

    const remaining = await getWaitlistEntries(id);
    for (let index = 0; index < remaining.length; index += 1) {
      const entry = remaining[index];
      if (entry.position !== index + 1) {
        await classWaitlistDb.updateAsync({ id: entry.id }, {
          $set: { position: index + 1 }
        }, {});
      }
    }

    res.json({ success: true, message: 'You left the class waitlist' });
  } catch (error) {
    console.error('Failed to remove class waitlist entry', error);
    res.status(500).json({ success: false, error: 'Class waitlist could not be updated' });
  }
});

// POST /api/classes/:id/book - Reserve spot in a class
router.post('/:id/book', requireAuth, requireRoles('member'), requireLicenseFeature('class-booking'), async (req: Request, res: Response) => {
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
    const promotedMember = await promoteNextWaitlistedMember(id);
    res.json({
      success: true,
      message: `Reservation cancelled for ${cls.name}`,
      data: {
        class: refreshed,
        promotedMemberId: promotedMember?.memberId ?? null
      }
    });
  } catch (error) {
    console.error('Failed to cancel class reservation', error);
    res.status(500).json({ success: false, error: 'Class reservation could not be cancelled' });
  }
});

export default router;
