import { createPublicKey, verify } from 'node:crypto';
import { configDb, membersDb, studioDb } from './db.js';

export type LicenseSku = 'STARTER' | 'GROWTH' | 'ENTERPRISE';
export type LicenseState = 'active' | 'trial' | 'grace-period' | 'expired' | 'unlicensed';
export type LicenseFeature =
  | 'member-directory'
  | 'class-booking'
  | 'facility-ops'
  | 'brand-customization'
  | 'network-roaming'
  | 'advanced-admin'
  | 'support-portal';

export interface LicenseConfig {
  licenseId: string;
  sku: LicenseSku;
  status: LicenseState;
  issuedAt: string;
  expiresAt: string | null;
  gracePeriodDays: number;
  maxStudios: number;
  maxMembers: number;
  customerName: string;
  features: string[];
  customDomain: string | null;
  emailFrom: string | null;
}

export type LicensePayload = Omit<LicenseConfig, 'status'> & { expiresAt: string };

export interface SignedLicenseFile {
  payload: LicensePayload;
  signature: string;
}

export const DEFAULT_LICENSE: LicenseConfig = {
  licenseId: 'local-demo-license',
  sku: 'STARTER',
  status: 'active',
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  gracePeriodDays: 7,
  maxStudios: 1,
  maxMembers: 500,
  customerName: 'Demo Studio',
  features: [
    'member-directory',
    'class-booking',
    'brand-customization'
  ],
  customDomain: null,
  emailFrom: null
};

const SKU_FEATURES: Record<LicenseSku, LicenseFeature[]> = {
  STARTER: ['member-directory', 'class-booking', 'brand-customization'],
  GROWTH: ['member-directory', 'class-booking', 'facility-ops', 'brand-customization', 'network-roaming'],
  ENTERPRISE: ['member-directory', 'class-booking', 'facility-ops', 'brand-customization', 'network-roaming', 'advanced-admin', 'support-portal']
};

const LICENSE_FEATURES = new Set<LicenseFeature>(Object.values(SKU_FEATURES).flat());

const SKU_LIMITS: Record<LicenseSku, { maxStudios: number; maxMembers: number }> = {
  STARTER: { maxStudios: 1, maxMembers: 500 },
  GROWTH: { maxStudios: 3, maxMembers: 5000 },
  ENTERPRISE: { maxStudios: 25, maxMembers: 25000 }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

let capacityLock: Promise<void> = Promise.resolve();
let reservedMemberSlots = 0;
let reservedStudioSlots = 0;

async function withCapacityLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = capacityLock;
  let release!: () => void;
  capacityLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

async function reserveCapacity(
  resource: 'member' | 'studio'
): Promise<(() => void) | null> {
  return withCapacityLock(async () => {
    const license = await getLicense();
    const [members, studios] = await Promise.all([
      resource === 'member' ? membersDb.countAsync({}) : Promise.resolve(0),
      resource === 'studio' ? studioDb.countAsync({}) : Promise.resolve(0)
    ]);
    const reserved = resource === 'member' ? reservedMemberSlots : reservedStudioSlots;
    const limit = resource === 'member' ? license.maxMembers : license.maxStudios;
    if ((resource === 'member' ? members : studios) + reserved >= limit) return null;

    if (resource === 'member') reservedMemberSlots += 1;
    else reservedStudioSlots += 1;

    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (resource === 'member') reservedMemberSlots -= 1;
      else reservedStudioSlots -= 1;
    };
  });
}

export function reserveMemberCapacity(): Promise<(() => void) | null> {
  return reserveCapacity('member');
}

export function reserveStudioCapacity(): Promise<(() => void) | null> {
  return reserveCapacity('studio');
}

export function canonicalLicensePayload(payload: LicensePayload): string {
  return JSON.stringify({
    licenseId: payload.licenseId,
    customerName: payload.customerName,
    sku: payload.sku,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    gracePeriodDays: payload.gracePeriodDays,
    maxStudios: payload.maxStudios,
    maxMembers: payload.maxMembers,
    features: payload.features,
    customDomain: payload.customDomain,
    emailFrom: payload.emailFrom
  });
}

