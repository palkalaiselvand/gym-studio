# Gym Studio Document Database

> This folder describes the current demo scaffold, which uses NeDB. The production architecture targets self-hosted PostgreSQL Community Edition (open-source and no license fee); operating infrastructure, backups, and support may still incur costs. See [the solution architecture](../docs/solution-architecture.md). No database migration is included in this documentation change.

This folder stores the database data, initial seeds, and configurations for the open-source document database engine.

## Document Database Architecture
- **Engine**: Open-Source Document Database (`@seald-io/nedb` persistent disk store) with seamless optional MongoDB / MongoDB Atlas connectivity via `MONGODB_URI`.
- **Format**: JSON Document format (schema-flexible, nested documents, arrays of subdocuments).
- **Collections**:
  - `members`: Gym members with nested emergency contact, membership tier, validity period, and check-in history.
  - `studio`: Studio details, amenities, certified trainer roster, announcements, and guidelines.
  - `classes`: Studio class schedules with real-time capacity and reservation tracking.

## Directories
- `data/`: Active persistent database files (`members.db`, `studio.db`, `classes.db`) generated and queried by the API.
- `seeds/`: Initial documents (`members.json`, `studio.json`) used for seeding the database upon first startup or reset.
