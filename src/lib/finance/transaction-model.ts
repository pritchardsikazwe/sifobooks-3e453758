/**
 * Shared finance transaction model for SifoBooks.
 *
 * One vocabulary for "what kind of transaction is this", "was it approved",
 * "was it posted to the ledger" and "has it been paid". These are four
 * independent questions and the UI must answer each of them separately —
 * a single generic "Posted" chip is not enough for an accountant.
 *
 * Pure functions only: nothing here reads, writes or recalculates ledger data.
 */

export type FinanceTxnType =
  | "business_expense"
  | "supplier_expense"
  | "reimbursement"
  | "supplier_payment"
  | "customer_receipt"
  | "transfer";

export type AccountingStatus = "draft" | "posted" | "reversed" | "pending_sync" | "void";
export type PaymentStatus = "unpaid" | "partially_paid" | "paid" | "not_applicable";
export type ApprovalStatus = "draft" | "submitted" | "approved" | "rejected";

export type TxnTypeMeta = {
  value: FinanceTxnType;
  label: string;
  /** One sentence an accountant can act on. */
  description: string;
  /** Does this transaction record a cost in profit & loss? */
  isExpense: boolean;
  /** Does it settle an existing liability instead of creating one? */
  settlesLiability: boolean;
};

export const TXN_TYPES: Record<FinanceTxnType, TxnTypeMeta> = {
  business_expense: {
    value: "business_expense",
    label: "Business / Office Expense",
    description:
      "A direct operating cost (rent, electricity, internet, stationery, fuel, repairs, subscriptions) paid straight from a cash, bank or mobile money account.",
    isExpense: true,
    settlesLiability: false,
  },
  supplier_expense: {
    value: "supplier_expense",
    label: "Supplier Expense / Purchase",
    description:
      "A cost incurred from an existing supplier and owed to them. It creates the cost and the payable; paying it later does not create the cost again.",
    isExpense: true,
    settlesLiability: false,
  },
  reimbursement: {
    value: "reimbursement",
    label: "Expense Reimbursement",
    description:
      "A cost paid personally by an employee and owed back to them, or refunded to them directly.",
    isExpense: true,
    settlesLiability: false,
  },
  supplier_payment: {
    value: "supplier_payment",
    label: "Supplier Payment",
    description:
      "Money paid to a supplier and allocated against existing bills. It settles the payable — it is never an expense on its own.",
    isExpense: false,
    settlesLiability: true,
  },
  customer_receipt: {
    value: "customer_receipt",
    label: "Customer Receipt",
    description: "Money received from a customer and allocated against existing invoices.",
    isExpense: false,
    settlesLiability: false,
  },
  transfer: {
    value: "transfer",
    label: "Bank / Cash Transfer",
    description:
      "Movement of money between your own accounts. This is not an expense and must never be counted as one.",
    isExpense: false,
    settlesLiability: false,
  },
};

/** Types that can be captured on the Expenses screen. */
export const EXPENSE_TXN_TYPES: FinanceTxnType[] = [
  "business_expense",
  "supplier_expense",
  "reimbursement",
];

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

export function txnTypeMeta(t: string | null | undefined): TxnTypeMeta {
  return TXN_TYPES[(t ?? "business_expense") as FinanceTxnType] ?? TXN_TYPES.business_expense;
}

export function accountingStatusMeta(s: string | null | undefined): {
  label: string;
  tone: BadgeTone;
  help: string;
} {
  switch ((s ?? "").toLowerCase()) {
    case "posted":
      return { label: "Posted to ledger", tone: "success", help: "A balanced journal entry exists for this transaction." };
    case "reversed":
      return { label: "Reversed", tone: "danger", help: "A reversing journal entry was posted. The original entry is kept for audit." };
    case "void":
      return { label: "Voided", tone: "danger", help: "Cancelled before it reached the ledger." };
    case "pending_sync":
      return { label: "Pending sync", tone: "warning", help: "Captured offline. It will post once the device is back online." };
    case "draft":
      return { label: "Not posted (draft)", tone: "neutral", help: "Nothing has reached the ledger yet." };
    default:
      return { label: s ? s.replace(/_/g, " ") : "Not posted", tone: "neutral", help: "No ledger entry recorded." };
  }
}

