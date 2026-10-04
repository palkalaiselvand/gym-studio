import type { Member, StudioDetails } from '../types';

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'MEM-1001',
    name: 'Sarah Connor',
    email: 'sarah.connor@example.com',
    phone: '+1 (555) 234-5678',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    joinDate: '2024-01-15',
    attendanceStreak: 12,
    totalCheckIns: 148,
    emergencyContact: {
      name: 'John Connor',
      phone: '+1 (555) 987-6543',
      relation: 'Son'
    },
    membership: {
      id: 'MS-2024-01',
      tier: 'Platinum',
      status: 'active',
      startDate: '2026-01-15',
      endDate: '2027-01-14',
      pricePerMonth: 129,
      paymentStatus: 'paid',
      autoRenew: true,
      perks: [
        'Unlimited 24/7 Access to all locations',
        'Complimentary Finnish Sauna & Cold Plunge',
        '2 Free Personal Trainer sessions per month',
        'Priority studio class booking',
        'Free towel service & locker rental',
        'Guest pass (2 per month)'
      ],
      notes: 'Prefers morning powerlifting & high-intensity mobility sessions.'
    },
    recentVisits: [
      { id: 'v1', date: '2026-10-03', time: '06:45 AM', activity: 'Powerlifting / Heavy Squats' },
      { id: 'v2', date: '2026-10-01', time: '07:15 AM', activity: 'HIIT Conditioning with Coach Maya' },
      { id: 'v3', date: '2026-09-29', time: '06:30 AM', activity: 'Recovery & Sauna Session' },
      { id: 'v4', date: '2026-09-27', time: '07:00 AM', activity: 'Upper Body Hypertrophy' }
    ]
  },
  {
    id: 'MEM-1002',
    name: 'Marcus Vance',
    email: 'marcus.vance@example.com',
    phone: '+1 (555) 345-6789',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    joinDate: '2025-03-10',
    attendanceStreak: 4,
    totalCheckIns: 84,
    emergencyContact: {
      name: 'Elena Vance',
      phone: '+1 (555) 765-4321',
      relation: 'Spouse'
    },
    membership: {
      id: 'MS-2025-02',
      tier: 'Gold',
      status: 'active',
      startDate: '2026-03-10',
      endDate: '2026-10-18', // Expiring in 14 days! Good for test
      pricePerMonth: 89,
      paymentStatus: 'paid',
      autoRenew: false,
      perks: [
        'All-hours Studio access',
        'Access to group fitness classes',
        'Sauna access during regular hours',
        '1 Free trainer consultation per quarter'
      ],
      notes: 'Renewal discussion pending. Training for autumn marathon.'
    },
    recentVisits: [
      { id: 'v5', date: '2026-10-02', time: '05:30 PM', activity: 'Cardio Treadmill Tempo Run' },
      { id: 'v6', date: '2026-09-30', time: '06:00 PM', activity: 'Spin Cycle Burn' },
      { id: 'v7', date: '2026-09-28', time: '05:45 PM', activity: 'Core & Mobility Class' }
    ]
  },
  {
    id: 'MEM-1003',
    name: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    phone: '+1 (555) 456-7890',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    joinDate: '2025-06-01',
    attendanceStreak: 18,
    totalCheckIns: 112,
    emergencyContact: {
      name: 'Dmitri Rostov',
      phone: '+1 (555) 654-3210',
      relation: 'Brother'
    },
    membership: {
      id: 'MS-2025-03',
      tier: 'VIP',
      status: 'active',
      startDate: '2026-06-01',
      endDate: '2027-05-31',
      pricePerMonth: 199,
      paymentStatus: 'paid',
      autoRenew: true,
      perks: [
        'All-inclusive VIP Platinum & Wellness suite access',
        'Dedicated private locker & laundry service',
        'Weekly 1-on-1 Personal Training with Head Coach',
        'Nutrition coaching & bi-weekly body composition scans',
        'Complimentary smoothie / protein shake after every visit',
        'Unlimited guest privileges'
      ],
      notes: 'VIP client. Has custom nutrition plan with nutritionist Dave.'
    },
    recentVisits: [
      { id: 'v8', date: '2026-10-04', time: '09:00 AM', activity: 'Vinyasa Flow Yoga & Recovery' },
      { id: 'v9', date: '2026-10-02', time: '08:30 AM', activity: 'Private PT with Coach Jordan' },
      { id: 'v10', date: '2026-09-30', time: '09:15 AM', activity: 'Pilates Reformer Class' }
    ]
  },
  {
    id: 'MEM-1004',
    name: 'David Chen',
    email: 'david.chen@example.com',
    phone: '+1 (555) 567-8901',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    joinDate: '2024-11-20',
    attendanceStreak: 0,
    totalCheckIns: 42,
    emergencyContact: {
      name: 'Grace Chen',
      phone: '+1 (555) 543-2109',
      relation: 'Sister'
    },
    membership: {
      id: 'MS-2024-04',
      tier: 'Basic',
      status: 'expired',
      startDate: '2025-09-01',
      endDate: '2026-09-01',
      pricePerMonth: 49,
      paymentStatus: 'overdue',
      autoRenew: false,
      perks: [
        'Standard gym floor access (6am - 10pm)',
        'Locker room & shower access',
        'Fitness app workout tracker'
      ],
      notes: 'Membership expired last month. Sent email reminder for renewal.'
    },
    recentVisits: [
      { id: 'v11', date: '2026-08-25', time: '06:00 PM', activity: 'Free weights floor' },
      { id: 'v12', date: '2026-08-20', time: '05:30 PM', activity: 'Treadmill & Chest press' }
    ]
  },
  {
    id: 'MEM-1005',
    name: 'Aaliyah Patel',
    email: 'aaliyah.patel@example.com',
    phone: '+1 (555) 678-9012',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    joinDate: '2025-08-14',
    attendanceStreak: 7,
    totalCheckIns: 53,
    emergencyContact: {
      name: 'Rohan Patel',
      phone: '+1 (555) 432-1098',
      relation: 'Spouse'
    },
    membership: {
      id: 'MS-2025-05',
      tier: 'Silver',
      status: 'active',
      startDate: '2026-08-14',
      endDate: '2027-02-14',
      pricePerMonth: 69,
      paymentStatus: 'paid',
      autoRenew: true,
      perks: [
        'Gym floor access (all open hours)',
        'Unlimited weekend group classes',
        'Sauna access on weekends',
        'Complimentary fitness assessment'
      ],
      notes: 'Regular attendee of evening Boxing & Cardio kickboxing.'
    },
    recentVisits: [
      { id: 'v13', date: '2026-10-03', time: '06:30 PM', activity: 'Boxing Boot Camp' },
      { id: 'v14', date: '2026-10-01', time: '06:15 PM', activity: 'Cardio & Abs' },
      { id: 'v15', date: '2026-09-29', time: '07:00 PM', activity: 'Heavy Bag Drills' }
    ]
  },
  {
    id: 'MEM-1006',
    name: 'Jackson Brooks',
    email: 'j.brooks@example.com',
    phone: '+1 (555) 789-0123',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
    joinDate: '2026-01-05',
    attendanceStreak: 0,
    totalCheckIns: 19,
    emergencyContact: {
      name: 'Rachel Brooks',
      phone: '+1 (555) 321-0987',
      relation: 'Mother'
    },
    membership: {
      id: 'MS-2026-06',
      tier: 'Gold',
      status: 'suspended',
      startDate: '2026-01-05',
      endDate: '2027-01-05',
      pricePerMonth: 89,
      paymentStatus: 'overdue',
      autoRenew: false,
      perks: [
        'All-hours Studio access',
        'Group classes included',
        'Sauna access'
      ],
      notes: 'Suspended temporarily upon member request due to shoulder surgery.'
    },
    recentVisits: [
      { id: 'v16', date: '2026-07-12', time: '11:00 AM', activity: 'Low-impact Recumbent Bike' }
    ]
  },
  {
    id: 'MEM-1007',
    name: 'Maya Lin',
    email: 'maya.lin@example.com',
    phone: '+1 (555) 890-1234',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    joinDate: '2026-09-28',
    attendanceStreak: 2,
    totalCheckIns: 4,
    emergencyContact: {
      name: 'Kevin Lin',
      phone: '+1 (555) 210-9876',
      relation: 'Partner'
    },
    membership: {
      id: 'MS-2026-07',
      tier: 'Platinum',
      status: 'pending',
      startDate: '2026-10-01',
      endDate: '2027-09-30',
      pricePerMonth: 129,
      paymentStatus: 'pending',
      autoRenew: true,
      perks: [
        'Unlimited 24/7 Access',
        'Finnish Sauna & Cold Plunge',
        '2 Free Personal Trainer sessions per month',
        'Priority booking'
      ],
      notes: 'New enrollment. Orientation booked for this Friday.'
    },
    recentVisits: [
      { id: 'v17', date: '2026-10-02', time: '04:00 PM', activity: 'Studio Orientation Tour' }
    ]
  }
];

