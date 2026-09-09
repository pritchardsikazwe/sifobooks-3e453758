# SifoBooks Inventory Document Standard

Inventory transaction screens must use a consistent document model before posting stock.

## Required document types

- Goods Receipt / Stock Receipt
- Stock Issue
- Stock Transfer
- Stock Adjustment
- Stock Take
- Production / Batch movement where enabled

## Document header

Every document shows document type, unique number, status, date, branch and responsible user.

## Location context

Receipt and issue documents show the warehouse/location. Transfers show both source and destination. Branch restrictions must be respected.

## Line grid

Each line supports item/SKU, description, quantity, unit, batch/serial when enabled, unit cost, and line value. Editing must immediately recalculate totals.

## Workflow

Transfers: Draft -> Approved -> Dispatched -> Received.

Stock takes: Open -> Count -> Review -> Approved -> Posted.

Adjustments require a reason and manager authorization where configured.

## Posting controls

A posted stock document must create the corresponding stock movement exactly once. Stock and GL effects must be visible before posting where accounting integration is enabled.

Negative stock must be blocked unless the company policy and authorized override permit it. Overrides require an audit record.

## Audit

Preserve the original document after posting. Record creator, editor, approver, posting timestamp, reason codes and reversal/void information.

## Visual standard

Use the shared SifoBooks document shell, responsive line grid, sticky actions, print-safe document layout, clear totals and consistent status badges.