export function validateLicensePayload(input: unknown): LicensePayload {
  if (!isRecord(input)) throw new Error('License payload must be a JSON object.');

  const licenseId = input.licenseId;
  const customerName = input.customerName;
  const sku = input.sku;
  const issuedAt = input.issuedAt;
  const expiresAt = input.expiresAt;
  const gracePeriodDays = input.gracePeriodDays;
  const maxStudios = input.maxStudios;
  const maxMembers = input.maxMembers;
  const features = input.features;
  const customDomain = input.customDomain;
  const emailFrom = input.emailFrom;

  if (typeof licenseId !== 'string' || !/^[\w-]{8,80}$/.test(licenseId)) {
    throw new Error('License ID must contain 8-80 letters, numbers, underscores, or hyphens.');
  }
  if (typeof customerName !== 'string' || customerName.trim().length < 2 || customerName.trim().length > 80) {
    throw new Error('Customer name must be 2-80 characters.');
  }
  if (sku !== 'STARTER' && sku !== 'GROWTH' && sku !== 'ENTERPRISE') {
    throw new Error('License SKU must be STARTER, GROWTH, or ENTERPRISE.');
  }
  if (typeof issuedAt !== 'string' || !toDate(issuedAt)) {
    throw new Error('License issue date must be a valid ISO date.');
  }
  if (typeof expiresAt !== 'string' || !toDate(expiresAt)) {
    throw new Error('License expiration must be a valid ISO date.');
  }
  if (Date.parse(issuedAt) > Date.now() + 5 * 60_000) {
    throw new Error('License issue date cannot be in the future.');
  }
  if (!Number.isInteger(gracePeriodDays) || Number(gracePeriodDays) < 0 || Number(gracePeriodDays) > 30) {
    throw new Error('Grace period days must be an integer between 0 and 30.');
  }
  if (!Number.isInteger(maxStudios) || Number(maxStudios) < 1 ||
    !Number.isInteger(maxMembers) || Number(maxMembers) < 1) {
    throw new Error('License capacity values must be positive integers.');
  }
  if (!Array.isArray(features) || features.length === 0 ||
    features.some((feature) => typeof feature !== 'string' || !LICENSE_FEATURES.has(feature as LicenseFeature)) ||
    new Set(features).size !== features.length) {
    throw new Error('Features must be a non-empty list of unique supported feature names.');
  }
  if (features.some((feature) => !SKU_FEATURES[sku].includes(feature as LicenseFeature))) {
    throw new Error(`The ${sku} SKU cannot include features outside its entitlement tier.`);
  }
  if (customDomain !== null && (typeof customDomain !== 'string' || customDomain.length > 253)) {
    throw new Error('Custom domain must be a valid domain name or null.');
  }
  if (emailFrom !== null && (typeof emailFrom !== 'string' || emailFrom.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFrom))) {
    throw new Error('Email sender must be a valid email address or null.');
  }

  return {
    licenseId,
    customerName: customerName.trim(),
    sku,
    issuedAt: new Date(issuedAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    gracePeriodDays: Number(gracePeriodDays),
    maxStudios: Number(maxStudios),
    maxMembers: Number(maxMembers),
    features: [...features] as string[],
    customDomain: typeof customDomain === 'string' ? customDomain.trim().toLowerCase() : null,
    emailFrom: typeof emailFrom === 'string' ? emailFrom.trim().toLowerCase() : null
  };
}

export function verifySignedLicense(input: unknown): { file: SignedLicenseFile; license: LicenseConfig } {
  if (!isRecord(input) || typeof input.signature !== 'string') {
    throw new Error('Signed license must include a payload and signature.');
  }

  const payload = validateLicensePayload(input.payload);
  const signatureText = input.signature;
  if (!/^[A-Za-z0-9_-]+$/.test(signatureText)) {
    throw new Error('License signature must be base64url encoded.');
  }
  const signature = Buffer.from(signatureText, 'base64url');
  if (signature.toString('base64url') !== signatureText) {
    throw new Error('License signature encoding is invalid.');
  }

  const publicKeyText = process.env.LICENSE_PUBLIC_KEY?.replace(/\\n/g, '\n');
  if (!publicKeyText) throw new Error('Offline license verification is not configured.');

  let publicKey;
  try {
    publicKey = createPublicKey(publicKeyText);
  } catch (error) {
    throw new Error('Configured license verification key is invalid.', { cause: error });
  }
  if (publicKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('License verification key must be an Ed25519 public key.');
  }
  if (!verify(null, Buffer.from(canonicalLicensePayload(payload)), publicKey, signature)) {
    throw new Error('License signature verification failed.');
  }

  return {
    file: { payload, signature: signatureText },
    license: evaluateLicense(payload)
  };
}