export const INITIAL_STUDIO_DETAILS: StudioDetails = {
  name: 'APEX ATHLETIC & FITNESS STUDIO',
  tagline: 'High Performance Training, Wellness & Recovery Sanctuary',
  description: 'Apex Studio is a cutting-edge athletic training facility offering Olympic weightlifting platforms, functional turf zones, premier recovery suites (infrared sauna and cold plunge pools), and world-class instructor-led classes designed for every fitness stage.',
  address: '450 Ironworks Way, Suite 120',
  cityStateZip: 'Metro City, NY 10001',
  phone: '+1 (800) 555-APEX (2739)',
  email: 'concierge@apexstudio.fit',
  website: 'https://apexstudio.fit',
  hours: {
    weekdays: '5:00 AM – 11:00 PM (24/7 for Platinum & VIP)',
    saturday: '6:00 AM – 10:00 PM',
    sunday: '7:00 AM – 8:00 PM'
  },
  amenities: [
    {
      name: 'Olympic Lifting Platforms',
      description: 'Eleiko competition barbells, calibrated bumper plates, and dual rubber-cushioned platforms.',
      icon: 'Dumbbell',
      highlight: true
    },
    {
      name: 'Contrast Therapy & Spa',
      description: 'Nordic cedar sauna, infrared therapy rooms, and 45°F plunge baths for rapid cellular recovery.',
      icon: 'Flame',
      highlight: true
    },
    {
      name: 'Functional Turf & Sled Track',
      description: '40-yard athletic turf with rogue dog sleds, battle ropes, plyometric boxes, and kettlebell arrays.',
      icon: 'Zap'
    },
    {
      name: 'Cardio Studio & Wattbikes',
      description: 'Smart Concept2 rowers, ski ergs, curved woodway treadmills, and Wattbike Atom consoles.',
      icon: 'Activity'
    },
    {
      name: 'Fuel & Cold-Pressed Juice Bar',
      description: 'Organic whey/plant protein shakes, electrolytes, artisan espresso, and pre-workout refreshments.',
      icon: 'Coffee'
    },
    {
      name: 'Executive Locker Suites',
      description: 'Private rain showers, Malin+Goetz luxury bath products, digital lockers, and steam rooms.',
      icon: 'ShieldCheck'
    }
  ],
  trainers: [
    {
      id: 'TR-1',
      name: 'Jordan Cruz, CSCS',
      specialty: 'Olympic Weightlifting & Biomechanics',
      experience: '9+ Years Experience',
      bio: 'Former collegiate strength coach specializing in lifting ergonomics, explosive power, and post-rehab functional strength.',
      avatar: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=200&q=80'
    },
    {
      id: 'TR-2',
      name: 'Maya Torres, NASM-CPT',
      specialty: 'High-Intensity Athletic Conditioning & Mobility',
      experience: '7+ Years Experience',
      bio: 'Known for pulse-raising HIIT programming, kettlebell flow mastery, and metabolic conditioning tailored for all levels.',
      avatar: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=200&q=80'
    },
    {
      id: 'TR-3',
      name: 'Chloe Laurent, E-RYT 500',
      specialty: 'Vinyasa Power Yoga & Breathwork',
      experience: '8+ Years Experience',
      bio: 'Combines dynamic flow with restorative somatic breathwork to enhance athletic mobility, joint stability, and mental clarity.',
      avatar: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&w=200&q=80'
    },
    {
      id: 'TR-4',
      name: 'Tyson Vance',
      specialty: 'Boxing Technique & Combat Endurance',
      experience: '11+ Years Experience',
      bio: 'Golden Gloves competitor teaching footwork, defensive head movement, heavy bag combinations, and heart-pounding intervals.',
      avatar: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=200&q=80'
    }
  ],
  classes: [
    {
      id: 'CLS-1',
      name: 'Iron Circuit HIIT',
      category: 'HIIT',
      trainer: 'Maya Torres',
      time: '07:00 AM - 07:50 AM',
      days: ['Mon', 'Wed', 'Fri'],
      duration: '50 mins',
      capacity: 18,
      spotsLeft: 3,
      room: 'Functional Turf Studio A',
      intensity: 'High'
    },
    {
      id: 'CLS-2',
      name: 'Athletic Power & Barbell',
      category: 'Strength',
      trainer: 'Jordan Cruz',
      time: '08:00 AM - 09:00 AM',
      days: ['Tue', 'Thu', 'Sat'],
      duration: '60 mins',
      capacity: 12,
      spotsLeft: 2,
      room: 'Olympic Platform Lab',
      intensity: 'High'
    },
    {
      id: 'CLS-3',
      name: 'Sunrise Flow & Somatics',
      category: 'Yoga',
      trainer: 'Chloe Laurent',
      time: '06:30 AM - 07:30 AM',
      days: ['Mon', 'Wed', 'Sat', 'Sun'],
      duration: '60 mins',
      capacity: 20,
      spotsLeft: 8,
      room: 'Zenith Mind-Body Studio',
      intensity: 'Medium'
    },
    {
      id: 'CLS-4',
      name: 'Apex Heavy Bag Boxing',
      category: 'Boxing',
      trainer: 'Tyson Vance',
      time: '05:30 PM - 06:30 PM',
      days: ['Mon', 'Tue', 'Thu'],
      duration: '60 mins',
      capacity: 16,
      spotsLeft: 4,
      room: 'Combat Zone 2',
      intensity: 'Extreme'
    },
    {
      id: 'CLS-5',
      name: 'Rhythm Spin Velocity',
      category: 'Spin',
      trainer: 'Maya Torres',
      time: '06:45 PM - 07:35 PM',
      days: ['Tue', 'Thu', 'Fri'],
      duration: '50 mins',
      capacity: 24,
      spotsLeft: 6,
      room: 'Cycle Amphitheater',
      intensity: 'High'
    }
  ],
  announcements: [
    {
      id: 'ANN-1',
      title: 'New Cold Plunge & Recovery Zone Grand Opening',
      date: 'Oct 01, 2026',
      content: 'We have upgraded our Finnish sauna with a twin contrast cold plunge tub maintained at a therapeutic 45°F. Complimentary for Platinum and VIP members.',
      tag: 'Facility'
    },
    {
      id: 'ANN-2',
      title: 'Autumn 6-Week Functional Fitness Challenge',
      date: 'Oct 10, 2026',
      content: 'Registration is now open! Measure progress via InBody body composition scan and complete challenges for exclusive Apex apparel.',
      tag: 'Event'
    },
    {
      id: 'ANN-3',
      title: 'Studio Holiday Operating Hours Notice',
      date: 'Nov 20, 2026',
      content: 'On upcoming holidays, member keycard 24/7 access remains operational for Platinum & VIP. Front desk staffed 8am - 2pm.',
      tag: 'Holiday'
    }
  ],
  rules: [
    'Always scan your digital barcode or key fob upon studio entry.',
    'Towels are mandatory on the gym floor; sanitize equipment immediately after every set.',
    'Re-rack all weight plates, dumbbells, and functional equipment to their designated racks.',
    'Closed-toe athletic shoes required at all times (except during Yoga/Pilates classes in Zenith studio).',
    'Chalk is permitted on designated Olympic platforms only; wipe bars clean after deadlifting or snatches.',
    'Guest passes must be registered at the concierge desk prior to gym floor access.'
  ]
};

