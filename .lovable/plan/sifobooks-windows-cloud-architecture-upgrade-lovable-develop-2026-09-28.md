# SifoBooks Windows + Cloud architecture upgrade (lovable-development only)

## Audit findings (already exists — will be reused, not duplicated)
- Backend split: `backend-mode.ts` switches cloud (hosted) vs local SQLite (Windows, `VITE_SIFOBOOKS_BACKEND=local`).
- Core contracts: `src/core/contracts/{database,runtime,transaction}.ts` with Windows adapters in `src/platform/windows/*` and cloud adapters in `src/platform/cloud/*`.
- Local SQLite + migrations: `src/lib/db/database.ts`, `src/lib/db/migrations/*` incl. multi-mode foundation (`deployment_profiles`, `sync_devices`, `sync_queue`, `migration_runs`, `backup_catalog`, `license_activations`).
- Browser offline queue: `offline-queue.ts` + `offline-db.ts` (IndexedDB, client idempotency keys, retries, conflicts, device id).
- Status UI: `ConnectionIndicator`, `OfflineBanner`, `network-status.ts`.
- Cloud sync protocol: `src/lib/cloud/sync.ts`, `sync-applier.ts`, cloud migration 005 (devices, events, conflicts, idempotency, cursors).
- Devices: `devices-terminals.tsx`, `print_devices`, `printTerminal.ts` device id.
- Onboarding: `/onboarding` company wizard, `/launch` resolver, `/network-setup`.
- ZRA: `src/lib/zra/*`, VSDC connector agent, `zra_invoice_queue`.
- Desktop runtime: `src/desktop/server.ts`, `scripts/build-desktop.ts`, Inno Setup installer.

## Missing pieces to add (small, additive)
1. **Deployment-mode contract**: extend `core/contracts/runtime.ts` with the 4 modes (cloud, windows-standalone, local-server, hybrid) and a single `getDeploymentMode()` resolver; stop the two conflicting mode enums from drifting (keep old names as aliases).
2. **Windows first-run screen** (`/welcome`, local build only): "Create New Company" / "Sign In to Existing Company", routing into the existing signup/onboarding/launch flows. Hosted build redirects `/welcome` to `/`.
3. **Device activation step** after company/branch selection: register device in the existing cloud device registry (tenant + branch + device id) and write the local `deployment_profiles` row. Re-activating on a new PC joins the same company — never creates one.
4. **Startup check service** (`src/lib/platform/startup-checks.ts`): database, schema version, migrations, company/device config, session, connectivity, sync queue. Returns typed diagnostic codes (DB_UNAVAILABLE, MIGRATION_REQUIRED, COMPANY_NOT_CONFIGURED, DEVICE_NOT_REGISTERED, CLOUD_UNAVAILABLE, SYNC_PENDING, PERMISSION_DENIED).
5. **Friendlier error screen**: root error component maps those codes to clear messages (no secrets) instead of the generic "This page didn't load".
6. **Sync status**: unify `ConnectionIndicator` states to ONLINE / OFFLINE / SYNCING / SYNC ERROR with pending-count and last error; never mark synced without server confirmation (already true in queue — verify).
7. **Migration safety**: schema-version table + pre-migration backup via existing `backup-db` logic; migration errors reported, never auto-delete.
8. **ZRA interface only**: `src/core/contracts/fiscal.ts` (`FiscalDevicePort`) with a "not configured" adapter; `fiscalized` only set on a real VSDC success response. No production connection.
9. **Cloud schema (additive only)**: if needed, a `company_devices` table in Lovable Cloud (company_id, branch_id, device_id, device_type, status, last_seen) with GRANTs + RLS by company membership. Checked against `print_devices` first to avoid duplication.

## Out of scope
No module rewrites, no main merge, no production publish, no ZRA production, no business data changes.

## Testing (Preview)
Hosted: signup, onboarding, sign-in, company/branch selection, device registration, offline POS sale via existing IndexedDB queue (network blocked in Playwright), pending state, restore, sync once, no duplicate, second session sees same company, core modules still open.
Windows-specific (SQLite, first-run, local server) cannot run in Preview — verified by typecheck, `windows-schema-qa` and desktop build script only.

## Deliverable
Report with the 13 items requested; then wait for approval.
