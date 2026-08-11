/**
 * SifoBooks module identity system.
 *
 * Colour is used to communicate *which part of the business* you are in —
 * never for decoration. Every module owns one hue; states (paid, overdue,
 * pending…) own their own separate scale so they read the same everywhere.
 *
 * Class strings are written out in full so Tailwind can statically detect them.
 */

export type ModuleKey =
  | "accounting" | "sales" | "purchases" | "inventory"
  | "banking" | "payroll" | "tax" | "reports"
  | "admin" | "learning";

export type ModuleTheme = {
  key: ModuleKey;
  label: string;
  /** Solid text colour, e.g. active tab label */
  text: string;
  /** Tinted surface used behind icons and active tabs */
  soft: string;
  /** Border used on active tabs / hovered cards */
  border: string;
  /** Static hover-border class (Tailwind cannot see interpolated variants) */
  hoverBorder: string;
  /** Full-strength background for the thin identity rail */
  bar: string;
  /** Icon chip: tinted bg + coloured glyph */
  chip: string;
  /** Landing route for the module */
  to: string;
};

export const MODULE_THEMES: Record<ModuleKey, ModuleTheme> = {
  accounting: {
    key: "accounting", label: "Accounting", to: "/chart-of-accounts",
    text: "text-mod-accounting", soft: "bg-mod-accounting/10", border: "border-mod-accounting/40", hoverBorder: "hover:border-mod-accounting/50",
    bar: "bg-mod-accounting", chip: "bg-mod-accounting/10 text-mod-accounting",
  },
  sales: {
    key: "sales", label: "Sales", to: "/invoices",
    text: "text-mod-sales", soft: "bg-mod-sales/10", border: "border-mod-sales/40", hoverBorder: "hover:border-mod-sales/50",
    bar: "bg-mod-sales", chip: "bg-mod-sales/10 text-mod-sales",
  },
  purchases: {
    key: "purchases", label: "Purchases", to: "/bills",
    text: "text-mod-purchases", soft: "bg-mod-purchases/10", border: "border-mod-purchases/40", hoverBorder: "hover:border-mod-purchases/50",
    bar: "bg-mod-purchases", chip: "bg-mod-purchases/10 text-mod-purchases",
  },
  inventory: {
    key: "inventory", label: "Inventory", to: "/stock",
    text: "text-mod-inventory", soft: "bg-mod-inventory/10", border: "border-mod-inventory/40", hoverBorder: "hover:border-mod-inventory/50",
    bar: "bg-mod-inventory", chip: "bg-mod-inventory/10 text-mod-inventory",
  },
  banking: {
    key: "banking", label: "Banking", to: "/banking",
    text: "text-mod-banking", soft: "bg-mod-banking/10", border: "border-mod-banking/40", hoverBorder: "hover:border-mod-banking/50",
    bar: "bg-mod-banking", chip: "bg-mod-banking/10 text-mod-banking",
  },
  payroll: {
    key: "payroll", label: "Payroll", to: "/payroll-dashboard",
    text: "text-mod-payroll", soft: "bg-mod-payroll/10", border: "border-mod-payroll/40", hoverBorder: "hover:border-mod-payroll/50",
    bar: "bg-mod-payroll", chip: "bg-mod-payroll/10 text-mod-payroll",
  },
  tax: {
    key: "tax", label: "Compliance", to: "/compliance",
    text: "text-mod-tax", soft: "bg-mod-tax/10", border: "border-mod-tax/40", hoverBorder: "hover:border-mod-tax/50",
    bar: "bg-mod-tax", chip: "bg-mod-tax/10 text-mod-tax",
  },
  admin: {
    key: "admin", label: "Admin", to: "/admin",
    text: "text-mod-admin", soft: "bg-mod-admin/10", border: "border-mod-admin/40", hoverBorder: "hover:border-mod-admin/50",
    bar: "bg-mod-admin", chip: "bg-mod-admin/10 text-mod-admin",
  },
  learning: {
    key: "learning", label: "Learn", to: "/learn",
    text: "text-mod-learning", soft: "bg-mod-learning/10", border: "border-mod-learning/40", hoverBorder: "hover:border-mod-learning/50",
    bar: "bg-mod-learning", chip: "bg-mod-learning/10 text-mod-learning",
  },
  reports: {
    key: "reports", label: "Reports", to: "/reports",
    text: "text-mod-reports", soft: "bg-mod-reports/10", border: "border-mod-reports/40", hoverBorder: "hover:border-mod-reports/50",
    bar: "bg-mod-reports", chip: "bg-mod-reports/10 text-mod-reports",
  },
};

export const moduleTheme = (key: ModuleKey) => MODULE_THEMES[key];

