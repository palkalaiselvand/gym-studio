# Project Progress Tracker

Update this file at the end of every working session. A new session should read it first.

Roadmap source: [product requirement/07_iterative_implementation_roadmap.md](./product%20requirement/07_iterative_implementation_roadmap.md)

Stack: React/TS SPA (`ui/`), Express/TS API (`api/`), NeDB storage. Build with `npm run build:api` and `npm run build:ui`. Lint with `npm run lint --prefix ui`. There is no test runner; use isolated API smoke tests (temp `DATA_DIR`, `PORT=5150`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

Last updated: 2026-10-13 (Phase 5 complete; current Phase 6 SKU checks and member-cap enforcement added; productization exit criteria still outstanding)

## Decisions made

- All payment processing is deferred to a distinct final phase after productization: no payment tokenization, processor charges, automated recurring billing, proration, processor-backed dunning, wallet payment-pass synchronization, retail payment settlement, or family/corporate billing is implemented before then.
- Until contract terms are captured, cancellation takes effect after the recorded membership end date and access remains available through that date.
- Membership pause, scheduled plan changes, cancellation requests, and retention offers are lifecycle records only; the app does not collect payment data or process charges/refunds.
- Authentication is database-driven (scrypt passwords, HttpOnly cookie sessions, CSRF token). There is no external identity provider.
- Roles: admin, staff, franchise-owner, member.
- License reductions grandfather existing records and deny operations that add licensed usage after the cap is reached.

## Phase status

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Foundations, data model, infra-agnostic baseline | Not formally tracked; basic API/UI/DB exist |
| 1 | Members enrollment and digital membership | Done, except payment (deferred) |
| Branding (Epic 8.4 subset) | Admin-configurable name, logo, currency, primary color | Done (commit `9113ce9`) |
| 2 | Membership lifecycle (non-payment scope) | Done: scheduled pause/resume, renewal-date plan changes, end-of-term cancellation, exit reasons, retention offers, and lifecycle metrics. Billing-dependent behavior deferred to Phase 7 |
| 3 | Studio offerings, scheduling and retail | Done: waitlist enrollment, capacity promotion, and class scheduling affordances shipped |
| 4 | Facility maintenance and IoT | Done: asset registry and maintenance ticket workflow shipped in the operating dashboard |
| 5 | Cross-gym network and perks | Done: partner-network, loyalty passport, and merchant-perk marketplace surfaced in the studio detail experience |
| 6 | Productization and customer-deployed readiness | In progress: Compose install, signed offline license import/enforcement, backup/restore and update helpers, export, and diagnostics added; external deployment validation and several productization epics remain |
| 7 | Payment processing and automated billing (final phase) | Deferred: provider selection, credentials, and PCI/compliance readiness are not yet defined |

## Done

- Phase 1: enrollment wizard, waiver/PAR-Q, contract hash evidence, duplicate review, rotating QR access pass and staff verify, class booking, offline-payment confirmation, staff account management, member directory.
- Phase 2 (non-payment lifecycle): validated 14–90 day pauses with a 90-day annual cap, three-day in-app resume reminder, and scheduled resume; tier-correct upgrades/downgrades applied after the current term; cancellable plan changes; end-of-term cancellation with structured reasons; retention pause/downgrade offers; lifecycle history; background state reconciliation; and admin pause/retention/cancellation metrics.
- Phase 3 (initial rollout): class waitlist registration, automatic waitlist promotion on cancellations, and UI affordances for full-class enrollment.
- Phase 4 (initial rollout): facility asset registry, maintenance ticket triage, and operations dashboard summary for asset health and outage tracking.
- Phase 5 (initial rollout): cross-gym partner network, loyalty passport data, and local merchant-perk marketplace surfaced in the studio detail experience.
- Phase 6 (initial rollout): single-host Docker Compose API/UI images with a prompted first-run installer and initial-admin bootstrap; Ed25519 offline-signed license generation/import and local signature verification; expired/unlicensed admin write restrictions with explicit access/check-in/facility/renewal exceptions; API feature checks for class booking, branding changes, and network-data edits; serialized member-cap reservations for new enrollment, seed-reset cap validation, and a studio-cap check before studio insertion; admin license status banner; hash-verified NeDB backup/restore and semantic-version image rebuild/rollback helpers; admin data export and sanitized runtime diagnostics; and a deployment runbook documenting limits and setup.
- Branding: public `GET /api/branding`, admin-only validated `PUT /api/branding`, Branding panel on the admin dashboard, UI-wide name/logo/color/currency formatting, currency-aware contract text.

## Known gaps and next steps

1. Phase 6 feature enforcement covers only current class-booking, branding, and network-data write surfaces; there is no UI-wide feature gate, no current API surface for `advanced-admin`/`support-portal`, and safety/maintenance workflows remain intentionally available. Member enrollment and seed-reset caps are enforced; studio caps are only checked when inserting the single studio record supported by the current data model. Mail/SMS/domain metadata is not wired to DNS or a delivery provider.
2. Phase 6 still lacks Helm, Terraform, air-gapped image distribution, release registry/provenance and LTS policy, scheduled off-host backup, diagnostics log bundling, and formal support SLAs. The update helper rebuilds a checked-out source tree rather than consuming vendor-signed release artifacts.
3. Phase 6 exit criteria remain open: Docker build/Compose clean-room validation, independent customer installation within two business days, independent rollback drill, sales-trial sign-off, and production sizing/DR exercises. Docker is unavailable in the current implementation environment; the Compose images were not built here.
4. Phase 7 payment work: processor selection and tokenization, recurring charges, proration, smart payment dunning/retries, payment reconciliation, wallet-pass synchronization, and payment/settlement-dependent retail, network, family, and corporate workflows.
5. Apple/Google Wallet pass issuance remains unimplemented; current access pass is in-app QR only. Freeze reminders are in-app only; email/SMS delivery is not configured. SMS/orientation automation, government-ID/selfie KYC, and legal review of the waiver also remain open.
6. Branding follow-ups: seed/studio data still says "Apex" (`database/seeds/studio.json`, `ui/src/data/mockData.ts`); no light theme or font choice; currency changes formatting only and does not convert prices.

## Housekeeping

- Login throttling is in-memory and IP-based.
- `/api/seed/reset` re-seeds demo data and clears member accounts, bookings, enrollments and access passes. Branding is kept.

## Verification (2026-10-13)

- `npm run build:api` passed after the entitlement changes.
- Isolated capacity smoke passed: SKU feature ceilings are applied, concurrent member reservations cannot exceed the configured cap, rejected attempts do not consume a slot, and released slots can be reserved.
- Isolated API smokes passed: non-entitled branding/network writes, over-cap enrollment before any member/account write, and a seed reset exceeding the member cap are rejected; existing member data and facility safety reads remain available.

## Prior verification (2026-10-12)

- `npm run build` passed for API and UI.
- `npm run lint --prefix ui` passed with existing purity/state-in-effect warnings; no lint errors.
- Ed25519 CLI key generation/signing and escaped-newline public-key verification passed; invalid/tampered signatures were rejected.
- Isolated production API smoke passed: unlicensed/expired admin writes are denied; license import/renewal, check-in, access verification, export, and diagnostics remain available.
- Isolated backup/restore round-trip passed; corrupted snapshots were rejected before replacing active data.
- Development UI and API health endpoints responded with HTTP 200. Docker is not installed in the implementation environment, so Compose/Docker image builds were not run.
