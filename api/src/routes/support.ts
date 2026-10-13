import { Router, Request, Response } from 'express';
import {
  accessPassesDb,
  classBookingsDb,
  classWaitlistDb,
  classesDb,
  configDb,
  enrollmentsDb,
  facilityAssetsDb,
  maintenanceTicketsDb,
  membersDb,
  studioDb,
  usersDb
} from '../db.js';
import { getLicense } from '../license.js';
import { requireAuth, requireRoles } from '../auth.js';

const router = Router();

router.get('/diagnostics', requireAuth, requireRoles('admin'), async (_req: Request, res: Response) => {
  try {
    const [license, members, studios, classes, bookings, waitlist, enrollments, assets, tickets, users, passes] =
      await Promise.all([
        getLicense(),
        membersDb.countAsync({}),
        studioDb.countAsync({}),
        classesDb.countAsync({}),
        classBookingsDb.countAsync({}),
        classWaitlistDb.countAsync({}),
        enrollmentsDb.countAsync({}),
        facilityAssetsDb.countAsync({}),
        maintenanceTicketsDb.countAsync({}),
        usersDb.countAsync({}),
        accessPassesDb.countAsync({})
      ]);

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        applicationVersion: process.env.APP_VERSION || '1.0.0',
        nodeVersion: process.version,
        runtime: process.env.NODE_ENV || 'development',
        storage: 'NeDB',
        uptimeSeconds: Math.floor(process.uptime()),
        license: {
          status: license.status,
          sku: license.sku,
          expiresAt: license.expiresAt
        },
        configuration: {
          licenseVerificationConfigured: Boolean(process.env.LICENSE_PUBLIC_KEY),
          bootstrapAdminConfigured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)
        },
        recordCounts: {
          members,
          studios,
          classes,
          bookings,
          waitlist,
          enrollments,
          assets,
          maintenanceTickets: tickets,
          userAccounts: users,
          accessPasses: passes
        },
        logAvailability: 'Application logs are written to the deployment runtime; use the documented container log command.'
      }
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Support diagnostics could not be generated'
    });
  }
});

router.get('/export', requireAuth, requireRoles('admin'), async (_req: Request, res: Response) => {
  try {
    const [members, studio, classes, bookings, waitlist, enrollments, assets, tickets, users, branding] =
      await Promise.all([
        membersDb.findAsync({}),
        studioDb.findAsync({}),
        classesDb.findAsync({}),
        classBookingsDb.findAsync({}),
        classWaitlistDb.findAsync({}),
        enrollmentsDb.findAsync({}),
        facilityAssetsDb.findAsync({}),
        maintenanceTicketsDb.findAsync({}),
        usersDb.findAsync({}),
        configDb.findOneAsync({ key: 'branding' })
      ]);

    const filename = `gym-studio-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const exportedUsers = users.map((user: Record<string, unknown>) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      memberId: user.memberId ?? null,
      studioId: user.studioId,
      active: user.active,
      createdAt: user.createdAt
    }));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      applicationVersion: process.env.APP_VERSION || '1.0.0',
      data: {
        members,
        studios: studio,
        classes,
        classBookings: bookings,
        classWaitlist: waitlist,
        enrollments,
        facilityAssets: assets,
        maintenanceTickets: tickets,
        userAccounts: exportedUsers,
        branding: branding?.value ?? null
      },
      excluded: ['password hashes', 'sessions', 'access-pass tokens', 'license signing material']
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Customer data export could not be generated'
    });
  }
});

export default router;
