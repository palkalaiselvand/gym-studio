# Customer Deployment and Phase 6 Operations

This guide describes the self-hosted Docker Compose reference deployment currently provided by the repository. It is a working single-host baseline, not a certification that every Phase 6 exit criterion has passed. The database remains NeDB, data is stored on a Docker volume, TLS is terminated by a customer-managed reverse proxy, and cloud/IaC, Kubernetes, and air-gapped delivery are not included.

## Requirements

- Docker Engine/Desktop with Docker Compose v2.
- A Linux host or customer-managed Docker-compatible environment with outbound access to build/pull the Node 22 and Nginx base images.
- Minimum starting point for a single studio: 2 vCPU, 4 GB RAM, 20 GB persistent storage. These figures are planning guidance only; production sizing has not been benchmarked.
- A DNS name and customer-managed HTTPS reverse proxy for any non-local deployment.
- An Ed25519 public verification key and vendor-signed license file for licensed deployments. Never put the signing private key on a customer host.

The Compose UI binds to `127.0.0.1:8080`; it is not directly exposed to the network. Configure a TLS reverse proxy to forward to that port, preserve the incoming `Host` header, and set `X-Forwarded-Proto: https`. Do not expose the API port directly.

## Fresh installation

From the repository root:

```powershell
Set-Location deployment
node .\install.mjs
```

The installer checks Docker and Compose, asks for the initial admin email and public application origin, and optionally imports a vendor Ed25519 public key. It generates a unique 192-bit bootstrap password, writes `deployment/.env` once, and builds/starts the stack. Save the one-time password in a password manager. The installer does not overwrite an existing `.env`.

The first boot seeds the demo records into the persistent NeDB volume. Replace/remove demo records before production use. The API is reached by the browser through the UI's same-origin `/api` proxy.

For an unlicensed evaluation, leave the verification key empty. The app remains available for member access and safety-critical workflows, but admin mutations are restricted. For a licensed deployment, configure the vendor's public key before importing a signed license. `LICENSE_PUBLIC_KEY` accepts PEM with literal `\n` between lines; restart the API after changing it:

```powershell
docker compose restart api
```

Sign-in sessions use secure cookies in production. The external URL must use HTTPS.

## Offline license workflow

The vendor creates an Ed25519 key pair in a secure, offline-controlled environment:

```powershell
npm --prefix api run license:keygen -- C:\secure\gym-license-private.pem C:\secure\gym-license-public.pem
```

Keep the private key outside the repository, outside customer infrastructure, and in an access-controlled backup. Configure the public key at the customer deployment in `LICENSE_PUBLIC_KEY`.

Create a payload JSON using these fields:

```json
{
  "licenseId": "lic_customer_0001",
  "customerName": "Example Fitness LLC",
  "sku": "GROWTH",
  "issuedAt": "2026-01-01T00:00:00.000Z",
  "expiresAt": "2027-01-01T00:00:00.000Z",
  "gracePeriodDays": 7,
  "maxStudios": 3,
  "maxMembers": 5000,
  "features": ["member-directory", "class-booking", "facility-ops", "brand-customization", "network-roaming"],
  "customDomain": "app.example.com",
  "emailFrom": "members@example.com"
}
```

On the vendor-controlled system:

```powershell
npm --prefix api run license:sign -- C:\secure\payload.json C:\secure\gym-license-private.pem C:\secure\signed-license.json
```

The customer admin signs into the app, opens **Branding & localization**, and imports `signed-license.json`. Signature verification is local and uses the configured public key; no phone-home request is made. Invalid files are rejected without replacing the current license.

The service derives active, grace-period, and expired state from the signed dates. An expired or missing license blocks admin write operations except license renewal, sign-out, access verification, member check-in, and facility incident/maintenance operations. Member self-service, read access, and safety-critical access are not license-gated. On tampered/malformed persisted license data, admin writes fail closed with an explicit service error; access/check-in/facility handling remains available.

