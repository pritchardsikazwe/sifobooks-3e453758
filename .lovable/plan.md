
## Goal

Make every module (School ERP, NGO, Mining, Payroll extras, etc.) installable/uninstallable per tenant. Sidebar hides anything not installed. Then deepen RBAC, Inventory, Payroll and Leave.

## Phase 1 — Module registry + sidebar gating (ship first)

**Central module registry** in `src/lib/modules.ts`:
- Defines every module: `key`, `label`, `category`, `routes[]`, `default_installed` (only Core/Finance/Sales/Purchases true; School ERP, NGO, Mining, Compliance-extras = false).
- Groups: Core, Finance, Sales, Purchases, Inventory, HR & Payroll, Projects, School ERP, NGO, Mining, Compliance, Admin.

**Data**: reuse existing `company_modules` table.
- Seed nothing new server-side; a hook computes "installed = row exists OR module.default_installed".
- Add `useInstalledModules()` hook (React Query) returning a `Set<string>`.

**Sidebar** (`src/components/AppSidebar.tsx`):
- Rebuild items from the registry, filtered by installed set. School ERP group hidden until installed.
- Empty groups collapse away.

**Modules admin page** `src/routes/_authenticated/modules.tsx`:
- Card grid grouped by category with Install/Uninstall toggle per module.
- Uses `installIndustry`/`uninstallModule` helpers (already exist) — extend to accept module key without industry.
- Route-guard wrapper `<RequireModule moduleKey="school_erp">` for route pages, redirects to /modules with toast if not installed.

## Phase 2 — Roles & Permissions

- Extend `app_role` enum (already has super_admin/admin) with: `accountant`, `hr`, `sales`, `viewer`.
- New table `role_permissions(role, permission)` seeded with a matrix (module_key + action: view/create/edit/delete/approve).
- Helper `has_permission(user, module, action)` SQL fn + `usePermission()` hook.
- Admin page `/roles`: assign users to roles, edit permission matrix (super_admin only).
- Sidebar/actions gated by permission (hide edit buttons without `edit`).

## Phase 3 — Inventory enhancements

- Add columns: `barcode`, `sku`, `warehouse_id`, `avg_cost`, `last_cost` to `stock_items` (some exist).
- Live stock valuation per warehouse (view).
- Reorder alerts already exist via notifications — surface a dashboard widget.
- Stock transfer between warehouses (new form).
- Bulk import CSV.

## Phase 4 — Payroll + Leave

- Payroll: add fields Overtime hrs, Shift, Sunday hrs, PSPF, Gratuity, Long Service, Terminal Benefits (columns to `payslips`); update `computePayslip`.
- Leave: accrual engine (monthly cron via `run_notification_scans`-style RPC), balance per employee (`leave_balances` table), auto-decrement on approved requests, calendar view.
- Approval workflow already exists; wire `leave_requests` into `approval_requests`.

## Technical notes

- All migrations follow CREATE TABLE + GRANT + RLS + POLICY order.
- No route file for a module is deleted; only sidebar visibility + route guard change.
- School ERP routes (`school-grants`, `teaching-materials`, `workshops`, `tuckshop`, `imprest`) become gated by `school_erp` module.
- NGO shows only if `ngo` module installed; Mining only if `mining` installed.

## Delivery order

1. Phase 1 (module registry, sidebar, /modules page, School ERP hidden by default) — this turn.
2. Phase 2–4 in follow-up turns after you confirm Phase 1 looks right.

Reply **go** to ship Phase 1 now.
