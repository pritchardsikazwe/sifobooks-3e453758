# Sifonet Shared Services Migration Inventory

**Audit date:** 2026-11-02  
**Source repository:** `pritchardsikazwe/sifobooks-3e453758`  
**Audit branch:** `architecture/sifonet-shared-services-inventory`  
**Scope:** Reusable capabilities for SifoProperty, SifoRestaurant, SifoBoarding, SifoButchery and SifoLending.

## 1. Executive findings

SifoBooks already contains a substantial set of reusable business capabilities and several vertical workspaces. The correct migration is extraction and hardening, not a blind copy of the whole SifoBooks application into every product.

Confirmed in source:
- React 19, TypeScript, Vite 8, TanStack Start/Router and Bun 1.3.14.
- A local SQLite compatibility backend and a separate hosted Supabase client path.
- Accounting, chart of accounts, journal posting, cashbook, banking, inventory, invoicing, POS, payroll, reporting, approvals, audit logs, companies/branches and user access foundations.
- ZRA Smart Invoice/VSDC configuration and server-function integration surface, device/connector registration and item mapping.
- SifoPrint discovery, terminal registration, printer routing and a local print queue.
- Browser offline storage, write queue, conflict records, service-worker/PWA support and network monitoring.
- Existing in-core Restaurant, Property, Lending and Boarding House workspaces/routes. These are extraction candidates, not yet independently deployed products.
- No matching Butchery workspace was found in the inspected route tree or expected workspace paths. Butchery needs a purpose-built operational module.

Important distinction: source code and UI presence do not by themselves prove production readiness, successful ZRA certification, reliable cloud synchronisation, or that every print transport is fully implemented. Each capability must pass the acceptance tests in this inventory before it is promoted to a shared production package.

## 2. Source evidence inspected

| Area | Source evidence | Audit observation |
|---|---|---|
| Runtime and packaging | `README.md`, `package.json`, `docs/ARCHITECTURE.md`, `vite.config.ts` | Standalone Bun/SQLite mode and hosted Supabase mode both exist. |
| Backend boundary | `src/integrations/supabase/client.ts`, `local-client.ts`, `cloud-client.ts` | Modules currently use a Supabase-compatible client API; local and cloud implementations differ. |
| Database | `src/lib/db/schema.sql`, `src/lib/db/server-api` (referenced by local client) | SQLite schema and local server-function query boundary exist. Full table/relationship audit remains a separate migration task. |
| Offline data | `src/lib/offline-db.ts`, `src/lib/offline-queue.ts` | IndexedDB caches and pending writes/conflicts exist. Queue replay and data-store coverage need per-product validation. |
| Connectivity | `src/lib/network-status.ts`, `src/lib/pwa/register-sw.ts` | Backend reachability monitoring, sync status and service-worker lifecycle exist. |
| ZRA | `src/routes/_authenticated/zra-smart-invoice.tsx`, `zra-item-mapping.tsx`, `src/lib/zra/server`, `src/lib/zra/connector.functions` | Configuration, device, connector, inventory mapping and queue UI are present. Certification status is not established by this code audit. |
| Printing | `src/routes/_authenticated/printing-settings.tsx`, `src/services/printDiscovery.ts`, `printQueue.ts`, `printRouting.ts`, `printTerminal.ts`, `universalPrintService.ts` | Agent discovery, routing, terminal registration and retry queue exist. |
| Cloud print gateway | `src/routes/api/printing/jobs.ts` | Current handler validates payload but returns HTTP 503 until a network print target is configured. Do not advertise cloud/network printing as complete. |
| Accounting posting | `src/lib/operationalPosting.ts` | Shared journal posting helpers exist for property and school-related transactions; transaction atomicity and account mapping need hardening. |
| Restaurant | `src/routes/_authenticated/restaurant.tsx` and generated route tree | Dedicated restaurant route group and many operational subroutes exist inside SifoBooks. |
| Property | `src/routes/_authenticated/property.tsx`, `src/components/industry/PropertyWorkspace.tsx` | Property workspace reads property, unit, tenant, lease, charge, payment, maintenance and meter records. |
| Lending | `src/routes/_authenticated/lending.tsx`, `src/components/industry/LendingWorkspace.tsx` | Extensive lending navigation: borrowers, applications, assessment, products, portfolio, disbursement, repayment, collections, arrears, guarantors, collateral, savings, investors, mobile money, restructuring, write-offs, KYC and reporting. |
| Boarding | `src/routes/_authenticated/boarding-house.tsx`, `src/components/industry/BoardingHouseWorkspace.tsx` | Houses, rooms/beds, students/residents, allocations, fees, payments, attendance, leave, maintenance, discipline, visitors and meals. |

