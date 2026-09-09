# SifoBooks Module Completeness & UI Audit

## Objective

Bring every SifoBooks operational module to one consistent, production-grade standard without replacing the existing architecture or onboarding choices.

The existing module registry already separates Sales, Purchases, Finance, Inventory, HR & Payroll, Reports, POS, Administration and optional industry modules. The upgrade work should therefore be an implementation pass across the existing routes rather than a navigation redesign.

## Global document standard

Every transactional document must use the same visual and functional pattern:

1. Document header
   - document type and number
   - status badge
   - customer/supplier/company identity
   - issue/due dates
   - currency and tax information
2. Action bar
   - Save draft
   - Post/Approve
   - Print/PDF
   - Share
   - Duplicate
   - More actions
3. Line-item grid
   - item/service selector
   - description
   - quantity
   - unit
   - unit price/cost
   - discount
   - tax rate
   - line total
   - remove/reorder controls
4. Totals panel
   - subtotal
   - discounts
   - taxable amount
   - VAT/tax
   - round-off where configured
   - grand total
   - amount paid
   - balance due
5. Supporting information
   - notes
   - reference/PO number
   - terms
   - attachments
   - custom fields where enabled
6. Accounting/stock impact
   - posting preview before commit
   - stock movement preview for stock documents
   - linked ledger entries after posting
7. Audit trail
   - created by/date
   - last edited by/date
   - posted/approved by/date
   - void/reversal reason

## Sales & Invoicing audit

### Existing
- Customers
- Quotes
- Sales Invoices
- Credit Notes
- Receive Payments
- Invoice list already has KPI cards, filters, DataTable, detail drawer, export and void controls.

### Required completion pass
- Standardize Quote, Invoice, Credit Note and Receipt editor layouts.
- Use a reusable line-item grid with keyboard-friendly row editing.
- Add visible draft/sent/approved/paid/partial/overdue/voided state progression.
- Ensure every document has print/PDF/share/duplicate actions.
- Add customer balance and document history to the detail drawer.
- Add tax breakdown and posting preview before posting.
- Ensure credit notes are linked to their source invoices and reverse stock/GL correctly.
- Add payment allocation against one or multiple invoices.
- Add document numbering/sequence controls and duplicate protection.

## Purchases & Bills audit

### Existing registry
- Suppliers
- Purchase Orders
- Bills
- Supplier Payments
- Expenses
- Expense Categories

### Required completion pass
- Purchase order line grid with supplier item, quantity, unit cost, discount, tax and delivery status.
- PO workflow: Draft -> Submitted -> Approved -> Partially Received -> Received -> Closed/Cancelled.
- Goods receipt/GRN linked to PO and stock receipt.
- Bill matching against PO/GRN, including partial deliveries.
- Supplier payment allocation and supplier statement integration.
- Expense entry with receipt attachment and approval workflow.
- Supplier credit notes and bill reversals.
- Duplicate supplier invoice detection.
- Posting preview for every bill/payment/expense transaction.

## Finance & GL audit

### Existing registry
- Banking
- Bank Accounts
- Bank Rules
- Reconciliation
- Reconciliation Sessions
- Chart of Accounts
- Journal Entries
- Smart Posting Wizard
- Cashbook
- Opening Balances
- Period Close
- Fixed Assets
- Budgets
- Multi-Currency / Exchange Rates

### Required completion pass
- Consistent journal-entry grid with balanced debit/credit validation.
- Account detail view with running balance and drill-down to source documents.
- Banking dashboard with imported, matched, pending and exception states.
- Reconciliation workflow with maker-checker and clear match/allocation UI.
- Period close controls with lock date, reopen authorization and audit trail.
- FX rate source/date and realized/unrealized FX treatment.
- Fixed asset lifecycle: acquire -> capitalize -> depreciate -> dispose.
- Budget vs actual drill-down to transactions.
- Opening balance import/validation and trial balance check.

## Inventory audit

### Existing registry
- Inventory Dashboard
- Control Center
- Items
- Locations
- Production Batches
- Stock Transfers
- Stock Card
- Reconciliation
- Cashier Records
- Warehouses
- Stock Adjustments
- Stock Takes
- Batches & Expiry
- Serial Numbers
- Inventory Sheets

### Required completion pass
- Standard inventory item master with SKU/barcode, unit, tax, cost, selling prices and reorder settings.
- Warehouse/location hierarchy and branch visibility.
- Receipt, issue, transfer and adjustment document layouts.
- Stock transfer workflow: Draft -> Approved -> Dispatched -> Received.
- Stock take workflow: Open -> Count -> Review -> Approve -> Post variance.
- Stock card showing opening balance, receipts, issues, transfers, adjustments and closing balance.
- Batch/expiry tracking with FEFO-ready picking.
- Serial-number tracking where enabled.
- Inventory valuation and stock-to-GL reconciliation.
- Negative stock controls and manager override audit.
- Deletion protection for items already used in transactions.

