# Copilot instructions

## Project overview

Gym Studio is a TypeScript full-stack demo with two separately run applications:

- `api/` is an Express REST API. `api/src/server.ts` initializes the database before mounting the member, studio, class, and seed routers under `/api`. Route handlers use the database helpers in `api/src/db.ts` and return JSON responses, usually with a `success` flag and `data` or `error`.
- `ui/` is a React + TypeScript SPA. `ui/src/App.tsx` owns the top-level admin/member view and shared member, studio, and notification state; feature components live under `ui/src/components/admin/` and `ui/src/components/member/`.
- The UI calls the API through `ui/src/services/apiService.ts`. Successful reads are cached by `storageService`; when the API is unavailable, the UI uses browser `localStorage` and mock defaults from `ui/src/data/mockData.ts`.
- `database/data/` holds the API's persistent NeDB files, while `database/seeds/` contains the seed JSON used on first start and reset. `api/src/db.ts` is the source of truth for how these files are initialized.

The implementation currently runs on NeDB. `docs/solution-architecture.md` describes a future production target based on a self-hosted PostgreSQL modular monolith; treat that as the target design, not as a description of the running code or an implemented migration.

## Build, lint, and run

Run commands from the repository root unless a command explicitly changes directory:

| Purpose | Command |
| --- | --- |
| Build API and UI | `npm run build` |
| Build API only | `npm run build:api` |
| Build UI only | `npm run build:ui` |
| Lint UI | `npm run lint --prefix ui` |
| Run API in watch mode | `npm run dev:api` |
| Run UI dev server | `npm run dev:ui` |
| Start built API | `npm run start:api` |

Install dependencies separately with `npm install --prefix api` and `npm install --prefix ui`. Run the API and UI in separate terminals. The API defaults to port `5000`; set `PORT` in `api/.env` to change it. The UI defaults to `http://localhost:5173` and uses `VITE_API_URL` when set, otherwise `http://localhost:5000/api`.

There is no configured test runner, test script, or checked-in test suite at present, so there is no single-test command. The API build runs TypeScript compilation; the UI build runs TypeScript project compilation followed by Vite.

## Codebase conventions

- Keep API endpoints grouped in `api/src/routes/` and mount each router in `api/src/server.ts`; route paths are relative to their mounted prefix (for example, `/` in the members router maps to `/api/members`).
- API source uses NodeNext module resolution. Keep `.js` extensions on relative imports in API TypeScript files.
- The API and UI define corresponding domain types separately in `api/src/types.ts` and `ui/src/types/index.ts`; update both when changing a type exchanged over the API.
- Keep browser persistence and offline behavior behind `ui/src/services/storageService.ts` and `ui/src/services/apiService.ts` rather than implementing separate fetch or `localStorage` logic inside views.
- UI feature-specific components belong in the existing `admin/` and `member/` component groups. Shared presentation and application state are composed at the `App.tsx` level.
- Preserve the API's JSON response envelope when adding endpoints, and keep the frontend's API and local-cache behavior consistent for the same user action.
- Seed changes belong in `database/seeds/`; persistent `.db` files under `database/data/` are runtime data, not seed definitions.