/** The Hercules-style stacked sub-tabs each module exposes. */
export const MODULE_TABS: Record<ModuleKey, Array<{ label: string; to: string }>> = {
  accounting: [
    { label: "Chart of Accounts", to: "/chart-of-accounts" },
    { label: "Journals", to: "/journal-entries" },
    { label: "Cashbook", to: "/cashbook" },
    { label: "General Ledger", to: "/reports/general-ledger" },
    { label: "Trial Balance", to: "/reports/trial-balance" },
    { label: "Period Close", to: "/period-close" },
  ],
  sales: [
    { label: "Invoices", to: "/invoices" },
    { label: "Quotes", to: "/quotes" },
    { label: "Receipts", to: "/receipts" },
    { label: "Credit Notes", to: "/credit-notes" },
    { label: "Customers", to: "/customers" },
  ],
  purchases: [
    { label: "Bills", to: "/bills" },
    { label: "Payments", to: "/bill-payments" },
    { label: "Purchase Orders", to: "/purchase-orders" },
    { label: "Expenses", to: "/expenses" },
    { label: "Suppliers", to: "/suppliers" },
  ],
  inventory: [
    { label: "Stock Items", to: "/stock" },
    { label: "Adjustments", to: "/stock-adjustments" },
    { label: "Warehouses", to: "/warehouses" },
    { label: "Stock Sheets", to: "/inventory-sheets" },
    { label: "Valuation", to: "/reports/inventory-valuation" },
  ],
  banking: [
    { label: "Bank Accounts", to: "/bank-accounts" },
    { label: "Transactions", to: "/banking" },
    { label: "Rules", to: "/bank-rules" },
    { label: "Reconciliation", to: "/reconciliation" },
    { label: "Petty Cash", to: "/petty-cash" },
  ],
  payroll: [
    { label: "Overview", to: "/payroll-dashboard" },
    { label: "Pay Runs", to: "/payroll" },
    { label: "Employees", to: "/employees" },
    { label: "Leave", to: "/leave" },
    { label: "Timesheets", to: "/timesheet" },
    { label: "Setup", to: "/payroll-setup" },
  ],
  tax: [
    { label: "Compliance", to: "/compliance" },
    { label: "VAT Return", to: "/reports/vat-return" },
    { label: "Income Tax", to: "/reports/income-tax" },
    { label: "Turnover Tax", to: "/reports/turnover-tax" },
    { label: "Tax Summary", to: "/reports/tax-summary" },
  ],
  admin: [
    { label: "Admin Home", to: "/admin" },
    { label: "Modules", to: "/modules" },
    { label: "Roles & Permissions", to: "/roles" },
    { label: "Approvals", to: "/approvals" },
    { label: "Company Setup", to: "/setup" },
    { label: "Industry Presets", to: "/industry" },
  ],
  learning: [
    { label: "Learn Centre", to: "/learn" },
    { label: "Quick Start", to: "/learn/quick-start" },
    { label: "New Company", to: "/learn/new-company" },
    { label: "Accounting Basics", to: "/learn/accounting-basics" },
    { label: "Payroll", to: "/learn/payroll" },
    { label: "VAT & ZRA", to: "/learn/vat-zra" },
  ],
  reports: [
    { label: "All Reports", to: "/reports" },
    { label: "Profit & Loss", to: "/reports/pnl" },
    { label: "Balance Sheet", to: "/reports/balance-sheet" },
    { label: "Cash Flow", to: "/reports/cash-flow" },
    { label: "Annual Statements", to: "/reports/afs" },
  ],
};

/* ------------------------------ Status ---------------------------------- */

export type StatusTone = "paid" | "pending" | "partial" | "overdue" | "draft" | "neutral";

export const STATUS_TONES: Record<StatusTone, string> = {
  paid: "bg-state-paid/12 text-state-paid border-state-paid/30",
  pending: "bg-state-pending/12 text-state-pending border-state-pending/30",
  partial: "bg-state-partial/12 text-state-partial border-state-partial/30",
  overdue: "bg-state-overdue/12 text-state-overdue border-state-overdue/30",
  draft: "bg-state-draft/12 text-state-draft border-state-draft/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

/** Maps the free-text statuses used across the app onto a tone. */
export function statusTone(status?: string | null): StatusTone {
  const s = (status ?? "").toLowerCase();
  if (/paid|completed|approved|posted|cleared|reconciled|active/.test(s)) return "paid";
  if (/partial/.test(s)) return "partial";
  if (/overdue|failed|rejected|error|reversed/.test(s)) return "overdue";
  if (/draft/.test(s)) return "draft";
  if (/pending|awaiting|submitted|sent|open|unpaid/.test(s)) return "pending";
  return "neutral";
}
