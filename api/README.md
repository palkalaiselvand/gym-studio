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

## Class bookings and QR access

Members can list, reserve, and cancel their own class bookings. Booking requires an active, paid membership and enforces physician-clearance restrictions for high-intensity classes. Available spots and reservation records are persisted.

`GET /api/access/pass` issues a 30-second HMAC-signed token only to an active, paid member. `POST /api/access/verify` is restricted to authenticated admin/staff access readers, checks the token's signature, expiry, studio, current membership status, and one-time use, then records the check-in. It is an in-app QR token, not an Apple/Google Wallet pass; scanner hardware integration is not included.

The sample waiver requires legal review. SMS onboarding, orientation scheduling, native wallet providers, and payment require external services and are not configured. Use the root README for prototype limitations and local setup.

## Development

From the repository root, run `npm run dev:api` or `npm run build:api`.
