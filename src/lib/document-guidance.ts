/**
 * Deterministic "what happens next" guidance for each document type.
 *
 * This is presentation guidance only — every button points at an existing
 * route/service and posting still happens through the existing engine.
 */

export type GuidanceStep = { label: string; to: string; hint?: string };

export type DocumentGuidance = {
  key: string;
  /** Plain-language explanation of what the document does to the books. */
  impact: (ctx: DocContext) => string[];
  steps: (ctx: DocContext) => GuidanceStep[];
  /** Lifecycle shown as a progress trail. */
  lifecycle: string[];
};

export type DocContext = {
  reference?: string;
  id?: string;
  amount?: string;
  net?: string;
  tax?: string;
  party?: string;
  hasStock?: boolean;
};

export const DOCUMENT_GUIDANCE: Record<string, DocumentGuidance> = {
  invoice: {
    key: "invoice",
    lifecycle: ["Created", "Sent", "Payment received", "Reconciled"],
    impact: (c) => [
      `Accounts receivable increases by ${c.amount ?? "the invoice total"} — ${c.party ?? "the customer"} now owes you that money.`,
      `Sales revenue increases by ${c.net ?? "the net amount"}.`,
      ...(c.tax ? [`VAT payable increases by ${c.tax}, owed to ZRA when you file.`] : []),
      ...(c.hasStock ? ["Inventory decreases and cost of sales increases for the items sold."] : []),
    ],
    steps: (c) => [
      { label: "Send invoice to customer", to: c.id ? `/invoice-detail/${c.id}` : "/invoices", hint: "Email or download the PDF." },
      { label: "Record payment when received", to: "/receipts", hint: "Receipt clears the customer balance." },
      { label: "View customer statement", to: "/reports/customer-statement" },
      { label: "Back to invoices", to: "/invoices" },
    ],
  },
  quote: {
    key: "quote",
    lifecycle: ["Created", "Sent", "Accepted", "Converted to invoice", "Paid"],
    impact: () => ["Nothing posts to the ledger yet — a quote is an offer, not a sale."],
    steps: (c) => [
      { label: "Send quote to customer", to: c.id ? `/quotes/${c.id}` : "/quotes" },
      { label: "Mark accepted, then convert to invoice", to: "/quotes", hint: "Converting is what creates the accounting entry." },
      { label: "Back to quotes", to: "/quotes" },
    ],
  },
  purchase_order: {
    key: "purchase_order",
    lifecycle: ["Created", "Submitted", "Approved", "Goods received", "Bill matched", "Paid"],
    impact: () => ["Nothing posts yet — an order is a commitment. The ledger moves when goods are received and the bill is recorded."],
    steps: () => [
      { label: "Submit for approval", to: "/purchase-orders" },
      { label: "Receive goods", to: "/goods-receipts", hint: "Receiving increases stock at the delivery location." },
      { label: "Create or match the supplier bill", to: "/bills" },
      { label: "Pay supplier", to: "/bill-payments" },
    ],
  },
  bill: {
    key: "bill",
    lifecycle: ["Posted", "Reviewed", "Paid", "Reconciled"],
    impact: (c) => [
      `Accounts payable increases by ${c.amount ?? "the bill total"} — you now owe ${c.party ?? "the supplier"}.`,
      "The expense or stock account is charged with the net amount.",
      ...(c.tax ? [`Input VAT of ${c.tax} is recorded and reduces what you pay ZRA.`] : []),
    ],
    steps: () => [
      { label: "Review supplier balance", to: "/reports/supplier-statement" },
      { label: "Pay supplier", to: "/bill-payments" },
      { label: "Reconcile the payment in banking", to: "/reconciliation" },
    ],
  },
  stock_transfer: {
    key: "stock_transfer",
    lifecycle: ["Drafted", "Approved", "Dispatched", "In transit", "Received", "Reconciled"],
    impact: () => [
      "No profit or loss — value simply moves between locations at cost.",
      "On dispatch the sending location decreases and Stock in Transit increases.",
      "On receipt the destination location increases and transit clears.",
    ],
    steps: () => [
      { label: "Approve and dispatch", to: "/inventory/transfers" },
      { label: "Receive at destination", to: "/inventory/transfers" },
      { label: "Check destination stock", to: "/inventory/reconciliation" },
    ],
  },
  stock_count: {
    key: "stock_count",
    lifecycle: ["Open", "Counted", "Variance reviewed", "Approved", "Posted", "Reconciled"],
    impact: () => [
      "Approving posts an adjustment for the difference between counted and expected quantity.",
      "Stock value changes and the difference is charged to the stock variance account.",
    ],
    steps: () => [
      { label: "Review variance", to: "/stock-counts" },
      { label: "Manager approval and post", to: "/stock-counts" },
      { label: "Inventory → GL reconciliation", to: "/inventory/gl-reconciliation" },
    ],
  },
  banking: {
    key: "banking",
    lifecycle: ["Imported", "Reviewed", "Allocated", "Reconciled", "Session closed"],
    impact: () => [
      "Allocating a transaction posts it to the right account and clears the customer or supplier balance.",
      "Reconciling proves your cash book agrees with the bank statement.",
    ],
    steps: () => [
      { label: "Allocate transactions", to: "/banking" },
      { label: "Reconcile the account", to: "/reconciliation" },
      { label: "Investigate exceptions", to: "/reconciliation-sessions" },
    ],
  },
  payroll: {
    key: "payroll",
    lifecycle: ["Setup", "Attendance & timesheets", "Calculated", "Reviewed", "Approved", "Posted", "Paid", "Statutory filed"],
    impact: () => [
      "Wage costs are charged to payroll expense.",
      "Net pay becomes a liability until the staff are paid.",
      "PAYE, NAPSA and NHIMA become statutory liabilities until filed and paid.",
    ],
    steps: () => [
      { label: "Review the pay run", to: "/payroll" },
      { label: "Approve and post to the ledger", to: "/payroll" },
      { label: "Pay staff and file statutory returns", to: "/compliance" },
    ],
  },
  compliance: {
    key: "compliance",
    lifecycle: ["Upcoming", "Prepared", "Evidence reviewed", "Filed", "Reference recorded"],
    impact: () => ["Filing does not change the ledger by itself; paying the liability does."],
    steps: () => [
      { label: "Prepare the return", to: "/reports/vat-return" },
      { label: "Record filing reference", to: "/compliance" },
      { label: "See the next deadline", to: "/compliance" },
    ],
  },
};

export function guidanceFor(key: string): DocumentGuidance | undefined {
  return DOCUMENT_GUIDANCE[key];
}
