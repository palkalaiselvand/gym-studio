import type { Member, StudioDetails } from '../types';
import { INITIAL_MEMBERS, INITIAL_STUDIO_DETAILS } from '../data/mockData';

const MEMBERS_STORAGE_KEY = 'apex_gym_members_v1';
const STUDIO_STORAGE_KEY = 'apex_gym_studio_v1';

export const storageService = {
  getMembers(): Member[] {
    try {
      const data = localStorage.getItem(MEMBERS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Failed to parse members from localStorage', err);
    }
    // Initialize default if not present
    this.saveMembers(INITIAL_MEMBERS);
    return INITIAL_MEMBERS;
  },

  saveMembers(members: Member[]): void {
    try {
      localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
    } catch (err) {
      console.error('Failed to save members to localStorage', err);
    }
  },

  getMember(id: string): Member | undefined {
    const members = this.getMembers();
    return members.find((m) => m.id === id);
  },

  addMember(newMember: Omit<Member, 'id'> & { id?: string }): Member {
    const members = this.getMembers();
    const id = newMember.id || `MEM-${Math.floor(1000 + Math.random() * 9000)}`;
    const created: Member = {
      ...newMember,
      id,
      avatar:
        newMember.avatar ||
        `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?auto=format&fit=crop&w=200&q=80`,
      recentVisits: newMember.recentVisits || [
        {
          id: `v-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          time: '10:00 AM',
          activity: 'Welcome Orientation & Fitness Assessment'
        }
      ]
    };
    members.unshift(created);
    this.saveMembers(members);
    return created;
  },

  updateMember(id: string, updates: Partial<Member>): Member {
    const members = this.getMembers();
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new Error(`Member with id ${id} not found`);
    }

    const current = members[index];
    const updated: Member = {
      ...current,
      ...updates,
      emergencyContact: updates.emergencyContact
        ? { ...current.emergencyContact, ...updates.emergencyContact }
        : current.emergencyContact,
      membership: updates.membership
        ? { ...current.membership, ...updates.membership }
        : current.membership
    };

    members[index] = updated;
    this.saveMembers(members);
    return updated;
  },

  deleteMember(id: string): void {
    const members = this.getMembers();
    const filtered = members.filter((m) => m.id !== id);
    this.saveMembers(filtered);
  },

  getStudioDetails(): StudioDetails {
    try {
      const data = localStorage.getItem(STUDIO_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Failed to parse studio details', err);
    }
    this.saveStudioDetails(INITIAL_STUDIO_DETAILS);
    return INITIAL_STUDIO_DETAILS;
  },

  saveStudioDetails(details: StudioDetails): void {
    try {
      localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(details));
    } catch (err) {
      console.error('Failed to save studio details', err);
    }
  },

  resetToDefaults(): { members: Member[]; studio: StudioDetails } {
    localStorage.removeItem(MEMBERS_STORAGE_KEY);
    localStorage.removeItem(STUDIO_STORAGE_KEY);
    this.saveMembers(INITIAL_MEMBERS);
    this.saveStudioDetails(INITIAL_STUDIO_DETAILS);
    return {
      members: INITIAL_MEMBERS,
      studio: INITIAL_STUDIO_DETAILS
    };
  }
};
