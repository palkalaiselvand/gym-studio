# Gym Studio API (Backend)

This folder is reserved for the backend service/API.

## Planned Architecture
- **Framework**: Express / Fastify (Node.js/TypeScript) or FastAPI / ASP.NET Core
- **Authentication**: JWT / OAuth2 with Role-Based Access Control (Admin, Member, Trainer)
- **Endpoints**:
  - `POST /api/auth/login` - User authentication
  - `GET /api/memberships` - List memberships (Admin)
  - `POST /api/memberships` - Create membership (Admin)
  - `PUT /api/memberships/:id` - Update membership / plan / status (Admin)
  - `DELETE /api/memberships/:id` - Cancel membership (Admin)
  - `GET /api/members/me` - Profile, current membership, attendance history (Member)
  - `PUT /api/members/me` - Update profile / contact info (Member)
  - `GET /api/studio` - Studio details, facilities, schedule, trainer profiles
