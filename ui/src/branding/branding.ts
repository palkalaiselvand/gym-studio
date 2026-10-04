import { createContext, useContext } from 'react';
import type { Branding } from '../types';

export const COUNTRIES = [
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

export function formatMoney(amount: number, branding: Branding): string {
  try {
    return new Intl.NumberFormat(branding.locale, {
      style: 'currency',
      currency: branding.currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2
    }).format(amount);
  } catch {
    return `${branding.currency} ${amount}`;
  }
}

export function applyBranding(branding: Branding): void {
  const root = document.documentElement;
  const hex = branding.primaryColor;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const darker = [r, g, b].map((c) => Math.round(c * 0.8).toString(16).padStart(2, '0')).join('');
  root.style.setProperty('--accent-primary', hex);
  root.style.setProperty('--accent-primary-hover', `#${darker}`);
  root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  document.title = `${branding.name} - Membership Management`;
  let favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (branding.logo) {
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = branding.logo;
  }
}

export interface BrandingContextValue {
  branding: Branding;
  setBranding: (branding: Branding) => void;
  money: (amount: number) => string;
}

export const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  setBranding: () => undefined,
  money: (amount) => formatMoney(amount, DEFAULT_BRANDING)
});

export const useBranding = (): BrandingContextValue => useContext(BrandingContext);
