# Plan — Dashboard Redesign + Reports/Expenses Fixes

This is a very large scope. I'll ship it in three tight phases so each phase is fully working before the next, rather than half-finishing everything.

## Phase 1 (this turn) — Reports & Expenses fixes for Design Links

Goal: you can print/export every report and see all posted expenses.

1. **Expenses page** — currently filters by `created_by = auth.uid()`, which hides expenses posted by other users in the same company. Switch to company-scoped query (via `company_id` of active company) so every posted expense shows.
2. **Universal PDF/Excel/CSV export** — add `ExportMenu` to the six list pages still missing it: Customers, Suppliers, Invoices, Bills, Expenses, Cashbook (banking). Reports pages already have CSV; add a **Print / PDF** button to every report (Trial Balance, P&L, Balance Sheet, Cash Flow, VAT, Customer/Supplier Statement, AFS, Payroll Schedules, Tax reports, Account Transactions).
3. **Design Links data sanity** — run `rebuild_ledgers()` + `auto_match_bank_transactions()` server-side so all posted docs hit the GL and reports show real figures.

## Phase 2 (next turn) — Dashboard visual redesign

Goal: `/dashboard` matches the attached reference in layout, colors, and interactivity.

- Dark navy shell (`oklch(0.16 0.02 220)`) with emerald accent (already the sidebar palette — extend to dashboard).
- **Top bar**: Search, Company selector, Branch selector, Date-range picker, Notifications, Settings, User profile, Theme switch.
- **Filter row**: All Branches / Projects / Customers / Salespersons / Currencies / Tax Types / Payment Methods + Reset.
- **KPI cards (8)** with gradient backgrounds, sparkline, MoM % delta, hover-lift: Revenue, Expenses, Net Profit, Cash, Bank, Customers, Inventory Value, Outstanding AR.
- **Charts row 1**: Sales by Month (bar), Income vs Expenses (line), Cash Flow (area).
- **Charts row 2**: Sales by Category (donut), Top Customers (h-bars), Payment Method (donut), Revenue by Branch (stacked).
- **Summary cards**: Banking, Receivables, Payables, Inventory, Payroll, Compliance, Calendar — each with a coloured CTA button routing to the module.
- **Right-side Quick Actions panel**: New Invoice / Quote / Payment / Expense / PO / Bill / Deposit / Journal — coloured tiles.
- **Recent Activities** timeline at the bottom (invoices, payments, expenses, POs, bank txns, customers) pulled live.
- Framer-motion fade/scale on load, hover-scale-105, ripple on click.

## Phase 3 (later turn) — Mobile + polish

- Mobile: opens on dashboard (no sidebar), swipeable KPI carousel, bottom nav, FAB `+`.
- Recharts responsive containers, drill-down clicks route to matching report.
- Glassmorphism cards, soft shadows, 16–20px radii tokenised in `styles.css`.

## Technical notes

- All colors go through `styles.css` tokens; no hard-coded `text-white`/`bg-black`.
- Chart data via existing report libs (`src/lib/reports.ts`, `afs.ts`) — no new server functions needed for Phase 2.
- Existing modules, routes, sidebar, and business logic remain untouched. Only `/dashboard` visuals change in Phase 2.
- Export helper `ExportMenu` already exists (`src/lib/exports.tsx`) — Phase 1 just wires it in.

Reply **"go"** to run Phase 1 now, or tell me to reorder (e.g. "do dashboard first").
