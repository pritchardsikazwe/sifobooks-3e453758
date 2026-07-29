# Plan — Banking Sub-Screens + Modern Reports Centre 2026

This is a large scope. I'll deliver it in **4 phases** so each ships as a working, testable piece rather than one giant untested drop. Phase 1 starts as soon as you approve.

## Phase 1 — Banking Sub-Screens (DataTable + Drawer)

Migrate the remaining bank-related list screens to the new `DataTable` + `DetailDrawer` pattern (matches Customers/Invoices/Expenses from Phase 2).

- `bank-accounts.tsx` — table with balance/last-reconciled columns, drawer showing account KPIs + recent transactions.
- `bank-rules.tsx` — table with priority/hits/last-used, drawer to edit rule.
- `reconciliation-sessions.tsx` — table with status/difference/statement balance, drawer showing lines + Lock/Reopen actions.
- `cashbook.tsx` — keep bespoke Sage layout, add DataTable-styled toolbar + export.
- Leave the main `banking.tsx` (Sage Spend/Reconcile flow) as-is — it's intentionally bespoke.

## Phase 2 — Reports Centre Foundation

Shared infrastructure everything else builds on. No individual reports rewritten yet.

- `src/components/reports/ReportsShell.tsx` — modern viewer: sticky header (logo, company, title, period, generated), KPI strip, chart slot, table slot, footer.
- `src/components/reports/ReportFilterBar.tsx` — global filter bar with period presets (This Month, Prev Month, QTD, YTD, PY, Custom), and optional Branch/Dept/Project/Account/Customer/Supplier/Employee/Product filters (only render what the report opts into).
- `src/components/reports/CompareToggle.tsx` — Current vs Previous / MoM / YoY / Budget vs Actual, emits a second period range.
- `src/components/reports/ReportTable.tsx` — sticky headers, subtotals/grand totals, negatives in brackets, tabular numerals, zebra rows, print page-breaks.
- `src/lib/reports/format.ts` — accounting number/percent formatters, variance calc, period-preset resolver.
- `src/lib/reports/pdf.ts` — jsPDF/autoTable branded exporter (portrait/landscape, header/footer, page numbers) — replaces ad-hoc `reports-pdf.ts` calls per report.
- `src/lib/reports/favorites.ts` — localStorage-backed star + recently-viewed.
- `src/routes/_authenticated/reports.index.tsx` — rebuild as a **Reports Centre** hub: categorized cards (Financial, Sales, Purchases, Banking, Inventory, Payroll, Tax, Receivables, Payables, Projects, Management, Monthly, Custom), each card = name + description + last-generated + star + Generate/Export quick actions. Tabs: All / Favorites / Recent.

## Phase 3 — Report Migration (batched)

Rebuild the existing reports on the new shell + add the missing high-value ones. Each report: filter bar + KPI strip + chart (toggle) + table + compare + PDF/Excel/CSV/Print/Share.

Batch A (Financial): P&L (with monthly columns + comparison), Balance Sheet, Trial Balance, General Ledger, Cash Flow, **Chart of Accounts**, **Retained Earnings / Changes in Equity**.
Batch B (Sales/Purchases): Sales Summary, Sales by Customer/Product/Salesperson, Outstanding Invoices, Purchase Summary, Purchases by Supplier/Product, Outstanding Bills.
Batch C (Banking/Cash): Bank Book, Cash Book, Bank Reconciliation, Bank Transactions, Receipts, Payments, Unallocated.
Batch D (Inventory/Payroll/Tax): Stock Valuation/Movement/Card/Ageing/Low Stock, Payroll Register/PAYE/NAPSA/NHIMA/WCF/SDL, VAT Return/Sales/Purchases/Control, Withholding, Turnover Tax.
Batch E (Receivables/Payables/Projects/Management): Ageing (both), Statements, Top Customers, Debtor/Creditor Days, Project P&L, Management Pack (already exists — reskin).

All calculations continue to pull from live journals/invoices/bills/etc. — no hardcoded demo numbers.

## Phase 4 — Monthly Engine + Advanced

- `src/routes/_authenticated/reports.monthly.tsx` — Monthly Reports module: pick Year/Month/Branch/Dept/Project, render all monthly-capable reports side-by-side with MoM, YoY, YTD, variance columns.
- **Custom Report Builder** — pick accounts/columns/rows/filters/grouping, save as template (new `report_templates` table).
- **Scheduled Reports** — new `report_schedules` table + pg_cron hook to `/api/public/hooks/reports-run` that generates + emails/notifies (daily/weekly/monthly/quarterly/annually).
- **Report Activity Log** — reuse `audit_logs` with `action='report_generated'`, filters/format captured.
- **Drill-down** — click a total → slide-over listing underlying transactions → click txn → existing DetailDrawer.

## Out of scope for this plan

- WhatsApp share is a mailto/wa.me deep link only (no WhatsApp Business API).
- Drag-and-drop dashboard widgets (already deferred from Phase 3 of the earlier UI plan).

## What I need from you

Approve and I'll ship **Phase 1 + Phase 2 in this turn** (banking sub-screens + Reports Centre foundation + hub redesign). Then say "go phase 3" to start the report migration batches.

## Technical notes

- New DB objects (Phase 4): `report_templates`, `report_schedules`, plus GRANTs + RLS scoped to `auth.uid()`.
- PDF: keep `jspdf` + `jspdf-autotable` (already installed via existing exports).
- Charts: reuse `recharts` (already in dashboard).
- No changes to posting engine, RLS on existing tables, or module registry.
- Permissions: reports check `user_can_view_module('reports')` and payroll/financial reports additionally check role via existing `has_role` RPC.