export type SifoWorkflowKind =
  | "invoice"
  | "quote"
  | "purchase_order"
  | "bill"
  | "transfer"
  | "stock_count"
  | "banking"
  | "payroll"
  | "compliance"
  | "generic";

export type SifoGuideAction = {
  id: string;
  label: string;
  description?: string;
  route?: string;
  primary?: boolean;
};

export type SifoGuideStep = {
  id: string;
  label: string;
  completed?: boolean;
  current?: boolean;
};

export type SifoGuideModel = {
  title: string;
  explanation: string;
  status?: string;
  steps: SifoGuideStep[];
  actions: SifoGuideAction[];
  accountingImpact?: string[];
};

const workflows: Record<Exclude<SifoWorkflowKind, "generic">, SifoGuideModel> = {
  invoice: {
    title: "Sales invoice",
    explanation: "Record the sale, then collect or follow up on the customer balance.",
    steps: [
      { id: "create", label: "Create" },
      { id: "post", label: "Post" },
      { id: "send", label: "Send" },
      { id: "collect", label: "Collect payment" },
    ],
    actions: [
      { id: "send", label: "Send invoice", primary: true },
      { id: "payment", label: "Record payment", route: "/receipts" },
      { id: "statement", label: "Customer statement", route: "/reports/customer-statement" },
      { id: "print", label: "Print / PDF" },
    ],
    accountingImpact: [
      "Receivable increases by the amount owed by the customer.",
      "Sales revenue and applicable VAT are recognised when the invoice is posted.",
    ],
  },
  quote: {
    title: "Sales quote",
    explanation: "Move the quote through customer acceptance before converting it into a sale.",
    steps: [
      { id: "create", label: "Create" },
      { id: "send", label: "Send" },
      { id: "accept", label: "Accept" },
      { id: "convert", label: "Convert to invoice" },
      { id: "collect", label: "Collect" },
    ],
    actions: [
      { id: "send", label: "Send quote", primary: true },
      { id: "accept", label: "Accept quote" },
      { id: "convert", label: "Convert to invoice", route: "/invoices" },
    ],
  },
  purchase_order: {
    title: "Purchase order",
    explanation: "Get approval, receive the goods, then match the supplier bill before payment.",
    steps: [
      { id: "create", label: "Create" },
      { id: "approve", label: "Approve" },
      { id: "receive", label: "Receive" },
      { id: "bill", label: "Match bill" },
      { id: "pay", label: "Pay supplier" },
    ],
    actions: [
      { id: "approve", label: "Submit for approval", primary: true },
      { id: "receive", label: "Receive goods", route: "/purchase-orders" },
      { id: "bill", label: "Review bills", route: "/bills" },
    ],
  },
  bill: {
    title: "Supplier bill",
    explanation: "A posted bill increases the supplier balance. Pay it and reconcile the payment when appropriate.",
    steps: [
      { id: "post", label: "Post" },
      { id: "review", label: "Review balance" },
      { id: "pay", label: "Pay" },
      { id: "reconcile", label: "Reconcile" },
    ],
    actions: [
      { id: "pay", label: "Pay supplier", route: "/bill-payments", primary: true },
      { id: "statement", label: "Supplier statement", route: "/reports/supplier-statement" },
      { id: "reconcile", label: "Reconcile payment", route: "/reconciliation" },
    ],
  },
  transfer: {
    title: "Stock transfer",
    explanation: "Move stock only after approval, then receive it at the destination and reconcile the balance.",
    steps: [
      { id: "draft", label: "Draft" },
      { id: "approve", label: "Approve" },
      { id: "dispatch", label: "Dispatch" },
      { id: "transit", label: "In transit" },
      { id: "receive", label: "Receive" },
      { id: "reconcile", label: "Reconcile" },
    ],
    actions: [
      { id: "approve", label: "Review approval", route: "/inventory/transfers", primary: true },
      { id: "receive", label: "Receive transfer", route: "/inventory/transfers" },
      { id: "reconcile", label: "Reconcile destination", route: "/inventory/reconciliation" },
    ],
  },
  stock_count: {
    title: "Stock count",
    explanation: "Count physical stock, investigate variances, then let an authorised manager approve the adjustment.",
    steps: [
      { id: "open", label: "Open count" },
      { id: "count", label: "Count" },
      { id: "review", label: "Review variance" },
      { id: "approve", label: "Manager approval" },
      { id: "post", label: "Post adjustment" },
      { id: "reconcile", label: "GL reconcile" },
    ],
    actions: [
      { id: "count", label: "Continue count", route: "/stock-counts", primary: true },
      { id: "review", label: "Review variance", route: "/stock-counts" },
      { id: "reconcile", label: "Inventory → GL", route: "/inventory/gl-reconciliation" },
    ],
  },
  banking: {
    title: "Bank reconciliation",
    explanation: "Bring the statement in, match it to the books, resolve exceptions, then reconcile the session.",
    steps: [
      { id: "import", label: "Import" },
      { id: "allocate", label: "Allocate / match" },
      { id: "reconcile", label: "Reconcile" },
      { id: "exceptions", label: "Resolve exceptions" },
      { id: "close", label: "Close session" },
    ],
    actions: [
      { id: "import", label: "Import statement", route: "/banking", primary: true },
      { id: "reconcile", label: "Open reconciliation", route: "/reconciliation" },
      { id: "sessions", label: "Review sessions", route: "/reconciliation-sessions" },
    ],
  },
  payroll: {
    title: "Payroll",
    explanation: "Prepare people data, calculate and review payroll, then post, pay and complete statutory work.",
    steps: [
      { id: "setup", label: "Setup" },
      { id: "calculate", label: "Calculate" },
      { id: "review", label: "Review" },
      { id: "approve", label: "Approve" },
      { id: "post", label: "Post" },
      { id: "pay", label: "Pay" },
      { id: "statutory", label: "Statutory" },
    ],
    actions: [
      { id: "calculate", label: "Generate payroll", route: "/payroll", primary: true },
      { id: "employees", label: "Review employees", route: "/employees" },
      { id: "setup", label: "Payroll setup", route: "/payroll-setup" },
    ],
  },
  compliance: {
    title: "Compliance",
    explanation: "Prepare the obligation, attach evidence, review it, file, and record the authority reference.",
    steps: [
      { id: "prepare", label: "Prepare" },
      { id: "review", label: "Review" },
      { id: "file", label: "File" },
      { id: "record", label: "Record reference" },
      { id: "next", label: "Next deadline" },
    ],
    actions: [
      { id: "open", label: "Open compliance centre", route: "/compliance", primary: true },
      { id: "reports", label: "Review tax reports", route: "/reports" },
    ],
  },
};