## 3. Shared service catalogue

These services should be extracted into versioned, provider-neutral packages. Each product consumes only the services it needs.

### Foundation services (all five products)

1. Company onboarding, legal entity profile, TPIN and branch setup.
2. Authentication, session lifecycle, users, roles, permissions and approval policies.
3. Company/branch/terminal scoping and data isolation.
4. Document numbering, sequences, currencies, exchange rates and fiscal periods.
5. Audit events, attachments, notifications and configurable workflows.
6. API conventions, validation, error handling, migrations and observability.
7. Backup, restore, export/import, retention and disaster recovery.
8. Shared SifoHotel-derived design system: top navigation, tabbed workspaces, dashboard grids, responsive tables, touch-first mobile navigation.

### Accounting and transaction services

- Chart of accounts and account mapping.
- Double-entry journals, journal lines, posting validation and reversals.
- Sales invoices, credit/debit notes, receipts and customer statements.
- Purchases, supplier bills, supplier payments and supplier statements.
- Cashbook, bank accounts, reconciliation and payment allocations.
- Expenses, budgets, fixed assets and depreciation where licensed/needed.
- VAT/tax configuration and tax reports.
- Cost of sales, inventory valuation and stock movement posting.
- Period close, trial balance, profit and loss, balance sheet and cash-flow reports.

### ZRA Smart Invoice service

- Taxpayer and branch configuration.
- VSDC/OSDC device registration and lifecycle.
- Secure connector registration, heartbeat and command queue.
- Test/production environment separation.
- Item/classification and tax-code mapping.
- Invoice, credit note, debit note and other supported fiscal document submission.
- Retry-safe submission queue, idempotency, response storage and reconciliation.
- Fiscal receipt identifiers, signature and QR data on supported printed documents.
- Diagnostics, failed submissions, replay controls and audit evidence.

**Hard rule:** no product may claim ZRA certification or production approval solely because it reuses this connector. Confirm the exact software/vendor approval and required ZRA testing/certification for each distributed product/version. Never move taxpayer credentials, private keys or production secrets into client code or a public repository.

### SifoPrint service

- Local Windows/Android agent discovery and secure pairing.
- Terminal/device identity scoped to company and branch.
- Printer discovery, system default printer and configured network printer.
- Routing by job type: till receipt, invoice, kitchen, bar, label, report and A4 document.
- Copy counts, paper profile and per-terminal preferences.
- Durable print queue, retries, duplicate prevention, cancellation and diagnostics.
- Cash-drawer and test-page operations where supported.
- Cloud/LAN relay only after the gateway is implemented, authenticated and tested.

**Known gap:** `src/routes/api/printing/jobs.ts` currently returns 503 when no print target is configured. The local queue/agent path and cloud gateway must be tested separately.

### Networking and offline services

- LAN discovery and terminal registration.
- Local print bridge connectivity.
- Backend reachability status, not just browser online status.
- IndexedDB read caches and durable offline write queue.
- Idempotency keys and duplicate detection.
- Conflict review and resolution; no silent loss of queued transactions.
- Sync monitoring, last-successful-sync timestamp and retry controls.
- PWA update handling and offline-safe upgrades.

**Known gap:** the architecture document describes the cloud sync layer as future direction while the client contains an IndexedDB queue and a cloud Supabase path. We must map the real sync path end-to-end before reusing it. Do not assume that all cached entities or all write operations are offline-ready.

## 4. Product-specific scope

### SifoProperty

