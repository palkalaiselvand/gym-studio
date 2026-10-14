# Gym Studio API

The Express/TypeScript API stores demo data in NeDB under `database/data/`. Set `DATA_DIR` to use a different local directory (useful for isolated development and smoke tests); the default remains `database/data/`.

## Authentication and access control

Set paired `ADMIN_EMAIL` and `ADMIN_PASSWORD` values before first startup to create the initial administrator; the password must be at least 12 characters. `UI_ORIGINS` is a comma-separated exact-origin allowlist for credentialed browser requests. `STUDIO_ID` selects the studio assigned to new accounts.

Passwords use scrypt hashes. The API issues opaque, database-backed 12-hour HttpOnly/SameSite cookies and a CSRF token; send that token in `X-CSRF-Token` on every authenticated mutation. Roles are `admin`, `staff`, `franchise-owner`, and `member`. Member sessions can access only their own member record and update only phone/emergency contact. Admin/staff can manage the directory; franchise owners have read-only directory access. Do not use the development cookie configuration over plain HTTP in production; deploy behind HTTPS and set `NODE_ENV=production`.

An administrator can manage staff/franchise-owner credentials through `/api/auth/users` or the Team access panel. Staff accounts are scoped to the administrator's studio; disabling an account or resetting its password revokes existing sessions. Additional administrators are not created through the staff-management endpoint.

## Enrollment API

- `GET /api/enrollments/plans` returns the available membership tiers and monthly prices.
- `GET /api/enrollments/waiver` returns the current sample waiver text and version.
- `POST /api/enrollments` validates and records an enrollment application, creates a member login, and stores typed member/guardian signatures with waiver and contract hashes.

The enrollment route stores only the health-screening result/clearance flag, not individual PAR-Q answers or date of birth. A possible duplicate based on normalized name/phone requires staff review; this is not government-ID or liveness verification. Enrollments create members with `pending` status. Payment processing is not integrated and payment details are neither requested nor stored. Staff/admin may activate or renew only after explicitly confirming payment was collected outside the application; the app records the confirming user and time.

## Membership lifecycle (Phase 2 non-payment scope)

- Members may schedule a pause with a valid start date and resume date at least 14 days apart, up to 90 pause days per calendar year. Access is blocked only during the pause interval; the API reconciles scheduled starts and resumes at startup, on member reads, and every minute. Members see an in-app reminder during the three days before resume.
- Upgrade and downgrade requests are stored for the day after the current membership end date. They do not change current access or price early, and can be cancelled before their effective date.
- Cancellation requires an exit reason and takes effect after the recorded membership end date, preserving access through that date. The API records accepted pause/downgrade offers or declined offers as retention outcomes.
- Existing memberships without a recorded contract term use their stored end date as the cancellation effective date.

These are lifecycle and access records only. The app does not collect payment data, calculate proration, pause charges, issue refunds, or run payment dunning. Recurring billing, processor integrations, payment reconciliation, wallet synchronization, family/corporate billing, and transaction settlement are deferred to final Phase 7. See the [roadmap](../product%20requirement/07_iterative_implementation_roadmap.md).

## Class bookings and QR access

Members can list, reserve, and cancel their own class bookings. Booking requires an active, paid membership and enforces physician-clearance restrictions for high-intensity classes. Available spots and reservation records are persisted.

`GET /api/access/pass` issues a 30-second HMAC-signed token only to an active, paid member. `POST /api/access/verify` is restricted to authenticated admin/staff access readers, checks the token's signature, expiry, studio, current membership status, and one-time use, then records the check-in. It is an in-app QR token, not an Apple/Google Wallet pass; scanner hardware integration is not included.

The sample waiver requires legal review. SMS onboarding, automated calendar booking, trainer-intro scheduling, native wallet providers, and payment require external services and are not configured. Use the root README for prototype limitations and local setup.

## Orientation requests

- Members use `GET /api/orientations/me` to view their own requests, `POST /api/orientations` to submit a preferred date/time with an optional note (up to 300 characters), and `DELETE /api/orientations/:id` to cancel a pending request.
- Admin/staff use `GET /api/orientations` to review requests and `PATCH /api/orientations/:id/status` with `confirmed` or `declined` to record a manual decision. A member may have only one pending request at a time.

Submitting a preference does not book a calendar slot or send a notification. Staff confirmation is handled in the admin dashboard; displayed times are studio-local preferences and staff must follow up through existing channels.

## License and support operations (Phase 6)

`GET /api/license` reports the local deployment license state. In production, configure `LICENSE_PUBLIC_KEY` with the vendor's Ed25519 public key and import a signed file through `POST /api/license/import` as an admin. The API validates and stores the envelope locally; license checks do not contact a vendor service. Unsigned `PUT /api/license` is limited to non-production demo use.

Once a signed license is expired or a production deployment is unlicensed, authenticated admin write operations are denied except license renewal, sign-out, access verification, member check-in, and facility maintenance/reporting. Member access and self-service are not license-gated. Missing or invalid verification configuration fails closed for admin writes.

Admin-only `GET /api/support/export` downloads customer data without password hashes, sessions, access-pass tokens, or signing material. `GET /api/support/diagnostics` returns aggregate runtime and datastore diagnostics; logs remain in the container runtime. Both endpoints contain operational/customer information and require admin authentication.

The first-party Docker Compose installer, license signer/key generator, backup/restore and update/rollback operations are described in [the customer deployment runbook](../docs/phase6-customer-deployment.md). The current license SKU flags/caps are not enforced across every feature, and the deployment guide lists packaging and acceptance-test gaps that remain before Phase 6 can be considered complete.

## Development

From the repository root, run `npm run dev:api` or `npm run build:api`.

## Branding and localization

GET /api/branding is public so sign-in and enrollment can be themed; PUT /api/branding is admin-only (CSRF-protected) and validates the studio name, tagline, primary color (hex), country code, logo (PNG/JPEG/WebP/SVG data URL, about 130 KB max), dark/light theme, and font family. Currency and locale are derived from the country code from a fixed list. Currency changes formatting only; stored prices are not converted. Settings persist in config.db and survive demo-data resets.
