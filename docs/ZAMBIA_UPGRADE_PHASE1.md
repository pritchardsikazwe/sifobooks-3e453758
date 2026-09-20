# SifoBooks Zambia Upgrade — Phase 1 Assessment & Plan

## Scope

This phase upgrades the existing SifoBooks runtime without replacing the existing accounting, inventory, POS or ZRA modules. The Git repository remains the master source. The local Windows runtime remains Bun + SQLite and does not require Base44, Lovable, GitHub, WAMP, Namecheap or Contabo to operate after packaging.

## Existing architecture assessment

### Runtime

- React + TanStack Start frontend.
- Bun server runtime.
- SQLite local database with WAL and foreign keys.
- Local authentication using signed JWTs and Bun password hashing.
- Supabase compatibility layer retained as an internal API shape; it does not require a Supabase backend.
- Existing offline IndexedDB queue.
- Existing POS, inventory, accounting, printing and ZRA/VSDC modules retained.
- Windows portable desktop packaging already exists.

### Existing accounting/inventory/POS assets

The schema already contains substantial ERP structures including:

- Chart of accounts, journal entries and journal lines.
- Customers and suppliers.
- POS sales, POS sale items, POS payments and shifts.
- Stock items, stock movements, stock balances, batches and serials.
- Warehouses, branches and registers.
- Financial periods.
- RBAC/approval tables.
- Existing audit logs.
- Existing ZRA configuration, standard-code cache, classification cache and invoice queue.

The upgrade therefore extends these structures rather than replacing them.

## Important runtime corrections made in Phase 1

1. The local Supabase compatibility query builder now explicitly switches between SELECT/INSERT/UPDATE/DELETE operations.
2. Local database queries now authenticate through the application JWT and automatically scope tables that contain user_id.
3. POS posted sales are routed through the POS checkout service instead of allowing a generic database write to create a completed sale.
4. POS checkout now performs server-side stock, payment, period and accounting validation inside a database transaction.
5. POS checkout creates stock movements and a stock ledger record.
6. POS checkout creates double-entry journal lines using configurable posting rules/account mappings.
7. Client references are used for duplicate prevention.
8. Fiscal transaction state is stored separately from the ordinary POS sale.
9. ZRA submissions now have an idempotent ZRA outbox.
10. ZRA fiscal state and ZRA responses are retained.
11. Audit events use an append-only table with hash chaining and database triggers that reject UPDATE/DELETE.
12. ZRA payment, transaction type, receipt type, transaction progress, currency and sales-category values are resolved from the synchronized VSDC standard-code dictionary rather than hard-coded.
13. After successful ZRA sales submission, SifoBooks now follows the documented ZRA stock sequence: Save Stock Items, then Save Stock Master.
14. ZRA stock synchronization is separately tracked so a stock-sync failure does not falsify or reverse an already accepted fiscal sale.
15. Printed successful ZRA receipts can display the returned receipt information and QR data.

## Database gap analysis

### Added foundation

- tax_codes
- document_sequences
- fiscal_transaction_controls
- zra_outbox
- terminal_devices
- sync_outbox
- item_master_attributes
- item_unit_conversions
- customer_master_attributes
- supplier_master_attributes
- stock_ledger
- accounting_posting_rules
- period_controls
- compliance_exceptions
- immutable audit_event_log
- zra_stock_records

### Still required in later phases

- Full tabbed Item Master UI and bulk item migration.
- Unit-conversion-aware stock calculations throughout purchasing, transfers and sales.
- Complete centralized Tax Engine UI and historical tax snapshots on every transaction.
- Full purchase/GRN stock posting through the same business-rule service boundary.
- Full warehouse-to-store transfer workflow with approvals.
- Full physical-stock reconciliation workflow.
- Full customer/supplier master screens for all requested fields.
- Full document numbering migration for every document type.
- Credit-note/debit-note services tied to the original ZRA receipt number.
- Branch-aware accounting posting and branch-level ZRA configuration.
- Device registration/heartbeat management UI.
- Cloud synchronization conflict resolution.
- Backup/restore dashboard and protected backup storage.
- Complete management/compliance dashboard.
- Automated test coverage for the complete acceptance matrix.

## ZRA/VSDC gap analysis

### Implemented

