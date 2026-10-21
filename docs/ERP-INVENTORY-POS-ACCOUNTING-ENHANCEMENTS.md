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


## Expanded product requirements supplied by the owner

These requirements extend the scope above. They are a specification for audit and staged implementation, not a claim that every feature already exists.

### A. Core business controls
- **Multi-branch:** company-scoped branches with branch-specific users/permissions, document numbering where configured, sales/purchases, reports and transfer approvals. All records must remain company-isolated; branch-level access must be enforced in queries and server-side mutations.
- **Multi-warehouse:** warehouses and locations per branch; stock transfers must support dispatch, in-transit/pending receipt, partial receipt if supported, receive confirmation, discrepancy handling and complete transfer history. Never duplicate stock during retry.
- **Multi-unit products:** base unit plus alternative purchase/sales/stock units and explicit conversion factors (e.g. box to piece). Validate positive factors and unit compatibility. Preserve transaction-time unit and conversion snapshots so historical quantities/costs are not rewritten by later edits.
- **IMEI/serial tracking:** optional serial/IMEI tracking by product; unique identifiers within the appropriate scope, capture at receiving and sale/return/service, traceability to invoice/customer/warranty/service history, and permissioned lookup. Do not require IMEI for ordinary non-serialized goods.
- **EMI/installment payments:** configurable deposit/down payment, financed amount, installment frequency, schedule, due dates, payment allocation, outstanding principal, late/overdue status, reminder queue and EMI reminder report. Define interest/fees only when explicitly configured; show the calculation basis and rounding. Link each agreement and receipt to customer, source sale, and ledger; prevent over-allocation and duplicate receipts. Do not represent reminders as sent unless a delivery provider confirms it.

### B. Business modules and workflow inventory
1. **Sales & POS:** Sales Entry, Sales Return Entry, Sales Voucher, Sales Return Voucher, Sales Record, Sales Return Record. Support tax/discount/payment splits, cashier and branch, stock reservation/depletion rules, receipt printing, and the existing POS/hardware/offline behavior.
2. **Service:** Service Entry, Service Expense Entry, Service Voucher, Service Expense Voucher, Service Record and Service Expense Record. Link service income/expense to customers, technicians where available, parts used, and ledger posting without treating service-only work as stock sales.
3. **Orders:** Sales Order Entry, Purchase Order Entry, Sales Order Voucher, Purchase Order Voucher, Sales Order Record and Purchase Order Record. Track draft/approved/partially fulfilled/fulfilled/cancelled states; convert to invoice/bill without duplicate posting.
4. **Quotations:** Quotation Entry and Quotation Record; support expiry, status, customer, items, taxes/discounts and conversion to sales order/invoice while preserving the original quote.
5. **Manufacturing:** Manufacturing Journal Entry, Manufacturing Journal Voucher and Manufacturing Journal Record. Audit BOM/recipe, input material, output quantity/yield, waste/by-products where supported, costing and stock effects. Post stock and ledger effects atomically.
6. **Purchases:** Purchase Entry, Purchase Return Entry, Purchase Voucher, Purchase Return Voucher, Purchase Record and Purchase Return Record. Include supplier, tax, warehouse, receipt matching where available, payment status and return linkage.
7. **Inventory:** Item Stock Report, Item Ledger, Item Transfer Entry, Item Adjustment Entry, Adjustment Record, Transfer Record, Transfer Pending Record and Transfer Receive Record. Keep the existing shared Inventory Core as the sole source of stock movements.
8. **Accounts:** Journal Entry, Contra Entry, Creditor Payment Entry, Debtor Receipt Entry, Expense Entry, Income Entry and Account Entry. All forms must call existing posting services, respect closed periods and produce traceable balanced entries.
9. **HR & Payroll:** Salary Payment Entry, Attendance Entry, Employee Entry, Department Entry, Designation Entry, Salary Report, Monthly Salary Report and Employee Salary. Reuse existing payroll calculations and Zambia statutory rules; do not invent rates or post salary twice.
10. **Reports:** provide the report catalogue below using existing routes/services where possible.

### C. Required report catalogue

**Financial statements and balances**
- Balance Sheet; Trial Balance; Profit & Loss; Cash & Bank Balance; Debtor Balance; Creditor Balance; Capital Accounts Balance; Loan Accounts Balance; Fixed Assets; Stock Report; Expense Report; Income Report.

**Ledgers and transaction registers**
- Cash & Bank Ledger; Capital Account Ledger; Debtor Account Ledger; Creditor Account Ledger; Daily Ledger; Sales Account Ledger; Purchase Account Ledger; Service Expense Ledger; Service Income Ledger; Sales Return Ledger; Purchase Return Ledger; Tax Account Ledger.
- Journal Record; Contra Record; Sales Record; Sales Return Record; Purchase Record; Purchase Return Record; Manufacturing Record.

**Receipts, payments, payroll and instalments**
- Debtor Receipt Report; Creditor Payment Report; Salary Report; Monthly Salary Report; EMI Reminder Report.

**Inventory and operations**
- Item Stock Report; Item Ledger; Low Stock; Stock Movement; Stock Reconciliation; Stock Valuation; Item Adjustment Record; Transfer Record; Transfer Pending Record; Transfer Receive Record; Variance Dashboard; Variance Summary; Variance vs Stock Movement; Adjustment History; Sales Detailed Report.

For every report, confirm the source of truth, date basis, branch/warehouse filters, account/party/item filters, opening/closing logic, status inclusion, totals and drill-down. Financial reports must use posted ledger entries and exclude drafts/voids; stock reports must use the Inventory Core movement ledger. Reconcile totals to the underlying records. Exports/prints must respect access controls and active filters.

### D. Module navigation and route integrity
- Audit the current route registry before adding new pages. Reuse existing pages for invoices, returns, service, orders, quotes, manufacturing, payroll and reports where they already cover the workflow.
- Build a feature-to-route-to-service-to-table matrix before schema changes. Mark each item as existing/working, existing/broken, partial, missing, or blocked.
- Do not create duplicate pages or menu entries merely because the requested business label differs from the current SifoBooks label. Add aliases/shortcuts only when they point to a real compatible workflow.
- A feature is not complete merely because a sidebar link exists: verify read, create, edit-draft, approve/post, reverse/return, print/export, permissions and audit history as applicable.

### E. Additional acceptance tests
- Branch and warehouse isolation; authorized transfer across branches; dispatch/pending/receive transitions; retry idempotency.
- Unit conversion round-trip and fractional quantities; historical conversion snapshot remains unchanged after product setup edits.
- IMEI uniqueness, return/service traceability and non-IMEI item sales.
- EMI schedule math, rounding, partial payment, early/late payment, overdue balance, duplicate receipt prevention and reminder delivery status.
- Sales/purchase return linkage and stock/account reversal; service income/expense posting; manufacturing input/output balancing; payroll totals and statutory outputs.
- Every report reconciles to posted accounting or inventory records for the same filters.
