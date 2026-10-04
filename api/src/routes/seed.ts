import { Router, Request, Response } from 'express';
import { resetDb } from '../db.js';

const router = Router();

// POST /api/seed/reset - Reset database back to default seed data
router.post('/reset', async (_req: Request, res: Response) => {
  try {
    await resetDb();
    res.json({
      success: true,
      message: 'Database has been reset to original seed documents'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
