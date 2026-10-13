import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { facilityAssetsDb, maintenanceTicketsDb } from '../db.js';
import { requireAuth, requireRoles } from '../auth.js';

const router = Router();

const severityRank: Record<string, number> = { P1: 0, P2: 1, P3: 2 };

function normalizeStatus(status: string): string {
  switch (status) {
    case 'Open':
    case 'Assigned':
    case 'In Progress':
    case 'Resolved':
    case 'Closed':
      return status;
    default:
      return 'Open';
  }
}

router.get('/assets', async (_req: Request, res: Response) => {
  try {
    const assets = await facilityAssetsDb.findAsync({});
    assets.sort((left: any, right: any) => left.locationZone.localeCompare(right.locationZone) || left.tagCode.localeCompare(right.tagCode));
    res.json({ success: true, data: assets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Facility assets could not be loaded' });
  }
});

router.get('/tickets', async (_req: Request, res: Response) => {
  try {
    const tickets = await maintenanceTicketsDb.findAsync({});
    tickets.sort((left: any, right: any) => {
      const leftRank = severityRank[left.severity] ?? 99;
      const rightRank = severityRank[right.severity] ?? 99;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
    res.json({ success: true, data: tickets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Maintenance tickets could not be loaded' });
  }
});

router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const [assets, tickets] = await Promise.all([
      facilityAssetsDb.findAsync({}),
      maintenanceTicketsDb.findAsync({})
    ]);

    const summary = {
      totalAssets: assets.length,
      operational: assets.filter((asset: any) => asset.status === 'Operational').length,
      inMaintenance: assets.filter((asset: any) => ['Out of Service', 'Under Maintenance', 'Degraded'].includes(asset.status)).length,
      openTickets: tickets.filter((ticket: any) => !['Resolved', 'Closed'].includes(ticket.status)).length,
      criticalTickets: tickets.filter((ticket: any) => ticket.severity === 'P1').length,
      nextEscalation: tickets
        .filter((ticket: any) => !['Resolved', 'Closed'].includes(ticket.status))
        .sort((left: any, right: any) => (severityRank[left.severity] ?? 99) - (severityRank[right.severity] ?? 99))[0] || null
    };

    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Maintenance summary could not be generated' });
  }
});

router.post('/tickets', requireAuth, requireRoles('admin', 'staff', 'franchise-owner'), async (req: Request, res: Response) => {
  try {
    const { assetId, issueType, description, reporterName, reporterType = 'staff', severity = 'P2', eta } = req.body ?? {};
    if (!assetId || !issueType || !description) {
      return res.status(400).json({ success: false, error: 'assetId, issueType, and description are required' });
    }

    const asset = await facilityAssetsDb.findOneAsync({ id: assetId });
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Facility asset not found' });
    }

    const ticket = {
      id: randomUUID(),
      assetId: asset.id,
      assetTag: asset.tagCode,
      reporterName: reporterName || req.authUser?.email || 'Operations Team',
      reporterType: reporterType === 'member' ? 'member' : 'staff',
      severity: ['P1', 'P2', 'P3'].includes(severity) ? severity : 'P2',
      issueType,
      description,
      photoUrls: Array.isArray(req.body?.photoUrls) ? req.body.photoUrls : [],
      status: 'Open',
      eta: eta || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await maintenanceTicketsDb.insertAsync(ticket);
    const nextStatus = ticket.severity === 'P1' ? 'Out of Service' : ticket.severity === 'P2' ? 'Under Maintenance' : 'Degraded';
    await facilityAssetsDb.updateAsync({ id: asset.id }, { $set: { status: nextStatus, updatedAt: ticket.createdAt } }, {});

    res.status(201).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Maintenance ticket could not be created' });
  }
});

router.patch('/tickets/:id/status', requireAuth, requireRoles('admin', 'staff', 'franchise-owner'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, eta } = req.body ?? {};
    const normalizedStatus = normalizeStatus(status);
    const ticket = await maintenanceTicketsDb.findOneAsync({ id });
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Maintenance ticket not found' });
    }

    const updates: Record<string, any> = {
      status: normalizedStatus,
      updatedAt: new Date().toISOString()
    };

    if (typeof eta !== 'undefined') {
      updates.eta = eta;
    }
    if (normalizedStatus === 'Resolved' || normalizedStatus === 'Closed') {
      updates.resolvedAt = new Date().toISOString();
    }

    await maintenanceTicketsDb.updateAsync({ id }, { $set: updates }, {});
    const refreshed = await maintenanceTicketsDb.findOneAsync({ id });
    res.json({ success: true, data: refreshed });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Maintenance ticket could not be updated' });
  }
});

router.post('/assets/:id/report', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { issueType, description, reporterName, severity = 'P2' } = req.body ?? {};
    if (!issueType || !description) {
      return res.status(400).json({ success: false, error: 'issueType and description are required' });
    }

    const asset = await facilityAssetsDb.findOneAsync({ id });
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Facility asset not found' });
    }

    const ticket = {
      id: randomUUID(),
      assetId: asset.id,
      assetTag: asset.tagCode,
      reporterName: reporterName || req.authUser?.email || 'Member report',
      reporterType: req.authUser?.role === 'member' ? 'member' : 'staff',
      severity: ['P1', 'P2', 'P3'].includes(severity) ? severity : 'P2',
      issueType,
      description,
      photoUrls: Array.isArray(req.body?.photoUrls) ? req.body.photoUrls : [],
      status: 'Open',
      eta: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await maintenanceTicketsDb.insertAsync(ticket);
    const nextStatus = ticket.severity === 'P1' ? 'Out of Service' : 'Under Maintenance';
    await facilityAssetsDb.updateAsync({ id: asset.id }, { $set: { status: nextStatus, updatedAt: ticket.createdAt } }, {});

    res.status(201).json({ success: true, data: ticket, message: 'Issue report submitted to the maintenance team' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Issue report could not be created' });
  }
});

export default router;
