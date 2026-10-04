import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { recordCheckIn } from '../attendance.js';
import { hasStudioAccess } from '../membership.js';
import { accessPassesDb, configDb, membersDb } from '../db.js';
import { requireAuth, requireRoles } from '../auth.js';

const router = Router();
const PASS_LIFETIME_MS = 30_000;

interface PassPayload {
  memberId: string;
  studioId: string;
  expiresAt: number;
  nonce: string;
}

async function signingSecret(): Promise<Buffer> {
  const existing = await configDb.findOneAsync({ key: 'access-pass-signing-key' });
  if (existing) return Buffer.from(existing.value, 'hex');
  const value = randomBytes(32).toString('hex');
  try {
    await configDb.insertAsync({ key: 'access-pass-signing-key', value });
    return Buffer.from(value, 'hex');
  } catch (error) {
    const concurrent = await configDb.findOneAsync({ key: 'access-pass-signing-key' });
    if (concurrent) return Buffer.from(concurrent.value, 'hex');
    throw error;
  }
}

function encode(payload: PassPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function signature(payload: string, secret: Buffer): Buffer {
  return createHmac('sha256', secret).update(payload).digest();
}

router.get('/pass', requireAuth, requireRoles('member'), async (req: Request, res: Response) => {
  try {
    const memberId = req.authUser!.memberId;
    const member = memberId ? await membersDb.findOneAsync({ id: memberId }) : null;
    if (!member || !hasStudioAccess(member)) {
      return res.status(403).json({ success: false, error: 'An active, paid membership is required for studio access' });
    }

    const expiresAt = Date.now() + PASS_LIFETIME_MS;
    const payload = encode({
      memberId: member.id,
      studioId: req.authUser!.studioId,
      expiresAt,
      nonce: randomBytes(16).toString('base64url')
    });
    const secret = await signingSecret();
    const token = `${payload}.${signature(payload, secret).toString('base64url')}`;
    await accessPassesDb.updateAsync(
      { memberId: member.id },
      { $set: { memberId: member.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(expiresAt).toISOString(), consumed: false } },
      { upsert: true }
    );
    return res.json({
      success: true,
      data: {
        token,
        expiresAt: new Date(expiresAt).toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to issue access pass', error);
    return res.status(500).json({ success: false, error: 'Access pass could not be issued' });
  }
});

router.post('/verify', requireAuth, requireRoles('admin', 'staff'), async (req: Request, res: Response) => {
  try {
    const token = req.body?.token;
    if (typeof token !== 'string' || token.length > 2048) {
      return res.status(400).json({ success: false, error: 'A valid access token is required' });
    }
    const [payloadPart, signaturePart, extra] = token.split('.');
    if (!payloadPart || !signaturePart || extra !== undefined) {
      return res.status(403).json({ success: false, error: 'Access pass is invalid' });
    }
    let payload: PassPayload;
    try {
      payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as PassPayload;
    } catch {
      return res.status(403).json({ success: false, error: 'Access pass is invalid' });
    }
    const suppliedSignature = Buffer.from(signaturePart, 'base64url');
    const expectedSignature = signature(payloadPart, await signingSecret());
    if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) {
      return res.status(403).json({ success: false, error: 'Access pass is invalid' });
    }
    if (
      typeof payload.memberId !== 'string' ||
      typeof payload.studioId !== 'string' ||
      typeof payload.nonce !== 'string' ||
      typeof payload.expiresAt !== 'number' ||
      payload.studioId !== req.authUser!.studioId ||
      payload.expiresAt <= Date.now() ||
      payload.expiresAt > Date.now() + PASS_LIFETIME_MS + 5_000
    ) {
      return res.status(403).json({ success: false, error: 'Access pass is expired or belongs to another studio' });
    }

    const member = await membersDb.findOneAsync({ id: payload.memberId });
    if (!member || !hasStudioAccess(member)) {
      return res.status(403).json({ success: false, error: 'Membership is inactive or unpaid' });
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const passRecord = await accessPassesDb.findOneAsync({ memberId: payload.memberId, tokenHash, consumed: false });
    if (!passRecord || Date.parse(passRecord.expiresAt) <= Date.now()) {
      return res.status(409).json({ success: false, error: 'This access pass has already been used' });
    }
    const { numAffected } = await accessPassesDb.updateAsync(
      { memberId: payload.memberId, tokenHash, consumed: false },
      { $set: { consumed: true } },
      {}
    );
    if (numAffected === 0) return res.status(409).json({ success: false, error: 'This access pass has already been used' });

    const updated = recordCheckIn(member, 'Verified QR studio access');
    await membersDb.updateAsync({ id: member.id }, updated, {});
    return res.json({
      success: true,
      data: { accessGranted: true, memberId: member.id, memberName: member.name }
    });
  } catch (error) {
    console.error('Failed to verify studio access', error);
    return res.status(500).json({ success: false, error: 'Studio access could not be verified' });
  }
});

export default router;
