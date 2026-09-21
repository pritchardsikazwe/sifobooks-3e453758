# SifoBooks Cloud Atomic Accounting Transactions

The cloud PostgreSQL data plane now provides atomic server-side transaction services for the core accounting flows.

## Implemented

- POS checkout: sale + lines + payments + stock deduction + stock movement + COGS/inventory journal + VAT + ZRA queue + audit event.
- Sales invoice: invoice + lines + accounts receivable + revenue + VAT + ZRA queue.
- Purchase bill: bill + lines + stock receipt + inventory + VAT input + accounts payable.
- Supplier bill payment: payment + bill balance + AP/cash journal.
- Credit note: note + returned stock + VAT reversal + customer credit + ZRA queue.
- POS void/refund: stock return + journal reversal. Fiscalized sales are blocked and must use the ZRA correction workflow.

## Transaction guarantees

Every workflow is wrapped in one PostgreSQL transaction. A failure rolls back the complete financial operation.

The engine also uses:

- PostgreSQL row locks (FOR UPDATE) for stock and bill balances.
- Tenant-bound PostgreSQL RLS.
- Idempotency through cloud_transaction_batches.
- Balanced double-entry journals.
- Durable ZRA queue records created in the same accounting transaction.
- Cloud transaction event history.
- No mutation of the existing SQLite/local transaction path.

## ZRA boundary

External VSDC/ZRA HTTP calls are intentionally outside the accounting database transaction. SifoBooks commits the accounting transaction and durable ZRA queue item first. A connector/worker then submits to VSDC and stores the ZRA response. A temporary internet/VSDC outage therefore does not create a half-posted sale.

## RPC compatibility

The cloud RPC gateway now handles:

- pos_checkout
- reverse_pos_sale
- post_sales_invoice
- post_purchase_bill
- post_credit_note
- record_bill_payment

Existing local SQLite RPCs remain unchanged.
