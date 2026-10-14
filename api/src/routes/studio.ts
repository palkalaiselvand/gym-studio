import { Router, Request, Response } from 'express';
import { studioDb } from '../db.js';
import { getLicense, reserveStudioCapacity } from '../license.js';
import type { StudioDetails } from '../types.js';
import { requireAuth, requireRoles } from '../auth.js';

const router = Router();
const NETWORK_FIELDS = ['partnerGyms', 'merchantPerks', 'loyaltySummary'] as const;

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
router.put('/', requireAuth, requireRoles('admin'), async (req: Request, res: Response) => {
  try {
    const updates: Partial<StudioDetails> = req.body;
    const current = await studioDb.findOneAsync({});
    const changesNetworkData = NETWORK_FIELDS.some((field) =>
      Object.prototype.hasOwnProperty.call(updates, field) &&
      JSON.stringify(updates[field]) !== JSON.stringify(current?.[field])
    );

    if (changesNetworkData) {
      let license;
      try {
        license = await getLicense();
      } catch (error) {
        console.error('Unable to verify deployment license before changing network data', error);
        return res.status(503).json({
          success: false,
          error: 'The deployment license could not be verified; retry after the license configuration is checked.'
        });
      }
      if (!license.features.includes('network-roaming')) {
        return res.status(403).json({
          success: false,
          error: `This feature is not included in the deployment's ${license.sku} license.`
        });
      }
    }

    if (!current) {
      let releaseStudioCapacity: (() => void) | null;
      try {
        releaseStudioCapacity = await reserveStudioCapacity();
      } catch (error) {
        console.error('Unable to verify studio capacity before creating a studio', error);
        return res.status(503).json({
          success: false,
          error: 'The deployment license could not be verified; retry after the license configuration is checked.'
        });
      }
      if (!releaseStudioCapacity) {
        return res.status(403).json({
          success: false,
          error: 'The deployment has reached its licensed studio limit.'
        });
      }
      try {
        const inserted = await studioDb.insertAsync(updates as StudioDetails);
        return res.json({ success: true, data: inserted });
      } finally {
        releaseStudioCapacity();
      }
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
