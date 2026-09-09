# Roadmap

## RBAC overhaul (in progress)
- [x] DB: permission catalogue, roles, staff_members, has_perm/my_access, tenant scoping, RLS, guard triggers, legacy migration
- [x] Client rbac lib + usePermissions
- [x] Route guard in _authenticated shell
- [x] Manager workspace (/manager, /manager/shifts, /manager/cashiers)
- [x] Cashier workspace entries in worker nav
- [x] Terminal unlock uses server-side PIN verification
- [ ] Wire manager/admin redirect after login
- [ ] Replace plaintext `invitePosWorker` PIN insertion with secure setup
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

## Active security finding
- [ ] Fix `rbac_role_permissions` insert policy privilege-escalation risk