export function paymentStatusMeta(s: string | null | undefined): { label: string; tone: BadgeTone } {
  switch ((s ?? "").toLowerCase()) {
    case "paid":
      return { label: "Paid / Settled", tone: "success" };
    case "partially_paid":
      return { label: "Partially paid", tone: "warning" };
    case "unpaid":
      return { label: "Outstanding", tone: "danger" };
    case "not_applicable":
      return { label: "No payment due", tone: "neutral" };
    default:
      return { label: s ? s.replace(/_/g, " ") : "—", tone: "neutral" };
  }
}

export function approvalStatusMeta(s: string | null | undefined): { label: string; tone: BadgeTone } {
  switch ((s ?? "").toLowerCase()) {
    case "approved":
      return { label: "Approved", tone: "success" };
    case "submitted":
      return { label: "Awaiting approval", tone: "warning" };
    case "rejected":
      return { label: "Rejected", tone: "danger" };
    case "draft":
      return { label: "Draft", tone: "neutral" };
    default:
      return { label: s ? s.replace(/_/g, " ") : "—", tone: "neutral" };
  }
}

/** Derive payment status from amounts without ever changing the amounts. */
export function derivePaymentStatus(total: number, paid: number): PaymentStatus {
  const t = Math.round((Number(total) || 0) * 100);
  const p = Math.round((Number(paid) || 0) * 100);
  if (t <= 0) return "not_applicable";
  if (p <= 0) return "unpaid";
  if (p >= t) return "paid";
  return "partially_paid";
}

export type ExpectedPostingLine = { account: string; debit?: boolean; note?: string };

/**
 * Plain-language description of the journal a transaction type produces.
 * Used for the "What was posted?" explanation next to the real journal lines.
 */
export function expectedPosting(
  type: FinanceTxnType,
  opts: { hasVat?: boolean; sourceAccount?: string | null; expenseAccount?: string | null } = {},
): ExpectedPostingLine[] {
  const src = opts.sourceAccount || "Cash / Bank";
  const exp = opts.expenseAccount || "Expense account";
  const vat: ExpectedPostingLine[] = opts.hasVat
    ? [{ account: "VAT / Input Tax", debit: true, note: "Recoverable input tax" }]
    : [];
  switch (type) {
    case "business_expense":
      return [{ account: exp, debit: true, note: "The cost" }, ...vat, { account: src, debit: false, note: "Money leaving the account" }];
    case "supplier_expense":
      return [
        { account: exp, debit: true, note: "The cost" },
        ...vat,
        { account: "Accounts Payable", debit: false, note: "Amount now owed to the supplier" },
      ];
    case "reimbursement":
      return [
        { account: exp, debit: true, note: "The cost" },
        ...vat,
        { account: "Staff reimbursements payable / Cash", debit: false, note: "Owed to or paid to the employee" },
      ];
    case "supplier_payment":
      return [
        { account: "Accounts Payable", debit: true, note: "Reduces what you owe — not a new expense" },
        { account: src, debit: false, note: "Money leaving the account" },
      ];
    case "customer_receipt":
      return [
        { account: src, debit: true, note: "Money received" },
        { account: "Accounts Receivable", debit: false, note: "Reduces what the customer owes" },
      ];
    case "transfer":
      return [
        { account: "Destination account", debit: true },
        { account: "Source account", debit: false, note: "Not an expense — money stays in the business" },
      ];
  }
}

/** True when a record should be counted in expense totals (avoids double counting). */
export function countsAsExpense(row: {
  transaction_type?: string | null;
  status?: string | null;
}): boolean {
  const meta = txnTypeMeta(row.transaction_type);
  if (!meta.isExpense) return false;
  const s = (row.status ?? "").toLowerCase();
  return s !== "reversed" && s !== "void";
}
