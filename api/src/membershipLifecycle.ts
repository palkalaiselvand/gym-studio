import { membersDb } from './db.js';
import { reconcileMemberLifecycle } from './membership.js';
import type { Member } from './types.js';

export async function processMembershipLifecycle(): Promise<void> {
  const members: Member[] = await membersDb.findAsync({});
  for (const member of members) {
    const updated = reconcileMemberLifecycle(member);
    if (updated !== member) {
      await membersDb.updateAsync({ id: member.id }, updated, {});
    }
  }
}
