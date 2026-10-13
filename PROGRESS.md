# Project Progress Tracker

Update this file at the end of every working session. A new session should read it first.

Roadmap source: [product requirement/07_iterative_implementation_roadmap.md](./product%20requirement/07_iterative_implementation_roadmap.md)

Stack: React/TS SPA (`ui/`), Express/TS API (`api/`), NeDB storage. Build with `npm run build:api` and `npm run build:ui`. Lint with `npm run lint --prefix ui`. There is no test runner; use isolated API smoke tests (temp `DATA_DIR`, `PORT=5150`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

Last updated: 2026-10-12 (Phase 3 waitlist and scheduling work shipped; Phase 4 asset registry and maintenance workflow started; payment work remains deferred to final phase)

## Decisions made

- All payment processing is deferred to a distinct final phase after productization: no payment tokenization, processor charges, automated recurring billing, proration, processor-backed dunning, wallet payment-pass synchronization, retail payment settlement, or family/corporate billing is implemented before then.
- Until contract terms are captured, cancellation takes effect after the recorded membership end date and access remains available through that date.
- Membership pause, scheduled plan changes, cancellation requests, and retention offers are lifecycle records only; the app does not collect payment data or process charges/refunds.
- Authentication is database-driven (scrypt passwords, HttpOnly cookie sessions, CSRF token). There is no external identity provider.
- Roles: admin, staff, franchise-owner, member.

## Phase status

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Foundations, data model, infra-agnostic baseline | Not formally tracked; basic API/UI/DB exist |
| 1 | Members enrollment and digital membership | Done, except payment (deferred) |
| Branding (Epic 8.4 subset) | Admin-configurable name, logo, currency, primary color | Done (commit `9113ce9`) |
| 2 | Membership lifecycle (non-payment scope) | Done: scheduled pause/resume, renewal-date plan changes, end-of-term cancellation, exit reasons, retention offers, and lifecycle metrics. Billing-dependent behavior deferred to Phase 7 |
| 3 | Studio offerings, scheduling and retail | Done: waitlist enrollment, capacity promotion, and class scheduling affordances shipped |
| 4 | Facility maintenance and IoT | In progress: asset registry and maintenance ticket workflow added for the next phase rollout |
| 5 | Cross-gym network and perks | Not started |
| 6 | Productization and customer-deployed readiness | Not started |
| 7 | Payment processing and automated billing (final phase) | Deferred: provider selection, credentials, and PCI/compliance readiness are not yet defined |

## Done

- Phase 1: enrollment wizard, waiver/PAR-Q, contract hash evidence, duplicate review, rotating QR access pass and staff verify, class booking, offline-payment confirmation, staff account management, member directory.
- Phase 2 (non-payment lifecycle): validated 14–90 day pauses with a 90-day annual cap, three-day in-app resume reminder, and scheduled resume; tier-correct upgrades/downgrades applied after the current term; cancellable plan changes; end-of-term cancellation with structured reasons; retention pause/downgrade offers; lifecycle history; background state reconciliation; and admin pause/retention/cancellation metrics.
- Phase 3 (initial rollout): class waitlist registration, automatic waitlist promotion on cancellations, and UI affordances for full-class enrollment.
- Phase 4 (initial rollout): facility asset registry, maintenance ticket triage, and operations dashboard summary for asset health and outage tracking.
- Branding: public `GET /api/branding`, admin-only validated `PUT /api/branding`, Branding panel on the admin dashboard, UI-wide name/logo/color/currency formatting, currency-aware contract text.

## Known gaps and next steps

1. Phase 7 payment work: processor selection and tokenization, recurring charges, proration, smart payment dunning/retries, payment reconciliation, wallet-pass synchronization, and payment/settlement-dependent retail, network, family, and corporate workflows.
2. Apple/Google Wallet pass issuance remains unimplemented; current access pass is in-app QR only. Freeze reminders are in-app only; email/SMS delivery is not configured.
3. SMS/orientation automation, government-ID/selfie KYC, and legal review of the waiver.
4. Branding follow-ups: seed/studio data still says "Apex" (`database/seeds/studio.json`, `ui/src/data/mockData.ts`); no light theme or font choice; currency changes formatting only and does not convert prices.

## Housekeeping

- Login throttling is in-memory and IP-based.
- `/api/seed/reset` re-seeds demo data and clears member accounts, bookings, enrollments and access passes. Branding is kept.
