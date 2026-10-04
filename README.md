# Gym Studio Membership Management Platform

This repository is structured into three dedicated directories for UI, API, and Database:

```
├── ui/              # React + TypeScript SPA (Vite, modern styling, Lucide icons)
├── api/             # Backend API service (Endpoints specification & architecture)
└── database/        # Database schemas, migrations, and table definitions
```

---

## 🏋️‍♂️ 1. UI (`ui/`)
A responsive Single Page Application built with **React**, **TypeScript**, and **Vite**.

### Features
- **Admin Management Portal**:
  - Real-time KPI overview (Total Members, Active %, Monthly MRR, Expiring < 30 days, Overdue accounts).
  - Search members by name, email, phone, or ID.
  - Multi-criteria filtering by Plan Tier (Basic, Silver, Gold, Platinum, VIP), Status (Active, Expiring Soon, Pending, Expired, Suspended), and Payment Status (Paid, Pending, Overdue).
  - Add & Edit Member modal with automatic duration presets (+1m, +3m, +6m, +1yr), perks preview, and emergency contact details.
  - Quick 1-click renewal (+1 Month extension).
  - Safe deletion dialog with confirmation.
- **Member Portal**:
  - Interactive digital wallet gym pass card with barcode, tier gradient, and turnstile scan simulator.
  - Personal profile & emergency contact editor.
  - Plan perks list & membership validity details.
  - Attendance metrics (streak tracker & check-in history).
  - Studio information (hours, location, contact, concierge).
  - Facility & recovery amenities showcase (sauna, cold plunge, Olympic platforms, functional turf, juice bar).
  - Interactive group fitness class schedule with spot reservations.
  - Studio etiquette & community guidelines.
- **Stub Data & Persistence**:
  - Comprehensive seed data for diverse members and gym amenities.
  - Synchronized with `localStorage` so changes persist across page reloads.
  - 1-click "Reset Demo Data" button in header.

### Running the UI
```bash
cd ui
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔌 2. API (`api/`)
Reserved for the upcoming backend service:
- Planned REST / GraphQL endpoints for authentication, membership lifecycle, bookings, and studio information.
- Architecture details and planned endpoints are documented in [`api/README.md`](./api/README.md).

---

## 🗄️ 3. Database (`database/`)
Contains relational database schema definitions:
- [`database/schema.sql`](./database/schema.sql): Complete SQL schema for users, memberships, plans, studio_info, classes, and check-ins.
- Readme instructions in [`database/README.md`](./database/README.md).
