import type { Member } from '../types';

export function hasStudioAccess(member: Member): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return member.membership.status === 'active' &&
    member.membership.paymentStatus === 'paid' &&
    member.membership.startDate <= today &&
    member.membership.endDate >= today;
}

export function getMembershipTierPrice(tier: Member['membership']['tier']): number {
  const priceMap: Record<Member['membership']['tier'], number> = {
    Basic: 79,
    Silver: 129,
    Gold: 179,
    Platinum: 249,
    VIP: 329
  };
  return priceMap[tier] ?? 0;
}
