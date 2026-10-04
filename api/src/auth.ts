import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { sessionsDb, usersDb } from './db.js';

function deriveKey(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}
const SESSION_COOKIE = 'gym_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

export type UserRole = 'admin' | 'staff' | 'franchise-owner' | 'member';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  memberId: string | null;
  studioId: string;
}

interface SessionRecord {
  tokenHash: string;
  csrfToken: string;
  userId: string;
  expiresAt: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
      authSession?: SessionRecord;
    }
  }
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 128) {
    throw new Error('Password must be between 12 and 128 characters');
  }
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt, 64);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, expectedHex] = storedHash.split(':');
  if (!saltHex || !expectedHex || !/^[a-f0-9]{32}$/.test(saltHex) || !/^[a-f0-9]{128}$/.test(expectedHex)) {
    return false;
  }
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = await deriveKey(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

export async function createMemberAccount(email: string, password: string, memberId: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await usersDb.findOneAsync({ email: normalizedEmail });
  if (existing) throw new Error('An account already exists for this email address');
  const id = `USR-${randomBytes(16).toString('hex')}`;
  await usersDb.insertAsync({
    id,
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    role: 'member',
    memberId,
    studioId: process.env.STUDIO_ID || 'apex-main',
    createdAt: new Date().toISOString(),
    active: true
  });
  return id;
}

function setSessionCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}${secure}`
  );
}

export async function startSession(userId: string, res: Response): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const csrfToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await sessionsDb.insertAsync({ tokenHash: tokenHash(token), csrfToken, userId, expiresAt });
  setSessionCookie(res, token);
  return csrfToken;
}

export function clearSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}

function getSessionToken(req: Request): string | undefined {
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return cookie?.slice(SESSION_COOKIE.length + 1);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const session: SessionRecord | null = await sessionsDb.findOneAsync({ tokenHash: tokenHash(token) });
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
      if (session) await sessionsDb.removeAsync({ tokenHash: session.tokenHash }, {});
      clearSessionCookie(res);
      res.status(401).json({ success: false, error: 'Session expired; sign in again' });
      return;
    }
    const user = await usersDb.findOneAsync({ id: session.userId, active: true });
    if (!user) {
      await sessionsDb.removeAsync({ tokenHash: session.tokenHash }, {});
      clearSessionCookie(res);
      res.status(401).json({ success: false, error: 'Account is unavailable' });
      return;
    }

    req.authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      memberId: user.memberId || null,
      studioId: user.studioId
    };
    req.authSession = session;

    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const csrfToken = req.header('x-csrf-token');
      if (!csrfToken || csrfToken.length !== session.csrfToken.length ||
        !timingSafeEqual(Buffer.from(csrfToken), Buffer.from(session.csrfToken))) {
        res.status(403).json({ success: false, error: 'CSRF validation failed' });
        return;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  if (!getSessionToken(req)) {
    next();
    return;
  }
  void requireAuth(req, res, next);
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      res.status(403).json({ success: false, error: 'You are not authorized to perform this action' });
      return;
    }
    next();
  };
}

export function canAccessMember(req: Request, memberId: string): boolean {
  const user = req.authUser;
  return !!user && (
    user.role === 'admin' ||
    user.role === 'staff' ||
    user.role === 'franchise-owner' ||
    (user.role === 'member' && user.memberId === memberId)
  );
}
