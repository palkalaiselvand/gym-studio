import { Router, Request, Response } from 'express';
import { configDb } from '../db.js';
import { evaluateLicense, getLicense, validateLegacyLicense, verifySignedLicense } from '../license.js';
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
    if (process.env.NODE_ENV === 'production' || process.env.LICENSE_PUBLIC_KEY) {
      return res.status(405).json({ success: false, error: 'Import a vendor-signed license file instead of editing entitlements.' });
    }
    const { value, error } = validateLegacyLicense(req.body);
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

router.post('/import', requireAuth, requireRoles('admin'), async (req: Request, res: Response) => {
  try {
    if (!process.env.LICENSE_PUBLIC_KEY) {
      return res.status(503).json({ success: false, error: 'Offline license verification is not configured on this deployment.' });
    }
    const { file, license } = verifySignedLicense(req.body);
    await configDb.updateAsync(
      { key: 'signed-license' },
      { key: 'signed-license', value: file, importedAt: new Date().toISOString() },
      { upsert: true }
    );
    res.json({ success: true, data: license });
  } catch (error: unknown) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Signed license could not be imported'
    });
  }
});

export default router;
