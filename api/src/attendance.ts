import { randomUUID } from 'node:crypto';
import type { Member } from './types.js';

export function recordCheckIn(member: Member, activity: string): Member {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const lastVisitDate = (member.recentVisits || []).reduce(
    (latest, visit) => visit.date > latest ? visit.date : latest,
    ''
  );
  const streak = lastVisitDate === today
    ? member.attendanceStreak || 0
    : lastVisitDate === yesterday
      ? (member.attendanceStreak || 0) + 1
      : 1;

  return {
    ...member,
    attendanceStreak: streak,
    totalCheckIns: (member.totalCheckIns || 0) + 1,
    recentVisits: [{
      id: `v-${randomUUID()}`,
      date: today,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activity
    }, ...(member.recentVisits || [])]
  };
}