export const TIER_CONFIG: Record<
  string,
  { name: string; monthlyPrice: number; badgeColor: string; bgGradient: string; description: string; perks: string[] }
> = {
  Basic: {
    name: 'Basic',
    monthlyPrice: 49,
    badgeColor: '#0ea5e9',
    bgGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    description: 'Essential gym floor access for independent lifters.',
    perks: [
      'Standard gym floor access (6am - 10pm)',
      'Locker room & shower access',
      'Apex workout tracking app'
    ]
  },
  Silver: {
    name: 'Silver',
    monthlyPrice: 69,
    badgeColor: '#64748b',
    bgGradient: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
    description: 'Floor access plus group classes & weekend sauna perks.',
    perks: [
      'Gym floor access (all open hours)',
      'Weekend group fitness classes',
      'Sauna access on weekends',
      'Free initial fitness appraisal'
    ]
  },
  Gold: {
    name: 'Gold',
    monthlyPrice: 89,
    badgeColor: '#f59e0b',
    bgGradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    description: 'Full studio access with unlimited group classes and sauna.',
    perks: [
      'All-hours Studio access',
      'Unlimited group fitness & spin classes',
      'Daily Finnish sauna access',
      '1 Free trainer consultation per quarter'
    ]
  },
  Platinum: {
    name: 'Platinum',
    monthlyPrice: 129,
    badgeColor: '#8b5cf6',
    bgGradient: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
    description: 'Elite 24/7 access with recovery spa, PT sessions & guest passes.',
    perks: [
      'Unlimited 24/7 Access to all facilities',
      'Finnish Sauna & Cold Plunge Spa suite',
      '2 Free Personal Trainer sessions / mo',
      'Priority studio class booking',
      'Free towel service & locker rental',
      '2 Guest passes per month'
    ]
  },
  VIP: {
    name: 'VIP',
    monthlyPrice: 199,
    badgeColor: '#ec4899',
    bgGradient: 'linear-gradient(135deg, #db2777 0%, #831843 100%)',
    description: 'The all-inclusive sanctuary experience with private coaching.',
    perks: [
      'All-inclusive VIP suite & 24/7 unrestricted access',
      'Dedicated private locker & laundry service',
      'Weekly 1-on-1 Personal Training session',
      'Custom nutrition coaching & bi-weekly body scans',
      'Free smoothie / protein shake after every workout',
      'Unlimited guest passes'
    ]
  }
};
