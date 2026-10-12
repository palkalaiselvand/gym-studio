# Iterative Implementation Roadmap & Product Build Plan (Phase 0 – Phase 7)

**Document Version:** 2.0.0  
**Scope:** Phase-by-phase delivery plan spanning all six operational pillars (Maintenance, Offerings, Enrollment, Membership Maintenance, Cross-Gym Collaboration, Benefits & Perks) plus the commercialization pillar (Productization, Licensing & Customer-Deployed Operability)  
**Owner:** Senior Product Owner, in collaboration with Engineering Leads & Delivery Managers  
**Methodology:** Agile, 2-week sprints, phase gates reviewed by a cross-functional steering committee (Product, Engineering, Operations, Finance, Sales/GTM)  
**Commercial Context:** This platform is built to be **sold as a licensed product that customers deploy onto their own infrastructure** (see [`08_productization_licensing_deployment.md`](file:///c:/Source/antigravitytest/product%20requirement/08_productization_licensing_deployment.md)). Infra-agnostic packaging is baked into the foundation. Payment processing is deliberately deferred to a new final Phase 7; Phase 6 prepares the product for customer deployment, while Phase 7 is required before payment-enabled commercial go-live.

---

## 1. Delivery Philosophy

The platform is built **iteratively, not big-bang**: each phase ships a usable increment validated with real studio operators before the next phase begins. Foundational data models land first, followed by enrollment and non-payment membership lifecycle work, studio operations, and network-effect features. Customer-deployed packaging follows; processor-backed payment flows and related settlement work are the final implementation phase.

```mermaid
gantt
    title Gym Studio Enterprise Platform — Phased Roadmap
    dateFormat  YYYY-MM-DD
    axisFormat  %b %Y
    section Phase 0
    Foundations, Core Data Model & Infra-Agnostic Baseline :p0, 2026-10-05, 4w
    section Phase 1
    Enrollment & Digital Membership    :p1, after p0, 6w
    section Phase 2
    Membership Lifecycle & Billing     :p2, after p1, 6w
    section Phase 3
    Offerings, Scheduling & Retail     :p3, after p2, 8w
    section Phase 4
    Facility Maintenance & IoT         :p4, after p3, 6w
    section Phase 5
    Cross-Gym Network & Perks Ecosystem:p5, after p4, 8w
    section Phase 6
    Productization & Customer-Deployable Readiness :p6, after p5, 6w
    section Phase 7
    Payment Processing & Automated Billing (final phase) :p7, after p6, 8w
```

---

## 2. Phase 0: Foundations, Core Data Model & Infra-Agnostic Baseline (4 Weeks)

**Goal:** Establish the shared technical foundation every other pillar depends on — without this, no pillar can be built safely in parallel later. Critically, this phase also bakes in the **deployability architecture** from day one (Pillar 8, Epic 8.1), because retrofitting infra-agnosticism after five phases of cloud-specific shortcuts is far more expensive than designing for it up front.

### Scope:
- Core domain models: `Studio`, `Member`, `User/Role (RBAC)`, `Asset` (stub), `Offering` (stub).
- Authentication & authorization (member, staff, admin, franchise-owner roles).
- Base API gateway, database schema migrations, CI/CD pipeline, and environment provisioning (dev/staging/prod).
- Observability baseline: structured logging, error tracking, uptime monitoring.
- Design system / UI component library (glassmorphism theme per existing `ui/` scaffold).
- **Infra-agnostic packaging baseline (Pillar 8, Epic 8.1):** containerize every service from the first commit (no code that assumes a specific cloud-managed service without a documented self-hosted equivalent); establish the configuration-as-code pattern (environment variables/secrets, not hardcoded endpoints) that the Phase 6 installer will later wrap.

### Dependencies: None (first phase).

### Exit Criteria (Phase Gate):
- A studio admin can log in and view an empty but correctly modeled studio record.
- CI pipeline runs lint/test/build on every commit with < 10-minute feedback loop.
- Security review sign-off on auth/RBAC design before any payment or PII data flows are introduced.
- The full stack runs identically via `docker compose up` on a clean machine with no hardcoded cloud-provider dependency — proving the infra-agnostic baseline before any domain-specific feature work begins.

---

## 3. Phase 1: Members Enrollment & Digital Membership (6 Weeks)

**Goal:** Ship the highest-leverage conversion surface first — a working, revenue-capable sign-up flow — so studios can begin onboarding real paying members as early as possible.

### Scope (maps to Pillar 3):
- Plan catalog + pricing engine (Epic 3.2).
- Digital waiver + PAR-Q e-signature capture (Epic 3.3).
- Plan selection and contract e-signature evidence (no payment method collection or charge).
- Basic admin member directory (search/filter/create/edit) — already partially reflected in the existing `ui`/`api` scaffold's Members module.

### Dependencies: Phase 0 data model and auth.

### Exit Criteria:
- End-to-end digital enrollment completes in under 3 minutes in usability testing.
- Enrollment creates a pending member account without collecting payment data or granting paid access before studio activation.
- First pilot studio successfully enrolls ≥ 25 real members through the new flow.

> **Deferred payment scope:** Processor tokenization, recurring charges, Apple/Google Wallet passes, and payment-dependent enrollment activation move to Phase 7, the final phase.

---

## 4. Phase 2: Membership Lifecycle (Non-Payment Scope)

**Goal:** Give members transparent self-service control over access and plan intent without pretending that the application processes payments.

### Scope (maps to Pillar 4):
- Self-service access pause and scheduled automatic resume; enforce the 14-day minimum and 90-day annual allowance and show a three-day in-app resume reminder (Epic 4.2, without billing suspension or external messaging).
- Schedule upgrades and downgrades for the next term, and allow members to revoke an unsatisfied plan change (Epic 4.3, without mid-cycle proration).
- End-of-current-term cancellation with a structured exit reason, reason-based retention pause/downgrade offers, and auditable acceptance outcomes (Epic 4.4).
- Member lifecycle state reconciliation and operational metrics for pause utilization, retention-offer acceptance, and scheduled cancellations.

### Dependencies: Phase 1 member identity, membership records, and the in-app QR access pass. No payment processor or external wallet integration is required for this limited scope.

### Exit Criteria:
- A valid pause blocks access on its start date and restores it automatically on its resume date; invalid dates and allowance overruns are rejected.
- Members see an in-app reminder during the three days before a scheduled pause ends; external email/SMS delivery is not part of this phase.
- A plan change is scheduled for the next term and can be cancelled before it takes effect; no tier or price changes early.
- Cancellation retains access through the recorded membership end date, captures a structured reason, and records whether a retention offer was accepted.
- The application clearly identifies all amounts as plan values only and does not claim to collect or process payment.

> **Deferred payment scope:** Recurring billing, processor-backed dunning, mid-cycle proration, payment reconciliation, family/corporate billing, and wallet-pass synchronization are moved to Phase 7. The in-app QR pass remains the access credential until then.

---

## 5. Phase 3: Studio Offerings, Scheduling & Retail (8 Weeks)

**Goal:** Unlock the ancillary revenue and engagement surfaces (classes, PT, recovery, pro-shop) that justify premium tiers and drive daily app engagement, now that the member base and billing engine are stable.

### Scope (maps to Pillar 2):
- Offering catalog builder + recurring schedule templates (Epic 2.1).
- Instructor roster & substitute workflow (Epic 2.2).
- Booking + smart waitlist engine (Epic 2.3).
- Recovery suite granular time-slice booking (Epic 2.4).
- Pro-shop catalog and PT package session-credit tracking (Epic 2.5); payment-taking POS and transaction reconciliation move to Phase 7.

### Dependencies: Phase 1 member identity, Phase 2 tier entitlements (for eligibility gating of premium offerings).

### Exit Criteria:
- Pilot studio achieves ≥ 70% class fill rate within the first month of launch (ramping toward the ≥ 85% platform target).
- Zero double-booking incidents across resource/zone locking in a 4-week production burn-in.
- Class bookings and PT/package entitlements are recorded correctly; money collection and revenue reconciliation remain deferred.

---

## 6. Phase 4: Facility Maintenance & IoT Operations (6 Weeks)

**Goal:** Close the operational loop with asset tracking, preventive maintenance, and smart turnstile hardware integration — deliberately sequenced after member-facing pillars so hardware/IoT procurement and integration timelines (which are typically the longest lead-time items) run in parallel with Phases 1–3 while software catches up.

### Scope (maps to Pillar 1):
- Asset lifecycle registry + QR tagging (Epic 1.1).
- Preventive maintenance engine + digital inspection checklists (Epic 1.2).
- Incident management & work order/vendor dispatch (Epic 1.3).
- Hygiene/sanitation logs + air quality telemetry (Epic 1.4).
- Smart turnstile hardware health, offline access cache, anti-tailgating (Epic 1.5).

> **Parallel Track Note:** Hardware procurement (turnstile controllers, IoT sensors, QR label printers) and vendor integration contracts should begin during Phase 1–2, since physical installation lead times (4–8 weeks) otherwise become the critical path.

### Dependencies: Phase 0 asset data model stub; Phase 1 in-app signed QR access token (wallet pass issuance is deferred to Phase 7).

### Exit Criteria:
- Turnstile access-control decisions resolve in < 300ms with verified 72-hour offline resilience in a controlled outage drill.
- MTTR for simulated equipment incidents measured at ≤ 48 hours in pilot studio operations.

---

## 7. Phase 5: Cross-Gym Network & Benefits/Perks Ecosystem (8 Weeks)

**Goal:** Layer in network-effect features once there are multiple live studios and an engaged member base large enough to make roaming and a merchant marketplace meaningful rather than empty shells.

### Scope (maps to Pillars 5 & 6):
- Partner network registry + reciprocity rule configuration (Epic 5.1).
- Universal gym passport cross-studio access verification (Epic 5.2).
- Usage ledger (Epic 5.3); automated settlement and payouts are deferred to Phase 7.
- Aggregator (ClassPass/Wellhub) two-way booking sync (Epic 5.4).
- Workout streak/milestone gamification + loyalty points ledger (Epic 6.1, 6.2).
- Local merchant perks marketplace (Epic 6.3).
- Referral engine (Epic 6.4).
- Wellness insurance/HSA credit integration (Epic 6.5) — treated as a fast-follow sub-phase given its dependency on external payer integrations with longer, less predictable timelines.

### Dependencies: At least 2+ live studios on the platform (Phases 0–4 complete) to validate roaming and usage records; a critical mass of active members to attract merchant marketplace partners.

### Exit Criteria:
- First two network studios complete a live reciprocal roaming pilot with usage recorded accurately; payment settlement remains deferred.
- ≥ 10 local merchant partners onboarded in the pilot metro market within the phase window.
- Referral engine demonstrably attributes ≥ 10% of new sign-ups in the pilot cohort.

---

## 8. Phase 6: Productization, Licensing & Customer-Deployable Readiness (6 Weeks)

**Goal:** Package and validate the platform for independent customer deployment. Payment-enabled commercial go-live remains gated on Phase 7.

### Scope (maps to Pillar 8):
- Guided installer + first-run setup wizard, Docker Compose bundle, and Helm chart finalized against the real, now-complete feature set (Epic 8.2).
- License & entitlement management: SKU/feature-tier definitions (`STARTER`/`GROWTH`/`ENTERPRISE`), offline-signed license file enforcement, graceful degradation on expiry (Epic 8.3).
- White-label theming layer: branding, custom domain, custom email/SMS sending identity (Epic 8.4).
- Update/patch distribution tooling with automated pre-update backup and documented rollback (Epic 8.5).
- Backup, restore, and full data export tooling, plus the published DR runbook (Epic 8.6).
- Sales demo/trial sandbox (reusing `database/seeds/`) and the self-service support diagnostics bundle (Epic 8.7).
- Minimum infra specification sheet and reference Terraform modules for AWS/Azure/GCP, plus the documented on-prem/air-gapped install path (Epic 8.1).

### Dependencies: Phases 0–5 functionally complete and stable (early installer/CI-packaging groundwork from Phase 0 continues incrementally throughout).

### Exit Criteria:
- A test customer "clean room" installation (fresh cloud account, no vendor engineering involvement) completes in ≤ 2 business days using only published documentation and the installer.
- License expiry drill confirms turnstile/member access continues uninterrupted while administrative functions correctly restrict.
- A patch release is applied and rolled back successfully by someone outside the core engineering team (e.g., a QA or support engineer), validating the self-service update path is truly self-service.
- Sales engineering signs off that the trial sandbox is demo-ready for prospect-facing use.

> **Deployment-readiness gate:** Passing Phase 6 validates customer-deployed packaging. It does not authorize payment-enabled commercial go-live; Phase 7 must also pass.

---

## 9. Phase 7: Payment Processing & Automated Billing (Final Phase)

**Goal:** Implement and validate all processor-backed money movement only after the product's non-payment workflows and customer-deployment foundation are stable.

### Scope:
- Select and integrate a PCI-compliant payment processor using hosted tokenization; never store raw card or bank credentials.
- Payment method vaulting, enrollment charges, staff-confirmed/offline-to-processor transition, refunds, and transaction ledger.
- Automated recurring charges, billing anchors, proration for upgrades, freeze billing rules, and payment reconciliation.
- Smart retry/dunning communications, payment-failure grace periods, recovery, and account-updater integration where available.
- Payment-taking retail/POS, network-use settlement and payouts, add-on charges, and family/corporate consolidated or split billing.
- Apple/Google Wallet pass issuance and lifecycle updates if selected provider capabilities and credentials are available.
- PCI/security review, webhook signature validation, idempotency, audit trails, finance reconciliation, and failure/recovery drills.

### Dependencies: Phases 0–6 are stable; product owner selects the processor, supplies test credentials, and confirms payment, contract, tax/refund, and compliance policies.

### Exit Criteria:
- Processor sandbox enrollment, recurring charges, refunds, retries, and webhooks pass idempotency and failure-recovery tests.
- Payment and membership ledgers reconcile exactly against processor test settlements.
- No raw payment credentials are stored; security and PCI scope are reviewed and approved before production enablement.
- Dunning, cancellation, pause, and plan-change behaviors pass end-to-end staging tests with member-facing notices.
- Production go-live remains blocked until credentials, legal terms, finance reconciliation, and processor/compliance sign-offs are complete.

---

## 10. Cross-Phase Workstreams (Run Continuously, Not Phase-Gated)

| Workstream | Description |
|---|---|
| **Security & Compliance** | PCI-DSS, GDPR/CCPA, and waiver/health-data handling reviews occur at the end of every phase, not just once at the end. |
| **Analytics & KPI Instrumentation** | Each pillar's operational KPIs (defined in its respective PRD) must be instrumented from day one of that pillar's phase, not retrofitted later. |
| **Pilot Studio Feedback Loop** | A rotating panel of 2–3 pilot studios provides weekly feedback throughout all phases; roadmap scope is adjusted based on real operational friction, not only internal assumptions. |
| **Documentation & Enablement** | Staff/admin training guides and member-facing help content are updated in lockstep with each phase's feature releases. |

---

## 11. Phase Gate Governance

Each phase concludes with a **Go/No-Go Steering Review** evaluating:
1. Exit criteria met (as defined per phase above).
2. No open Critical/High severity defects or security findings.
3. Pilot studio operator sign-off on usability and operational readiness.
4. Updated risk register reviewed (see §11).

A phase may proceed to limited production rollout with a documented risk acceptance even if minor (Low/Medium) issues remain open, provided a remediation plan with owners and dates is logged.

---

## 12. Risk Register & Mitigation Summary

| Risk | Phase Impacted | Mitigation |
|---|---|---|
| Payment processor PCI compliance delays | Phase 7 | Use hosted-fields tokenization; never build custom card storage. Select provider and complete compliance review before integration. |
| Hardware/IoT procurement lead times | Phase 4 | Begin vendor contracts and hardware ordering during Phase 1–2, in parallel with software development. |
| Low initial network density undermining Phase 5 value | Phase 5 | Sequence Phase 5 last; require minimum 2+ live studios and defined active-member threshold before kickoff. |
| Retention logic increasing member frustration if mistuned | Phase 2 / Phase 7 | Validate pause and non-payment save offers with operators; pilot payment dunning cadence before enabling processor-backed recovery. |
| Scheduling double-booking bugs eroding instructor trust | Phase 3 | Enforce resource/zone locking at the database constraint layer, not just UI validation; include in Phase 3 exit criteria. |
| Retrofitting cloud-specific shortcuts late, breaking infra-agnostic packaging | Phase 0 / Phase 6 | Enforce the Phase 0 "`docker compose up` with no hardcoded cloud dependency" exit criterion as a hard CI gate, not an aspiration, for every PR throughout Phases 1–5. |
| Customers unable to self-install without vendor hand-holding, stalling deal closures | Phase 6 | Validate with a true "clean room" installation drill (Phase 6 exit criteria) performed by someone outside the core engineering team before any customer commitment date is promised. |
| License enforcement logic accidentally blocking safety-critical access on expiry | Phase 6 | Hard product requirement (Epic 8.3): license expiry must only ever restrict administrative actions, never member/turnstile access; covered by an explicit regression test in the Phase 6 test suite. |

---

## 13. Product Build Plan — Master Order of Implementation

This section is the single consolidated reference for **"what gets built in what order, and why."** It restates the phase sequence as a flat, dependency-ordered build plan suitable for sprint-planning and staffing conversations, independent of the narrative detail above.

| # | Build Unit | Pillar(s) | Depends On | Why This Position in the Order |
|---|---|---|---|---|
| 1 | Core data model, auth/RBAC, CI/CD, **infra-agnostic container baseline** | Foundation + Pillar 8 (Epic 8.1 groundwork) | None | Everything else is built on top of this; infra-agnosticism is a day-one architectural decision, not a bolt-on — retrofitting it after Phase 5 would require re-platforming completed features. |
| 2 | Plan catalog, waivers/PAR-Q, contract e-sign, pending enrollment, in-app QR pass | Pillar 3 | #1 | Establishes member identity and in-app access without collecting or processing payment. |
| 3 | Access pause/resume, renewal-date plan changes, cancellation, retention outcomes | Pillar 4 (non-payment scope) | #2 | Provides transparent self-service lifecycle control while preserving access/payment safeguards before processor integration. |
| 4 | Offering catalog, scheduling, booking/waitlist, recovery bookings, pro-shop POS | Pillar 2 | #2, #3 | Ancillary revenue and daily engagement depend on both a stable member base and correct tier entitlement gating from #3. |
| 5 | Asset registry, preventive maintenance, incident tickets, hygiene logs, turnstile hardware integration | Pillar 1 | #1 (data model), #2 (in-app access pass) | Deliberately after #2–#4 in software sequencing, but hardware/IoT **procurement** should start in parallel with #2 since physical lead times are the true critical path, not engineering effort. |
| 6 | Partner network registry, universal passport roaming, usage ledger, aggregator sync | Pillar 5 | #1–#5 (needs multiple live, stable studios to be meaningful) | A network feature is worthless with only one studio; sequenced after the single-studio experience is proven; settlement waits for #9. |
| 7 | Streaks/gamification, loyalty points, merchant marketplace, referral engine, wellness credits | Pillar 6 | #2–#4 (needs check-in and offering-usage data to gamify) | Retention/engagement layer that enriches an already-functioning core; highest ROI once there's real usage data to reward. |
| 8 | Installer/packaging, license & entitlement enforcement, white-labeling, update/rollback tooling, backup/DR, trial sandbox | Pillar 8 | #1–#7 (wraps the non-payment feature set) | Produces a customer-deployable platform before adding final processor-backed flows. |
| 9 | Processor integration, recurring billing, payment dunning, POS/settlement, family/corporate billing, wallet passes | Deferred payment scope | #1–#8 and provider/compliance decisions | This is deliberately last; all money movement and its dependent workflows receive their own security, finance, and operational gate. |

> **Parallelizable work, by exception:** Hardware/IoT vendor procurement (build unit #5) and early Terraform/Helm packaging scaffolding (build unit #8, infra-as-code accelerators only) can and should start as early as build unit #2. Processor selection and compliance planning may begin earlier, but implementation and money movement remain gated to build unit #9.

---

## 14. Related Documents

- [`README.md`](file:///c:/Source/antigravitytest/product%20requirement/README.md) — Master PRD overview, personas, and system architecture.
- [`01_gym_studio_maintenance.md`](file:///c:/Source/antigravitytest/product%20requirement/01_gym_studio_maintenance.md) — Pillar 1 detailed specification.
- [`02_gym_studio_offerings.md`](file:///c:/Source/antigravitytest/product%20requirement/02_gym_studio_offerings.md) — Pillar 2 detailed specification.
- [`03_members_enrollment.md`](file:///c:/Source/antigravitytest/product%20requirement/03_members_enrollment.md) — Pillar 3 detailed specification.
- [`04_membership_maintenance.md`](file:///c:/Source/antigravitytest/product%20requirement/04_membership_maintenance.md) — Pillar 4 detailed specification.
- [`05_across_gym_collaboration.md`](file:///c:/Source/antigravitytest/product%20requirement/05_across_gym_collaboration.md) — Pillar 5 detailed specification.
- [`06_members_benefits_and_perks.md`](file:///c:/Source/antigravitytest/product%20requirement/06_members_benefits_and_perks.md) — Pillar 6 detailed specification.
- [`08_productization_licensing_deployment.md`](file:///c:/Source/antigravitytest/product%20requirement/08_productization_licensing_deployment.md) — Pillar 8 detailed specification (packaging, licensing, deployment).