- Property portfolio, buildings, blocks, units and occupancy.
- Tenant/landlord records, KYC and contacts.
- Lease creation, renewals, rent escalation and deposits.
- Rent billing, recurring charges, receipts, arrears and statements.
- Meter readings and utilities recovery.
- Maintenance requests, work orders, contractors and costs.
- Property expenses, owner statements and profitability.
- Accounting integration: receivables, rental income, deposits, expenses and bank/cash receipts.
- ZRA invoice/receipt workflow where the taxpayer's obligations and document type require it.

### SifoRestaurant

- Branches, dining areas, table map and reservations.
- Menu categories, modifiers, combos, pricing and recipes.
- POS, dine-in, takeaway, delivery and split bills.
- Kitchen display and preparation stations; bar tickets where applicable.
- Ingredient inventory, recipe consumption, yields, wastage and stock counts.
- Purchasing, goods received, supplier invoices and food-cost control.
- Shifts, cash drawers, cashier reconciliation and end-of-day close.
- Customer loyalty, dispatch and operational reports.
- Accounting integration: sales, VAT, discounts, inventory/COGS, cash/bank/mobile money and expenses.
- ZRA fiscal invoice flow and receipt printing.

### SifoBoarding

- Houses, blocks, rooms, beds and capacity.
- Applications, resident/student records, guardians and emergency contacts.
- Room/bed allocation, transfers, check-in and check-out.
- Boarding fee plans, deposits, invoices, payment plans, arrears and receipts.
- Attendance, leave, visitors and safeguarding/discipline records with restricted access.
- Meal plans, meal attendance and optional laundry/services.
- Maintenance, inspections and room readiness.
- Accounting integration: boarding income, receivables, deposits, meal/service charges and expenses.
- ZRA invoicing and receipt printing where applicable.

### SifoButchery

- Suppliers, livestock purchases and purchase weights.
- Animal/carcass intake, batch and traceability identifiers.
- Slaughter/processing records where applicable to the business and regulatory permissions.
- Carcass grading, weighing and cutting/butchering yields.
- Primal cuts, sub-cuts, mince, offal, bones, by-products and packaged products.
- Yield variance, trim, spoilage, expiry, wastage and shrinkage.
- Scale integration, barcode/label printing and price-per-weight selling.
- Counter POS, wholesale orders, customer accounts and deliveries.
- Cold-room/freezer stock, batch/lot traceability and stock counts.
- Accounting integration: livestock/meat purchases, conversion costs, yield-based costing, stock valuation, wastage and COGS.
- ZRA fiscal invoice workflow.

### SifoLending

- Borrower onboarding, KYC, consent and document management.
- Loan products, rates, fees, terms, schedules and repayment rules.
- Applications, affordability assessment, credit scoring and approvals.
- Guarantors, collateral and group lending.
- Disbursement controls and payment authorisation.
- Repayment allocation to principal, interest, fees and penalties.
- Arrears ageing, collections, field visits and promises to pay.
- Rescheduling, restructuring, write-offs and recoveries.
- Savings/investor features only if the institution's licence and business model permit them.
- Portfolio quality, PAR, collection efficiency, loan loss provisions and management reports.
- Accounting integration: loan principal receivable, interest income, fees, cash/bank/mobile money and impairment.
- ZRA/tax documents only for taxable supplies/fees as applicable; lending must not treat principal disbursement as sales revenue.

## 5. Target architecture

```
                 SIFONET SHARED FOUNDATION
   Identity | Company/Branch | Audit | Documents | Notifications
   Accounting | ZRA Adapter | SifoPrint | Network/Offline | Reports
                         |
       +-----------------+-------------------+
       |          |          |         |     |
    Property  Restaurant  Boarding  Butchery Lending
       |          |          |         |     |
   own schema  own schema own schema own schema own schema
   own DB      own DB     own DB     own DB     own DB
   own deploy  own deploy own deploy own deploy own deploy
```

