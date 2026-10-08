export type UserRole = 'admin' | 'staff' | 'franchise-owner' | 'member';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  memberId: string | null;
  studioId: string;
}

export interface StaffAccount {
  id: string;
  email: string;
  role: 'staff' | 'franchise-owner';
  studioId: string;
  active: boolean;
  createdAt: string;
}

export type MembershipTier = 'Basic' | 'Silver' | 'Gold' | 'Platinum' | 'VIP';

export type MembershipStatus = 'active' | 'pending' | 'expired' | 'suspended' | 'cancelled' | 'frozen';

export type PaymentStatus = 'paid' | 'pending' | 'overdue';

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface VisitHistory {
  id: string;
  date: string;
  time: string;
  activity: string;
}

export interface MembershipInfo {
  id: string;
  tier: MembershipTier;
  status: MembershipStatus;
  startDate: string;
  endDate: string;
  pricePerMonth: number;
  paymentStatus: PaymentStatus;
  autoRenew: boolean;
  perks: string[];
  notes?: string;
  freeze?: {
    startDate: string;
    endDate: string;
    reason?: string;
  };
  pendingDowngradeTier?: MembershipTier | null;
  cancellation?: {
    requestedAt?: string;
    effectiveDate?: string;
    reason?: string;
    status?: 'requested' | 'completed';
  };
  lastOfflinePaymentConfirmation?: {
    confirmedAt: string;
    confirmedBy: string;
    renewalMonths?: number;
  };
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  joinDate: string;
  emergencyContact: EmergencyContact;
  attendanceStreak: number;
  totalCheckIns: number;
  membership: MembershipInfo;
  recentVisits: VisitHistory[];
  healthScreening?: {
    flagged: boolean;
    physicianClearanceRequired: boolean;
  };
  duplicateReview?: {
    status: 'unverified' | 'review_required' | 'reviewed';
    candidateMemberIds: string[];
    reviewedAt?: string;
    reviewedBy?: string;
  };
}

export interface Branding {
  name: string;
  tagline: string;
  logo: string | null;
  primaryColor: string;
  countryCode: string;
  currency: string;
  locale: string;
}

export interface EnrollmentPlan {
  id: MembershipTier;
  name: string;
  monthlyPrice: number;
  description: string;
  perks: string[];
}

export interface EnrollmentWaiver {
  version: string;
  text: string;
  legalReviewRequired: boolean;
}

export interface EnrollmentSubmission {
  name: string;
  email: string;
  phone: string;
  planId: MembershipTier;
  startDate: string;
  dateOfBirth: string;
  channel: 'WEB';
  parqResponses: {
    heartCondition: boolean;
    chestPain: boolean;
    medicalAdvice: boolean;
    boneOrJointCondition: boolean;
  };
  waiverAccepted: boolean;
  contractAccepted: boolean;
  signerName: string;
  password: string;
  guardianName?: string;
  guardianSignature?: string;
}

export interface EnrollmentResult {
  enrollmentId: string;
  memberId: string;
  status: 'PENDING_PAYMENT';
  member: Member;
  paymentStatus: 'NOT_CONFIGURED';
  walletPassStatus: 'NOT_PROVISIONED';
  identityReviewRequired: boolean;
  csrfToken: string;
  user: AuthenticatedUser;
}

export interface StudioAmenity {
  name: string;
  description: string;
  icon: string;
  highlight?: boolean;
}

export interface StudioClass {
  id: string;
  name: string;
  category: 'HIIT' | 'Yoga' | 'Spin' | 'Strength' | 'Pilates' | 'Boxing';
  trainer: string;
  time: string;
  days: string[];
  duration: string;
  capacity: number;
  spotsLeft: number;
  room: string;
  intensity: 'Low' | 'Medium' | 'High' | 'Extreme';
}

export interface Trainer {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  bio: string;
  avatar: string;
}

export interface StudioAnnouncement {
  id: string;
  title: string;
  date: string;
  content: string;
  tag: 'Facility' | 'Event' | 'Holiday' | 'New Class';
}

export interface StudioDetails {
  name: string;
  tagline: string;
  description: string;
  address: string;
  cityStateZip: string;
  phone: string;
  email: string;
  website: string;
  hours: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  amenities: StudioAmenity[];
  trainers: Trainer[];
  classes: StudioClass[];
  announcements: StudioAnnouncement[];
  rules: string[];
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}
