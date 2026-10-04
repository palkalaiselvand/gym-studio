import { configDb } from './db.js';

export interface Branding {
  name: string;
  tagline: string;
  logo: string | null;
  primaryColor: string;
  countryCode: string;
  currency: string;
  locale: string;
}

export const COUNTRIES: Array<{ code: string; name: string; currency: string; locale: string }> = [
  { code: 'US', name: 'United States', currency: 'USD', locale: 'en-US' },
  { code: 'CA', name: 'Canada', currency: 'CAD', locale: 'en-CA' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', locale: 'es-MX' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', locale: 'pt-BR' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', locale: 'en-GB' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', locale: 'en-IE' },
  { code: 'DE', name: 'Germany', currency: 'EUR', locale: 'de-DE' },
  { code: 'FR', name: 'France', currency: 'EUR', locale: 'fr-FR' },
  { code: 'ES', name: 'Spain', currency: 'EUR', locale: 'es-ES' },
  { code: 'IT', name: 'Italy', currency: 'EUR', locale: 'it-IT' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', locale: 'nl-NL' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', locale: 'pt-PT' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', locale: 'de-CH' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', locale: 'sv-SE' },
  { code: 'NO', name: 'Norway', currency: 'NOK', locale: 'nb-NO' },
  { code: 'DK', name: 'Denmark', currency: 'DKK', locale: 'da-DK' },
  { code: 'PL', name: 'Poland', currency: 'PLN', locale: 'pl-PL' },
  { code: 'TR', name: 'Turkey', currency: 'TRY', locale: 'tr-TR' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', locale: 'en-AE' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', locale: 'ar-SA' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', locale: 'en-ZA' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', locale: 'en-NG' },
  { code: 'KE', name: 'Kenya', currency: 'KES', locale: 'en-KE' },
  { code: 'IN', name: 'India', currency: 'INR', locale: 'en-IN' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', locale: 'en-PK' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', locale: 'en-BD' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', locale: 'en-LK' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', locale: 'en-SG' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', locale: 'en-MY' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', locale: 'id-ID' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', locale: 'en-PH' },
  { code: 'TH', name: 'Thailand', currency: 'THB', locale: 'th-TH' },
  { code: 'VN', name: 'Vietnam', currency: 'VND', locale: 'vi-VN' },
  { code: 'JP', name: 'Japan', currency: 'JPY', locale: 'ja-JP' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', locale: 'ko-KR' },
  { code: 'CN', name: 'China', currency: 'CNY', locale: 'zh-CN' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD', locale: 'en-HK' },
  { code: 'AU', name: 'Australia', currency: 'AUD', locale: 'en-AU' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', locale: 'en-NZ' }
];

export const DEFAULT_BRANDING: Branding = {
  name: 'Apex Studio',
  tagline: 'Gym & Athletic Club',
  logo: null,
  primaryColor: '#10b981',
  countryCode: 'US',
  currency: 'USD',
  locale: 'en-US'
};

const MAX_LOGO_LENGTH = 180_000;
const LOGO_DATA_URL = /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function getBranding(): Promise<Branding> {
  const doc = await configDb.findOneAsync({ key: 'branding' });
  return { ...DEFAULT_BRANDING, ...(doc?.value || {}) };
}

export function formatMoney(amount: number, branding: Branding): string {
  try {
    return new Intl.NumberFormat(branding.locale, { style: 'currency', currency: branding.currency }).format(amount);
  } catch {
    return `${branding.currency} ${amount}`;
  }
}

export function validateBranding(input: any): { value?: Branding; error?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Branding settings are required' };

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length < 2 || name.length > 60) return { error: 'Studio name must be 2-60 characters' };

  const tagline = typeof input.tagline === 'string' ? input.tagline.trim() : '';
  if (tagline.length > 80) return { error: 'Tagline must be 80 characters or fewer' };

  const primaryColor = typeof input.primaryColor === 'string' ? input.primaryColor.trim() : '';
  if (!HEX_COLOR.test(primaryColor)) return { error: 'Primary color must be a hex value like #10b981' };

  const country = COUNTRIES.find((entry) => entry.code === input.countryCode);
  if (!country) return { error: 'Unsupported country code' };

  let logo: string | null = null;
  if (input.logo !== null && input.logo !== undefined && input.logo !== '') {
    if (typeof input.logo !== 'string') return { error: 'Logo must be an image' };
    if (input.logo.length > MAX_LOGO_LENGTH) return { error: 'Logo is too large (max about 130 KB)' };
    if (!LOGO_DATA_URL.test(input.logo)) return { error: 'Logo must be a PNG, JPEG, WebP or SVG image' };
    logo = input.logo;
  }

  return {
    value: {
      name,
      tagline,
      logo,
      primaryColor: primaryColor.toLowerCase(),
      countryCode: country.code,
      currency: country.currency,
      locale: country.locale
    }
  };
}
