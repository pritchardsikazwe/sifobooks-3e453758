# Design Links Engineering 1 — Inventory & Administration Audit

## Scope

This audit defines the target operating model for the **Design Links Engineering 1** workspace under the company account associated with `sifonettech@gmail.com`.

The current inventory experience must not stop at a location count such as `50 items`. A manager must be able to open a location and inspect the actual stock held there, item by item, including quantity, value, movement history and responsible transactions.

## 1. Required inventory hierarchy

```text
Design Links Engineering 1
│
├── MKP Farms Warehouse / Starting Warehouse
│   ├── Item A — Qty
│   ├── Item B — Qty
│   └── ...
│
├── Chibombo Store
│   ├── Item A — Qty
│   ├── Item B — Qty
│   └── ...
│
└── Other approved locations
```

A location card is a navigation point, not just a KPI. Clicking it opens a location-specific stock ledger.

### Location detail must show

- Location name, code, branch and status.
- Item/SKU.
- Description, unit and category.
- Opening quantity.
- Receipts/transfers in.
- Sales/issues out.
- Adjustments.
- Current quantity.
- Unit cost and stock value.
- Reorder level/status.
- Last movement date.
- Batch/serial/expiry when enabled.
- Source document and user for each movement.
- Drill-down to the original transaction.

## 2. Starting warehouse → store flow

The first posted batch establishes the opening warehouse position. Subsequent transfers move stock between locations; they must not duplicate inventory.

```text
Opening / Production Batch
        │
        ▼
MKP Farms Warehouse
        │
        │ Stock Transfer
        ▼
Stock In Transit
        │
        ▼
Chibombo Store
        │
        │ POS Sale
        ▼
Customer / Revenue
```

Every transfer must preserve:

- transfer number
- source location
- destination location
- transfer date
- requested/approved/dispatched/received status
- item lines and quantities
- quantity received versus dispatched
- user who created, approved, dispatched and received
- source and destination stock balances
- in-transit quantity while applicable
- reversal/void information

## 3. Visual location control centre

Add a manager-facing **Inventory Control Centre** with:

- Location cards showing quantity/value plus `View Stock`.
- Separate Warehouse and Store sections.
- `View Stock` opens the actual item grid for that location.
- `Transfers` opens source/destination movement history.
- `Stock Card` opens item-level movement history.
- `Audit` opens who changed what and when.
- `Sales` opens store/POS activity tied to stock depletion.
- `Reconcile` compares expected stock with counted stock.

The location view must never aggregate Warehouse and Chibombo Store into one misleading number.

## 4. Warehouse view

Warehouse managers/admins should be able to inspect:

- opening stock from the first batch
- all receipts/production additions
- every transfer out
- remaining warehouse stock
- stock value
- slow/low/zero stock
- transfer quantities currently in transit
- stock adjustments
- stock-take results

## 5. Chibombo Store view

Chibombo Store must have its own stock position.

The manager should see:

- opening transfer quantity
- later transfer receipts
- sales by item
- returns/refunds/voids
- adjustments
- stock takes and variances
- current available quantity
- current stock value
- reorder alerts
- cashier responsible for each sale

A sale from Chibombo must reduce Chibombo stock, not warehouse stock.

## 6. Cashier audit

For every cashier, the manager audit should show:

- assigned branch/store
- assigned register/station
- active/inactive state
- role and permissions
- shift opened/closed
- opening float
- sales count/value
- payment methods
- discounts
- voids
- refunds
- cash variance
- offline transactions awaiting sync
- stock items sold
- last activity

Cashier permissions must be explicit. Typical controls include:

- sell
- apply permitted discounts
- receive payment
- view own sales
- open/close own shift
- request refund/void
- perform stock lookup

Manager-only controls should include approval of sensitive refunds/voids/discounts, shift variance review, stock adjustments and audit review.

## 7. Inventory audit trail

Inventory audit must answer five questions for every change:

1. **What item changed?**
2. **Which location changed?**
3. **How much changed?**
4. **Which document caused it?**
5. **Who performed/approved it and when?**

Posted transactions must be immutable. Corrections should use controlled reversal/adjustment documents rather than deleting the original movement.

## 8. Inventory modules to audit and clarify

### Item Master

- SKU/code
- item name and description
- category
- unit of measure
- tax category/VAT
- HS code where applicable
- cost and selling price
- reorder level
- active/inactive
- batch/serial/expiry settings

### Locations

- branches
- warehouses
- stores/outlets
- location status
- branch restrictions
- responsible manager

### Opening/Production Stock

