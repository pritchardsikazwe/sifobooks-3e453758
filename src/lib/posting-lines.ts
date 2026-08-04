import type { PreviewLine } from "@/components/PostingPreview";

/**
 * Pure, testable builders that turn a transaction into balanced double-entry
 * lines. Every UI flow (invoices, receipts, bills, payments, bank allocations,
 * payroll) uses these so the on-screen posting preview matches what the ledger
 * will actually receive.
 */

export type AccountLike = {
  id?: string;
  account_code?: string | null;
  account_name?: string | null;
  name?: string | null;
} | null | undefined;

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function acctLabel(a: AccountLike, fallback = "Unassigned account"): string {
  if (!a) return fallback;
  const name = a.account_name ?? a.name ?? fallback;
  return a.account_code ? `${a.account_code} — ${name}` : String(name);
}

const dr = (account: string, amount: number, description?: string): PreviewLine =>
  ({ account, description, debit: round2(amount), credit: 0 });
const cr = (account: string, amount: number, description?: string): PreviewLine =>
  ({ account, description, debit: 0, credit: round2(amount) });

const clean = (lines: PreviewLine[]) => lines.filter(l => round2(l.debit) !== 0 || round2(l.credit) !== 0);

/** Sum of debits minus credits — 0 when the entry balances. */
export function outOfBalance(lines: PreviewLine[]) {
  return round2(lines.reduce((s, l) => s + l.debit - l.credit, 0));
}

/* ------------------------------- Sales ---------------------------------- */

export function salesInvoiceLines(o: {
  subtotal: number; vat: number; total: number;
  receivable: AccountLike; revenue: AccountLike; vatOutput?: AccountLike;
  customerName?: string;
}): PreviewLine[] {
  return clean([
    dr(acctLabel(o.receivable, "1100 — Accounts Receivable"), o.total, o.customerName ? `Owed by ${o.customerName}` : "Trade receivable"),
    cr(acctLabel(o.revenue, "4000 — Sales Revenue"), o.subtotal, "Sales revenue"),
    cr(acctLabel(o.vatOutput, "2200 — VAT Payable"), o.vat, "VAT output"),
  ]);
}

export function creditNoteLines(o: {
  subtotal: number; vat: number; total: number;
  receivable: AccountLike; revenue: AccountLike; vatOutput?: AccountLike;
}): PreviewLine[] {
  return clean([
    dr(acctLabel(o.revenue, "4000 — Sales Revenue"), o.subtotal, "Sales returns / credit"),
    dr(acctLabel(o.vatOutput, "2200 — VAT Payable"), o.vat, "Reverse VAT output"),
    cr(acctLabel(o.receivable, "1100 — Accounts Receivable"), o.total, "Reduce trade receivable"),
  ]);
}

/* ------------------------------ Receipts -------------------------------- */

/**
 * Money received. Customer receipts clear the receivable; every other receipt
 * type credits the chosen income / liability / equity account.
 */
export function receiptLines(o: {
  amount: number;
  bank: AccountLike;
  credit: AccountLike;
  isCustomerReceipt?: boolean;
  payer?: string;
  invoiceNumber?: string;
}): PreviewLine[] {
  const creditDesc = o.isCustomerReceipt
    ? o.invoiceNumber ? `Settle invoice ${o.invoiceNumber}` : "Reduce customer balance"
    : "Amount received";
  return clean([
    dr(acctLabel(o.bank, "1000 — Cash & Bank"), o.amount, o.payer ? `Received from ${o.payer}` : "Cash / bank in"),
    cr(acctLabel(o.credit, o.isCustomerReceipt ? "1100 — Accounts Receivable" : "4000 — Sales Revenue"), o.amount, creditDesc),
  ]);
}

/* ------------------------- Purchases → Bills ---------------------------- */

export function supplierBillLines(o: {
  subtotal: number; vat: number; total: number;
  expense: AccountLike; payable: AccountLike; vatInput?: AccountLike;
  supplierName?: string;
}): PreviewLine[] {
  return clean([
    dr(acctLabel(o.expense, "5000 — Cost of Sales"), o.subtotal, "Purchase / expense"),
    dr(acctLabel(o.vatInput, "2201 — VAT Input"), o.vat, "VAT input (recoverable)"),
    cr(acctLabel(o.payable, "2100 — Accounts Payable"), o.total, o.supplierName ? `Owed to ${o.supplierName}` : "Trade payable"),
  ]);
}

