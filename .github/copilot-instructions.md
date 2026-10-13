# Copilot instructions

## Purpose

This repository is a staged gym-management demo that evolves in implementation phases. The goal of any AI coding agent is to implement the next feature slice in the approved roadmap sequence without drifting into deferred or out-of-scope work. Follow the product roadmap and the current progress tracker before selecting a feature or patch.

## Required reading order before new work

Before editing code, read these in order:

1. `PROGRESS.md` — current delivery status and last completed work.
2. `product requirement/07_iterative_implementation_roadmap.md` — authoritative roadmap and phase sequencing.
3. The PRD for the active phase, e.g.:
   - `product requirement/01_gym_studio_maintenance.md` for facility/maintenance work
   - `product requirement/02_gym_studio_offerings.md` for studio offerings and scheduling
   - `product requirement/03_members_enrollment.md` for member onboarding
   - `product requirement/04_membership_maintenance.md` for lifecycle work
4. `docs/solution-architecture.md` — target-state architectural intent only; not the current runtime architecture.

Do not infer scope from memory or from unrelated docs alone. The roadmap is the canonical ordering mechanism.

## Product and architecture reality

- The app is a TypeScript full-stack demo with two separately run services:
  - `api/` is an Express REST API.
  - `ui/` is a React + TypeScript SPA.
- The database in the current codebase is NeDB, not PostgreSQL. `api/src/db.ts` is the source of truth for persistent collections and seed initialization.
- `database/data/` stores runtime `.db` files. `database/seeds/` contains seed JSON used to initialize a clean demo state; never treat `.db` files as source-of-truth seed data.
- `docs/solution-architecture.md` describes a future production-state modular monolith with PostgreSQL and a richer operational architecture. Treat that as strategic design guidance, not as evidence that the repo already includes those services.

## Current implementation constraints

- Payment processing remains explicitly deferred to Phase 7. Do not implement payment collection, card tokenization, recurring billing, settlement, or revenue reconciliation unless the task explicitly targets the final Phase 7 work.
- Keep the current no-payment architecture intact. Any feature work should preserve the existing membership lifecycle semantics and offline/manual payment confirmation patterns.
- Phase ordering matters more than feature richness. If there is a next phase, implement only that phase’s slice instead of broadening scope prematurely.
- The project uses build validation as the practical safety check because there is no configured test suite.

## Project structure

- `api/src/server.ts` initializes the database and mounts routers under `/api`.
- `api/src/routes/` contains endpoint handlers; each router should be mounted in the server with the correct prefix.
- `api/src/db.ts` owns datastore creation, indexes, seeding, and reset behavior.
- `api/src/types.ts` defines backend domain model types.
- `ui/src/App.tsx` owns global state and orchestration.
- `ui/src/components/admin/` and `ui/src/components/member/` contain view logic and feature UI.
- `ui/src/services/apiService.ts` and `ui/src/services/storageService.ts` are the integration points for all API and offline-cache access.
- `ui/src/types/index.ts` mirrors API-facing types used by the client.

## Coding standards for this repo

- Keep API endpoints grouped in `api/src/routes/` and mount each router in `api/src/server.ts`.
- Route paths are relative to the mounted prefix. Example: `/` in the member router maps to `/api/members`.
- Use NodeNext module resolution in API TypeScript files. Keep `.js` extensions on relative imports.
- Preserve the API response envelope in all endpoints: usually `{ success, data }` or `{ success, error }`.
- Update both backend and frontend type definitions when a contract changes.
- Keep persistence and offline-fallback behavior centralized in the service layer instead of embedding localStorage or custom fetch logic inside components.
- Keep seed changes in `database/seeds/` and avoid committing generated runtime data from `database/data/`.
- When a feature is full-stack, update both the API and UI in the same change; do not leave backend/API work or front-end state mismatched.
- Prefer implementing the minimum meaningful slice needed for the chosen phase instead of creating a broad, speculative framework.

## Implementation workflow for AI agents

1. Read `PROGRESS.md` and the roadmap before making code changes.
2. Identify the active phase and the exact feature slice being implemented.
3. Inspect the relevant API route, service, and UI components that are closest to the requirement.
4. Keep scope to one phase and one capability area at a time.
5. Update the related model types and seed data if the feature requires new public structure.
6. Validate with the smallest relevant command, usually `npm run build` from the repo root.
7. Update `PROGRESS.md` at the end of the session to reflect new work and current phase status.

## Phase and scope guardrails

- Do not drift to Phase 7 payment or settlement work unless the task is explicitly about payment processing.
- Do not implement future-state PostgreSQL architecture or cross-service patterns in the current app unless the document explicitly calls for a migration task.
- Do not add “nice-to-have” features that are not part of the current roadmap phase unless they are required for correctness in the current feature slice.
- Use the product requirement documents as the source of truth for business behavior. Use the architecture doc to understand the intended future direction, not the current runtime shape.

## Reference documents

- Roadmap: `product requirement/07_iterative_implementation_roadmap.md`
- Project tracker: `PROGRESS.md`
- Facility/operations phase: `product requirement/01_gym_studio_maintenance.md`
- Offerings/scheduling phase: `product requirement/02_gym_studio_offerings.md`
- Membership lifecycle: `product requirement/04_membership_maintenance.md`
- Architecture target state: `docs/solution-architecture.md`

## Build and validation commands

Run from the repository root unless a command explicitly changes directory:

| Purpose | Command |
| --- | --- |
| Build API and UI | `npm run build` |
| Build API only | `npm run build:api` |
| Build UI only | `npm run build:ui` |
| Lint UI | `npm run lint --prefix ui` |
| Run API in watch mode | `npm run dev:api` |
| Run UI dev server | `npm run dev:ui` |
| Start built API | `npm run start:api` |

There is no configured test runner or checked-in test suite at present. TypeScript compilation is the current validation gate.

## Final rule for contributions

If an implementation choice is unclear, prefer the interpretation that preserves roadmap sequencing, current system constraints, and the existing NeDB architecture over a more ambitious future-state design.
