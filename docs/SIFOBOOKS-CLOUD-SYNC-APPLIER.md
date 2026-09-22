# Cloud Sync Applier

The sync transport now has a controlled application boundary.

Whitelisted financial event types are routed to the existing atomic accounting services:

- pos_checkout
- sales_invoice
- purchase_bill
- bill_payment
- credit_note
- pos_reversal

Unknown event types are marked unsupported rather than executed. Failed events are retained with an apply error for review. Successful events are marked processed only after the accounting service returns successfully.

The applier deliberately does not write journal, stock, VAT, or fiscal records itself. This prevents local/cloud implementations from creating a second accounting engine.
