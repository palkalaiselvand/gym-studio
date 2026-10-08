import type { Member, MembershipTier } from './types.js';

const TIER_PRICE_MAP: Record<MembershipTier, number> = {
  Basic: 79,
  Silver: 129,
  Gold: 179,
  Platinum: 249,
  VIP: 329
};

export function hasStudioAccess(member: Member, today = new Date().toISOString().slice(0, 10)): boolean {
  return member.membership.status === 'active' &&
    member.membership.paymentStatus === 'paid' &&
    member.membership.startDate <= today &&
    member.membership.endDate >= today;
}

export function getMembershipTierPrice(tier: MembershipTier): number {
  return TIER_PRICE_MAP[tier] ?? 0;
}

export function calculateProratedCharge(currentTier: MembershipTier, targetTier: MembershipTier, remainingDays: number): number {
  const currentPrice = getMembershipTierPrice(currentTier);
  const targetPrice = getMembershipTierPrice(targetTier);
  const dailyRate = Math.max(targetPrice - currentPrice, 0) / 30;
  return Number((dailyRate * Math.max(remainingDays, 0)).toFixed(2));
}

export function addMembershipMonths(dateText: string, months: number): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}
