# SifoBooks Modular ERP — Delivery Plan

The core accounting engine (GL, CoA, AR, AP, Banking, Payroll, Tax, Reports, AFS, Multi-company, Audit trail, Roles) already exists in the app. This plan wires the **Industry Module** layer on top so each tenant only sees what it needs, and gets its industry-specific CoA and tables auto-installed.

## Phase 1 — Foundations (this turn)

1. `industries` registry (code file, not DB): id, label, icon, description, list of module keys, default CoA additions, default document prefixes.
2. DB: add `industry` (text) to `companies`; new table `company_modules` (company_id, module_key, installed_at, config jsonb) with RLS.
3. Setup wizard step "Choose industry" added to `/setup` — grid of 19 industries, multi-select modules per industry, "Install" button.
4. Installer service `installIndustry(companyId, industryId)`:
   - inserts missing CoA rows (idempotent by account_code)
   - inserts `company_modules` rows
   - seeds default document numbering rows
   - is safe to re-run.
5. Sidebar/nav filters modules: hide routes whose module isn't installed for the active company; "+ Add module" entry links back to the wizard.

## Phase 2 — First four industry modules (next turn, on approval)

Deliver actual functional module UI + tables for the four highest-value industries first. Each includes: list/CRUD pages, transactions that post to the core GL, and one industry dashboard.

1. **School** — students, guardians, classes, fees invoices → AR, receipts → cashbook.
2. **Pharmacy / Retail POS** — items with batch + expiry, POS screen, sale → revenue+VAT+COGS journal.
3. **Lending / Microfinance** — borrowers, loans, repayment schedule, interest accrual JEs.
4. **Property Management** — properties, tenants, leases, monthly rent invoicing.

## Phase 3 — Remaining industries (subsequent turns)

Law firm, phone shop, manufacturing, transport, fleet, car hire, hire-purchase, land installments, hotel, restaurant, NGO, church, construction, agriculture, fuel station, hardware, courier, mining, security, salon, clinic, insurance broker, consultancy, SACCO. Each follows the same shape: registry entry → installer CoA seed → module tables → routes + dashboard tile.

## Phase 4 — Marketplace surface

`/marketplace` page listing all industry modules with install / uninstall, per-company. Reuses the installer.

## Technical notes

- One shared `journal_entries` / `journal_lines` engine — every industry transaction posts here so all reports (P&L, BS, TB, AFS, ratios, AI narrative) already work for every industry.
- `company_modules` is the single source of truth for "is this feature on?". A `useInstalledModules()` hook powers nav + route guards.
- Industry CoA additions live in `src/lib/industries/*.ts` and are declarative — one file per industry.
- Existing routes (invoices, bills, customers, banking, reports, AFS) stay for every industry as the "General Business" default.

## Ask

Approve **Phase 1** and I ship it now. Phase 2–4 land in follow-up turns so each stays reviewable. If you'd rather I compress Phases 1+2 into a single larger turn, say "do phases 1 and 2".