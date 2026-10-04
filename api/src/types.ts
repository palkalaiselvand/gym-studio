export type UserRole = 'admin' | 'member';

export type MembershipTier = 'Basic' | 'Silver' | 'Gold' | 'Platinum' | 'VIP';

export type MembershipStatus = 'active' | 'pending' | 'expired' | 'suspended' | 'cancelled';

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
  _id?: string;
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
  _id?: string;
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
  _id?: string;
}
