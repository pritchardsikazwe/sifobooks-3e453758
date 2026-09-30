# SifoBooks — Independent Project

This project is an independent TanStack Start application with local SQLite + JWT auth.
It is no longer connected to Lovable, Base44, or Supabase.

## Architecture

- **Frontend**: TanStack Start (React + Vite + SSR)
- **Database**: Local SQLite via `bun:sqlite` (see `src/lib/db/`)
- **Auth**: JWT-based local auth (see `src/lib/db/auth.ts`)
- **Storage**: Local file storage (see `src/lib/db/storage.ts`)
- **Compatibility**: `src/integrations/supabase/client.ts` is a shim that mimics the Supabase JS client API but routes all calls to local SQLite via server functions. This allows 226+ files that use `supabase.from(...)` to work without changes.

## Development

```sh
bun install
bun run dev
```

## Build

```sh
bun run build
```

## Environment Variables

See `.env` for required variables. Key variables:

- `JWT_SECRET` — secret key for JWT signing/verification (auto-generated if not set)
- `DATABASE_PATH` — path to SQLite database file (defaults to `data/sifobooks.db`)
- `AI_API_KEY` — API key for the AI commentary feature (OpenAI-compatible endpoint)
- `AI_API_URL` — base URL for the AI API (defaults to OpenAI)
- `AI_MODEL` — model name for the AI API

- Files ported to the local SQLite layer carry `// @ts-nocheck` and tsconfig uses strict:false + strictNullChecks; the Supabase-compat client is exported as `any`. Why: the external port left ~250 type-only errors; remove per-file as each is typed.
- Backend boundary: hosted builds use Lovable Cloud via src/integrations/supabase/{cloud-client,cloud-client.server}.ts; Windows build sets VITE_SIFOBOOKS_BACKEND=local to use local-client*.ts (SQLite). Why: browser/hosted must never depend on bun:sqlite or Bun globals.
- Deployment modes (cloud, windows-standalone, local-server, hybrid) resolve via src/core/contracts/deployment.ts + getDeploymentMode(); device activation reuses print_devices (unique user+device) — no separate device table. Why: one company across many devices, no duplicate registries.
- ZRA/VSDC goes through src/core/contracts/fiscal.ts FiscalDevicePort; only a real "fiscalized" VSDC response marks a sale fiscalised. Why: keep fiscal integration out of the accounting/POS core.
- Windows desktop writable data (db, backups, config, logs, licence) lives in %ProgramData%\SifoBooks (override SIFOBOOKS_DATA_DIR, or portable.flag beside EXE); legacy {app}\data is copied once, never moved/deleted. Why: Program Files is not user-writable and is replaced on upgrade.
- Windows desktop runtime: single instance per data dir (desktop-port.txt health check), shutdown only via token-protected POST /api/desktop/shutdown (Stop-SifoBooks.ps1); Linux builds hide console by patching PE subsystem 3→2. Why: no duplicate servers on one SQLite DB; Bun cannot hide console when cross-compiling.
- Windows installer: installer/SifoBooks.nsi built on Linux with makensis (nix nsis) → installer-dist/SifoBooks-enterprise-Windows-Setup.exe; Inno template kept for Windows-host builds. Why: Inno Setup needs Windows; NSIS cross-builds.
- Windows sign-in: SifoBooks Cloud is the identity source; online sign-in mirrors the user's existing companies/members/branches/warehouses/locations into SQLite with the same ids (src/lib/db/cloud-link.server.ts), offline falls back to local sign-in. Why: Windows must reuse the cloud company, never create a duplicate.
- Windows company structure (companies, members, branches, warehouses, locations) is written to SifoBooks Cloud first via the cloud-linked session (cloud_links table), then to SQLite with the same id; unreachable cloud = logged offline local-only write. Why: an online Windows user must never get an independent local company.
- Both query engines (local SQLite src/lib/db/query-executor.ts and self-hosted Postgres src/lib/db/cloud-query-executor.ts) resolve embeds as correlated JSON sub-queries, never JOINs, qualify filters/sorts with the main table, and scope embedded rows to the caller's user_id; local tables gain missing cloud columns (nullable, additive) from src/lib/db/cloud-columns.json at startup. Why: JOINs made shared columns ambiguous and multiplied rows; embeds must never leak another tenant's rows.
- Screens of planned/inactive modules are wrapped in ModuleGate (src/components/ModuleGate.tsx), which probes their tables and shows "not yet available" where they don't exist; never create placeholder tables to make a screen load. Why: no clickable screen may be guaranteed to fail, and no fake data models.
- VAT Return / Turnover Tax requests and maths live in src/lib/tax-reports.ts (screens and scripts/tax-report-qa.ts share it). Why: one definition, identical on web and Windows.
- ZRA connector tables (zra_connector_credentials/commands/events) have RLS on with no anon/authenticated access; only the server connector path (service role, src/lib/zra/connector.server.ts getConnectorDb, fails closed) reaches them. Other zra_* tables are owner-only (user_id = auth.uid()). Why: connector credentials/jobs must never be browser-reachable.
- Till sale numbers come only from next_doc_number('POS') inside pos_checkout (advisory lock, next after the highest existing POS-YYYY-NNNN); the terminal's number is ignored. Why: unique, restart-safe, never renumbers history.
