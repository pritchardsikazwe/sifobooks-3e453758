# SifoBooks Accounting Engine Upgrade

Enterprise-grade banking, journals, cashbooks, posting, and reports. Sized in 5 phases so each ships working before the next begins.

## What already exists (won't rebuild)
- Bills / Receipts / Expenses auto-posting via triggers → GL
- `bank_allocations` with partial splits + reversal
- `auto_match_bank_transactions()` amount/date matcher
- `journal_entries` + `journal_lines` + `reverse_bank_allocation`
- Trial Balance, P&L, Balance Sheet, Cash Flow, VAT, AFS, Payroll schedules, Statements
- Period close (`close_month`, `close_year`, `reopen_period`)
- Multi-currency `fx_rates` + `fx_rate()` helper
- Imprest register with retirement
- Universal `ExportMenu` (CSV / Excel / PDF)

## Phase 1 — Banking depth (this turn)

**DB migration**
- `bank_accounts` table: name, bank_name, account_number, currency, opening_balance, opening_date, gl_account_id, is_active, notes. Linked to `company_id`.
- Add `bank_account_id` to `bank_transactions` + `bank_allocations` (backfill existing rows to a default "Default Bank" account per user).
- `bank_documents` table for attachments (uses existing `company-logos` bucket pattern → new `bank-documents` bucket).
- `bank_rules` table: description_pattern, contains/regex, suggested_account_id, auto_apply. Consumed by matcher.
- Extend `auto_match_bank_transactions()` to (a) apply learned rules first, (b) fall back to amount+date match.
- `bank_running_balance` view: opening + cumulative debit/credit per bank_account_id ordered by date.

**UI**
- `banking.tsx` split into tabs: **Accounts** (CRUD + opening balance) · **Transactions** (existing + filter by account, date, ref, amount) · **Import** (existing CSV + new OFX parser) · **Rules** (create/edit smart matching rules) · **Reconcile** (moved from `reconciliation.tsx`).
- Bank dashboard card at top: total balance across accounts, unmatched count, pending recon count, recent 5 deposits/payments.
- Transaction row: attach document button → uploads to storage, links via `bank_documents`.

**Public tenants benefit**: any company adds unlimited bank accounts, imports OFX, teaches rules once → future ZESCO/MTN/etc auto-match.

## Phase 2 — Reconciliation workflow (next turn)

**DB**
- `bank_reconciliations` table: bank_account_id, statement_date, statement_balance, system_balance, difference, status (draft/completed/locked), locked_at, locked_by.
- `bank_reconciliation_lines` linking reconciled `bank_transactions` to a recon session.

**UI**
- Professional recon screen: Statement Balance − Outstanding Deposits + Outstanding Payments = Adjusted Balance vs System Balance = Difference.
- Lock button (posts summary JE stamp, marks lines immutable). Reopen requires `admin` role via `has_role`.
- Reports: Bank Reconciliation Statement (PDF), Outstanding Payments, Outstanding Deposits, Unpresented Cheques.

## Phase 3 — Journal & Cashbook

**Journals**
- Add `journal_type` enum column: general/cash/bank/sales/purchase/adjustment/opening/depreciation/tax/payroll.
- Journal editor: multi-line form, live DR=CR validator, required description, attach supporting doc, save draft → post workflow.
- Recurring journals table (frequency, next_run_date, template lines) + nightly `pg_cron` job.

**Cashbook**
- `cash_accounts` table (Main / Petty / Branch / POS) — mirrors bank accounts but GL-mapped to cash.
- Cash In / Cash Out / Transfer / Adjustment forms → auto JE.
- Cashbook report per account with running balance.
- Petty cash reimbursement flow reusing Imprest.

## Phase 4 — Reports & Drill-down

- **General Ledger**: full account activity report, filter by date/account, click line → open source document (bill/receipt/expense/journal).
- **Cash Position**: today's opening + inflows − outflows = closing per account.
- **Journal Register**: filter by type/status/date + posted vs draft tabs.
- Drill-down chain wired: P&L line → account transactions → source doc.
- Every report gets Print + PDF + Excel + CSV via existing `ExportMenu` + `ReportShell`.

## Phase 5 — Dashboard, guardrails, POS sync

- **Accounting Health card** on `/dashboard`: green=reconciled, amber=pending, red=posting errors count.
- **Error prevention**: DB triggers block unbalanced JE post, duplicate reference within 24h, negative cash if account flag set. Friendly toast messages.
- **POS offline sync stub**: `sync_queue` table + `POST /api/public/pos-sync` route with HMAC signature — accepts batched POS sales, deduplicates by client_uuid, posts to bills/receipts/inventory.

## Technical notes
- All new tables: RLS `auth.uid() = user_id`, GRANT to authenticated + service_role, `company_id` scoping where multi-tenant.
- Backfill existing `bank_transactions` on migration so no data lost.
- Posting functions stay `SECURITY DEFINER` for reliability.
- OFX parser is a small pure-TS routine (~80 lines) — no new dep needed beyond existing `xlsx`.
- No breaking changes to existing routes; new capabilities are additive.

## Delivery order
Reply **"go phase 1"** and I ship Banking depth (bank accounts, OFX import, smart rules, document attach, dashboard card). Each subsequent phase ships on the next "go".
