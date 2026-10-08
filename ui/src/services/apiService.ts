import type {
  EnrollmentPlan,
  EnrollmentResult,
  EnrollmentSubmission,
  EnrollmentWaiver,
  AuthenticatedUser,
  Branding,
  Member,
  StaffAccount,
  StudioDetails
} from '../types';
import { storageService } from './storageService';
import { TIER_CONFIG } from '../data/mockData';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

const enrollmentPlanFallback: EnrollmentPlan[] = Object.values(TIER_CONFIG).map((plan) => ({
  id: plan.name as EnrollmentPlan['id'],
  name: plan.name,
  monthlyPrice: plan.monthlyPrice,
  description: plan.description,
  perks: plan.perks
}));

const enrollmentWaiverFallback: EnrollmentWaiver = {
  version: 'demo-v1',
  text: 'I understand that exercise involves physical exertion and inherent risks. I will use equipment responsibly, follow studio safety instructions, and stop exercising if I experience concerning symptoms. I understand this sample waiver has not been reviewed by legal counsel and is not a substitute for a jurisdiction-specific agreement.',
  legalReviewRequired: true
};

let csrfToken: string | null = null;

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes((init.method || 'GET').toUpperCase())) {
    headers.set('X-CSRF-Token', csrfToken);
  }
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include'
  });
}

async function readResponse<T>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok || json.success === false) {
    throw new Error(json.error || `Request failed (${response.status})`);
  }
  return json.data as T;
}

