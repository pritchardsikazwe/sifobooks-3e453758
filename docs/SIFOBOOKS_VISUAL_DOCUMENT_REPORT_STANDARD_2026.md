# SifoBooks Visual Document & Reporting Standard — 2026

## Objective
One professional visual language across every SifoBooks module without replacing existing business logic, routes, accounting engines, inventory engines or tenant/company context.

## 1. Document standard
Every transaction document should present, where applicable:
1. Company identity: legal/trading name, logo, TPIN/VAT, address, phone, email and website.
2. Document identity: document type, unique number, issue date, due date, branch/location and status.
3. Party block: customer/supplier/employee and relevant tax identifiers.
4. Reference block: quote, PO, receipt, GRN, transfer, sale or source transaction.
5. Line grid: item/service, SKU/code, description, quantity, unit, unit price/cost, discount, tax, line total; batch/serial/location where applicable.
6. Totals: subtotal, discount, taxable amount, VAT/tax, rounding, total, paid, balance.
7. Settlement: payment method, allocation and outstanding amount where applicable.
8. Accounting impact: accounts, debit/credit or posting summary.
9. Inventory impact: location and stock movement summary where applicable.
10. Supporting information: notes, terms, delivery details and attachments.
11. Workflow: prepared by, reviewed by, approved by, posted/paid/received timestamps where available.
12. Audit: creator/editor/approver, source/reference, status changes and reversal/void information where available.
13. Footer: company registration/contact details, system-generated notice, page number and print date/time.

Use the shared `SifoDocumentLayout` for on-screen detail views and `SifoPrintTools`/`SifoPrintDocument` for print output. Do not create parallel document shells.

## 2. Print and preview standard
- A4 default with clean margins.
- Screen-only controls hidden during printing.
- Repeating table headers and rows kept together where possible.
- Company header and document identity repeated on printed pages.
- Footer with page numbering and generated-by information.
- Currency values aligned consistently and never truncated.
- Long descriptions wrap rather than overlap.
- No dashboard cards, navigation or interactive controls in the printed document.
- Print preview must be usable from every document detail page.
- Save as PDF must use the browser's native print-to-PDF flow unless a server PDF renderer already exists.
- Receipts/POS may use dedicated thermal layouts while retaining the same identity, totals and audit principles.

## 3. Report standard
Every report should contain:
- Report Tree navigation.
- Report title and plain-language purpose.
- Company/branch/location context.
- Period/as-of date.
- Filters and saved/recent/favourite views where supported.
- KPI summary where meaningful.
- Main report table with strong column hierarchy.
- Subtotals and grand totals.
- Reconciliation/control checks where applicable.
- Exceptions and warnings separated from normal results.
- Source/reference drill-down where available.
- Prepared/generated timestamp.
- Audit metadata and report basis.
- Print Preview, PDF and spreadsheet/CSV export where technically supported.

## 4. Report tree
Reports should be grouped by business purpose rather than scattered across modules:
- Financial Statements
- General Ledger & Accounting
- Sales & Receivables
- Purchases & Payables
- Banking & Cash
- Inventory & Costing
- Payroll & HR
- Tax & Statutory Compliance
- Customers
- Suppliers
- Fixed Assets
- Budgets & Variance
- POS & Retail Control
- Restaurant Operations
- Mining Operations
- School/NGO Operations
- Management & KPI
- Audit & Control

A report may remain accessible from its originating module, but the Reports Centre is the canonical reporting index.

## 5. Visual rules
- Restrained enterprise accounting design for accounting/admin/report screens.
- Clear typography, consistent spacing and aligned numeric columns.
- Semantic status colours only: success, warning, error, neutral.
- Subtle 150–300ms interactions; no distracting animation.
- Tables use consistent density, sorting, search, column visibility and responsive overflow.
- Empty states explain what data is missing and how to create it.
- Loading and error states are explicit and recoverable.
- Avoid duplicate dashboard widgets and duplicate navigation systems.

## 6. Audit and control rules
Documents must distinguish Draft, Submitted, Approved, Posted, Paid/Received, Cancelled and Reversed states when those states exist in the business workflow. Posted financial/inventory effects must not be silently edited. Reversals should preserve the original transaction and create an auditable reversal path. Permissions and maker-checker controls remain server-side responsibilities; UI controls must not be treated as authorization.

## 7. Module rollout order
1. Shared document/print/report primitives.
2. Sales and purchasing documents.
3. Finance/GL and banking.
4. Inventory and POS.
5. Payroll/HR.
6. Compliance/statutory reports.
7. Administration/audit.
8. Specialist modules: Restaurant, Mining, School and NGO.
9. Cross-module regression: save/edit/delete/archive, posting/reversal, GL/AR/AP/tax/inventory effects, printing, exports, permissions and offline workflows.

## 8. Acceptance criteria
A user can open any supported transaction, understand its identity and status immediately, inspect its lines and totals, see accounting/inventory impact, access audit information, open a clean print preview, print/save a professional PDF, and navigate to the relevant report from the module's report tree without learning a different interface for each module.
