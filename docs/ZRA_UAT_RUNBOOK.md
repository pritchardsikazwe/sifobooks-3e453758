# SifoBooks — ZRA Smart Invoice UAT Readiness Runbook

## Purpose

Prepare SifoBooks for controlled ZRA Smart Invoice/VSDC UAT. This is not a claim of ZRA certification.

## Configuration prerequisites

Record and verify TPIN, Branch ID, Device/SDC identifier, VSDC endpoint, UAT/production mode, terminal/register ID, taxpayer/branch details and tax configuration. Never place production credentials in source control.

## Regulatory master data

Synchronize ZRA standard codes and item classifications. Store retrieved dictionaries locally with timestamps. Map each fiscalized item to ZRA item/classification/package/quantity/VAT fields. Reject fiscalization when required mapping is incomplete.

## UAT transaction matrix

### Normal sale
Verify POS totals, VAT, payment method, ZRA item mapping, returned receipt number, internal data, receipt signature, QR information where supplied and local printing.

### Credit note
Start from a fiscalized sale. Verify original ZRA invoice number, original SDC/device identifier, synchronized credit-note receipt type, retained response, local stock/accounting reversal only after accepted fiscal correction, and correction audit event.

### Debit note
Repeat the credit-note controls using the debit-note receipt type.

### Rejected transaction
Force a controlled UAT rejection. Verify response retention, retryability, preservation of the original sale, no duplicate fiscal transaction and audit trail.

### Duplicate submission
Submit the same sale twice. Expected result: existing idempotent fiscal transaction is reused/returned and no second fiscalized sale is created.

### Offline/reconnect
Verify an offline transaction is not falsely marked fiscalized, queued work submits after reconnection, and retry does not duplicate the fiscal transaction.

## Evidence pack

Keep application version/commit, VSDC version, redacted configuration, dictionary sync timestamps, redacted request/response samples, accepted receipt numbers, receipt prints, credit/debit evidence, rejection evidence, duplicate-submission evidence, audit export, accounting reconciliation and stock reconciliation results.

## Official specification basis

Validate against the ZRA VSDC specification supplied for the taxpayer's UAT. The official v1.0.8 specification describes the Save Sales Request for credit notes and includes tpin, bhfId, orgSdcId, orgIncNo, cisInvcNo, salesTyCd, rcptTyCd and salesSttsCd among the required fields.

Do not substitute undocumented field names or assume sandbox response shapes are identical to production.

## Certification boundary

Passing SifoBooks internal tests or ZRA UAT tests does not itself constitute ZRA certification. Certification/approval must come through the applicable ZRA process.