import { Router, Request, Response } from 'express';
import { configDb } from '../db.js';
import { evaluateLicense, getLicense, validateLicense } from '../license.js';
import { requireAuth, requireRoles } from '../auth.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const license = await getLicense();
    res.json({ success: true, data: license });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'License status could not be loaded' });
  }
});

router.put('/', requireAuth, requireRoles('admin'), async (req: Request, res: Response) => {
  try {
    const { value, error } = validateLicense(req.body);
    if (!value) {
      return res.status(400).json({ success: false, error });
    }

    const normalized = evaluateLicense(value);
    await configDb.updateAsync({ key: 'license' }, { key: 'license', value: normalized }, { upsert: true });
    res.json({ success: true, data: normalized });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'License settings could not be updated' });
  }
});

export default router;