export function getSifoGuide(kind: SifoWorkflowKind): SifoGuideModel {
  if (kind === "generic") {
    return {
      title: "What should I do next?",
      explanation: "SifoBooks uses the current document state and live company data to recommend the next safe action.",
      steps: [],
      actions: [{ id: "home", label: "Open work queue", route: "/dashboard", primary: true }],
    };
  }
  return workflows[kind];
}

export function getNextActionForStatus(kind: SifoWorkflowKind, status?: string | null): SifoGuideAction | undefined {
  const guide = getSifoGuide(kind);
  const normalized = (status ?? "").toLowerCase();

  if (kind === "invoice") {
    if (["draft", "open"].includes(normalized)) return guide.actions.find(a => a.id === "send");
    if (["posted", "sent", "partial", "partially_paid"].includes(normalized)) return guide.actions.find(a => a.id === "payment");
    if (normalized === "paid") return guide.actions.find(a => a.id === "statement");
  }

  if (kind === "transfer") {
    if (["draft", "pending", "submitted"].includes(normalized)) return guide.actions.find(a => a.id === "approve");
    if (["approved", "dispatched", "in_transit"].includes(normalized)) return guide.actions.find(a => a.id === "receive");
    if (["received", "completed"].includes(normalized)) return guide.actions.find(a => a.id === "reconcile");
  }

  return guide.actions.find(a => a.primary) ?? guide.actions[0];
}
