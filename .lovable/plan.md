
## Scope

Four Sage-style surfaces, all in dark glass matching the current dashboard theme.

## 1. Spend Money modal (Banking)

New component `src/components/SpendMoneyDialog.tsx` opened from a "Spend Money" button on `banking.tsx` and `bank-accounts.tsx`.

Fields (match screenshot order):
- Account Paid From (bank account select, shows current balance)
- Transaction Date (date picker, defaults today)
- Amount (currency, ZMW)
- Supplier (optional combobox from `suppliers`)
- Payment Method (Manual / EFT / Cheque / Cash / Mobile Money)
- Reference Number (auto-filled `PMT-####`, editable)
- Journal Memo (textarea)
- Account Allocation grid: rows of `{ account (COA select), amount, DR/CR }`, add/remove rows, live remaining-to-allocate indicator
- Actions: Save Template, Record (primary), Cancel

On Record: insert one `bank_transactions` row (negative amount) plus a balanced `journal_entries` + `journal_lines` posting from bank credit → allocation debits/credits. Reuses existing `posting.ts` helpers.

## 2. Reconcile Account modal

New component `src/components/ReconcileDialog.tsx` opened from Banking and Reconciliation Sessions.

Header grid: Account · Last Reconciled Date · Bank Statement Date · New Statement Balance · Calculated Balance (live) · Out of Balance (live, red when non-zero).

Body: table of unreconciled `bank_transactions` for the account with a Reconciled checkbox, Date, Ledger Transaction, Deposits, Payments columns. Toolbar: Load Bank Statement from File (reuses existing `statement-parser.ts`), + Add Deposit, + Add Payment, Rollback to Previous. Footer: Reconcile (disabled until Out of Balance = 0), Cancel.

On Reconcile: creates a `reconciliation_sessions` row via existing `lock_reconciliation` RPC with the ticked lines.

## 3. Reports hub — colored tile grid

Rewrite `src/routes/_authenticated/reports.index.tsx` to render category-colored tiles matching the screenshot:
- Purple: Income Statement, Income Statement Analysis, Balance Sheet, Cash Flow, Trial Balance, Consolidated
- Orange: Invoices, Quotes, Orders, Sales Invoice Payment, Transactions, Items per Customer, Customer Sales
- Cyan: Inventory, Item Sales, Salesperson, Unpaid Accounts, Accounts Payable, Payments of AP, AR Aging, Customers
- Green: Account Enquiry, Reconciliation, Chart of Accounts, Mileage, VAT/Sales Tax, Budget & Variance, Customised

Dark-glass tiles with color-tinted gradient overlays, keyboard-navigable, click routes to existing report pages. Skeleton loaders while route lazy-loads.

## 4. Inventory table — grouped layout

Rewrite `src/routes/_authenticated/stock.tsx` list view to group `stock_items` by `warehouse` (Location) → `category`, with columns: Category, Order By Unit, Cost, Qty/Unit, Item Size, Cost per Item, Stock Qty, Reorder Level, Reorder (auto: `qty <= reorder_level ? "REORDER" : "OK"` styled pill), Item Reorder Qty. Sticky location headers, alternating row shading, dark-glass shell.

## Shared

- `src/components/ui/glass-card.tsx` — reusable dark-glass panel token so all four surfaces share the same background/border/blur.
- All new dialogs: shadcn Dialog, `pointer-events-auto` on interactive parts, responsive (stack on <sm), keyboard shortcuts (Esc close, ⌘/Ctrl+Enter submit), toast success/error, zod validation, loading skeletons.
- No new tables; reuses `bank_transactions`, `bank_allocations`, `reconciliation_sessions`, `journal_entries`, `stock_items`, `warehouses`.

## Technical notes

- Dialogs live in `src/components/`, opened from existing routes — no new routes.
- Posting reuses `src/lib/posting.ts` and `src/lib/bank-posting.ts`; if a helper for multi-line DR/CR splits is missing, add `postSpendMoney()` in `src/lib/bank-posting.ts`.
- Reports tiles map to existing routes under `/reports/*`; any tile whose target route doesn't exist yet renders as "Coming soon" instead of a broken link.
- Inventory grouping done client-side with `useMemo`; no schema change.
