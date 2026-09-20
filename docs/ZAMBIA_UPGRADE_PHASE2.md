# SifoBooks Zambia Upgrade — Phase 2

## Implemented controls

- Item unit conversions with audit history.
- Purchase orders with approval and receiving controls.
- GRN accounting through Goods Received Not Invoiced (GRNI).
- Supplier bill clears GRNI to Accounts Payable.
- PO over-receipt prevention and PARTIAL/RECEIVED status progression.
- Warehouse/store stock transfers in base units.
- Physical stock reconciliation with management approval.
- POS sales retain selling quantity/unit while inventory posts base-unit quantities.
- POS stock validation at the selling location.
- POS shift closing is server-authoritative and records expected cash, actual cash and variance.
- Non-fiscalized POS reversals return stock and record reversal actions.
- Fiscalized POS refunds cannot be silently voided; they use the ZRA correction workflow.
- ZRA credit/debit correction submission uses the VSDC sales request with the appropriate receipt type and original invoice reference.
- Accepted ZRA corrections are followed by local stock and accounting reversal; failures are marked for retry/local-posting review.
- ZRA correction requests are idempotent through the document correction control and ZRA outbox.

## ZRA basis

The implementation follows the official ZRA VSDC specification for credit/debit notes: credit notes use the reversal-after-sale receipt type, debit notes use the adjustment-upwards-after-sale receipt type, and correction requests reference the original invoice. Actual production use remains subject to ZRA registration, UAT and certification requirements.

## Important validation

GitHub Actions is currently queued for the latest Phase 2 head. A green CI result must be obtained before treating the branch as build-validated.

## Deployment policy

Contabo is intentionally not configured as part of this phase. The repository remains the source of truth and the Windows portable package remains the deployment target for local POS operation.