- batch/document number
- date
- source
- item lines
- quantity and cost
- posted status
- accounting/stock impact

### Stock Transfers

- source/destination
- line quantities
- workflow
- in-transit status
- receive confirmation
- partial receipts
- reversal

### Stock Issues/Receipts

- reason/source document
- location
- item lines
- quantities
- cost
- approval
- stock and GL impact

### Stock Adjustments

- before/after quantity
- variance
- reason code
- supporting note
- manager authorization
- audit trail

### Stock Take

- count session
- location
- expected quantity
- counted quantity
- variance
- reason
- review/approval/posting

### Stock Card

Show a running ledger:

`Date | Document | Source | Destination | In | Out | Balance | Cost | User`

### Valuation & Reconciliation

- quantity × cost
- location valuation
- total valuation
- inventory GL balance
- stock subledger difference
- unresolved variance

## 9. Reports

Create/report-link the following manager reports:

1. Stock by Location
2. Warehouse Stock
3. Store Stock — Chibombo
4. Stock Movement
5. Stock Card
6. Transfers by Source/Destination
7. Stock in Transit
8. Stock Take Variance
9. Stock Adjustments
10. Low Stock/Reorder
11. Inventory Valuation
12. Inventory-to-GL Reconciliation
13. Sales by Store
14. Sales by Cashier
15. Cashier Shift Report
16. Refund/Void/Discount Report
17. Cashier Cash Variance
18. Item Sales and Stock Depletion
19. Audit Log by Location
20. Full Inventory Trace — Opening Batch → Transfer → Store → Sale

All reports need filters for company, branch, location, date range, item/category, cashier/user and document number where applicable, plus drill-down, print/PDF and export.

## 10. Administration audit

Settings & Administration should be organized as:

### Company

- company profile/legal details
- logo/branding
- TPIN/VAT information
- contact details
- base currency
- timezone
- active company/workspace

### Organization

- branches
- warehouses/stores
- departments
- cost centres
- branch restrictions

### People & Security

- users/team
- roles
- permissions
- role-permission matrix
- branch/location restrictions
- active/inactive users
- approval authority
- audit logs

### Accounting Configuration

- numbering/sequence rules
- tax configuration
- currencies and exchange-rate policy
- fiscal year
- accounting periods
- period-close controls
- document templates
- default accounts

### Integrations

- ZRA Smart Invoice
- payment/mobile-money integrations
- banking integrations
- email/SMS/notification providers
- API credentials and connection status
- webhook/last-sync/error state

### Subscription & Modules

- current plan
- plan limits
- active modules
- module entitlements
- user limits
- branch/location limits
- billing status
- renewal date

## 11. Administration security rules

- Never rely only on hidden UI controls for authorization.
- Tenant/company scope must be enforced by the database/RLS/server-side functions.
- Sensitive role, permission, branch and subscription changes must be audited.
- Do not allow an owner to be removed through ordinary staff controls.
- Prevent duplicate membership assignments.
- Prevent users from changing their own privilege level unless explicitly permitted.
- Posted accounting/stock documents cannot be silently edited or deleted.
- Period locks must apply consistently to inventory and accounting effects.
- Configuration changes should record actor, timestamp, old value, new value and reason where appropriate.

## 12. Acceptance test for Design Links Engineering 1

A manager should be able to perform this complete trace without leaving SifoBooks:

1. Open Design Links Engineering 1.
2. Open Inventory Control Centre.
3. Click **MKP Farms Warehouse**.
4. See the actual items and quantities, not just a count.
5. Open the first posted batch and verify the opening quantities.
6. Open Transfers and see each transfer from warehouse to Chibombo.
7. Click **Chibombo Store**.
8. See only Chibombo's current items and quantities.
9. Open an item and see its stock card.
10. Open a sale and identify the cashier responsible.
11. Verify the sale reduced Chibombo stock.
12. Open the cashier audit and inspect shift, sales, payment, void/refund/discount and variance information.
13. Run Stock by Location and reconcile warehouse versus Chibombo.
14. Run Inventory-to-GL Reconciliation.
15. Open the audit trail and trace the transaction back to its originating document.

## Implementation priority

**P0:** location-specific stock drill-down, warehouse/store separation, transfer traceability, cashier audit, stock-card drill-down.

**P1:** inventory control centre, stock-in-transit, reconciliation reports, location-aware reporting.

**P2:** administration hardening, document templates, numbering controls, integrations health, subscription/module entitlement controls.

The existing SifoBooks document shells, DataTable, RBAC and POS reversal/integrity engines should be reused rather than replaced.