- VSDC initialization/configuration.
- Standard-code synchronization.
- UNSPSC/classification synchronization and local storage.
- Inventory-to-ZRA mapping.
- ZRA item registration validation.
- POS sale fiscal submission.
- Returned ZRA receipt metadata storage.
- ZRA idempotency/outbox.
- Fiscal transaction states.
- ZRA rejection capture.
- ZRA stock Save Stock Items + Save Stock Master sequence.
- Receipt QR rendering from the actual returned verification information.

### Must remain under UAT/certification review

- Exact device initialization data and production credentials.
- All ZRA code mappings for the taxpayer's actual catalogue.
- Branch/device registration.
- Customer synchronization requirements for the taxpayer's business model.
- Credit/debit note workflows and all applicable reason codes.
- Purchase synchronization.
- Any sector-specific requirements (for example mining/RVAT/MTV).
- Receipt layout against the final current ZRA-approved fiscal receipt requirements.
- ZRA certification itself.

SifoBooks must not be described as ZRA certified until ZRA certification is actually granted.

## Migration safety

Every schema migration is versioned under src/lib/db/migrations/ and recorded in schema_migrations.

Migration order:

1. Back up the SQLite database.
2. Start SifoBooks against a copy/staging database.
3. Apply versioned migrations.
4. Validate row counts and key totals.
5. Validate stock balances against stock ledger.
6. Validate journal debits equal credits.
7. Validate POS sale counts and totals.
8. Validate ZRA mappings and queues.
9. Run acceptance tests.
10. Promote only after reconciliation passes.

No production data should be dropped or rewritten by these migrations.

## Phase 2 priority

Phase 2 should focus on the user-facing accounting discipline:

1. Complete Item Master tabs.
2. Central Tax Engine and tax-code selection.
3. Purchase → GRN → stock ledger → accounting.
4. Warehouse → Chibombo Store transfer ledger.
5. Stock reconciliation/variance approval.
6. Credit/debit note service layer.
7. Document numbering for SI/CN/DN/PO/GRN/ST.
8. Compliance Centre.
9. ZRA outbox retry/review UI.
10. Automated tests for POS, inventory, accounting and ZRA.

## Regulatory source of truth

Use the current ZRA VSDC/CIS specification and ZRA Smart Invoice guidance as the regulatory source of truth. Do not invent endpoints or regulatory codes.

Official ZRA Smart Invoice guidance:
https://www.zra.org.zm/smart-invoice-learn-more/

Official ZRA registration guide:
https://www.zra.org.zm/smart-invoice-registration-guide/

Official VSDC API Specification v1.0.8:
https://www.zra.org.zm/wp-content/uploads/2026/05/VSDC-API-Specification-Document-v1.0.8.pdf


## Phase 2 implementation now added

The Phase 2 ERP control layer now includes:

- Central tax-code table with effective dates and ZRA mapping fields.
- Historical tax transaction snapshots for POS and purchasing.
- Purchase receipt / GRN posting service with stock ledger and accounts payable accounting.
- Weighted inventory receipt foundation (with future moving-average enhancement).
- Warehouse/store transfer posting with separate outbound/inbound stock ledger movements.
- Physical stock reconciliation creation and approval/posting workflow.
- Credit-note fiscal-control fields and a debit-note foundation.
- Compliance Centre dashboard showing fiscal state, ZRA outbox, purchasing receipts, transfers and stock reconciliation exceptions.
- Central Tax Engine screen for maintaining effective-dated tax codes.

### Phase 2 business-rule boundary

Purchases, transfers and stock reconciliations are posted through authenticated server-side services. The UI is not permitted to create completed accounting/stock postings by writing directly to the tables.

Fiscalized POS transactions remain immutable through the generic local query layer.

### Next implementation sequence

1. Complete Item Master tabbed UI and item-unit conversion service.
2. Add full purchase order -> GRN -> supplier bill/AP workflow.
3. Add Warehouse -> Chibombo Store transfer UI with approval.
4. Add stock count scanning and variance approval UI.
5. Add credit/debit note business services and ZRA VSDC submission workflow.
6. Add accounting period open/close/reopen controls.
7. Add Compliance Centre retry/manual-review actions.
8. Add automated acceptance tests and reconciliation reports.
