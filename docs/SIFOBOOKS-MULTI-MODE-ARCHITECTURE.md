# SifoBooks multi-mode architecture

SifoBooks keeps one business application and supports multiple deployment modes.

## Editions
- Offline — Windows/local installation, SQLite, no Internet required.
- Network — one office/server installation with PostgreSQL and browser/POS clients on the LAN.
- Cloud — PostgreSQL-backed hosted deployment accessible over HTTPS.
- Hybrid — local/offline operation with queued synchronization to a remote service.
- PWA — the existing Vite PWA shell is shared across web and installable clients.

## Data rules
- SQLite is for a single-machine/local installation.
- Network clients communicate with the SifoBooks server/API; they never open a shared SQLite file.
- PostgreSQL is the target database for multi-user/network/cloud deployments.
- Offline transactions are represented by durable sync queue records before remote synchronization.
- Sync operations require idempotency keys and version numbers so retries do not create duplicate accounting transactions.
- Conflicts are recorded instead of silently overwriting accounting data.

## Recovery and migration
The old Lovable/Supabase database is treated as an immutable source during migration.
1. Backup source.
2. Inspect schema and row counts.
3. Stage mappings.
4. Import into a migration-safe target.
5. Reconcile counts and accounting totals.
6. Activate the migrated company.

The migration tables migration_runs and migration_items are intentionally additive and can be used for Supabase/PostgreSQL-to-SifoBooks reconciliation.

## Backups
The existing desktop startup backup remains active. backup_catalog adds metadata for verified backups and future cloud/server backup providers.

## Printing
print_agents and print_jobs provide the data model for a local print bridge. Cloud/network deployments can queue a print job to a workstation without exposing a printer directly to the Internet.

## Licensing
license_activations stores installation-level activation state. License signing/issuance remains server-side; private signing keys must never ship inside the desktop application.

## Runtime configuration
- SIFOBOOKS_MODE=offline|network|cloud|hybrid
- SIFOBOOKS_DATABASE=sqlite|postgres
- SIFOBOOKS_HOST=127.0.0.1
- SIFOBOOKS_OFFLINE_ENABLED=true|false
- SIFOBOOKS_SYNC_ENABLED=true|false
- SIFOBOOKS_PWA_ENABLED=true|false
- SIFOBOOKS_PRINTING=system|local_bridge|network

The current UI and accounting modules remain unchanged by this foundation.
