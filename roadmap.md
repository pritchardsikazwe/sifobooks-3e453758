# SifoBooks roadmap

## Done: Real report engine
- [x] Shared report engine (`src/lib/reports/engine.ts`) reading live tenant data
- [x] Smart Reporter insight generator (`src/lib/reports/insights.ts`) — read-only
- [x] Shared `SifoReportViewer` + `SifoSmartReporter` components
- [x] Trial Balance, General Ledger, P&L, Balance Sheet
- [x] Cashbook/Bank, AR Aging, AP Aging
- [x] Stock Valuation, Stock Movement, Stock Reconciliation
- [x] Sales by Item / Customer / Branch, VAT-Tax
- [x] Reports index links + engine unit tests + typecheck/tests/build

## Done: Finance area audit (no data changes; anomalies reported, not corrected)
- [x] Cashbook/bank: verified — real account selectors, no forced creation
- [x] Bank allocation: verified — existing transactions + existing COA accounts
- [x] Reconciliation: verified — real transactions, opening/receipts/payments/closing, locked sessions
- [x] Chart of accounts: added account detail drawer (balance + posted entries + drill-down), design tokens
- [x] Journal entries: verified — COA-only selectors, posted entries read-only via reversal
- [x] Invoices/receivables: verified — customer first, then that customer's open invoices
- [x] Bills/payables: rebuilt supplier payment as supplier → open bills → allocation with posting preview
- [x] Period close: verified — RPC-gated, confirmed, audited; DB trigger blocks closed-period posting
- [x] Finance UX: breadcrumb/module headers on cashbook, bank accounts, reconciliation, sessions, period close

## Open anomalies to review with the user (not auto-corrected)
- MKP tenant posted trial balance is out of balance by 365.00 (debits 3,900.00 vs credits 3,535.00).