export function evaluateLicense(input: Partial<LicenseConfig> | null | undefined): LicenseConfig {
  const baseline = { ...DEFAULT_LICENSE, ...(input || {}) };
  const sku = baseline.sku === 'STARTER' || baseline.sku === 'GROWTH' || baseline.sku === 'ENTERPRISE'
    ? baseline.sku
    : 'STARTER';
  const expiresAt = toDate(baseline.expiresAt);
  const issuedAt = toDate(baseline.issuedAt);
  const graceDays = Number.isFinite(baseline.gracePeriodDays)
    ? Math.max(0, Math.min(30, Number(baseline.gracePeriodDays)))
    : DEFAULT_LICENSE.gracePeriodDays;
  const requestedFeatures = Array.isArray(baseline.features) && baseline.features.length > 0
    ? baseline.features
    : SKU_FEATURES[sku];
  const features = requestedFeatures.filter((feature): feature is LicenseFeature =>
    LICENSE_FEATURES.has(feature as LicenseFeature) && SKU_FEATURES[sku].includes(feature as LicenseFeature)
  );
  const limits = SKU_LIMITS[sku];

  let status: LicenseState = 'active';
  if (baseline.status === 'unlicensed') {
    status = 'unlicensed';
  } else if (baseline.status === 'trial' && expiresAt && Date.now() <= expiresAt.getTime()) {
    status = 'trial';
  } else if (expiresAt) {
    const graceCutoff = expiresAt.getTime() + graceDays * 24 * 60 * 60 * 1000;
    if (Date.now() > graceCutoff) status = 'expired';
    else if (Date.now() > expiresAt.getTime()) status = 'grace-period';
  } else {
    status = 'unlicensed';
  }

  return {
    ...baseline,
    licenseId: typeof baseline.licenseId === 'string' ? baseline.licenseId : DEFAULT_LICENSE.licenseId,
    sku,
    status,
    expiresAt: expiresAt?.toISOString() ?? null,
    gracePeriodDays: graceDays,
    maxStudios: Number.isInteger(baseline.maxStudios) && baseline.maxStudios > 0 ? baseline.maxStudios : limits.maxStudios,
    maxMembers: Number.isInteger(baseline.maxMembers) && baseline.maxMembers > 0 ? baseline.maxMembers : limits.maxMembers,
    customerName: typeof baseline.customerName === 'string' && baseline.customerName.trim()
      ? baseline.customerName.trim()
      : DEFAULT_LICENSE.customerName,
    features,
    customDomain: typeof baseline.customDomain === 'string' && baseline.customDomain.trim()
      ? baseline.customDomain.trim().toLowerCase()
      : null,
    emailFrom: typeof baseline.emailFrom === 'string' && baseline.emailFrom.trim()
      ? baseline.emailFrom.trim().toLowerCase()
      : DEFAULT_LICENSE.emailFrom,
    issuedAt: issuedAt?.toISOString() || DEFAULT_LICENSE.issuedAt
  };
}

function unlicensedConfig(): LicenseConfig {
  return evaluateLicense({
    ...DEFAULT_LICENSE,
    licenseId: '',
    status: 'unlicensed',
    expiresAt: null
  });
}

export async function getLicense(): Promise<LicenseConfig> {
  if (process.env.LICENSE_PUBLIC_KEY) {
    const doc = await configDb.findOneAsync({ key: 'signed-license' });
    if (!doc) return unlicensedConfig();
    return verifySignedLicense(doc.value).license;
  }

  if (process.env.NODE_ENV === 'production') return unlicensedConfig();
  const doc = await configDb.findOneAsync({ key: 'license' });
  return evaluateLicense(doc?.value ?? DEFAULT_LICENSE);
}

export function validateLegacyLicense(input: unknown): { value?: LicenseConfig; error?: string } {
  if (!isRecord(input)) return { error: 'License settings are required.' };
  if (input.sku !== 'STARTER' && input.sku !== 'GROWTH' && input.sku !== 'ENTERPRISE') {
    return { error: 'License SKU must be STARTER, GROWTH, or ENTERPRISE.' };
  }
  if (typeof input.customerName !== 'string' || input.customerName.trim().length < 2 || input.customerName.trim().length > 80) {
    return { error: 'Customer name must be 2-80 characters.' };
  }
  if (!['active', 'trial', 'grace-period', 'expired'].includes(String(input.status))) {
    return { error: 'License status must be active, trial, grace-period, or expired.' };
  }
  const expiresAt = typeof input.expiresAt === 'string' ? input.expiresAt : null;
  if (expiresAt && !toDate(expiresAt)) return { error: 'License expiration must be a valid ISO date.' };
  const gracePeriodDays = Number(input.gracePeriodDays ?? DEFAULT_LICENSE.gracePeriodDays);
  if (!Number.isInteger(gracePeriodDays) || gracePeriodDays < 0 || gracePeriodDays > 30) {
    return { error: 'Grace period days must be an integer between 0 and 30.' };
  }
  const sku = input.sku as LicenseSku;
  const maxStudios = Number(input.maxStudios ?? SKU_LIMITS[sku].maxStudios);
  const maxMembers = Number(input.maxMembers ?? SKU_LIMITS[sku].maxMembers);
  if (!Number.isInteger(maxStudios) || maxStudios < 1 || !Number.isInteger(maxMembers) || maxMembers < 1) {
    return { error: 'License capacity values must be positive integers.' };
  }
  if (!Array.isArray(input.features) || input.features.length === 0 ||
    input.features.some((feature) => typeof feature !== 'string' || !feature.trim())) {
    return { error: 'Features must be a non-empty list of strings.' };
  }

  return {
    value: evaluateLicense({
      ...DEFAULT_LICENSE,
      ...input,
      licenseId: typeof input.licenseId === 'string' ? input.licenseId : DEFAULT_LICENSE.licenseId,
      sku,
      issuedAt: typeof input.issuedAt === 'string' ? input.issuedAt : new Date().toISOString(),
      expiresAt,
      gracePeriodDays,
      maxStudios,
      maxMembers,
      customerName: input.customerName.trim(),
      features: input.features as string[],
      customDomain: typeof input.customDomain === 'string' && input.customDomain.trim() ? input.customDomain.trim() : null,
      emailFrom: typeof input.emailFrom === 'string' && input.emailFrom.trim() ? input.emailFrom.trim() : null
    })
  };
}