SKU feature flags and studio/member caps are represented in the license payload but are **not yet enforced at all feature entry points**. Do not rely on the current tier limits as contractual access controls.

## Backup, restore, update, and rollback

All NeDB files are on the `gym_data` volume. The current backup utility verifies SHA-256 hashes and requires the API container to be stopped to avoid copying a live datastore. Backups are written to `deployment/backups/`; protect this directory because database files include member personal and health data.

Create a backup:

```powershell
docker compose stop api
try {
  docker compose run --rm --no-deps api node /app/api/scripts/data-maintenance.mjs backup
} finally {
  docker compose start api
}
```

Restore a snapshot by ID (copy the folder name under `deployment/backups/`):

```powershell
docker compose stop api
try {
  docker compose run --rm --no-deps api node /app/api/scripts/data-maintenance.mjs restore snapshot-2026-10-12T23-00-00-000Z-a1b2c3d4
} finally {
  docker compose start api
}
```

Restore verifies the manifest and hashes, and first makes a pre-restore snapshot. Run restore only while the API is stopped. Test recovery on a separate deployment before relying on a backup for disaster recovery.

For a source-based patch update, preserve a known-good source revision and use the update helper:

```powershell
node .\update.mjs update 1.0.1
```

It takes a stopped-service backup before rebuilding, tags the local images by semantic version, and checks the UI/API health endpoint. On failure it attempts to restore the prior image version and backup. To explicitly roll back:

```powershell
node .\update.mjs rollback 1.0.0 snapshot-2026-10-12T23-00-00-000Z-a1b2c3d4
```

These tools currently rebuild from a checked-out source tree; there is no signed vendor release registry, artifact provenance verification, database migration framework, or supported LTS policy yet. Schedule the backup command through the customer's OS scheduler and copy backups to customer-controlled off-host storage. A copy under `deployment/backups/` alone is not disaster recovery.

## Export and support diagnostics

An authenticated admin can use **Branding & localization** to download:

- **Export customer data** — versioned JSON containing studio/member/class/enrollment/facility data and account metadata. Password hashes, sessions, access-pass tokens, and license signing material are excluded. The export contains sensitive member data and must be stored/transferred securely.
- **Download support diagnostics** — application/runtime versions, aggregate datastore record counts, license status, and configuration-presence flags. Secret values and database contents are not included.

Runtime logs are written to the customer-managed container runtime. To review the API log stream locally:

```powershell
docker compose logs --no-color --tail 200 api
```

The diagnostics download does not currently package logs. Review and redact logs before sending them to support.

## Current Phase 6 coverage

| Requirement | Current state |
|---|---|
| Docker Compose API/UI bundle and persistent NeDB volume | Implemented; single-host reference only |
| Guided first-run setup and initial admin bootstrap | Implemented as a local CLI prompt; no browser setup wizard |
| Offline-signed Ed25519 license import and expiry behavior | Implemented; requires vendor key provisioning; studio/member caps and feature gates remain incomplete |
| Admin restriction while preserving member access/check-in | Implemented at authenticated admin write boundary, with safety/license-renewal exceptions |
| White-label name/logo/color/currency | Existing admin configuration |
| Custom domain / customer mail and SMS delivery | Metadata only; DNS, outbound delivery, and provider integration remain unimplemented |
| Manual backup/restore and update/rollback helpers | Implemented with integrity checks; scheduling and external storage are operator responsibilities |
| Customer data export and sanitized diagnostics | Implemented; diagnostics do not bundle logs |
| Helm, Terraform, air-gapped bundle, tested hardware sizing | Not implemented |
| Release distribution, verified release signatures/provenance, LTS, support SLAs | Not implemented |
| Clean-room customer install, expiry drill, independent rollback drill, sales sign-off | Not performed; required before declaring Phase 6 complete |

The reference deployment must not be presented as passing the Phase 6 clean-room, independent rollback, trial-sales, or production security exit criteria until those drills have been run and recorded.
