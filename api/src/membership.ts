import type { Member, MembershipTier } from './types.js';

const TIER_PRICE_MAP: Record<MembershipTier, number> = {
  Basic: 49,
  Silver: 69,
  Gold: 89,
  Platinum: 129,
  VIP: 199
};

export function hasStudioAccess(member: Member, today = new Date().toISOString().slice(0, 10)): boolean {
  const reconciled = reconcileMemberLifecycle(member, today);
  return reconciled.membership.status === 'active' &&
    reconciled.membership.paymentStatus === 'paid' &&
    reconciled.membership.startDate <= today &&
    reconciled.membership.endDate >= today;
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addCalendarDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getMembershipTierRank(tier: MembershipTier): number {
  return Object.keys(TIER_PRICE_MAP).indexOf(tier);
}

export function getMembershipTierPrice(tier: MembershipTier): number {
  return TIER_PRICE_MAP[tier];
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

export function reconcileMemberLifecycle(member: Member, today = new Date().toISOString().slice(0, 10)): Member {
  const membership = { ...member.membership };
  let changed = false;
  const setStatus = (status: typeof membership.status) => {
    if (membership.status !== status) {
      membership.status = status;
      changed = true;
    }
  };

  if (!membership.pendingPlanChange && membership.pendingDowngradeTier) {
    membership.pendingPlanChange = {
      tier: membership.pendingDowngradeTier,
      effectiveDate: addCalendarDays(membership.endDate, 1),
      requestedAt: today
    };
    changed = true;
  }

  if (membership.pendingPlanChange && membership.pendingPlanChange.effectiveDate <= today) {
    membership.tier = membership.pendingPlanChange.tier;
    membership.pricePerMonth = getMembershipTierPrice(membership.pendingPlanChange.tier);
    membership.pendingPlanChange = undefined;
    membership.pendingDowngradeTier = null;
    changed = true;
  }

  if (membership.cancellation?.status === 'requested' &&
    membership.cancellation.effectiveDate &&
    membership.cancellation.effectiveDate < today) {
    membership.cancellation = { ...membership.cancellation, status: 'completed' };
    membership.freeze = undefined;
    membership.pendingPlanChange = undefined;
    membership.pendingDowngradeTier = null;
    membership.autoRenew = false;
    setStatus('cancelled');
    changed = true;
  } else if (membership.status !== 'cancelled') {
    if (membership.endDate < today) {
      if (membership.freeze) {
        membership.freezeHistory = [
          ...(membership.freezeHistory || []),
          {
            ...membership.freeze,
            endDate: membership.freeze.endDate < membership.endDate ? membership.freeze.endDate : membership.endDate
          }
        ];
        changed = true;
      }
      membership.freeze = undefined;
      setStatus('expired');
      if (membership.cancellation?.status === 'requested') {
        membership.cancellation = { ...membership.cancellation, status: 'completed' };
        changed = true;
      }
    } else if (membership.freeze) {
      if (membership.freeze.endDate <= today) {
        membership.freezeHistory = [...(membership.freezeHistory || []), membership.freeze];
        membership.freeze = undefined;
        setStatus('active');
        changed = true;
      } else if (membership.freeze.startDate <= today) {
        setStatus('frozen');
      } else {
        setStatus('active');
      }
    } else if (membership.status === 'frozen') {
      setStatus('active');
    }
  }

  return changed ? { ...member, membership } : member;
}
