# Pillar 3: Members Enrollment & Smart Onboarding PRD

**Document Version:** 1.0.0  
**Domain:** Omnichannel Lead Capture, Digital Waivers, Identity Verification, Payment Tokenization & Digital Wallet Provisioning  
**Owner:** Senior Product Owner – Growth & Onboarding  

---

## 1. Module Overview & Business Value

The enrollment funnel is the single highest-leverage moment to reduce drop-off and establish a frictionless member relationship. This module delivers an omnichannel (in-person kiosk, web, mobile, sales-rep assisted) enrollment experience that compresses sign-up time from an industry-average 20+ minutes of paperwork to **under 3 minutes**, while remaining fully compliant with payment, health-disclosure, and liability-waiver regulations.

### Key Objectives:
- Increase digital lead-to-paid-member conversion from 18% (industry baseline) to **≥ 38%**.
- Reduce average enrollment completion time to **< 3 minutes** for self-serve digital sign-up.
- Achieve **100% digital waiver and PAR-Q capture** with zero paper forms.
- Provision a working digital wallet gym pass (Apple Wallet / Google Wallet) within **60 seconds** of payment confirmation.

---

## 2. Core Functional Epics & Feature Specifications

```mermaid
flowchart LR
    A["Lead Capture & CRM Hooks"] --> B["Plan Selection & Pricing Engine"]
    B --> C["Digital Waiver & PAR-Q Health Screening"]
    C --> D["Identity Verification (KYC-lite)"]
    D --> E["Payment Tokenization & Vaulting"]
    E --> F["Contract E-Signature"]
    F --> G["Digital Wallet Pass Provisioning"]
    G --> H["Welcome Journey & Orientation Scheduling"]
```

### Epic 3.1: Omnichannel Lead Capture & Trial Funnels
1. **Entry Points:** QR codes on out-of-home ads, website landing pages, social DM-to-signup bots, referral links, walk-in sales-rep tablet flow, and third-party aggregator handoffs (ClassPass, Wellhub).
2. **Lead Nurture Automation:** Abandoned sign-up flows (any user who starts but does not complete within 24 hours) trigger an automated SMS/email nurture sequence with a limited-time incentive (e.g., waived enrollment fee).
3. **Trial & Day-Pass Flows:** Lightweight capture (name, phone, email) for single-visit guest passes with automatic conversion prompts at expiration.

---

### Epic 3.2: Plan Selection & Transparent Pricing Engine
1. **Dynamic Plan Comparison:** Side-by-side tier comparison (e.g., Basic/Gold/Platinum) showing included class credits, recovery access, guest privileges, and multi-location roaming rights.
2. **Promotional Code & Corporate Rate Engine:** Supports percentage/fixed discounts, founding-member locked pricing, and corporate/partner-negotiated rate codes validated against an eligibility list (e.g., employer domain match).
3. **Proration & Start-Date Flexibility:** Members may select an immediate or future start date; billing is automatically prorated to align with the studio's preferred billing anchor day.

---

### Epic 3.3: Digital Waiver, Liability Release & PAR-Q Health Screening
1. **E-Signature Liability Waiver:** Legally binding digital signature capture (finger/stylus or typed signature with timestamp, IP address, and device fingerprint audit trail), versioned so re-signature is required whenever waiver text changes.
2. **PAR-Q+ Health Screening Questionnaire:** Standardized physical activity readiness questions (cardiovascular conditions, joint/bone issues, pregnancy, medication). Positive/flagged responses trigger a soft-block recommending physician clearance before high-intensity class booking, without preventing basic facility access.
3. **Minor/Guardian Consent Workflow:** For members under 18, the flow requires a parent/guardian identity match and co-signature before activation.

---

### Epic 3.4: Identity Verification & Fraud Prevention (KYC-lite)
1. **Document + Selfie Liveness Check (Optional/Tiered):** For high-value corporate or family-plan enrollments, an optional government ID scan + selfie liveness match reduces fraudulent shared-membership accounts.
2. **Duplicate Account Detection:** Fuzzy-matching on name + phone + payment fingerprint to flag potential duplicate enrollments or previously-cancelled-for-cause accounts before reactivation.

---

### Epic 3.5: Payment Tokenization & Vaulting
1. **PCI-Compliant Tokenized Vault:** All card/bank data captured via hosted fields (Stripe Elements / Adyen Drop-in) — raw PANs never touch platform servers.
2. **Multiple Payment Methods:** Credit/debit card, ACH/direct debit, Apple Pay/Google Pay, and BNPL (buy-now-pay-later) installment options for annual prepay plans.
3. **Pre-Authorization Validation:** A $0 or $1 card verification hold confirms card validity before contract finalization, preventing immediate first-billing failures.

