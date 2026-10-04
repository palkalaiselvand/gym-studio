# Gym Studio Membership Management Platform

Full-stack gym management platform with a React + TypeScript SPA, RESTful API, and an open-source document database.

```
├── ui/              # React + TypeScript SPA (Vite, Lucide icons, glassmorphism theme)
├── api/             # Express + TypeScript backend REST API
└── database/        # Open-source document database (NeDB / MongoDB) & seeds
    ├── data/        # Persistent database files (members.db, studio.db, classes.db)
    └── seeds/       # Initial seed documents (members.json, studio.json)
```

---

## ⚡ Quick Start

### 1. Start the Backend API & Database
Configure `api/.env` first. For a new database, set both `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 12 characters) to bootstrap the first administrator. Existing administrator passwords are not overwritten on restart.

```bash
cd api
npm install
npm run dev
```
The API starts on `http://localhost:5000` and automatically connects to the persistent document database in `database/data/`.

- Health check: `http://localhost:5000/api/health`
- Members API: `http://localhost:5000/api/members`
- Studio API: `http://localhost:5000/api/studio`
- Classes API: `http://localhost:5000/api/classes`

### 2. Start the Frontend UI
In a separate terminal:
```bash
cd ui
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. The UI will automatically detect and connect to the live backend API and show a `Live DB` badge in the header.

---

## 🗄️ Database Architecture
- **Engine**: Open-Source Document Database (`@seald-io/nedb`) providing full MongoDB-compatible document storage without requiring Docker or an external daemon installed.
- **Optional MongoDB / Atlas Support**: Simply set `MONGODB_URI` in `api/.env` to point to any remote MongoDB cluster or local MongoDB instance.
- **Storage**: Persistent collection files stored in `database/data/` (`members.db`, `studio.db`, `classes.db`, `enrollments.db`).
- **Initial Seeds**: Tracked in `database/seeds/` (`members.json`, `studio.json`).

> The database section and running code describe the current demo scaffold. The production target is self-hosted PostgreSQL Community Edition, an open-source database with no license fee; infrastructure and operations may still have costs. The current demo database is unchanged. See [docs/solution-architecture.md](docs/solution-architecture.md).

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health status and database engine info |
| `POST` | `/api/auth/login` | Sign in and start a database-backed session |
| `GET` | `/api/auth/me` | Restore the current session and CSRF token |
| `POST` | `/api/auth/logout` | Revoke the current session |
| `GET` | `/api/auth/users` | List staff accounts (admin) |
| `POST` | `/api/auth/users` | Create a staff or franchise-owner account (admin) |
| `PATCH` | `/api/auth/users/:id` | Disable/enable or reset a staff account (admin) |
| `GET` | `/api/enrollments/plans` | Published membership plans and monthly prices |
| `GET` | `/api/enrollments/waiver` | Current sample waiver text/version (requires legal review) |
| `POST` | `/api/enrollments` | Save signed enrollment and create a member account; membership remains pending |
| `GET` | `/api/members` | List members (admin, staff, franchise owner) |
| `GET` | `/api/members/:id` | Get an authorized member record |
| `PATCH` | `/api/members/:id/duplicate-review` | Complete staff review of a possible name/phone duplicate |
| `POST` | `/api/members/:id/activate` | Activate after a staff member confirms payment was collected outside the app |
| `POST` | `/api/members/:id/renew` | Renew after staff confirms payment was collected outside the app |
| `POST` | `/api/members/:id/check-in` | Staff/admin recorded check-in for an active, paid member |
| `GET` | `/api/studio` | Studio details, amenities, hours, trainers & announcements |
| `PUT` | `/api/studio` | Update studio details (admin) |
| `GET` | `/api/classes` | List studio classes with available spots |
| `GET` | `/api/classes/bookings/me` | List the signed-in member's class reservations |
| `POST` | `/api/classes/:id/book` | Reserve a spot (active, paid member only) |
| `POST` | `/api/classes/:id/cancel` | Cancel the signed-in member's reservation |
| `GET` | `/api/access/pass` | Issue a short-lived signed QR access token |
| `POST` | `/api/access/verify` | Validate and consume a QR token (staff/admin access reader) |
| `POST` | `/api/seed/reset` | Reset demo data (admin) |

### Phase 1 enrollment status

Use **Join the studio** in the UI to select a plan, submit contact details, complete the health-screening questionnaire, accept the sample waiver and contract summary, and sign by typing the member's name. A guardian co-signature is collected for applicants under 18. Individual health answers and date of birth are not retained; only the health-clearance flag and document-signature evidence are recorded.

Authentication uses the local database: passwords are scrypt-hashed, opaque sessions are stored by token hash, cookies are HttpOnly/SameSite, and authenticated mutations require a session CSRF token. Public enrollment creates a member account; the initial administrator is bootstrapped from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Configure `UI_ORIGINS` for the browser origins you use.

Enrollment creates a pending member and account. Payment processing is intentionally deferred: no card/bank data is collected and no processor is integrated. Staff/admin can record an explicit confirmation that payment was collected outside the app before activating or renewing a member. Only active, paid, unexpired accounts can book classes or receive a rotating, signed, one-use in-app QR token; staff/admin access readers can validate it through `/api/access/verify`. This is not an Apple/Google Wallet pass and no physical scanner integration is included.

Possible duplicate screening compares normalized name and phone and queues a staff review; it is not identity verification. No government ID, selfie, or liveness data is collected. SMS welcome nudges, orientation automation, provider-based wallet issuance, payment, and legal review of the sample waiver still require external services or operational setup. This remains a development prototype, not a production-ready deployment.

---

## 🏋️‍♂️ Frontend Features
- **Admin Management Portal**: Member directory and filters, enrollment duplicate-review queue, explicit offline-payment activation/renewal confirmations, guarded member edits, and demo reset for administrators.
- **Member Portal**: Profile self-service, membership status, studio details, health-clearance-aware class reservations, and a rotating signed QR access pass after activation.
- **Protected data**: Member and staff records are fetched from the authenticated API; there is no local-storage fallback for member PII or write operations.
