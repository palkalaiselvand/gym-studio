import type { Member } from './types.js';

export function hasStudioAccess(member: Member, today = new Date().toISOString().slice(0, 10)): boolean {
  return member.membership.status === 'active' &&
    member.membership.paymentStatus === 'paid' &&
    member.membership.startDate <= today &&
    member.membership.endDate >= today;
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
