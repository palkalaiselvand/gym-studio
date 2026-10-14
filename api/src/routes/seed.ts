import { Router, Request, Response } from 'express';
import { getDefaultSeedCounts, resetDb } from '../db.js';
import { getLicense } from '../license.js';
import { requireAuth, requireRoles } from '../auth.js';

const router = Router();

// POST /api/seed/reset - Reset database back to default seed data
router.post('/reset', requireAuth, requireRoles('admin'), async (_req: Request, res: Response) => {
  try {
    const [license, seedCounts] = await Promise.all([getLicense(), getDefaultSeedCounts()]);
    if (seedCounts.members > license.maxMembers || seedCounts.studios > license.maxStudios) {
      return res.status(403).json({
        success: false,
        error: "The default seed data exceeds this deployment's licensed capacity; database reset was not performed."
      });
    }
    await resetDb();
    res.json({
      success: true,
      message: 'Database has been reset to original seed documents'
    });
  } catch (error) {
    console.error('Failed to reset demo data', error);
    res.status(500).json({ success: false, error: 'Demo data could not be reset' });
  }
});

export default router;
