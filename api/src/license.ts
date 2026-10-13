import { configDb } from './db.js';

export type LicenseSku = 'STARTER' | 'GROWTH' | 'ENTERPRISE';
export type LicenseState = 'active' | 'trial' | 'grace-period' | 'expired';

export interface LicenseConfig {
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

export const DEFAULT_LICENSE: LicenseConfig = {
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
    'facility-ops',
    'brand-customization'
  ],
  customDomain: null,
  emailFrom: 'hello@apexstudio.fit'
};

const SKU_FEATURES: Record<LicenseSku, string[]> = {
  STARTER: ['member-directory', 'class-booking', 'brand-customization'],
  GROWTH: ['member-directory', 'class-booking', 'facility-ops', 'brand-customization', 'network-roaming'],
  ENTERPRISE: ['member-directory', 'class-booking', 'facility-ops', 'brand-customization', 'network-roaming', 'advanced-admin', 'support-portal']
};

const SKU_LIMITS: Record<LicenseSku, { maxStudios: number; maxMembers: number }> = {
  STARTER: { maxStudios: 1, maxMembers: 500 },
  GROWTH: { maxStudios: 3, maxMembers: 5000 },
  ENTERPRISE: { maxStudios: 25, maxMembers: 25000 }
};

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function evaluateLicense(input: Partial<LicenseConfig> | null | undefined): LicenseConfig {
  const baseline = { ...DEFAULT_LICENSE, ...(input || {}) } as LicenseConfig;
  const sku = ['STARTER', 'GROWTH', 'ENTERPRISE'].includes(baseline.sku) ? baseline.sku : 'STARTER';
  const expiresAt = toDate(baseline.expiresAt);
  const statusFromInput = baseline.status;
  const graceDays = Number.isFinite(baseline.gracePeriodDays) ? Math.max(0, Math.min(30, Number(baseline.gracePeriodDays))) : DEFAULT_LICENSE.gracePeriodDays;

  const features = Array.isArray(baseline.features) && baseline.features.length > 0 ? baseline.features : SKU_FEATURES[sku];
  const limits = SKU_LIMITS[sku];

  let status: LicenseState = 'active';
  if (statusFromInput === 'trial') {
    status = 'trial';
  } else if (expiresAt) {
    const now = new Date();
    const graceCutoff = new Date(expiresAt.getTime() + graceDays * 24 * 60 * 60 * 1000);
    if (now > graceCutoff) {
      status = 'expired';
    } else if (now > expiresAt) {
      status = 'grace-period';
    }
  }

  return {
    ...baseline,
    sku,
    status,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    gracePeriodDays: graceDays,
    maxStudios: Number.isFinite(baseline.maxStudios) ? Number(baseline.maxStudios) : limits.maxStudios,
    maxMembers: Number.isFinite(baseline.maxMembers) ? Number(baseline.maxMembers) : limits.maxMembers,
    customerName: typeof baseline.customerName === 'string' && baseline.customerName.trim() ? baseline.customerName.trim() : DEFAULT_LICENSE.customerName,
    features,
    customDomain: typeof baseline.customDomain === 'string' && baseline.customDomain.trim() ? baseline.customDomain.trim() : null,
    emailFrom: typeof baseline.emailFrom === 'string' && baseline.emailFrom.trim() ? baseline.emailFrom.trim() : DEFAULT_LICENSE.emailFrom,
    issuedAt: toDate(baseline.issuedAt)?.toISOString() || DEFAULT_LICENSE.issuedAt
  };
}

export async function getLicense(): Promise<LicenseConfig> {
  const doc = await configDb.findOneAsync({ key: 'license' });
  return evaluateLicense(doc?.value ?? DEFAULT_LICENSE);
}

export function validateLicense(input: any): { value?: LicenseConfig; error?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'License settings are required.' };

  const sku = input.sku;
  if (!['STARTER', 'GROWTH', 'ENTERPRISE'].includes(sku)) return { error: 'License SKU must be STARTER, GROWTH, or ENTERPRISE.' };

  const customerName = typeof input.customerName === 'string' ? input.customerName.trim() : '';
  if (!customerName || customerName.length < 2 || customerName.length > 80) return { error: 'Customer name must be 2-80 characters.' };

  const status = input.status;
  if (!['active', 'trial', 'grace-period', 'expired'].includes(status)) return { error: 'License status must be active, trial, grace-period, or expired.' };

  const expiresAt = typeof input.expiresAt === 'string' ? input.expiresAt : null;
  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) return { error: 'License expiration must be a valid ISO date.' };

  const gracePeriodDays = Number(input.gracePeriodDays ?? DEFAULT_LICENSE.gracePeriodDays);
  if (!Number.isInteger(gracePeriodDays) || gracePeriodDays < 0 || gracePeriodDays > 30) return { error: 'Grace period days must be an integer between 0 and 30.' };

  const maxStudios = Number(input.maxStudios ?? SKU_LIMITS[sku as LicenseSku].maxStudios);
  const maxMembers = Number(input.maxMembers ?? SKU_LIMITS[sku as LicenseSku].maxMembers);
  if (!Number.isInteger(maxStudios) || maxStudios < 1 || !Number.isInteger(maxMembers) || maxMembers < 1) return { error: 'License capacity values must be positive integers.' };

  if (!Array.isArray(input.features) || input.features.length === 0 || input.features.some((feature: any) => typeof feature !== 'string' || !feature.trim())) {
    return { error: 'Features must be a non-empty list of strings.' };
  }

  return {
    value: evaluateLicense({
      sku,
      status,
      issuedAt: typeof input.issuedAt === 'string' ? input.issuedAt : new Date().toISOString(),
      expiresAt,
      gracePeriodDays,
      maxStudios,
      maxMembers,
      customerName,
      features: input.features,
      customDomain: typeof input.customDomain === 'string' && input.customDomain.trim() ? input.customDomain.trim() : null,
      emailFrom: typeof input.emailFrom === 'string' && input.emailFrom.trim() ? input.emailFrom.trim() : null
    })
  };
}
