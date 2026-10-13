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

export type MembershipFreezeReason = 'travel' | 'medical' | 'military' | 'other' | 'retention';

export type MembershipCancellationReason =
  | 'price'
  | 'relocation'
  | 'injury'
  | 'dissatisfaction'
  | 'competitor'
  | 'other';

export interface MembershipFreezeWindow {
  startDate: string;
  endDate: string;
  reason: MembershipFreezeReason;
  resumedAt?: string;
}

export interface MembershipPlanChange {
  tier: MembershipTier;
  effectiveDate: string;
  requestedAt: string;
}

export interface MembershipRetentionEvent {
  requestedAt: string;
  reason: MembershipCancellationReason;
  offer: 'pause' | 'downgrade' | 'declined';
  accepted: boolean;
}

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
  freeze?: MembershipFreezeWindow;
  freezeHistory?: MembershipFreezeWindow[];
  pendingPlanChange?: MembershipPlanChange;
  pendingDowngradeTier?: MembershipTier | null;
  cancellation?: {
    requestedAt?: string;
    effectiveDate?: string;
    reason?: MembershipCancellationReason | string;
    status?: 'requested' | 'completed';
  };
  retentionHistory?: MembershipRetentionEvent[];
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

export interface RecoverySuite {
  id: string;
  name: string;
  description: string;
  duration: string;
  capacity: number;
  tier: 'Silver' | 'Gold' | 'Platinum' | 'VIP';
  price: number;
  availability: string;
}

export interface PersonalTrainingPackage {
  id: string;
  name: string;
  sessions: number;
  price: number;
  description: string;
  expiresIn: string;
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

export interface ClassWaitlistEntry {
  id: string;
  classId: string;
  memberId: string;
  waitlistKey: string;
  status: 'waiting' | 'promoted' | 'cancelled';
  position: number;
  createdAt: string;
  promotedAt?: string;
  cancelledAt?: string;
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

export interface PartnerGym {
  id: string;
  name: string;
  city: string;
  distanceMiles: number;
  status: 'Active' | 'Pilot' | 'Testing';
  reciprocityRate: string;
  guestAccessPerMonth: number;
  accessHours: string;
}

export interface MerchantPerk {
  id: string;
  merchantName: string;
  category: 'Coffee' | 'Recovery' | 'Retail' | 'Nutrition';
  offer: string;
  benefit: string;
  pointsCost: number;
  validFor: string;
}

export interface LoyaltySummary {
  currentPoints: number;
  streakDays: number;
  activeChallenges: number;
  challengeTitle: string;
  referralCode: string;
  referralsThisMonth: number;
}

export type LicenseSku = 'STARTER' | 'GROWTH' | 'ENTERPRISE';
export type LicenseState = 'active' | 'trial' | 'grace-period' | 'expired';

export interface LicenseConfig {
  sku: LicenseSku;
  status: LicenseState;
  issuedAt: string;
  expiresAt: string | null;
  gracePeriodDays: number;
  maxStudios: number;
  maxMembers: number;
  customerName: string;
  features: string[];
  customDomain: string | null;
  emailFrom: string | null;
}

export type FacilityAssetCategory = 'Cardio' | 'Strength' | 'Recovery' | 'Infrastructure' | 'Access Control';
export type FacilityAssetStatus = 'Operational' | 'Degraded' | 'Out of Service' | 'Under Maintenance' | 'Decommissioned';
export type MaintenanceSeverity = 'P1' | 'P2' | 'P3';
export type MaintenanceStatus = 'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';

export interface FacilityAsset {
  id: string;
  tagCode: string;
  category: FacilityAssetCategory;
  make: string;
  model: string;
  serialNumber: string;
  commissionDate: string;
  warrantyExpiration: string;
  status: FacilityAssetStatus;
  locationZone: string;
  locationFloor: string;
  hasIoT: boolean;
  totalRunHours: number;
  lastHeartbeat?: string;
  lastInspection?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceTicket {
  id: string;
  assetId: string;
  assetTag: string;
  reporterName: string;
  reporterType: 'member' | 'staff';
  severity: MaintenanceSeverity;
  issueType: string;
  description: string;
  photoUrls: string[];
  status: MaintenanceStatus;
  eta?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
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
  recoverySuites: RecoverySuite[];
  ptPackages: PersonalTrainingPackage[];
  announcements: StudioAnnouncement[];
  rules: string[];
  partnerGyms?: PartnerGym[];
  merchantPerks?: MerchantPerk[];
  loyaltySummary?: LoyaltySummary;
  facilityAssets?: FacilityAsset[];
  maintenanceTickets?: MaintenanceTicket[];
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}