Recommended package boundaries:
- `@sifonet/core-contracts`: shared types, IDs, money/date conventions and API contracts.
- `@sifonet/accounting`: journal engine, posting rules and reports.
- `@sifonet/zra-adapter`: server-side VSDC integration and fiscal document lifecycle.
- `@sifonet/printing`: agent protocol, job contracts, routing and queue.
- `@sifonet/offline`: cache, queue, idempotency and conflict primitives.
- `@sifonet/ui`: shared SifoHotel visual system and responsive components.

Use a versioned package or a pinned Git dependency for shared code. Do not share a single operational database between vertical products. Each product owns its operational schema and database; shared services connect through stable contracts and tenant-scoped APIs.

## 6. Migration sequence across all five products

### Phase 0 — Preserve and baseline
- Keep SifoBooks `main` unchanged.
- Back up source and any live databases before schema work.
- Record current package versions, migrations, environment variables and secrets locations.
- Establish automated build, typecheck, unit and business-workflow tests.

### Phase 1 — Extract the shared foundation
- Define contracts and stable identifiers.
- Move accounting, fiscalisation, printing, networking/offline and common UI behind explicit service interfaces.
- Remove direct vertical-module assumptions from shared packages.
- Replace environment-specific hard-coded fallbacks with deployment configuration.
- Ensure server-only secrets never enter browser bundles.

### Phase 2 — Product extraction in parallel
- SifoProperty: extract the current PropertyWorkspace and its schema/ledger hooks.
- SifoRestaurant: extract restaurant routes, POS, kitchen, recipes, inventory and print routing.
- SifoBoarding: extract boarding routes, tables and permission model from the existing boarding workspace.
- SifoLending: extract the lending workspace, schedules, repayment logic and accounting controls.
- SifoButchery: build the dedicated domain model and workflows; do not repurpose generic retail stock as the full butchery engine.

### Phase 3 — Isolated data and deployment
For every product:
- Separate repository and release pipeline.
- Separate database/project, credentials, storage and backup policy.
- Separate auth tenant/company boundaries and product-specific roles.
- Explicit migration scripts from source tables; no shared live table writes.
- Demo data separated from production data.
- Independent environment configuration and rollback.

### Phase 4 — Cross-product acceptance
- Accounting journals balance and reverse correctly.
- Every transaction is idempotent and company/branch scoped.
- ZRA test submissions and responses are reconciled; production approval is verified before live use.
- Printing succeeds locally; queued jobs survive app restarts; gateway is not marked ready until real routing is implemented.
- Offline-created transactions sync once, conflicts remain visible and no records are silently lost.
- Backups restore to a clean environment.
- Mobile and desktop workflows pass.

## 7. Release acceptance checklist

- [ ] Build and typecheck pass in each repository.
- [ ] No imports from the SifoBooks monolith remain in product applications.
- [ ] Each product has its own database and migration history.
- [ ] Each product has independent company, branch and role isolation.
- [ ] Journal entries are balanced, traceable and reversible.
- [ ] Tax settings are configurable by taxpayer and branch.
- [ ] ZRA test/production separation and approval evidence are documented.
- [ ] Print jobs have stable IDs, deduplication and retry visibility.
- [ ] Offline queue and conflict resolution are tested under network interruption.
- [ ] Windows, browser and Android print paths are validated.
- [ ] Backups and restore drills pass.
- [ ] Demo records cannot contaminate live company records.
- [ ] SifoHotel visual language is consistent across desktop and mobile.

## 8. Current repository inventory and caveats

At the time of this audit, GitHub metadata showed:
- `pritchardsikazwe/sifobooks-3e453758`: populated source repository, default branch `main`.
- `pritchardsikazwe/sifobooks-hotel-`: separate repository.
- `pritchardsikazwe/sifoproperty` and `pritchardsikazwe/sifoschool-`: GitHub metadata reported size 0 at audit time, but direct file retrieval confirms both contain their React/Vite frontend foundations. Treat the size metadata as stale/inaccurate; current source files are present.
- No verified SifoRestaurant, SifoBoarding, SifoButchery or SifoLending standalone repositories were confirmed in this audit.

This document is an architecture and source inventory only. It does not migrate data, alter production schemas, copy credentials, create production databases, or claim that any product is certified or production-ready.