export const apiService = {
  baseUrl: API_BASE_URL,
  isApiOnline: false,

  setCsrfToken(token: string | null): void {
    csrfToken = token;
  },

  async getBranding(): Promise<Branding | null> {
    try {
      const response = await apiFetch('/branding', { signal: AbortSignal.timeout(3000) });
      return await readResponse<Branding>(response);
    } catch {
      return null;
    }
  },

  async updateBranding(branding: Branding): Promise<Branding> {
    const response = await apiFetch('/branding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branding)
    });
    return readResponse<Branding>(response);
  },

  async getCurrentUser(): Promise<{ user: AuthenticatedUser; csrfToken: string } | null> {
    const response = await apiFetch('/auth/me');
    if (response.status === 401) return null;
    const data = await readResponse<{ user: AuthenticatedUser; csrfToken: string }>(response);
    csrfToken = data.csrfToken;
    this.isApiOnline = true;
    return data;
  },

  async login(email: string, password: string): Promise<{ user: AuthenticatedUser; csrfToken: string }> {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await readResponse<{ user: AuthenticatedUser; csrfToken: string }>(response);
    csrfToken = data.csrfToken;
    this.isApiOnline = true;
    return data;
  },

  async logout(): Promise<void> {
    const response = await apiFetch('/auth/logout', { method: 'POST' });
    await readResponse<undefined>(response);
    csrfToken = null;
  },

  async getStaffAccounts(): Promise<StaffAccount[]> {
    const response = await apiFetch('/auth/users', { signal: AbortSignal.timeout(3000) });
    return readResponse<StaffAccount[]>(response);
  },

  async createStaffAccount(input: { email: string; password: string; role: StaffAccount['role'] }): Promise<StaffAccount> {
    const response = await apiFetch('/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(4000)
    });
    return readResponse<StaffAccount>(response);
  },

  async updateStaffAccount(id: string, updates: { active?: boolean; role?: StaffAccount['role']; password?: string }): Promise<StaffAccount> {
    const response = await apiFetch(`/auth/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
      signal: AbortSignal.timeout(4000)
    });
    return readResponse<StaffAccount>(response);
  },

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
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.tier && filters.tier !== 'ALL') params.append('tier', filters.tier);
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters?.payment && filters.payment !== 'ALL') params.append('payment', filters.payment);
    const response = await apiFetch(`/members?${params.toString()}`, { signal: AbortSignal.timeout(3000) });
    const members = await readResponse<Member[]>(response);
    this.isApiOnline = true;
    return members;
  },

  async getMember(id: string): Promise<Member | undefined> {
    const response = await apiFetch(`/members/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(3000) });
    const json = await readResponse<Member>(response);
    this.isApiOnline = true;
    return json;
  },

  async updateMember(id: string, updates: Partial<Member>): Promise<Member> {
    const response = await apiFetch(`/members/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
      signal: AbortSignal.timeout(4000)
    });
    const member = await readResponse<Member>(response);
    this.isApiOnline = true;
    return member;
  },

  async deleteMember(id: string): Promise<void> {
    const response = await apiFetch(`/members/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(4000)
    });
    await readResponse<undefined>(response);
    this.isApiOnline = true;
  },

  async quickRenew(id: string, months = 1): Promise<Member> {
    const response = await apiFetch(`/members/${encodeURIComponent(id)}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ months, offlinePaymentConfirmed: true }),
      signal: AbortSignal.timeout(4000)
    });
    const member = await readResponse<Member>(response);
    this.isApiOnline = true;
    return member;
  },

  async freezeMembership(id: string, input: { startDate?: string; endDate: string; reason?: string }): Promise<Member> {
    const response = await apiFetch(`/members/${encodeURIComponent(id)}/freeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(4000)
    });
    const member = await readResponse<Member>(response);
    this.isApiOnline = true;
    return member;
  },

  async resumeMembership(id: string): Promise<Member> {
    const response = await apiFetch(`/members/${encodeURIComponent(id)}/resume`, {
      method: 'POST',
      signal: AbortSignal.timeout(4000)
    });
    const member = await readResponse<Member>(response);
    this.isApiOnline = true;
    return member;
  },

  async upgradeMembership(id: string, tier: Member['membership']['tier']): Promise<Member> {
    const response = await apiFetch(`/members/${encodeURIComponent(id)}/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
      signal: AbortSignal.timeout(4000)
    });
    const member = await readResponse<Member>(response);
    this.isApiOnline = true;
    return member;
  },

  async downgradeMembership(id: string, tier: Member['membership']['tier']): Promise<Member> {
    const response = await apiFetch(`/members/${encodeURIComponent(id)}/downgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
      signal: AbortSignal.timeout(4000)
    });
    const member = await readResponse<Member>(response);
    this.isApiOnline = true;
    return member;
  },

  async cancelMembership(id: string, input?: { effectiveDate?: string; reason?: string }): Promise<Member> {
    const response = await apiFetch(`/members/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input || {}),
      signal: AbortSignal.timeout(4000)
    });
    const member = await readResponse<Member>(response);
    this.isApiOnline = true;
    return member;
  },

  async activateMember(id: string): Promise<Member> {
    const response = await apiFetch(`/members/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offlinePaymentConfirmed: true }),
      signal: AbortSignal.timeout(4000)
    });
    return readResponse<Member>(response);
  },

  async checkIn(id: string, activity?: string): Promise<Member> {
    const response = await apiFetch(`/members/${encodeURIComponent(id)}/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity }),
      signal: AbortSignal.timeout(4000)
    });
    const member = await readResponse<Member>(response);
    this.isApiOnline = true;
    return member;
  },

  async getAccessPass(): Promise<{ token: string; expiresAt: string }> {
    const response = await apiFetch('/access/pass', { signal: AbortSignal.timeout(3000) });
    return readResponse<{ token: string; expiresAt: string }>(response);
  },

  async verifyAccessPass(token: string): Promise<{ accessGranted: boolean; memberId: string; memberName: string }> {
    const response = await apiFetch('/access/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(4000)
    });
    return readResponse<{ accessGranted: boolean; memberId: string; memberName: string }>(response);
  },

  async getStudioDetails(): Promise<StudioDetails> {
    try {
      const res = await apiFetch('/studio', { signal: AbortSignal.timeout(3000) });
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

  async getEnrollmentPlans(): Promise<EnrollmentPlan[]> {
    try {
      const res = await apiFetch('/enrollments/plans', { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`Plan catalog request failed (${res.status})`);
      const json = await res.json();
      if (!Array.isArray(json.data)) throw new Error('Plan catalog response is invalid');
      this.isApiOnline = true;
      return json.data;
    } catch (error) {
      console.warn('Using the local plan catalog because the API is unavailable', error);
      return enrollmentPlanFallback;
    }
  },

  async getEnrollmentWaiver(): Promise<EnrollmentWaiver> {
    try {
      const res = await apiFetch('/enrollments/waiver', { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`Waiver request failed (${res.status})`);
      const json = await res.json();
      if (typeof json.data?.text !== 'string' || typeof json.data?.version !== 'string') {
        throw new Error('Waiver response is invalid');
      }
      return json.data;
    } catch (error) {
      console.warn('Using the local sample waiver because the API is unavailable', error);
      return enrollmentWaiverFallback;
    }
  },

  async submitEnrollment(submission: EnrollmentSubmission): Promise<EnrollmentResult> {
    const res = await apiFetch('/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
      signal: AbortSignal.timeout(8000)
    });
    const result = await readResponse<EnrollmentResult>(res);
    csrfToken = result.csrfToken;
    this.isApiOnline = true;
    return result;
  },

  async bookClass(classId: string): Promise<void> {
    const response = await apiFetch(`/classes/${encodeURIComponent(classId)}/book`, {
      method: 'POST',
      signal: AbortSignal.timeout(3000)
    });
    await readResponse<unknown>(response);
  },

  async cancelClass(classId: string): Promise<void> {
    const response = await apiFetch(`/classes/${encodeURIComponent(classId)}/cancel`, {
      method: 'POST',
      signal: AbortSignal.timeout(3000)
    });
    await readResponse<unknown>(response);
  },

  async getClassBookings(): Promise<string[]> {
    const response = await apiFetch('/classes/bookings/me', { signal: AbortSignal.timeout(3000) });
    return readResponse<string[]>(response);
  },

  async reviewMemberDuplicate(id: string, status: 'reviewed' | 'review_required'): Promise<Member> {
    const response = await apiFetch(`/members/${encodeURIComponent(id)}/duplicate-review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
      signal: AbortSignal.timeout(4000)
    });
    return readResponse<Member>(response);
  },

  async resetData(): Promise<{ members: Member[]; studio: StudioDetails }> {
    const response = await apiFetch('/seed/reset', {
      method: 'POST',
      signal: AbortSignal.timeout(4000)
    });
    await readResponse<unknown>(response);
    this.isApiOnline = true;
    const [members, studio] = await Promise.all([this.getMembers(), this.getStudioDetails()]);
    return { members, studio };
  }
};