---

### Epic 3.6: Contract E-Signature & Digital Wallet Pass Provisioning
1. **Bundled Final Contract:** Combines plan terms, waiver, and payment authorization into a single reviewable PDF-backed e-signature event, stored immutably with a SHA-256 content hash for dispute resolution.
2. **Instant Digital Wallet Pass:** Upon successful payment, the system generates an Apple Wallet (.pkpass) and Google Wallet pass containing a rotating barcode/NFC token, member photo, tier badge, and push-update capability (e.g., automatically reflects a freeze or tier change without reissuing the pass).
3. **Welcome Journey Orchestration:** Automated triggers for orientation session booking, trainer intro call scheduling, and a day-1/day-7/day-30 engagement nudge sequence to combat early-stage churn (the highest-risk churn window).

---

## 3. Data Models & Schemas

### 3.1 Enrollment Application (`EnrollmentApplication`)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "EnrollmentApplication",
  "type": "object",
  "properties": {
    "applicationId": { "type": "string", "format": "uuid" },
    "studioId": { "type": "string", "format": "uuid" },
    "channel": { "type": "string", "enum": ["WEB", "MOBILE_APP", "KIOSK", "SALES_REP", "AGGREGATOR_HANDOFF"] },
    "planId": { "type": "string" },
    "promoCode": { "type": "string" },
    "waiverSignature": {
      "signedAt": { "type": "string", "format": "date-time" },
      "waiverVersion": { "type": "string", "example": "v3.2" },
      "signatureHash": { "type": "string" }
    },
    "parq": {
      "flagged": { "type": "boolean" },
      "responses": { "type": "object" }
    },
    "paymentToken": { "type": "string", "example": "tok_vault_9b21" },
    "status": { "type": "string", "enum": ["STARTED", "WAIVER_SIGNED", "PAYMENT_VERIFIED", "CONTRACT_SIGNED", "COMPLETED", "ABANDONED"] }
  },
  "required": ["applicationId", "studioId", "channel", "status"]
}
```

### 3.2 Digital Wallet Pass Record (`WalletPass`)
```json
{
  "passId": "pass_4471a",
  "memberId": "usr_member_442",
  "platform": "APPLE_WALLET",
  "serialNumber": "GYM-STD101-00442",
  "tokenType": "NFC_ROTATING",
  "tierBadge": "PLATINUM",
  "lastPushUpdateAt": "2026-10-04T14:00:00Z",
  "status": "ACTIVE"
}
```

---

## 4. User Stories & Acceptance Criteria (Gherkin Format)

### Scenario 1: Self-Serve Digital Enrollment Under 3 Minutes
```gherkin
Feature: Rapid Digital Enrollment
  As a prospective member
  I want to sign up for a membership entirely from my phone
  So that I can start working out today without paperwork

  Scenario: Successful end-to-end mobile enrollment
    Given I open the enrollment link and select the "Gold" plan
    When I complete the waiver e-signature and PAR-Q questionnaire
    And I enter a valid payment method via the hosted payment field
    And I e-sign the final membership contract
    Then my membership status should become "ACTIVE"
    And an Apple/Google Wallet pass should be provisioned within 60 seconds
    And I should receive a welcome SMS with an orientation booking link
```

### Scenario 2: PAR-Q Flagged Response Soft-Block
```gherkin
Feature: Health Screening Safety Gate
  As a studio operator
  I want members with flagged health conditions to be advised before high-intensity classes
  So that we reduce liability and promote member safety

  Scenario: Member flags a cardiovascular condition during PAR-Q
    Given a prospective member answers "Yes" to "Do you have a known heart condition?"
    When the enrollment flow evaluates the PAR-Q responses
    Then the application should be marked "flagged: true"
    And the member should see a recommendation to obtain physician clearance
    And the member should still be allowed to complete basic facility-access enrollment
    But high-intensity class booking should require an uploaded physician clearance note
```

---

## 5. Operational Dashboard & Reporting KPIs

1. **Funnel Conversion Rate (%):** Completed enrollments ÷ started applications, tracked per channel (Target: ≥ 38% web/mobile).
2. **Average Enrollment Completion Time:** Median seconds from application start to contract signature (Target: < 180 seconds digital self-serve).
3. **Waiver/PAR-Q Compliance Rate:** % of active members with a current-version signed waiver on file (Target: 100%).
4. **Wallet Pass Provisioning Latency:** p95 seconds from payment confirmation to pass delivery (Target: < 60 seconds).
