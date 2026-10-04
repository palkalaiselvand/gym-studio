import type { Member, StudioDetails } from '../types';
import { storageService } from './storageService';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

export const apiService = {
  baseUrl: API_BASE_URL,
  isApiOnline: false,

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        this.isApiOnline = true;
        return true;
      }
    } catch {
      this.isApiOnline = false;
    }
    return false;
  },

  async getMembers(filters?: {
    search?: string;
    tier?: string;
    status?: string;
    payment?: string;
  }): Promise<Member[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.tier && filters.tier !== 'ALL') params.append('tier', filters.tier);
      if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
      if (filters?.payment && filters.payment !== 'ALL') params.append('payment', filters.payment);

      const res = await fetch(`${API_BASE_URL}/members?${params.toString()}`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const json = await res.json();
        this.isApiOnline = true;
        // Backup to local storage
        if (json.data) {
          storageService.saveMembers(json.data);
          return json.data;
        }
      }
    } catch (err) {
      console.warn('API unreachable, falling back to local storage', err);
      this.isApiOnline = false;
    }

    return storageService.getMembers();
  },

  async getMember(id: string): Promise<Member | undefined> {
    try {
      const res = await fetch(`${API_BASE_URL}/members/${id}`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch {
      // Fallback
    }
    return storageService.getMember(id);
  },

  async addMember(memberData: Partial<Member>): Promise<Member> {
    try {
      const res = await fetch(`${API_BASE_URL}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const json = await res.json();
        this.isApiOnline = true;
        const members = await this.getMembers();
        storageService.saveMembers(members);
        return json.data;
      }
    } catch (err) {
      console.warn('API add failed, fallback to local storage', err);
      this.isApiOnline = false;
    }

    return storageService.addMember(memberData as any);
  },

  async updateMember(id: string, updates: Partial<Member>): Promise<Member> {
    try {
      const res = await fetch(`${API_BASE_URL}/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const json = await res.json();
        this.isApiOnline = true;
        const members = await this.getMembers();
        storageService.saveMembers(members);
        return json.data;
      }
    } catch (err) {
      console.warn('API update failed, fallback to local storage', err);
      this.isApiOnline = false;
    }

    return storageService.updateMember(id, updates);
  },

  async deleteMember(id: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE_URL}/members/${id}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        this.isApiOnline = true;
        storageService.deleteMember(id);
        return;
      }
    } catch (err) {
      console.warn('API delete failed, fallback to local storage', err);
      this.isApiOnline = false;
    }

    storageService.deleteMember(id);
  },

  async quickRenew(id: string, months = 1): Promise<Member> {
    try {
      const res = await fetch(`${API_BASE_URL}/members/${id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months }),
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const json = await res.json();
        this.isApiOnline = true;
        const members = await this.getMembers();
        storageService.saveMembers(members);
        return json.data;
      }
    } catch {
      this.isApiOnline = false;
    }

    const member = storageService.getMember(id);
    if (!member) throw new Error('Member not found');

    const currentEnd = new Date(member.membership.endDate);
    const newEnd = new Date(currentEnd);
    newEnd.setMonth(newEnd.getMonth() + months);

    return storageService.updateMember(id, {
      membership: {
        ...member.membership,
        endDate: newEnd.toISOString().split('T')[0],
        status: 'active',
        paymentStatus: 'paid'
      }
    });
  },

  async checkIn(id: string, activity?: string): Promise<Member> {
    try {
      const res = await fetch(`${API_BASE_URL}/members/${id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity }),
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const json = await res.json();
        this.isApiOnline = true;
        const members = await this.getMembers();
        storageService.saveMembers(members);
        return json.data;
      }
    } catch {
      this.isApiOnline = false;
    }

    const member = storageService.getMember(id);
    if (!member) throw new Error('Member not found');

    const today = new Date().toISOString().split('T')[0];
    const newVisit = {
      id: `v-${Date.now()}`,
      date: today,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activity: activity || 'Studio Turnstile Access Verified'
    };

    return storageService.updateMember(id, {
      attendanceStreak: (member.attendanceStreak || 0) + 1,
      totalCheckIns: (member.totalCheckIns || 0) + 1,
      recentVisits: [newVisit, ...(member.recentVisits || [])]
    });
  },

  async getStudioDetails(): Promise<StudioDetails> {
    try {
      const res = await fetch(`${API_BASE_URL}/studio`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const json = await res.json();
        this.isApiOnline = true;
        if (json.data) {
          storageService.saveStudioDetails(json.data);
          return json.data;
        }
      }
    } catch (err) {
      console.warn('API studio fetch failed, fallback to local storage', err);
      this.isApiOnline = false;
    }

    return storageService.getStudioDetails();
  },

  async bookClass(classId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/classes/${classId}/book`, {
        method: 'POST',
        signal: AbortSignal.timeout(3000)
      });
    } catch {
      // Offline fallback
    }
  },

  async cancelClass(classId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/classes/${classId}/cancel`, {
        method: 'POST',
        signal: AbortSignal.timeout(3000)
      });
    } catch {
      // Offline fallback
    }
  },

  async resetData(): Promise<{ members: Member[]; studio: StudioDetails }> {
    try {
      const res = await fetch(`${API_BASE_URL}/seed/reset`, {
        method: 'POST',
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        this.isApiOnline = true;
        const [members, studio] = await Promise.all([this.getMembers(), this.getStudioDetails()]);
        return { members, studio };
      }
    } catch {
      this.isApiOnline = false;
    }

    return storageService.resetToDefaults();
  }
};
