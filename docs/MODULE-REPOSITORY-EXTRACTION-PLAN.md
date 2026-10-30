# SifoBooks Module Repository Separation Plan

Status: planning only. The existing monolith remains the production source of truth until each extracted repository is built, configured, tested, and migrated.

## Target repositories

Create these repositories under `pritchardsikazwe`:

- `sifobooks-platform` — central landing page, tenant/customer records, module catalogue, subscriptions, billing, access entitlements, shared navigation and support.
- `sifobooks-hotel` — standalone hotel operations and hotel-specific database migrations.
- `sifobooks-accounting` — general ledger, journals, posting engine, financial reports and accounting migrations.
- `sifobooks-pos` — till/register workflows, checkout, receipts, cashier controls and POS migrations.
- `sifobooks-inventory` — stock, warehouses/locations, stock movements, inventory reports and inventory migrations.
- `sifobooks-restaurant` — restaurant tables/checks, orders, kitchen workflow and restaurant migrations.
- `sifobooks-shared-contracts` — versioned API contracts, shared types and integration events only; no operational database.

## Existing source locations identified

### Hotel
- `src/routes/_authenticated/hotel.tsx`
- `src/routes/_authenticated/hotel/**`
- `src/components/industry/Hotel*.tsx`
- `src/lib/hotel-*.ts`
- `src/lib/demo/hotel.ts`
- `src/lib/__tests__/hotel-*.test.ts`
- Hotel-related entries in `docs/SIFOBOOKS_HOTEL_SCHOOL_ERP_STANDARD_2026.md`

### POS
- `src/routes/_authenticated/pos*`
- `src/pages/pos/**`
- `src/components/pos/**`
- `src/lib/pos*.ts`, `src/lib/worker-pos.ts`
- `src/lib/__tests__/pos-*.test.ts`
- POS migrations under `cloud/migrations/`, `drizzle/migrations/` and `src/lib/db/migrations/`

### Inventory
- `src/routes/_authenticated/inventory*`
- `src/routes/_authenticated/inventory/**`
- `src/core/inventory/**`
- `src/lib/inventory*.ts`, `src/lib/inventory/**`
- Inventory-related migrations and QA scripts

### Accounting
- `src/core/accounting/**`
- `src/lib/posting*.ts`, `src/lib/operationalPosting.ts`, `src/lib/bank-posting.ts`, `src/lib/payroll-posting.ts`
- `src/platform/windows/accounting*.ts`
- Accounting-related migrations and posting tests

### Restaurant
- `src/routes/_authenticated/restaurant*`
- `src/components/restaurant/**`
- `src/lib/restaurant*.ts`, `src/lib/restaurant/**`
- Restaurant-related migrations and tests

## Mandatory architecture rules

1. Keep the current `sifobooks-3e453758` repository intact during extraction. Do not delete module code or migrations from it until each new repository is validated and deployed.
2. Each extracted module gets its own Supabase project, environment variables, database migrations, RLS policies, storage configuration, CI checks and deployment instructions.
3. Never copy production secrets, service-role keys, real customer data, or database dumps into Git.
4. The platform owns customer subscription/entitlement decisions. Modules verify signed/authenticated entitlements server-side; hiding UI is not authorization.
5. Modules communicate through authenticated, versioned APIs/webhooks. Do not directly query another module's database.
6. Accounting, POS and Inventory have important transactional dependencies. Define idempotent events and reconciliation before enabling cross-module posting.
7. Hotel must operate without Accounting/POS/Inventory subscriptions. Optional integrations must fail safely without blocking hotel reservations, check-in/out or hotel reports.
8. Keep tenant isolation and per-tenant authorization enforced in every module's database/RLS policies and server endpoints.
9. Migrate schema first, then controlled data, then test reconciliation. Preserve IDs or provide explicit ID mapping.
10. Run tests and production build for each extracted app before routing real users to it.

## Recommended extraction order

1. Hotel first (clearest standalone product); establish its independent Supabase project and deployment.
2. Restaurant as standalone or a Hotel add-on, with an explicit optional integration contract.
3. Inventory.
4. POS.
5. Accounting and posting integrations.
6. Central platform module catalogue and subscription-driven launch links.

## Completion checklist for each repository

- [ ] Repository created and access permissions confirmed
- [ ] Application source extracted without importing unrelated monolith-only routes
- [ ] Dependencies and environment variables documented
- [ ] Dedicated Supabase project configured
- [ ] Migrations, RLS, functions and storage policies reviewed
- [ ] Authentication and tenant isolation tested
- [ ] API contracts and optional integrations tested
- [ ] Unit/integration tests and production build pass
- [ ] Backup/restore and rollback procedure documented
- [ ] Deployment URL and central-platform launch configuration tested
- [ ] Existing monolith remains functional until cutover is approved

## Current limitation

This plan documents source boundaries and safe extraction sequencing. Repository creation and Supabase project provisioning are separate administrative actions; do not claim a module has been extracted or isolated until its new repository and database are actually created and verified.
