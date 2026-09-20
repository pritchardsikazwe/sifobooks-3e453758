# SifoBooks Phase 2 — End-to-End Acceptance Test Plan

## Master flow

1. Sign in as owner/administrator.
2. Confirm an open accounting period.
3. Create/verify supplier and item.
4. Configure base, purchase and sales units and ZRA mapping.
5. Create PO; verify DRAFT.
6. Approve PO with authorized role.
7. Receive stock against the approved PO.
8. Confirm GRN is POSTED and PO becomes PARTIAL or RECEIVED.
9. Confirm stock ledger, location balance, moving-average cost and GRNI journal.
10. Create supplier bill from GRN; confirm GRNI debit and AP credit.
11. Transfer stock Warehouse → Chibombo Store; verify both location balances.
12. Open POS shift and sell using the sales unit.
13. Confirm base-unit deduction, revenue and tax snapshot.
14. Submit the sale to ZRA UAT VSDC.
15. Confirm receipt number/internal data/signature/QR data are retained and receipt prints.
16. Close POS shift and reconcile expected vs actual cash.
17. Create, approve and post physical stock reconciliation.
18. Run Accounting Integrity Reconciliation.

## Negative tests

- PO cannot be received before approval.
- PO cannot receive more than ordered quantity.
- Supplier bill cannot be created twice from one GRN.
- Supplier invoice number is required.
- Transfer cannot use the same source and destination.
- Transfer cannot exceed source-location stock.
- Stock reconciliation requires authorized approval.
- Closed accounting periods reject operational posting.
- POS cannot exceed available stock unless the configured policy permits negative stock.
- Fiscalized POS sales cannot be silently voided/refunded.
- Duplicate ZRA submission cannot create a second fiscal transaction.
- ZRA rejection retains response and is retryable/reviewable.

## Unit conversion test

Base unit: bottle. Sales unit: carton. Conversion: 1 carton = 24 bottles. Sale: 2 cartons at K480/carton.

Expected: revenue K960; inventory deduction 48 bottles; COGS uses 48 base units; cashier-facing quantity remains 2 cartons.

## Accounting assertions

Every posted journal must satisfy SUM(debits) = SUM(credits).

GRN: Debit Inventory Asset; Debit Input VAT when applicable; Credit GRNI.

Supplier bill: Debit GRNI; Credit Accounts Payable.

POS: revenue/tax/payment postings balance with configured posting rules; COGS and inventory use base-unit quantities.

## Fiscal assertions

A fiscalized POS transaction retains ZRA receipt number, internal data, receipt signature, QR data where returned, raw response, fiscalized timestamp and immutable audit event.

## Windows acceptance

Run the portable Windows build on a clean Windows machine. Start it without GitHub/Base44; verify SQLite migration, login, shift, sale, printing, restart persistence, offline queue and one-time synchronization after reconnect.