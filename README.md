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
- **Storage**: Persistent collection files stored in `database/data/` (`members.db`, `studio.db`, `classes.db`).
- **Initial Seeds**: Tracked in `database/seeds/` (`members.json`, `studio.json`).

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health status and database engine info |
| `GET` | `/api/members` | List members with filters (`search`, `tier`, `status`, `payment`) |
| `GET` | `/api/members/:id` | Get single member record |
| `POST` | `/api/members` | Register new member |
| `PUT` | `/api/members/:id` | Update member or membership subdocument |
| `DELETE` | `/api/members/:id` | Remove member document |
| `POST` | `/api/members/:id/renew` | Quick renew (+N months) |
| `POST` | `/api/members/:id/check-in` | Turnstile NFC scan simulation (updates streak & visit history) |
| `GET` | `/api/studio` | Studio details, amenities, hours, trainers & announcements |
| `PUT` | `/api/studio` | Update studio details |
| `GET` | `/api/classes` | List studio classes with available spots |
| `POST` | `/api/classes/:id/book` | Reserve spot in a class |
| `POST` | `/api/classes/:id/cancel` | Cancel class booking |
| `POST` | `/api/seed/reset` | Reset database back to default seed documents |

---

## 🏋️‍♂️ Frontend Features
- **Admin Management Portal**: Real-time KPI cards (MRR, Active %, Expirations < 30 days, Overdue accounts), search, multi-filter, member registration & editing modal, duration presets, 1-click renewal, and delete confirmation.
- **Member Portal**: Interactive digital wallet gym pass with barcode and turnstile scan simulator, personal profile editor, membership perks checklist, workout streak tracker, studio amenities showcase, trainer roster, and interactive class booking.
- **Resilient Connectivity**: Live API mode with automatic fallback to local cache if the backend is unreachable.
