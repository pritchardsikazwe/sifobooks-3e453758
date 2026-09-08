# Roadmap

## RBAC overhaul (in progress)
- [x] DB: permission catalogue, roles, staff_members, has_perm/my_access, tenant scoping, RLS, guard triggers, legacy migration
- [x] Client rbac lib + usePermissions
- [x] Route guard in _authenticated shell
- [ ] Sidebar / command palette / mobile nav / header trimmed for staff
- [ ] Cashier dashboard
- [ ] Team & Roles admin page (/roles): roles, permissions, users, branches
- [ ] Staff invite + manager-override server functions
- [ ] Retail POS: gate discount/refund/void, manager authorisation dialog
- [ ] restaurant.ts uid() -> tenant id
- [ ] Retail worker Command Center (/pos/command-center) — live cashier activity, shifts, refunds/voids for retail managers
- [ ] Verify with Playwright as a cashier

## MKP multi-location inventory (company: sifonettech@gmail.com)
- [ ] Inspect existing inventory tables (stock_items, stock_movements, inventory_locations, warehouses, inventory_transfers, stock_counts, stock_batches)
- [ ] Phase 1: locations (MKP-WH, MKP-OUTLET), product master w/ units, per-location ledger + balances, stock transfer workflow (draft→completed, transit), two-sided ledger, transfer screen
- [ ] Seed 16 MKP products (Couples Choice qty pending), transfer MKP-TRF-2026-08-04-001 dated 04 Aug 2026
- [ ] Phase 2: stock take 31 Aug 2026 (workflow draft→posted, variance), stock card, adjustments w/ reasons, CSV import
- [ ] Phase 3: POS/sales deduct from cashier's outlet location; returns
- [ ] Later phases: batch/expiry, reorder, reservations, barcode, dashboards, reports, reconciliation
- [ ] Inventory permissions (inventory.transfer.* etc.) + location-based access
