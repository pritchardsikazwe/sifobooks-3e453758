# Roadmap

## RBAC overhaul (in progress)
- [x] DB: permission catalogue, roles, staff_members, has_perm/my_access, tenant scoping, RLS, guard triggers, legacy migration
- [x] Client rbac lib + usePermissions
- [x] Route guard in _authenticated shell
- [x] Manager workspace (/manager, /manager/shifts, /manager/cashiers)
- [x] Cashier workspace entries in worker nav
- [x] Terminal unlock uses server-side PIN verification
- [x] Secure POS worker invitation (no plaintext PIN storage)
- [x] Role-permission grants restricted to owners/super admins
- [ ] Wire manager/admin redirect after login
- [ ] Sidebar / command palette / mobile nav / header trimmed for staff
- [ ] Cashier dashboard
- [ ] Team & Roles admin page (/roles): roles, permissions, users, branches
- [ ] Staff invite + manager-override server functions
- [ ] Retail POS: gate discount/refund/void, manager authorisation dialog
- [ ] restaurant.ts uid() -> tenant id
- [ ] Retail worker Command Center (/pos/command-center) — live cashier activity, shifts, refunds/voids for retail managers
- [ ] Verify with Playwright as a cashier

## GitHub project sync (pending)
- [ ] Connect Sifobooks project to GitHub for code backup/sync

## MKP multi-location inventory (company: sifonettech@gmail.com)
- [x] Phase 1: locations (MKP-WH, MKP-OUTLET/Chibombo), product master w/ units, per-location ledger + balances, stock transfer workflow, two-sided ledger
- [x] Seed 17 MKP products w/ cost + retail prices, production/transfers/cashier records
- [x] Cost prices applied from Wholesale Cost column; retail prices from Retail Unit Cost
- [x] Stock count 31 Aug 2026 in counted status
- [ ] POS/sales deduct from cashier's outlet location; returns
- [ ] Production / cashier / reconciliation / control-center screens
- [ ] Batch/expiry, reorder, barcode, dashboards, reports
- [ ] Inventory permissions (inventory.transfer.* etc.) + location-based access

## Active security warnings (surfaced, not error-level)
- Public/signed-in SECURITY DEFINER function exposure (baseline infra warnings)
- Customer table staff permission-check inconsistency
- POS worker self-read policy exposes PIN hash/lockout columns

## POS + Inventory transaction engine hardening (2026-09-09)
- [ ] Server-authoritative sale posting: recalc totals/VAT, derive COGS from item cost at the selling location
- [ ] Enforce active register + shift + location before completing a sale (no silent shift creation)
- [ ] Validate stock at the POS location from stock_balances; reject shortfall unless manager override (audited)
- [ ] Persist unit_cost and total_cost on sale stock movements (fix AFTER-trigger design)
- [ ] Resolve valid cost on new transfer dispatch/receipt (never touch historical rows)
- [ ] Keep client_ref idempotency; shift payment totals posted once
- [ ] POSCommandCenter: live products/prices from stock_items, real checkout via RPC, keep the current look
- [ ] Tests: balanced journal, COGS source, single stock decrease, retry, shortfall, shift enforcement
