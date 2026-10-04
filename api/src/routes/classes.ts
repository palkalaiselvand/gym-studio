import { Router, Request, Response } from 'express';
import { classesDb } from '../db.js';

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

// POST /api/classes/:id/book - Reserve spot in a class
router.post('/:id/book', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cls = await classesDb.findOneAsync({ id });

    if (!cls) {
      return res.status(404).json({ success: false, error: `Class ${id} not found` });
    }

    if (cls.spotsLeft <= 0) {
      return res.status(400).json({ success: false, error: 'Class is completely booked' });
    }

    const updatedSpots = cls.spotsLeft - 1;
    await classesDb.updateAsync({ id }, { $set: { spotsLeft: updatedSpots } }, {});
    const refreshed = await classesDb.findOneAsync({ id });

    res.json({
      success: true,
      message: `Spot booked in ${cls.name}`,
      data: refreshed
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/classes/:id/cancel - Cancel reservation in a class
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cls = await classesDb.findOneAsync({ id });

    if (!cls) {
      return res.status(404).json({ success: false, error: `Class ${id} not found` });
    }

    const updatedSpots = Math.min(cls.capacity, cls.spotsLeft + 1);
    await classesDb.updateAsync({ id }, { $set: { spotsLeft: updatedSpots } }, {});
    const refreshed = await classesDb.findOneAsync({ id });

    res.json({
      success: true,
      message: `Reservation cancelled for ${cls.name}`,
      data: refreshed
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
