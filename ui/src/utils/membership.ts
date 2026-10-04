import type { Member } from '../types';

export function hasStudioAccess(member: Member): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return member.membership.status === 'active' &&
    member.membership.paymentStatus === 'paid' &&
    member.membership.startDate <= today &&
    member.membership.endDate >= today;
}
