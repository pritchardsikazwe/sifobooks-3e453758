// SifoBooks navigation hubs.
//
// The module registry (src/lib/modules.ts) remains the source of truth for what
// a company has installed and what a user may view. This file only decides how
// those existing routes are *presented*: eight first-level hubs, each with a few
// primary workflow entries and the rest available inside the hub workspace.
//
// No route is removed here. Every deep link keeps working.

export type HubItem = {
  title: string;
  url: string;
  /** Module key from MODULES that owns this route (drives install + permission checks). */
  module: string;
  iconName?: string;
  /** Shown directly in the sidebar. Everything else lives in the hub workspace. */
  primary?: boolean;
  /** One-line plain-language purpose, shown in the hub. */
  hint?: string;
};

export type HubGroup = { label: string; items: HubItem[] };

export type HubDef = {
  key: string;
  label: string;
  iconName: string;
  /** One sentence explaining what the hub is for. */
  purpose: string;
  groups: HubGroup[];
};

export const HUBS: HubDef[] = [
  {
    key: "home",
    label: "Home",
    iconName: "Home",
    purpose: "What needs your attention today, and what to do next.",
    groups: [
      {
        label: "Today",
        items: [
          { title: "Home", url: "/dashboard", module: "core_home", iconName: "Home", primary: true, hint: "Work queue, cash position and suggested next actions." },
          { title: "Approvals", url: "/approvals", module: "core_home", iconName: "CheckCheck", hint: "Documents waiting for your decision." },
          { title: "Notifications", url: "/notifications", module: "core_home", iconName: "Bell" },
          { title: "Modules", url: "/modules", module: "core_home", iconName: "LayoutGrid", hint: "Turn features on or off for this company." },
        ],
      },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    iconName: "TrendingUp",
    purpose: "Win the work, bill it, and get paid.",
    groups: [
      {
        label: "Sell & bill",
        items: [
          { title: "Invoices", url: "/invoices", module: "sales", iconName: "ReceiptText", primary: true, hint: "Bill customers and track what they owe." },
          { title: "Quotes", url: "/quotes", module: "sales", iconName: "FileText", primary: true, hint: "Price work before you invoice it." },
          { title: "Customers", url: "/customers", module: "sales", iconName: "Users", primary: true, hint: "Who you sell to, and their balances." },
          { title: "Receive Payments", url: "/receipts", module: "sales", iconName: "CreditCard", primary: true, hint: "Record money received against invoices." },
          { title: "Credit Notes", url: "/credit-notes", module: "sales", iconName: "Undo2", hint: "Reverse or reduce an invoice properly." },
        ],
      },
      {
        label: "Statements & analysis",
        items: [
          { title: "Customer Statement", url: "/reports/customer-statement", module: "reports", iconName: "FileBarChart" },
          { title: "Sales Reports", url: "/reports", module: "reports", iconName: "BarChart3" },
        ],
      },
    ],
  },
  {
    key: "purchases",
    label: "Purchases",
    iconName: "ShoppingCart",
    purpose: "Buy, receive, record supplier bills and pay them.",
    groups: [
      {
        label: "Buy & pay",
        items: [
          { title: "Bills", url: "/bills", module: "purchases", iconName: "FileBox", primary: true, hint: "Supplier invoices you owe." },
          { title: "Purchase Orders", url: "/purchase-orders", module: "purchases", iconName: "ShoppingCart", primary: true, hint: "Order goods before they arrive." },
          { title: "Suppliers", url: "/suppliers", module: "purchases", iconName: "Truck", primary: true, hint: "Who you buy from, and what you owe them." },
          { title: "Expenses", url: "/expenses", module: "purchases", iconName: "Receipt", primary: true, hint: "Day-to-day spending, straight to the ledger." },
          { title: "Supplier Payments", url: "/bill-payments", module: "purchases", iconName: "Wallet" },
        ],
      },
      {
        label: "Tools",
        items: [
          { title: "Quotation Comparison", url: "/quotation-comparison", module: "purchases", iconName: "FileSearch", hint: "Compare supplier quotes side by side." },
          { title: "Goods Receipts", url: "/goods-receipts", module: "purchases", iconName: "PackageCheck" },
          { title: "Expense Categories", url: "/expense-rules", module: "purchases", iconName: "Tags" },
          { title: "Supplier Statement", url: "/reports/supplier-statement", module: "reports", iconName: "FileBarChart" },
        ],
      },
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    iconName: "Boxes",
    purpose: "Know what stock you hold, where it is, and what it is worth.",
    groups: [
      {
        label: "Everyday",
        items: [
          { title: "Overview", url: "/inventory", module: "inventory", iconName: "LayoutDashboard", primary: true, hint: "Stock value, movement and alerts." },
          { title: "Items", url: "/stock", module: "inventory", iconName: "Boxes", primary: true, hint: "Products, costs and selling prices." },
          { title: "Transfers", url: "/inventory/transfers", module: "inventory", iconName: "ArrowLeftRight", primary: true, hint: "Move stock between warehouse and outlets." },
          { title: "Stock Counts", url: "/stock-counts", module: "inventory", iconName: "ClipboardList", primary: true, hint: "Count, review variance, approve, post." },
          { title: "Reconciliation", url: "/inventory/reconciliation", module: "inventory", iconName: "Scale", primary: true, hint: "Opening, movement and closing per location." },
        ],
      },
      {
        label: "Stock flow",
        items: [
          { title: "Control Center", url: "/inventory-control-centre", module: "inventory", iconName: "Gauge" },
          { title: "Stock Card / History", url: "/inventory/stock-card", module: "inventory", iconName: "ScrollText" },
          { title: "Stock Adjustments", url: "/stock-adjustments", module: "inventory", iconName: "ClipboardEdit" },
          { title: "Inventory → GL Reconciliation", url: "/inventory/gl-reconciliation", module: "inventory", iconName: "Scale" },
          { title: "Inventory Flow & Audit", url: "/reports/inventory-flow-audit", module: "reports", iconName: "FileBarChart" },
        ],
      },
      {
        label: "Locations & valuation",
        items: [
          { title: "Locations", url: "/inventory/locations", module: "inventory", iconName: "Warehouse" },
          { title: "Warehouses", url: "/warehouses", module: "inventory", iconName: "Warehouse" },
          { title: "Batches & Expiry", url: "/stock-batches", module: "inventory", iconName: "Layers" },
          { title: "Serial Numbers", url: "/stock-serials", module: "inventory", iconName: "Barcode" },
        ],
      },
      {
        label: "More tools",
        items: [
          { title: "Production Batches", url: "/inventory/production", module: "inventory", iconName: "Factory" },
          { title: "Cashier Records", url: "/inventory/cashier-records", module: "inventory", iconName: "NotebookPen" },
          { title: "Inventory Sheets", url: "/inventory-sheets", module: "inventory", iconName: "ClipboardList" },
        ],
      },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    iconName: "Landmark",
    purpose: "Bank, ledger and period close — the books behind everything.",
    groups: [
      {
        label: "Everyday",
        items: [
          { title: "Banking", url: "/banking", module: "finance", iconName: "Landmark", primary: true, hint: "Import, review and allocate bank activity." },
          { title: "Reconciliation", url: "/reconciliation", module: "finance", iconName: "Scale", primary: true, hint: "Agree your books to the bank statement." },
          { title: "Chart of Accounts", url: "/chart-of-accounts", module: "finance", iconName: "BookOpen", primary: true, hint: "Every account and its balance." },
          { title: "Journal Entries", url: "/journal-entries", module: "finance", iconName: "BookText", primary: true, hint: "Manual double-entry postings." },
        ],
      },
      {
        label: "Bank",
        items: [
          { title: "Bank Accounts", url: "/bank-accounts", module: "finance", iconName: "Landmark" },
          { title: "Bank Rules", url: "/bank-rules", module: "finance", iconName: "Sparkles" },
          { title: "Recon Sessions", url: "/reconciliation-sessions", module: "finance", iconName: "Scale" },
          { title: "Cashbook", url: "/cashbook", module: "finance", iconName: "BookText" },
        ],
      },
      {
        label: "Ledger & close",
        items: [
          { title: "Smart Posting Wizard", url: "/posting-wizard", module: "finance", iconName: "Sparkles" },
          { title: "Opening Balances", url: "/opening-balances", module: "finance", iconName: "Sparkles" },
          { title: "Period Close", url: "/period-close", module: "finance", iconName: "CalendarClock" },
        ],
      },
      {
        label: "Assets, budgets & FX",
        items: [
          { title: "Fixed Assets", url: "/fixed-assets", module: "fixed_assets", iconName: "Landmark" },
          { title: "Budgets", url: "/budgets", module: "budgets", iconName: "PiggyBank" },
          { title: "Exchange Rates", url: "/fx-rates", module: "multi_currency", iconName: "Coins" },
        ],
      },
    ],
  },
  {
    key: "people",
    label: "People",
    iconName: "UsersRound",
    purpose: "Your team, their time, and getting them paid correctly.",
    groups: [
      {
        label: "Everyday",
        items: [
          { title: "Payroll", url: "/payroll", module: "hr_payroll", iconName: "Banknote", primary: true, hint: "Run the pay cycle and issue payslips." },
          { title: "Employees", url: "/employees", module: "hr_payroll", iconName: "UserSquare", primary: true },
          { title: "Attendance", url: "/attendance", module: "hr_payroll", iconName: "CalendarCheck", primary: true },
          { title: "Timesheet", url: "/timesheet", module: "hr_payroll", iconName: "Clock", primary: true },
        ],
      },
      {
        label: "Payroll tools",
        items: [
          { title: "Payroll Dashboard", url: "/payroll-dashboard", module: "hr_payroll", iconName: "LayoutDashboard" },
          { title: "Statutory Centre", url: "/payroll-statutory", module: "hr_payroll", iconName: "ShieldCheck", hint: "PAYE, NAPSA and NHIMA totals, files and filing status." },
          { title: "Payroll Setup", url: "/payroll-setup", module: "hr_payroll", iconName: "Settings2" },
          { title: "Payroll Transactions", url: "/payroll-transactions", module: "hr_payroll", iconName: "Wallet2" },
          { title: "Payroll Tools", url: "/payroll-tools", module: "hr_payroll", iconName: "Calculator" },
          { title: "Payroll Schedules", url: "/reports/payroll-schedules", module: "hr_payroll", iconName: "Banknote" },
        ],
      },
      {
        label: "People admin",
        items: [
          { title: "Leave", url: "/leave", module: "hr_payroll", iconName: "CalendarDays" },
          { title: "Jobs & Recruitment", url: "/jobs", module: "hr_payroll", iconName: "BriefcaseBusiness" },
        ],
      },
    ],
  },
  {
    key: "pos",
    label: "Point of Sale",
    iconName: "ShoppingBag",
    purpose: "Selling at the till, shifts and cashier activity.",
    groups: [
      {
        label: "Till",
        items: [
          { title: "Retail POS", url: "/pos", module: "retail_pos", iconName: "ShoppingBag", primary: true, hint: "Sell at the counter." },
          { title: "POS Sales History", url: "/pos-sales", module: "retail_pos", iconName: "Receipt", primary: true },
          { title: "Retail Command Center", url: "/pos/retail-command-center", module: "retail_pos", iconName: "Gauge", primary: true, hint: "Shifts, cash and cashier activity." },
        ],
      },
      {
        label: "Setup & workers",
        items: [
          { title: "SifoPOS Hub", url: "/sifopos", module: "retail_pos", iconName: "LayoutGrid" },
          { title: "Worker Command Center", url: "/pos/command-center", module: "retail_pos", iconName: "LayoutGrid" },
          { title: "Worker Terminal", url: "/w", module: "retail_pos", iconName: "Monitor" },
          { title: "Worker Access & Roles", url: "/pos-workers", module: "retail_pos", iconName: "ShieldCheck" },
          { title: "Till & Stock Health Check", url: "/reports/pos-integrity", module: "reports", iconName: "ShieldCheck" },
        ],
      },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    iconName: "BarChart3",
    purpose: "Answer a question about the business, then export the evidence.",
    groups: [
      {
        label: "Start here",
        items: [
          { title: "Reports Centre", url: "/reports", module: "reports", iconName: "BarChart3", primary: true, hint: "Ask a question, get the right report." },
          { title: "Trial Balance", url: "/reports/trial-balance", module: "reports", iconName: "BookText", primary: true },
          { title: "Annual Financial Statements", url: "/reports/afs", module: "reports", iconName: "Sparkles", primary: true },
        ],
      },
      {
        label: "Tax & compliance",
        items: [
          { title: "VAT Return (VAT 3)", url: "/reports/vat-return", module: "reports", iconName: "Receipt" },
          { title: "Income Tax Computation", url: "/reports/income-tax", module: "reports", iconName: "Receipt" },
          { title: "Turnover Tax", url: "/reports/turnover-tax", module: "reports", iconName: "Receipt" },
          { title: "Compliance", url: "/compliance", module: "compliance", iconName: "ShieldCheck", primary: true },
        ],
      },
      {
        label: "Statements",
        items: [
          { title: "Customer Statement", url: "/reports/customer-statement", module: "reports", iconName: "Users" },
          { title: "Supplier Statement", url: "/reports/supplier-statement", module: "reports", iconName: "Truck" },
          { title: "Inventory Flow & Audit", url: "/reports/inventory-flow-audit", module: "reports", iconName: "FileBarChart" },
        ],
      },
    ],
  },
  {
    key: "more",
    label: "More",
    iconName: "Ellipsis",
    purpose: "Company setup, people access, audit trail and industry modules.",
    groups: [
      {
        label: "Administration",
        items: [
          { title: "Company Setup", url: "/setup", module: "admin", iconName: "Building2", primary: true },
          { title: "Users & Roles", url: "/roles", module: "admin", iconName: "ShieldCheck", primary: true },
          { title: "Administration", url: "/admin", module: "admin", iconName: "Settings" },
          { title: "Audit Logs", url: "/audit-logs", module: "admin", iconName: "History" },
        ],
      },
      {
        label: "Industry modules",
        items: [
          { title: "School Management", url: "/school", module: "school_erp", iconName: "School" },
          { title: "Hotel Management", url: "/hotel", module: "hotel_erp", iconName: "Hotel" },
          { title: "Public Services", url: "/public-services", module: "public_services", iconName: "Globe2" },
        ],
      },
      {
        label: "Help & learning",
        items: [
          { title: "Learn Centre", url: "/learn", module: "learning", iconName: "GraduationCap", primary: true },
          { title: "New Company Setup", url: "/learn/new-company", module: "learning", iconName: "ClipboardList" },
          { title: "Accounting Basics", url: "/learn/accounting-basics", module: "learning", iconName: "GraduationCap" },
        ],
      },
    ],
  },
];

export function getHub(key: string): HubDef | undefined {
  return HUBS.find((h) => h.key === key);
}

/** Every item in a hub, flattened. */
export function hubItems(hub: HubDef): HubItem[] {
  return hub.groups.flatMap((g) => g.items);
}

/** Which hub a route belongs to (first match wins). Used for breadcrumbs. */
export function hubForRoute(pathname: string): HubDef | undefined {
  let best: { hub: HubDef; len: number } | undefined;
  for (const hub of HUBS) {
    for (const item of hubItems(hub)) {
      if (pathname === item.url || pathname.startsWith(item.url + "/")) {
        if (!best || item.url.length > best.len) best = { hub, len: item.url.length };
      }
    }
  }
  return best?.hub;
}

/**
 * Filter a hub down to what this user may actually open.
 * `installed` / `canView` come from the existing module registry + RBAC.
 */
export function visibleHubGroups(
  hub: HubDef,
  installed: Set<string>,
  canView: (moduleKey: string) => boolean,
): HubGroup[] {
  return hub.groups
    .map((g) => ({ label: g.label, items: g.items.filter((i) => installed.has(i.module) && canView(i.module)) }))
    .filter((g) => g.items.length > 0);
}
