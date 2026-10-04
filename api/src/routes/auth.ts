import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { usersDb, sessionsDb } from '../db.js';
import { clearSessionCookie, hashPassword, requireAuth, requireRoles, startSession, verifyPassword } from '../auth.js';

const router = Router();
const attempts = new Map<string, { count: number; resetAt: number }>();
const dummyPasswordHash = `00000000000000000000000000000000:${'0'.repeat(128)}`;
const STAFF_ROLES = ['staff', 'franchise-owner'] as const;

function publicAccount(user: Record<string, unknown>) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    studioId: user.studioId,
    active: user.active,
    createdAt: user.createdAt
  };
}

router.get('/users', requireAuth, requireRoles('admin'), async (_req: Request, res: Response) => {
  try {
    const users = await usersDb.findAsync({ role: { $in: [...STAFF_ROLES] } });
    return res.json({ success: true, data: users.map(publicAccount) });
  } catch (error) {
    console.error('Failed to load staff accounts', error);
    return res.status(500).json({ success: false, error: 'Staff accounts could not be loaded' });
  }
});

router.post('/users', requireAuth, requireRoles('admin'), async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const role = req.body?.role;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ success: false, error: 'Enter a valid email address' });
    }
    if (password.length < 12 || password.length > 128) {
      return res.status(400).json({ success: false, error: 'Password must contain 12 to 128 characters' });
    }
    if (!STAFF_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: 'New accounts must have the staff or franchise-owner role' });
    }
    if (await usersDb.findOneAsync({ email })) {
      return res.status(409).json({ success: false, error: 'An account already exists for this email address' });
    }
    const user = {
      id: `USR-${randomUUID()}`,
      email,
      passwordHash: await hashPassword(password),
      role,
      memberId: null,
      studioId: req.authUser!.studioId,
      createdAt: new Date().toISOString(),
      active: true
    };
    await usersDb.insertAsync(user);
    return res.status(201).json({ success: true, data: publicAccount(user) });
  } catch (error) {
    console.error('Failed to create staff account', error);
    return res.status(500).json({ success: false, error: 'Staff account could not be created' });
  }
});

router.patch('/users/:id', requireAuth, requireRoles('admin'), async (req: Request, res: Response) => {
  try {
    const user = await usersDb.findOneAsync({ id: req.params.id, role: { $in: [...STAFF_ROLES] } });
    if (!user || user.studioId !== req.authUser!.studioId) {
      return res.status(404).json({ success: false, error: 'Staff account not found' });
    }
    const { active, role, password } = req.body ?? {};
    if (active !== undefined && typeof active !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Active must be a boolean' });
    }
    if (role !== undefined && !STAFF_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: 'Role must be staff or franchise-owner' });
    }
    if (password !== undefined && (typeof password !== 'string' || password.length < 12 || password.length > 128)) {
      return res.status(400).json({ success: false, error: 'Password must contain 12 to 128 characters' });
    }
    const updated = {
      ...user,
      ...(active !== undefined ? { active } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(password !== undefined ? { passwordHash: await hashPassword(password) } : {})
    };
    if (active === false || password !== undefined) {
      await sessionsDb.removeAsync({ userId: user.id }, { multi: true });
    }
    await usersDb.updateAsync({ id: user.id }, updated, {});
    return res.json({ success: true, data: publicAccount(updated) });
  } catch (error) {
    console.error('Failed to update staff account', error);
    return res.status(500).json({ success: false, error: 'Staff account could not be updated' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const clientKey = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const attempt = attempts.get(clientKey);
    if (attempt && attempt.resetAt <= now) attempts.delete(clientKey);
    const current = attempts.get(clientKey);
    if (current && current.count >= 10) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      return res.status(429).json({ success: false, error: 'Too many sign-in attempts. Try again later.' });
    }

    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password || email.length > 254 || password.length > 128) {
      return res.status(400).json({ success: false, error: 'Enter your email and password' });
    }

    const user = await usersDb.findOneAsync({ email, active: true });
    const passwordMatches = await verifyPassword(password, user?.passwordHash || dummyPasswordHash);
    if (!user || !passwordMatches) {
      const nextAttempt = attempts.get(clientKey) || { count: 0, resetAt: now + 15 * 60 * 1000 };
      nextAttempt.count += 1;
      attempts.set(clientKey, nextAttempt);
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    attempts.delete(clientKey);
    await sessionsDb.removeAsync({ userId: user.id, expiresAt: { $lt: new Date().toISOString() } }, { multi: true });
    const csrfToken = await startSession(user.id, res);
    return res.json({
      success: true,
      data: {
        csrfToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          memberId: user.memberId || null,
          studioId: user.studioId
        }
      }
    });
  } catch (error) {
    console.error('Authentication failed', error);
    return res.status(500).json({ success: false, error: 'Sign-in is temporarily unavailable' });
  }
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ success: true, data: { user: req.authUser, csrfToken: req.authSession?.csrfToken } });
});

router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    await sessionsDb.removeAsync({ tokenHash: req.authSession?.tokenHash }, {});
    clearSessionCookie(res);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke session', error);
    res.status(500).json({ success: false, error: 'Sign-out failed' });
  }
});

export default router;