## HR & Payroll full audit

### Existing registry
- Payroll Dashboard
- Employees
- Attendance
- Leave
- Timesheet
- Payroll
- Payroll Setup
- Payroll Transactions
- Payroll Tools
- Payroll Schedules

### Payroll engine currently present
- PAYE calculation
- NAPSA
- NHIMA
- Overtime
- Gratuity
- Leave pay
- Notice pay
- Repatriation
- Payslip generation/PDF
- Bank schedule and statutory exports
- Payroll journal posting and reversal

### Required completion pass
- Employee master audit: identity, employment status, department, position, salary, tax/statutory numbers, bank details and effective dates.
- Salary history/effective-dated changes rather than overwriting historical rates.
- Attendance -> timesheet -> payroll linkage.
- Leave balances, approvals and payroll impact.
- Loan/advance deductions with schedules and balances.
- Earnings/deductions configuration with taxable/statutory flags.
- Monthly payroll workflow: Draft -> Calculated -> Reviewed -> Approved -> Posted -> Paid -> Locked.
- Maker-checker approval before payroll posting.
- Recalculation warning when employee master data changes after calculation.
- Payroll audit report comparing gross, deductions, net and GL postings.
- Statutory reconciliation reports for PAYE, NAPSA and NHIMA.
- Payment file validation and bank/mobile-money schedule totals against net payroll.
- Payslip layout standardization with company identity, employee identity, earnings, deductions, employer contributions, YTD and statutory references.
- Payroll reversal must create a controlled reversing journal and preserve the original run.

## Administration & Settings audit

### Required completion pass
- Company profile and branding.
- Active company/workspace context.
- Fiscal year and accounting period settings.
- Base currency and tax configuration.
- Document numbering/sequences.
- Users, roles, permissions and branch restrictions.
- Approval thresholds.
- Audit logs and security events.
- Notification/preferences.
- Backup/export controls.
- Integrations and API credentials UI without exposing secrets.
- Data import/export center.
- Subscription/module configuration where applicable.

## Reports & statements audit

Every report should provide:
- date range and branch/company filters
- search/filter controls
- clear column headings
- totals and subtotals
- drill-down to source transaction
- print/PDF/export
- consistent currency formatting
- empty/loading/error states

Priority reports:
- Trial Balance
- Profit & Loss
- Balance Sheet
- Cash Flow
- Customer Statement
- Supplier Statement
- VAT Return
- Income Tax
- Turnover Tax
- AFS
- Inventory valuation
- Stock movement
- Payroll/statutory schedules

## Cross-module integrity tests

Before calling a module complete, verify:

- Sales invoice posts to AR/revenue/VAT and stock/COGS where applicable.
- Receipt reduces customer balance and posts to the selected cash/bank account.
- Credit note reverses the correct invoice impact.
- PO -> GRN -> Bill preserves quantities and costs.
- Supplier payment reduces supplier balance and posts to the selected bank/cash account.
- Inventory movements agree with document lines and GL valuation.
- Payroll totals agree with payroll journals and payment schedules.
- Bank reconciliation never posts outside the selected tenant/branch.
- Voids/reversals preserve the original document and create auditable reversing records.
- Closed periods reject unauthorized posting/editing.
- Offline POS transactions reconcile cleanly when connectivity returns.

## Visual QA standard

All list pages:
- page header + breadcrumb
- KPI summary where useful
- compact filter/search toolbar
- responsive data table
- sticky key columns/actions on wide grids
- row click -> detail drawer
- empty/loading/error states
- consistent status badges
- export/print actions

All forms:
- clear sections
- two-column desktop layout where appropriate
- single-column mobile layout
- required-field indicators
- inline validation
- unsaved-change protection
- calculated totals shown immediately
- keyboard navigation through line grids

All documents:
- print-safe A4 layout
- consistent company header/footer
- document number and status prominent
- line grid readable in print
- totals visually separated
- signature/approval area where required
- QR/reference area where configured

## Implementation order

1. Shared document UI and line-grid foundation.
2. Sales documents: quote, invoice, credit note, receipt.
3. Purchase documents: PO, GRN, bill, supplier payment, expense.
4. Finance: journal, banking, reconciliation, period close.
5. Inventory: item, transfer, adjustment, stock take, stock card, batch/serial.
6. Payroll: complete workflow, audit and statutory reconciliation.
7. Settings/Admin: configuration, permissions and audit controls.
8. Reports: consistent grids, drill-downs and print/export.
9. Full cross-module regression audit.
