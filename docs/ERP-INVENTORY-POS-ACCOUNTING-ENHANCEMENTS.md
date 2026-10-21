# SifoBooks ERP, Inventory, POS and Accounting Enhancements

## Purpose
Incrementally enhance the existing SifoBooks application using the workflow ideas visible in the supplied Business Integration ERP screenshot. This is an implementation specification, not a claim that the features have already been implemented.

## Non-negotiable safeguards
- Extend the existing SifoBooks app; do not rebuild it or create a separate app.
- Preserve current routes, navigation, authentication, company/branch/location isolation, accounting, inventory, POS, payroll, reporting, hotel/school modules, ZRA/VSDC integration, and current database behavior.
- Inspect existing schemas, migrations, services, and UI before changing anything. Reuse existing tables and services where possible; never create duplicate ledgers or stock engines.
- Keep postings transactional and idempotent. Posted financial documents must not be silently edited or deleted; use reversal/credit/adjustment workflows.
- Apply active company, branch, and location context to every query and mutation. Enforce permissions on the server, not only by hiding buttons.
- Keep cloud PostgreSQL/Supabase and Windows Bun + SQLite deployments compatible. Use the existing database adapter/migration conventions.
- No fake/demo data in production screens. Show clear empty, loading, and error states.
- Do not deploy automatically or change production data as part of this work.

## Feature groups to add or complete

### 1. Inventory Catalog
- Master Stock Sheet with searchable/filterable items, SKU/code, description, category, unit, location, on-hand, reserved, available, reorder level, average/weighted cost where supported, and stock value.
- Low Stock report with configurable reorder thresholds and filters by branch/location/category.
- Item Conversions for controlled unit-of-measure conversions (e.g. carton to units), conversion factor validation, and audit history. Never allow a conversion to silently change historical transactions.
- Stock movement history and Adjustment History with opening/closing quantities, source document, user, timestamp, reason, and approval/posting state.
- Variance Dashboard and Variance Summary comparing expected theoretical stock with physical counts and recorded movement; allow drill-down to the underlying transactions.
- Variance vs Stock Movement report with filters and export/print.
- Every stock-affecting action must use the shared Inventory Core and preserve atomicity.

### 2. POS configuration and recipe costing
- POS Menu Layout for organizing saleable products/services into categories and tiles; preserve existing POS behavior and hardware/receipt flows.
- Modifiers & Stations for modifier groups/options, kitchen/preparation stations, availability, and routing where relevant.
- Recipe Costing with ingredient quantities, units/conversions, current cost basis, yield/portion calculations, cost per portion, and margin. Changing a recipe must not rewrite historical sale costs.
- Low-stock and variance insights should link to item detail and movement history.
- Cash Declaration at shift close: expected cash by payment method versus counted amount, variance, explanation, user, timestamp, and approval.
- Keep “Impact Declaration” as an unresolved label from the reference screenshot; first inspect the existing code and product terminology. Do not create a guessed workflow or rename an existing feature without evidence.

### 3. Payables and Receivables
- Reuse the existing supplier/customer and invoice modules.
- Payables: supplier bills, due dates, outstanding balances, aging buckets, payment allocation, and supplier statement.
- Receivables: customer invoices, due dates, receipts/allocations, aging buckets, and customer statement.
- Prevent duplicate posting and ensure payment allocations update open balances consistently.
- Keep credit notes, reversals, and audit trail connected to the original document.

### 4. Journal and Chart of Accounts
- Journal Entries list with draft/posted/reversed states, date/period filters, source document, reference, narration, creator/approver, and balanced debit/credit totals.
- Chart of Accounts management with account code, account name, notes/description, account class, active status, and safe edit controls.
- Default class ranges suggested by the reference screen: Assets 1000–1999; Liabilities 2000–2999; Equity 3000–3999; Income 4000–4999; Cost of Sales 5000–5999; Expenses 6000–6999. Treat ranges as configurable company defaults, validate conflicts, and do not remap existing accounts automatically.
- Enforce unique account codes within the correct company scope, valid posting accounts, closed-period restrictions, and balanced journals.
- Preserve system/control accounts and prevent deletion when referenced by posted transactions.
- Add/Edit Accounts must use existing accounting services and not write directly around the posting engine.

### 5. Tax, bank, mobile money, cost centres and cash books
- Output Tax and Input Tax views with tax code/rate, taxable base, tax amount, source document, period, and reconciliation totals.
- Add/Edit Banks and Add/Edit MoMo for payment accounts, provider, account reference, currency, active state, and permitted company/location scope. Mask sensitive references in general UI and never store PINs or secret credentials.
- Add/Edit Cost Centre for controlled cost-centre codes, names, status, and reporting assignments.
- Add/Edit Cash Books for cash/bank/mobile-money ledgers, opening balances via controlled opening-balance workflow, receipts, payments, transfers, reconciliation, and audit trail.
- Integrate with existing Zambia tax/ZRA logic; do not claim tax compliance or submit to ZRA unless the existing verified integration supports it.

### 6. Reports
- Sales Detailed Report with date, item, cashier/user, branch/location, payment method, source, quantity, net sales, tax, discounts, and totals according to available schema.
- Daily Variance, Variance Dashboard, Variance Summary, Variance vs Stock Movement, Adjustment History, and Profit & Loss.
- Profit & Loss must derive from posted ledger data for the selected period and company, with drill-down to source transactions; exclude drafts and prevent double counting.
- Reports need consistent date/period filters, pagination, export/print where existing infrastructure supports it, and clear no-data/error states.

## Navigation and user experience
- Add or repair links within the existing sidebar/navigation; do not replace the current navigation system.
- Group entries into Catalog, Sales/POS, Purchases, Accounting, Banking & Tax, and Reports only where that fits the existing navigation architecture.
- All visible menu items must open a working page or a clearly marked disabled/coming-soon state; no dead links.
- Follow existing SifoBooks design tokens and responsive behavior. Use readable tables, search/filter controls, empty states, confirmation dialogs for destructive actions, and accessible labels.
- Respect role/permission checks and company/branch/location context throughout.

## Suggested implementation sequence
1. Audit existing routes, components, database schema, migrations, accounting services, Inventory Core, permissions, and cloud/Windows adapters.
2. Map each requested feature to existing code; report what is already implemented, partially implemented, broken, or genuinely missing.
3. Fix navigation and data wiring for existing pages first.
4. Implement Chart of Accounts and Journal validation only through existing accounting services.
5. Complete inventory stock sheet, low stock, item conversions, movement/adjustment history, and variance reports.
6. Complete POS menu/modifiers/stations/recipe costing/cash declaration.
7. Complete payables/receivables, tax/bank/MoMo/cost-centre/cash-book views.
8. Complete sales detail and Profit & Loss reporting.
9. Add tests, run lint/typecheck/build, validate migrations for both supported database environments, and summarize any blocked checks.

## Acceptance criteria
- Existing SifoBooks login, routes, POS, inventory, accounting, ZRA/VSDC, hotel/school modules, and Windows deployment remain functional.
- No data loss, duplicate stock movement, duplicate journal posting, cross-company leakage, or silent changes to historical documents.
- Every feature links to real persisted data and authorized actions; no production mock data.
- Journals balance; reports reconcile to posted ledger and stock movements.
- Tests cover company/branch/location scoping, permissions, transaction rollback, duplicate submission, period locks, and SQLite/PostgreSQL behavior.
- Provide a completion matrix marking each feature as implemented, partial, blocked, or not started, with evidence and test results.
