# Demo polish + Finance/Cashbook clarity

Two workstreams in the existing project. No real company data, balances or history is touched, and no demo data ever enters a real company.

## A. Demo experience

The demo layer already exists as an isolated, read-only sample environment (Hotel, School, Restaurant) that never touches the live database. It works but looks flat: text tables, no charts, no dashboard feel.

Improvements:
- **Demo entry from the landing page** — three clear cards (Hotel Demo, School Demo, Restaurant Demo) with a coloured "Enter demo" button, plus a link in the top header. No passwords: the demo opens instantly, so there is nothing to leak or fake.
- **Real dashboard feel** — each demo opens on an overview screen with headline figures, trend and mix charts (using the charting library the app already has), status badges and coloured action buttons that jump straight into the matching workflow screen.
- **New visual pieces** for the demo screens: revenue/occupancy trend line, breakdown donut, progress bars, a timeline strip for order/booking flow, and a floor-plan grid.
- **Consistent look** — same colours, spacing, cards and buttons as the rest of SifoBooks; mobile layouts checked.
- Every demo screen keeps the amber "DEMO ENVIRONMENT — SAMPLE DATA ONLY" banner, plus a footer note on isolation.

## B. Restaurant demo — full operations story

Extend the restaurant demo so the walkthrough runs end to end with "next step" buttons linking each screen to the next:

Dashboard → floor plan/tables → reservations & waitlist → waiter order → kitchen display → prep/serve → bill → split/merge → payment (cash/card/mobile) → cashier shift → cash-up/close → ingredients → recipes → wastage → purchasing → suppliers → expenses → accounting impact → reports.

Screens gain visual table maps, ticket boards with timers, modifier/course detail, service charge, discount and tax lines, split-payment panels and a day-close summary.

## C. Finance navigation and workflow clarity

Restructure the Finance hub into five plain-language groups (no route removed, no route renamed):

- **Cash & Bank** — Cashbook, Bank Accounts, Bank Transactions, Deposits, Reconciliation
- **Receivables** — Customer Invoices, Customer Receipts, Customer Allocations, AR Aging
- **Payables** — Supplier Bills, Supplier Payments, Supplier Allocations, AP Aging
- **Expenses** — Expenses/Claims, Cash Expenses, Bank Expenses
- **General Accounting** — Journal Entries, Chart of Accounts, General Ledger, Trial Balance, Period Close

Each entry gets a one-line explanation of who pays whom and why.

**Finance action bar** (reused on the Finance hub, Cashbook and Banking pages):
`Receive Customer Money` · `Pay Supplier` · `Record Expense` · `Bank Deposit` · `Transfer Between Accounts` · `New Journal` — each opens the existing workflow, no new posting logic.

**"Which one do I use?" card** with the worked examples: customer paid an invoice, we paid a supplier bill, we bought fuel with cash, till cash to bank, bank to bank, manual correction.

Page-level wording and flow:
- Receipts page → titled **Customer Receipt — Receive Money from Customer**: pick existing customer, see their outstanding invoices, allocate across them, pick the cash/bank account, see received / allocated / unallocated totals before posting.
- Bill payments → **Supplier Payment — Pay Supplier**, same shape against outstanding bills.
- Expenses → **Record Expense**, with existing GL account + existing cash/bank account, optional existing supplier/payee, evidence attachment where supported, and a note explaining how it differs from a supplier bill/payment.
- Deposits → **Bank Deposit — Deposit Cash to Bank**: existing source cash account → existing destination bank account, amount/date/reference. Money moves between accounts; it is never treated as sales.
- **Cashbook** becomes a chronological control ledger: Date, Reference, Description, Source, Receipt, Payment, Running Balance, Reconciled — each row clicks through to the source document.
- **Banking** shows account balance with matched / unmatched / reconciled counts up front.

## D. Existing-record rule

Where any of the touched screens still lets a user type a free-text name instead of choosing an existing customer, supplier, item, account, invoice, bill, employee or bank/cash account, it is switched to the existing searchable selector, with "create new" kept as a secondary option.

## E. Safety and validation

- Demo content stays in the isolated sample layer; it cannot post, and cannot read any company's records.
- No changes to posting rules, approvals, period locks, permissions or tenant isolation; no test transactions run.
- Typecheck, the existing test suite and a build run before reporting; results reported honestly.

## Technical notes

- Demo data/types: `src/lib/demo/*`; demo UI: `src/components/demo/*`; demo routes: `src/routes/demo.*`. New chart/floor-plan/timeline block kinds added to the demo block renderer.
- Finance grouping: `src/lib/nav-hubs.ts` (`finance` hub) — items regrouped and re-hinted only; URLs unchanged. Missing entries (Deposits, AR/AP aging, Trial Balance, General Ledger, allocations) point at existing routes.
- New shared component `src/components/sifo/FinanceActionBar.tsx` used by the finance hub, `cashbook.tsx` and `banking.tsx`.
- Cashbook row model reshaped in `src/routes/_authenticated/cashbook.tsx` (presentation only; same queries and RLS path).
- Receipts / bill-payments / expenses / deposits routes: heading, guidance and selector changes only — posting calls untouched.
