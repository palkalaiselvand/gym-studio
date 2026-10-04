import { Router, Request, Response } from 'express';
import { configDb } from '../db.js';
import { requireAuth, requireRoles } from '../auth.js';
import { getBranding, validateBranding } from '../branding.js';

const router = Router();

// Public: the login and enrollment screens need branding before sign-in
router.get('/', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await getBranding() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/', requireAuth, requireRoles('admin'), async (req: Request, res: Response) => {
  try {
    const { value, error } = validateBranding(req.body);
    if (!value) return res.status(400).json({ success: false, error });
    await configDb.updateAsync({ key: 'branding' }, { key: 'branding', value }, { upsert: true });
    res.json({ success: true, data: value });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
