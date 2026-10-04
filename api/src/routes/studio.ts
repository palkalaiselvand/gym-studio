import { Router, Request, Response } from 'express';
import { studioDb } from '../db.js';
import type { StudioDetails } from '../types.js';

const router = Router();

// GET /api/studio - Get studio information, facilities, hours and trainers
router.get('/', async (_req: Request, res: Response) => {
  try {
    const studio = await studioDb.findOneAsync({});

    if (!studio) {
      return res.status(404).json({ success: false, error: 'Studio information not found' });
    }

    res.json({ success: true, data: studio });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/studio - Update studio information
router.put('/', async (req: Request, res: Response) => {
  try {
    const updates: Partial<StudioDetails> = req.body;
    const current = await studioDb.findOneAsync({});

    if (!current) {
      const inserted = await studioDb.insertAsync(updates as StudioDetails);
      return res.json({ success: true, data: inserted });
    }

    const updatedDocument: StudioDetails = {
      ...current,
      ...updates
    };

    await studioDb.updateAsync({}, updatedDocument, {});
    const refreshed = await studioDb.findOneAsync({});

    res.json({ success: true, data: refreshed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
