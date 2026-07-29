# Plan — Phase 3 now + SifoBooks 2026 roadmap

The prompt is huge (roughly a 6–9 month build). I'll deliver what you asked "start with" **this turn** (Phase 3 dashboard drag/drop + global command palette), then execute the rest in tightly scoped phases so each ships as a working, testable slice — not vapor UI.

## Ship this turn — Phase 3 (Dashboard + Command Palette)

1. **Draggable dashboard widgets** on `dashboard.tsx`
   - Widget registry: KPI cards, sales trend, cash flow, income vs expenses, receivables ageing, payables ageing, bank rec status, compliance score, top customers, recent activity.
   - Drag-to-reorder + show/hide per widget using `@dnd-kit/core` + `@dnd-kit/sortable`.
   - Per-user layout persisted in `localStorage` (key scoped by `active_company_id`), with "Reset layout" and "Add widget" controls.
   - Each widget clickable → drills to source list/report.

2. **Global command palette** (⌘/Ctrl+K) — upgrade of existing shell trigger
   - New file `src/components/CommandPalette.tsx` using existing shadcn `command` primitive.
   - Sources: all installed module routes (from `MODULES` + `useInstalledModules` + `usePermissions`), quick actions (New Invoice / Bill / Expense / Receipt / Payment / Journal / Customer / Supplier / Employee), reports (from `reports.index.tsx` catalog), recent records (last 20 invoices/bills/expenses via a single supabase query on mount), and top-level jumps (Dashboard, Reports, Banking, Period Close, Compliance).
   - Fuzzy filter, grouped sections, keyboard nav, recently-used items.
   - Wired into `_authenticated/route.tsx` (replaces the current lightweight ⌘K stub).

3. **Quick-action bar on dashboard** — "What do you want to do?" row mirroring §70 (Record Sale / Purchase / Expense / Receive / Pay / Reconcile / Payroll / Reports) — each opens the matching route or existing dialog (`SpendMoneyDialog`, `QuickCreate`, etc.).

## After Phase 3 — phased roadmap for the master prompt

Each phase is one turn ("go phase N"). No phase is marked done without the underlying engine + tests, per §68/§71.

- **Phase 4 — Accounting Workbench + Smart Posting Wizard** (§8, §9, §51): central "What do you want to do?" workspace, guided expense/sale/purchase wizard with proposed journal preview and "Why this posting?" explainer. Reuses existing posting RPCs.
- **Phase 5 — COA guide + Debit/Credit Tutor + Learning Centre** (§6, §7, §59): per-account guide panel (`chart-of-accounts` drawer), interactive tutor route, 25 lessons with quizzes. Content only, no schema changes.
- **Phase 6 — Compliance engine v2** (§22, §29, §30): `tax_rules` + `compliance_rules` tables (versioned, effective-dated), compliance calendar UI, `run_compliance_scan()` RPC covering the 25+ checks in §30, compliance score dashboard tile.
- **Phase 7 — Month-end + Year-end wizards + Period lock hardening** (§31, §32, §56): 20-step guided close with gate checks (TB balanced, bank rec done, critical exceptions = 0), year-end wizard with retained-earnings roll-forward and new-period creation, override with reason + audit.
- **Phase 8 — Auditor mode + immutable audit trail v2** (§33, §58): dedicated `/auditor` dashboard, expanded `audit_logs` coverage (prev/new value diff, IP/device, reason), filter/export/flag/comment. Reads only.
- **Phase 9 — Approvals v2 + RBAC hardening** (§34, §35): configurable rules by amount/module, sequential + parallel approvers, segregation-of-duties enforcement on payments, tighter role matrix.
- **Phase 10 — Reporting framework engine + IFRS mappings** (§13, §60, §61): `reporting_frameworks` + `account_mappings` + `financial_statement_layouts`, framework-aware P&L/BS/CF/SoCiE, disclosure notes templates.
- **Phase 11 — Report Builder + Scheduled Reports + Drill-through everywhere** (§15, §39, Phase 4 of the earlier reports plan): drag-and-drop custom reports, `report_templates` + `report_schedules`, pg_cron hook to `/api/public/hooks/reports-run`, universal drill from any total → transactions → source doc.
- **Phase 12 — PWA + Offline transaction queue** (§43, §44, §45): `vite-plugin-pwa` with guarded registration, IndexedDB queue for invoices/receipts/expenses, sync worker with UUID preservation and conflict resolution, online/offline/syncing indicator.
- **Phase 13 — AI Assistant v2 + AI posting suggestions** (§47, §48): receipt OCR + suggested journal, "Ask SifoBooks" queries over live ledger, always human-confirm before post.
- **Phase 14 — Automated tests + demo seed** (§66, §67): vitest suites for posting/reporting/tax/tenant-isolation/period-lock, "SifoBooks Demo Zambia Ltd" seed migration.

## Explicitly skipped (already shipped in earlier turns)

Modern design system + dark mode, DataTable + DetailDrawer pattern, Reports Centre foundation + hub, banking sub-screens migration, multi-company + super admin, branded emails, Fixed Assets + depreciation, NGO template, Opening Balances wizard, module registry + RBAC v1, Cashbook, bank rules + reconciliation sessions, payroll dashboard + statutory (PAYE/NAPSA/NHIMA/WCF/SDL), CSV/Excel/PDF exports, chart-of-accounts + journal engine + triggers, `rebuild_ledgers`.

## What I need from you

Say **"go"** and I ship Phase 3 (drag/drop dashboard + command palette + quick-action bar) in the next turn. Then just say **"go phase 4"**, **"go phase 5"**, etc., and I'll roll each phase in order. If you want a phase pulled forward (e.g. Compliance before Workbench), say the number.

## Technical notes

- New deps for Phase 3: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (already indirectly compatible with React 19).
- No DB changes in Phase 3. Layout + palette state are client-side only.
- Compliance/tax rules (Phase 6) will use versioned rows keyed by `effective_from`/`effective_to` so historical reports keep using the rule version applicable to their period (§29, §61).
- All new tables in later phases will follow the mandated GRANT + RLS + `service_role` pattern with `auth.uid()`-scoped policies.
