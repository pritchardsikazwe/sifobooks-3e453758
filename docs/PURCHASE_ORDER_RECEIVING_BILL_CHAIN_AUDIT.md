# SifoBooks Purchase Order → Goods Receipt → Supplier Bill Audit

## Verified current state

- `purchase_orders` is already exposed by the Purchases module.
- Purchase Orders currently support draft → submitted → approved and contain order date, expected date, currency, subtotal, tax and total fields.
- The previous PO `Receive` action only changed the PO status to `received`. It did not prove that a goods-receipt transaction or stock movement was created.
- Supplier Bills and Supplier Payments are already implemented separately.
- The shared SifoDocumentLayout is the standard document shell for transaction detail pages.

## Control decision

A purchase order must never be treated as a stock transaction. Approval establishes purchasing authority; receiving must create a separate receiving transaction that records the actual quantity accepted into a specific inventory location.

## Required target chain

Purchase Order
→ Goods Receipt / Stock Receipt
→ Inventory Movement
→ Supplier Bill
→ Supplier Payment

### Purchase Order

- Supplier
- PO number
- Order/expected dates
- Ordered item lines
- Unit price, tax and total
- Approval status
- Outstanding quantity

### Goods Receipt

- Unique receipt number
- PO reference
- Supplier
- Receipt date
- Receiving location/warehouse
- Actual received quantities
- Rejected/short quantities
- Batch/expiry/serial information where applicable
- Responsible receiver
- Posted status
- One-and-only-one inventory effect per posted receipt

### Supplier Bill

- Supplier invoice number
- Bill reference to PO and/or goods receipt
- Billed quantities and values
- VAT/tax
- Payable amount
- Accounting posting
- Outstanding balance

## Duplicate-stock protection

Do not implement receiving by simply changing `purchase_orders.status`. A posted receipt must be the source of the inventory movement. Subsequent billing must not create another inventory movement for the same received quantity.

## Implementation rule

Before adding a Goods Receipt UI or migration, inspect the actual Supabase schema/migrations for existing receiving, purchase-order line, inventory-movement and supplier-bill relationships. If those structures are absent, add the schema and server-side posting functions together rather than creating client-only pseudo-receipts.

## Current implementation

The Purchase Order list now opens a transaction detail page using the shared SifoDocumentLayout. The unsafe direct `Receive` shortcut has been removed until a verified goods-receipt transaction can be wired to inventory.
