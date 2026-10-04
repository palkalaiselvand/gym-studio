import { createHash, randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { enrollmentsDb, membersDb, usersDb } from '../db.js';
import { createMemberAccount, optionalAuth, startSession } from '../auth.js';
import { formatMoney, getBranding } from '../branding.js';
import type { Member, MembershipTier } from '../types.js';

const router = Router();

const PLANS: Array<{
  id: MembershipTier;
  name: string;
  monthlyPrice: number;
  description: string;
  perks: string[];
}> = [
  { id: 'Basic', name: 'Basic', monthlyPrice: 49, description: 'Essential gym floor access for independent training.', perks: ['Standard gym floor access', 'Locker room and showers', 'Workout tracking app'] },
  { id: 'Silver', name: 'Silver', monthlyPrice: 69, description: 'Floor access plus group classes and weekend sauna.', perks: ['All open-hours gym access', 'Weekend group fitness classes', 'Weekend sauna access', 'Initial fitness appraisal'] },
  { id: 'Gold', name: 'Gold', monthlyPrice: 89, description: 'Full studio access with group classes and sauna.', perks: ['All-hours studio access', 'Unlimited group fitness classes', 'Daily sauna access', 'Quarterly trainer consultation'] },
  { id: 'Platinum', name: 'Platinum', monthlyPrice: 129, description: '24/7 access with recovery, personal training, and guest passes.', perks: ['24/7 facility access', 'Sauna and cold plunge', 'Two monthly trainer sessions', 'Priority class booking', 'Two monthly guest passes'] },
  { id: 'VIP', name: 'VIP', monthlyPrice: 199, description: 'All-inclusive access with private coaching and wellness services.', perks: ['24/7 all-inclusive access', 'Private locker and laundry', 'Weekly personal training', 'Nutrition coaching', 'Unlimited guest passes'] }
];

const WAIVER_VERSION = 'demo-v1';
const WAIVER_TEXT =
  'I understand that exercise involves physical exertion and inherent risks. I will use equipment responsibly, follow studio safety instructions, and stop exercising if I experience concerning symptoms. I understand this sample waiver has not been reviewed by legal counsel and is not a substitute for a jurisdiction-specific agreement.';
const PARQ_FIELDS = ['heartCondition', 'chestPain', 'medicalAdvice', 'boneOrJointCondition'] as const;
const VALID_CHANNELS = ['WEB', 'MOBILE_APP', 'KIOSK', 'SALES_REP', 'AGGREGATOR_HANDOFF'];

function addOneMonth(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

function ageOn(dateOfBirth: string, date: Date): number {
  const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
  let age = date.getUTCFullYear() - birthDate.getUTCFullYear();
  if (
    date.getUTCMonth() < birthDate.getUTCMonth() ||
    (date.getUTCMonth() === birthDate.getUTCMonth() && date.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

function isValidDate(dateText: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return false;
  const date = new Date(`${dateText}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dateText;
}

function normalizedName(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
}

function namesAreSimilar(left: string, right: string): boolean {
  const a = normalizedName(left);
  const b = normalizedName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5) return false;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length) >= 0.85;
}

function normalizedPhone(value: string): string {
  return value.replace(/\D/g, '');
}

router.get('/plans', (_req: Request, res: Response) => {
  res.json({ success: true, data: PLANS });
});

router.get('/waiver', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { version: WAIVER_VERSION, text: WAIVER_TEXT, legalReviewRequired: true }
  });
});

router.post('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    if (req.authUser && req.authUser.role !== 'admin' && req.authUser.role !== 'staff') {
      return res.status(403).json({ success: false, error: 'Only staff can create an enrollment for another person' });
    }
    const {
      name,
      email,
      phone,
      planId,
      startDate,
      dateOfBirth,
      parqResponses,
      waiverAccepted,
      contractAccepted,
      signerName,
      password,
      guardianName,
      guardianSignature,
      channel = 'WEB'
    } = req.body ?? {};

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ success: false, error: 'Enter a name between 2 and 100 characters' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254) {
      return res.status(400).json({ success: false, error: 'Enter a valid email address' });
    }
    if (typeof phone !== 'string' || phone.trim().length < 7 || phone.trim().length > 30) {
      return res.status(400).json({ success: false, error: 'Enter a valid phone number' });
    }
    if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
      return res.status(400).json({ success: false, error: 'Choose a password between 12 and 128 characters' });
    }

    const plan = PLANS.find(({ id }) => id === planId);
    if (!plan) {
      return res.status(400).json({ success: false, error: 'Select a valid membership plan' });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (typeof startDate !== 'string' || !isValidDate(startDate) || startDate < today) {
      return res.status(400).json({ success: false, error: 'Select today or a future membership start date' });
    }
    if (typeof dateOfBirth !== 'string' || !isValidDate(dateOfBirth) || dateOfBirth >= today) {
      return res.status(400).json({ success: false, error: 'Enter a valid date of birth' });
    }
    if (!parqResponses || typeof parqResponses !== 'object' || Array.isArray(parqResponses) ||
      !PARQ_FIELDS.every((field) => typeof parqResponses[field] === 'boolean')) {
      return res.status(400).json({ success: false, error: 'Complete every health screening question' });
    }
    if (waiverAccepted !== true || contractAccepted !== true) {
      return res.status(400).json({ success: false, error: 'Accept the waiver and membership contract to continue' });
    }
    if (typeof signerName !== 'string' || signerName.trim().toLocaleLowerCase() !== name.trim().toLocaleLowerCase()) {
      return res.status(400).json({ success: false, error: 'Type the member’s full name to sign the contract' });
    }
    if (typeof channel !== 'string' || !VALID_CHANNELS.includes(channel)) {
      return res.status(400).json({ success: false, error: 'Select a supported enrollment channel' });
    }

    const age = ageOn(dateOfBirth, new Date(`${today}T00:00:00.000Z`));
    const isMinor = age < 18;
    if (age < 0 || age > 120) {
      return res.status(400).json({ success: false, error: 'Enter a valid date of birth' });
    }
    if (isMinor && (
      typeof guardianName !== 'string' ||
      guardianName.trim().length < 2 ||
      typeof guardianSignature !== 'string' ||
      guardianSignature.trim().toLocaleLowerCase() !== guardianName.trim().toLocaleLowerCase()
    )) {
      return res.status(400).json({ success: false, error: 'A parent or guardian must provide their name and typed co-signature' });
    }

    const normalizedEmail = email.trim().toLocaleLowerCase();
    const existingMembers: Member[] = await membersDb.findAsync({});
    if (existingMembers.some((member) => member.email.trim().toLocaleLowerCase() === normalizedEmail)) {
      return res.status(409).json({ success: false, error: 'This email address is already registered' });
    }
    if (await usersDb.findOneAsync({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, error: 'An account already exists for this email address' });
    }

    const matchingPhone = normalizedPhone(phone);
    const possibleDuplicates = existingMembers.filter((member) =>
      matchingPhone.length >= 7 &&
      normalizedPhone(member.phone) === matchingPhone &&
      namesAreSimilar(member.name, name.trim())
    );
    const duplicateReviewRequired = possibleDuplicates.length > 0;

    const id = randomUUID();
    const memberId = `MEM-${randomUUID().slice(0, 8).toUpperCase()}`;
    const signedAt = new Date().toISOString();
    const signer = signerName.trim();
    const flagged = PARQ_FIELDS.some((field) => parqResponses[field] === true);
    const waiverHash = createHash('sha256').update(`${WAIVER_VERSION}\n${WAIVER_TEXT}`).digest('hex');
    const endDate = addOneMonth(startDate);
    const branding = await getBranding();
    const contractTerms = `You selected the ${plan.name} plan at ${formatMoney(plan.monthlyPrice, branding)} per month, beginning ${startDate}. This is a plan selection only. No payment method has been collected, no charge will be made, and your membership will remain pending until payment setup and studio activation are completed.`;
    const contractSnapshot = {
      memberId,
      planId: plan.id,
      monthlyPrice: plan.monthlyPrice,
      startDate,
      endDate,
      waiverVersion: WAIVER_VERSION,
      waiverContentHash: waiverHash,
      terms: contractTerms,
      signer,
      guardianSigner: isMinor ? guardianName.trim() : null,
      signedAt
    };
    const contractHash = createHash('sha256').update(JSON.stringify(contractSnapshot)).digest('hex');
    const waiverSignatureHash = createHash('sha256')
      .update(JSON.stringify({ version: WAIVER_VERSION, signer, signedAt, contentHash: waiverHash, contractHash }))
      .digest('hex');

    const member: Member = {
      id: memberId,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      joinDate: startDate,
      emergencyContact: { name: '', phone: '', relation: '' },
      attendanceStreak: 0,
      totalCheckIns: 0,
      membership: {
        id: `MS-${randomUUID().slice(0, 8).toUpperCase()}`,
        tier: plan.id,
        status: 'pending',
        startDate,
        endDate,
        pricePerMonth: plan.monthlyPrice,
        paymentStatus: 'pending',
        autoRenew: false,
        perks: plan.perks,
        notes: 'Enrollment captured. Payment setup is required before activation or studio access.'
      },
      recentVisits: [],
      healthScreening: {
        flagged,
        physicianClearanceRequired: flagged
      },
      duplicateReview: {
        status: duplicateReviewRequired ? 'review_required' : 'unverified',
        candidateMemberIds: possibleDuplicates.map((candidate) => candidate.id)
      }
    };

    const userId = await createMemberAccount(normalizedEmail, password, memberId);
    try {
      await membersDb.insertAsync(member);
      await enrollmentsDb.insertAsync({
        id,
        memberId,
        studioId: process.env.STUDIO_ID || 'apex-main',
        channel,
        planId: plan.id,
        status: 'PENDING_PAYMENT',
        waiver: {
          version: WAIVER_VERSION,
          signedAt,
          signer,
          contentHash: waiverHash,
          signatureHash: waiverSignatureHash
        },
        healthScreening: { flagged, physicianClearanceRequired: flagged, completedAt: signedAt },
        identityReview: {
          status: duplicateReviewRequired ? 'REVIEW_REQUIRED' : 'UNVERIFIED',
          duplicateCandidateMemberIds: possibleDuplicates.map((candidate) => candidate.id)
        },
        contract: {
          signedAt,
          signer,
          snapshot: contractSnapshot,
          contentHash: contractHash,
          guardian: isMinor
            ? {
                signer: guardianName.trim(),
                signedAt,
                signatureHash: createHash('sha256').update(`${guardianName.trim()}\n${signedAt}\n${contractHash}`).digest('hex')
              }
            : null
        },
        payment: { status: 'NOT_CONFIGURED' },
        walletPass: { status: 'NOT_PROVISIONED' },
        createdAt: signedAt
      });
    } catch (error) {
      await membersDb.removeAsync({ id: memberId }, {});
      await enrollmentsDb.removeAsync({ id }, {});
      await usersDb.removeAsync({ id: userId }, {});
      throw error;
    }

    const csrfToken = req.authUser
      ? req.authSession!.csrfToken
      : await startSession(userId, res);
    return res.status(201).json({
      success: true,
      data: {
        enrollmentId: id,
        memberId,
        status: 'PENDING_PAYMENT',
        member,
        paymentStatus: 'NOT_CONFIGURED',
        walletPassStatus: 'NOT_PROVISIONED',
        identityReviewRequired: duplicateReviewRequired,
        csrfToken,
        user: {
          id: userId,
          email: normalizedEmail,
          role: 'member',
          memberId,
          studioId: process.env.STUDIO_ID || 'apex-main'
        }
      }
    });
  } catch (error) {
    console.error('Failed to save enrollment', error);
    return res.status(500).json({ success: false, error: 'Enrollment could not be saved' });
  }
});

export default router;
