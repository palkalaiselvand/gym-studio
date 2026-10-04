# Project Progress Tracker

Update this file at the end of every working session. A new session should read it first.

Roadmap source: [product requirement/07_iterative_implementation_roadmap.md](./product%20requirement/07_iterative_implementation_roadmap.md)

Stack: React/TS SPA (`ui/`), Express/TS API (`api/`), NeDB storage. Build with `npm run build:api` and `npm run build:ui`. Lint with `npm run lint --prefix ui`. There is no test runner; use isolated API smoke tests (temp `DATA_DIR`, `PORT=5150`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

Last updated: 2026-10-04 (after commit `9113ce9`)

## Decisions made

- Payment integration is deferred until the end of the project.
- Authentication is database-driven (scrypt passwords, HttpOnly cookie sessions, CSRF token). There is no external identity provider.
- Roles: admin, staff, franchise-owner, member.

## Phase status

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Foundations, data model, infra-agnostic baseline | Not formally tracked; basic API/UI/DB exist |
| 1 | Members enrollment and digital membership | Done, except payment (deferred) |
| Branding (Epic 8.4 subset) | Admin-configurable name, logo, currency, primary color | Done (commit `9113ce9`) |
| 2 | Membership lifecycle and recurring billing | Not started |
| 3 | Studio offerings, scheduling and retail | Not started (class booking exists from Phase 1) |
| 4 | Facility maintenance and IoT | Not started |
| 5 | Cross-gym network and perks | Not started |
| 6 | Productization, licensing, launch readiness | Not started |

## Done

- Phase 1: enrollment wizard, waiver/PAR-Q, contract hash evidence, duplicate review, rotating QR access pass and staff verify, class booking, offline-payment confirmation, staff account management, member directory.
- Branding: public `GET /api/branding`, admin-only validated `PUT /api/branding`, Branding panel on the admin dashboard, UI-wide name/logo/color/currency formatting, currency-aware contract text.

## Known gaps and next steps

1. Payment tokenization/processing (deferred by the user; do last).
2. Apple/Google Wallet pass issuance (the QR pass is in-app only).
3. SMS/orientation automation, government-ID/selfie KYC, legal review of the waiver.
4. Branding follow-ups: seed/studio data still says "Apex" (`database/seeds/studio.json`, `ui/src/data/mockData.ts`); no light theme or font choice; currency changes formatting only and does not convert prices.
5. Next planned phase: Phase 2 (freeze/pause, upgrade/downgrade, cancellation, recurring billing). Billing parts depend on the deferred payment work.

## Housekeeping

- Login throttling is in-memory and IP-based.
- `/api/seed/reset` re-seeds demo data and clears member accounts, bookings, enrollments and access passes. Branding is kept.