export function supplierPaymentLines(o: {
  amount: number; payable: AccountLike; bank: AccountLike; supplierName?: string;
}): PreviewLine[] {
  return clean([
    dr(acctLabel(o.payable, "2100 — Accounts Payable"), o.amount, o.supplierName ? `Settle ${o.supplierName}` : "Reduce trade payable"),
    cr(acctLabel(o.bank, "1000 — Cash & Bank"), o.amount, "Cash / bank out"),
  ]);
}

/* -------------------- Banking: allocation & clearing --------------------- */

/**
 * `signedAmount` follows the bank statement: positive = money in,
 * negative = money out. `amount` is the (positive) portion being allocated.
 */
export function bankAllocationLines(o: {
  amount: number; signedAmount: number;
  bank: AccountLike; account: AccountLike; memo?: string;
}): PreviewLine[] {
  const amt = Math.abs(round2(o.amount));
  const bank = acctLabel(o.bank, "1000 — Cash & Bank");
  const other = acctLabel(o.account, "Allocation account");
  return o.signedAmount >= 0
    ? clean([dr(bank, amt, "Bank receipt"), cr(other, amt, o.memo ?? "Allocated income / settlement")])
    : clean([dr(other, amt, o.memo ?? "Allocated expense / settlement"), cr(bank, amt, "Bank payment")]);
}

/* ------------------------------- Payroll -------------------------------- */

export type PayrollTotals = {
  grossPay: number;
  paye: number;
  napsaEmployee: number;
  napsaEmployer: number;
  nhimaEmployee: number;
  nhimaEmployer: number;
  otherDeductions?: number;
  netPay: number;
};

export function payrollJournalLines(o: PayrollTotals & {
  wagesExpense: AccountLike;
  employerContribExpense?: AccountLike;
  payePayable: AccountLike;
  napsaPayable: AccountLike;
  nhimaPayable: AccountLike;
  otherPayable?: AccountLike;
  netPayable: AccountLike;
  periodLabel?: string;
}): PreviewLine[] {
  const p = o.periodLabel ? ` — ${o.periodLabel}` : "";
  const employer = round2(o.napsaEmployer) + round2(o.nhimaEmployer);
  return clean([
    dr(acctLabel(o.wagesExpense, "6200 — Salaries & Wages"), o.grossPay, `Gross pay${p}`),
    dr(acctLabel(o.employerContribExpense ?? o.wagesExpense, "6210 — Employer Contributions"), employer, `Employer NAPSA + NHIMA${p}`),
    cr(acctLabel(o.payePayable, "2300 — PAYE Payable"), o.paye, "PAYE due to ZRA"),
    cr(acctLabel(o.napsaPayable, "2310 — NAPSA Payable"), round2(o.napsaEmployee) + round2(o.napsaEmployer), "NAPSA (employee + employer)"),
    cr(acctLabel(o.nhimaPayable, "2320 — NHIMA Payable"), round2(o.nhimaEmployee) + round2(o.nhimaEmployer), "NHIMA (employee + employer)"),
    cr(acctLabel(o.otherPayable, "2390 — Other Payroll Deductions"), o.otherDeductions ?? 0, "Loans, unions & other deductions"),
    cr(acctLabel(o.netPayable, "1000 — Cash & Bank"), o.netPay, `Net pay to staff${p}`),
  ]);
}

/** Totals a list of payslip-like rows into the shape payrollJournalLines wants. */
export function sumPayslips(rows: Array<Record<string, any>>): PayrollTotals {
  const n = (v: any) => Number(v) || 0;
  const t = rows.reduce(
    (a, r) => ({
      grossPay: a.grossPay + n(r.gross_pay),
      paye: a.paye + n(r.paye),
      napsaEmployee: a.napsaEmployee + n(r.napsa_employee),
      napsaEmployer: a.napsaEmployer + n(r.napsa_employer),
      nhimaEmployee: a.nhimaEmployee + n(r.nhima_employee),
      nhimaEmployer: a.nhimaEmployer + n(r.nhima_employer),
      otherDeductions: a.otherDeductions + n(r.other_deductions) + n(r.loan_deduction),
      netPay: a.netPay + n(r.net_pay),
    }),
    { grossPay: 0, paye: 0, napsaEmployee: 0, napsaEmployer: 0, nhimaEmployee: 0, nhimaEmployer: 0, otherDeductions: 0, netPay: 0 },
  );
  return {
    grossPay: round2(t.grossPay), paye: round2(t.paye),
    napsaEmployee: round2(t.napsaEmployee), napsaEmployer: round2(t.napsaEmployer),
    nhimaEmployee: round2(t.nhimaEmployee), nhimaEmployer: round2(t.nhimaEmployer),
    otherDeductions: round2(t.otherDeductions), netPay: round2(t.netPay),
  };
}
