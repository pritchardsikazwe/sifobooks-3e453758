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
          { title: "Review & Approve", url: "/payroll-review", module: "hr_payroll", iconName: "ClipboardCheck", hint: "Check every payslip and the exceptions before approval." },
          { title: "Payroll Payments", url: "/payroll-payments", module: "hr_payroll", iconName: "Wallet", hint: "Pay an approved run from an existing bank or cash account." },
          { title: "Statutory Centre", url: "/payroll-statutory", module: "hr_payroll", iconName: "ShieldCheck", hint: "PAYE, NAPSA and NHIMA totals, files and filing status." },
          { title: "Statutory Rates", url: "/payroll-rules", module: "hr_payroll", iconName: "ScrollText", hint: "PAYE, NAPSA and NHIMA rates versioned by effective date." },
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
          { title: "HR & Labour Compliance", url: "/hr-compliance", module: "hr_payroll", iconName: "ShieldCheck", hint: "Contracts, labour-law controls, policies and compliance evidence." },
          { title: "HR 360", url: "/hr360", module: "hr_payroll", iconName: "UsersRound", hint: "Employee lifecycle from onboarding to separation." },
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
          { title: "Documents & Branding", url: "/documents-branding", module: "admin", iconName: "Palette", primary: true, hint: "Logo, colours, templates and wording for every printed document." },
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
          { title: "Property & Tenancy", url: "/property", module: "property_management", iconName: "Building2", primary: true, hint: "Apartments, complexes, boarding houses, monthly rent, daily/BnB stays, collections and maintenance." },
          { title: "Public Services", url: "/public-services", module: "public_services", iconName: "Globe2" },
        ],
      },
      {
        label: "Compliance",
        items: [
          { title: "Government Compliance", url: "/compliance-centre", module: "compliance", iconName: "ShieldCheck", primary: true, hint: "ZRA, NAPSA, NHIMA, Workers' Compensation, NCC and statutory deadlines." },
          { title: "Compliance Calendar", url: "/compliance", module: "compliance", iconName: "CalendarClock", primary: true },
          { title: "ZRA Smart Invoice", url: "/zra-smart-invoice", module: "compliance", iconName: "ReceiptText", primary: true },
          { title: "ZRA Item Mapping", url: "/zra-smart-invoice", module: "compliance", iconName: "Boxes" },
          { title: "Mineral Royalty", url: "/compliance-centre", module: "compliance", iconName: "Pickaxe" },
          { title: "NCC Compliance", url: "/compliance-centre", module: "compliance", iconName: "HardHat" },
          { title: "Workers' Compensation", url: "/compliance-centre", module: "compliance", iconName: "ShieldPlus" },
          { title: "Submission Queue", url: "/compliance-centre", module: "compliance", iconName: "ListChecks" },
          { title: "Audit Trail", url: "/audit-logs", module: "admin", iconName: "History" },
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

/**
 * SifoPayroll (payroll-only) navigation.
 *
 * Used only when the company's workspace_mode is "payroll_only". Nothing is
 * removed from HUBS — a payroll-only tenant that upgrades gets the full set
 * back immediately, and every deep link keeps working meanwhile.
 */
export const PAYROLL_HUBS: HubDef[] = [
  {
    key: "payroll-home",
    label: "Payroll",
    iconName: "Banknote",
    purpose: "Run this month's payroll and see what needs attention.",
    groups: [
      {
        label: "This month",
        items: [
          { title: "Dashboard", url: "/payroll-dashboard", module: "core_home", iconName: "LayoutDashboard", primary: true, hint: "Period status, pay totals and exceptions." },
          { title: "Run Payroll", url: "/payroll", module: "hr_payroll", iconName: "Banknote", primary: true, hint: "Calculate the pay run for the open period." },
          { title: "Review & Approve", url: "/payroll-review", module: "hr_payroll", iconName: "CheckCheck", primary: true, hint: "Check every payslip before approval." },
          { title: "Payments", url: "/payroll-payments", module: "hr_payroll", iconName: "Wallet2", primary: true, hint: "Prepare the bank or mobile-money payment batch." },
          { title: "Payroll Transactions", url: "/payroll-transactions", module: "hr_payroll", iconName: "ListChecks", hint: "Once-off earnings and deductions." },
          { title: "Payroll Tools", url: "/payroll-tools", module: "hr_payroll", iconName: "Calculator" },
          { title: "Approvals", url: "/approvals", module: "core_home", iconName: "CheckCheck" },
        ],
      },
    ],
  },
  {
    key: "payroll-people",
    label: "People",
    iconName: "Users",
    purpose: "Employees, attendance, leave and timesheets that feed payroll.",
    groups: [
      {
        label: "Workforce",
        items: [
          { title: "Employees", url: "/employees", module: "hr_payroll", iconName: "UserSquare", primary: true, hint: "The employee register with pay, bank and statutory details." },
          { title: "Attendance", url: "/attendance", module: "hr_payroll", iconName: "CalendarCheck", primary: true },
          { title: "Leave", url: "/leave", module: "hr_payroll", iconName: "CalendarDays", primary: true },
          { title: "Timesheet", url: "/timesheet", module: "hr_payroll", iconName: "Clock" },
        ],
      },
    ],
  },
  {
    key: "payroll-statutory",
    label: "Statutory",
    iconName: "ShieldCheck",
    purpose: "PAYE, NAPSA and NHIMA returns prepared from the approved run.",
    groups: [
      {
        label: "Returns",
        items: [
          { title: "Statutory Centre", url: "/payroll-statutory", module: "hr_payroll", iconName: "ShieldCheck", primary: true, hint: "Prepare, reconcile and track PAYE, NAPSA and NHIMA returns." },
          { title: "Statutory Rules", url: "/payroll-rules", module: "hr_payroll", iconName: "Scale", primary: true, hint: "Rates and thresholds by effective date." },
        ],
      },
    ],
  },
  {
    key: "payroll-reports",
    label: "Reports",
    iconName: "BarChart3",
    purpose: "Payroll register, statutory schedules and payment schedules.",
    groups: [
      {
        label: "Payroll reporting",
        items: [
          { title: "Payroll Summary", url: "/reports/payroll-summary", module: "hr_payroll", iconName: "BarChart3", primary: true },
          { title: "Payroll Schedules", url: "/reports/payroll-schedules", module: "hr_payroll", iconName: "Banknote", primary: true },
        ],
      },
    ],
  },
  {
    key: "payroll-settings",
    label: "Settings",
    iconName: "Settings2",
    purpose: "Payroll setup, company details and your subscription.",
    groups: [
      {
        label: "Setup",
        items: [
          { title: "Payroll Setup", url: "/payroll-setup", module: "hr_payroll", iconName: "Settings2", primary: true, hint: "Pay components, grades and payroll defaults." },
          { title: "Company Settings", url: "/settings", module: "core_home", iconName: "Settings", primary: true },
          { title: "Modules", url: "/modules", module: "core_home", iconName: "LayoutGrid", hint: "Switch on the rest of SifoBooks when you are ready." },
          { title: "Subscription", url: "/subscription", module: "core_home", iconName: "Sparkles", primary: true },
        ],
      },
    ],
  },
];

/**
 * SifoHotel (hotel-only) navigation.
 *
 * Used only when the company's workspace_mode is "hotel_only". Nothing is
 * removed from HUBS — a hotel-only tenant that upgrades gets the full set back
 * immediately, and every deep link keeps working meanwhile.
 */
export const HOTEL_HUBS: HubDef[] = [
  {
    key: "hotel-front",
    label: "Front office",
    iconName: "Hotel",
    purpose: "Today's arrivals, departures, rooms and guest accounts.",
    groups: [
      {
        label: "Operations",
        items: [
          { title: "Dashboard", url: "/hotel", module: "hotel_erp", iconName: "LayoutDashboard", primary: true, hint: "Occupancy, arrivals, revenue and alerts." },
          { title: "Front Desk", url: "/hotel/front-desk", module: "hotel_erp", iconName: "ConciergeBell", primary: true },
          { title: "Reservations", url: "/hotel/reservations", module: "hotel_erp", iconName: "CalendarCheck", primary: true },
          { title: "Room Rack", url: "/hotel/room-rack", module: "hotel_erp", iconName: "BedDouble", primary: true },
          { title: "Check-in / Check-out", url: "/hotel/check-in-out", module: "hotel_erp", iconName: "LogIn", primary: true },
          { title: "Guests", url: "/hotel/guests", module: "hotel_erp", iconName: "Users" },
          { title: "Pre-arrival", url: "/hotel/pre-arrival", module: "hotel_erp", iconName: "Smartphone" },
        ],
      },
    ],
  },
  {
    key: "hotel-revenue",
    label: "Revenue",
    iconName: "Tag",
    purpose: "Rates, packages, distribution and the direct booking flow.",
    groups: [
      {
        label: "Distribution",
        items: [
          { title: "Rates & Packages", url: "/hotel/rates", module: "hotel_erp", iconName: "Tag", primary: true },
          { title: "Booking Engine", url: "/hotel/booking", module: "hotel_erp", iconName: "CalendarRange", primary: true },
          { title: "Channel Manager", url: "/hotel/channels", module: "hotel_erp", iconName: "Globe2", primary: true },
          { title: "Events & Banquets", url: "/hotel/events", module: "hotel_erp", iconName: "PartyPopper" },
        ],
      },
    ],
  },
  {
    key: "hotel-billing",
    label: "Billing",
    iconName: "ReceiptText",
    purpose: "Folios, payments, outlet sales and the night audit.",
    groups: [
      {
        label: "Money",
        items: [
          { title: "Folios & Billing", url: "/hotel/folios", module: "hotel_erp", iconName: "ReceiptText", primary: true },
          { title: "Payments", url: "/hotel/payments", module: "hotel_erp", iconName: "CreditCard", primary: true },
          { title: "Hotel POS", url: "/hotel/pos", module: "hotel_erp", iconName: "ShoppingBag", primary: true },
          { title: "Night Audit", url: "/hotel/night-audit", module: "hotel_erp", iconName: "MoonStar", primary: true },
        ],
      },
    ],
  },
  {
    key: "hotel-service",
    label: "Service",
    iconName: "Sparkles",
    purpose: "Housekeeping, maintenance and property stock.",
    groups: [
      {
        label: "Property",
        items: [
          { title: "Housekeeping", url: "/hotel/housekeeping", module: "hotel_erp", iconName: "Sparkles", primary: true },
          { title: "Maintenance", url: "/hotel/maintenance", module: "hotel_erp", iconName: "Wrench", primary: true },
          { title: "Inventory", url: "/hotel/inventory", module: "hotel_erp", iconName: "Boxes" },
        ],
      },
    ],
  },
  {
    key: "hotel-reports",
    label: "Reports",
    iconName: "BarChart3",
    purpose: "Occupancy, ADR, RevPAR, revenue and compliance reporting.",
    groups: [
      {
        label: "Reporting",
        items: [
          { title: "Hotel Reports", url: "/hotel/reports", module: "hotel_erp", iconName: "BarChart3", primary: true },
          { title: "Hotel Accounting", url: "/hotel/accounting", module: "hotel_erp", iconName: "Landmark" },
          { title: "Compliance", url: "/hotel/compliance", module: "hotel_erp", iconName: "ShieldCheck" },
        ],
      },
    ],
  },
  {
    key: "hotel-settings",
    label: "Settings",
    iconName: "Settings2",
    purpose: "Property setup, staff access and your subscription.",
    groups: [
      {
        label: "Setup",
        items: [
          { title: "Company Settings", url: "/settings", module: "core_home", iconName: "Settings", primary: true },
          { title: "Modules", url: "/modules", module: "core_home", iconName: "LayoutGrid", hint: "Switch on the rest of SifoBooks when you are ready." },
          { title: "Subscription", url: "/subscription", module: "core_home", iconName: "Sparkles", primary: true },
        ],
      },
    ],
  },
];


/** SifoRetail — focused retail/POS workspace. */
export const RETAIL_HUBS: HubDef[] = [
  { key: "retail-home", label: "Retail", iconName: "Store", purpose: "Run the shop: sell, control stock and see today's numbers.", groups: [
    { label: "Today", items: [
      { title: "Retail Dashboard", url: "/pos/retail-command-center", module: "retail_pos", iconName: "LayoutDashboard", primary: true, hint: "Sales, shifts, cash and alerts." },
      { title: "Retail POS", url: "/pos", module: "retail_pos", iconName: "ShoppingBag", primary: true, hint: "Sell at the counter." },
      { title: "Sales History", url: "/pos-sales", module: "retail_pos", iconName: "Receipt", primary: true },
      { title: "Cashier & Shifts", url: "/pos/command-center", module: "retail_pos", iconName: "Users", primary: true },
    ]},
  ]},
  { key: "retail-stock", label: "Stock", iconName: "Boxes", purpose: "Products, stock movement and replenishment.", groups: [
    { label: "Inventory", items: [
      { title: "Products", url: "/stock", module: "inventory", iconName: "Boxes", primary: true },
      { title: "Inventory Overview", url: "/inventory", module: "inventory", iconName: "LayoutDashboard", primary: true },
      { title: "Transfers", url: "/inventory/transfers", module: "inventory", iconName: "ArrowLeftRight", primary: true },
      { title: "Stock Counts", url: "/stock-counts", module: "inventory", iconName: "ClipboardList", primary: true },
      { title: "Warehouses", url: "/warehouses", module: "inventory", iconName: "Warehouse" },
      { title: "Stock Adjustments", url: "/stock-adjustments", module: "inventory", iconName: "ClipboardEdit" },
    ]},
  ]},
  { key: "retail-buy", label: "Purchasing", iconName: "ShoppingCart", purpose: "Suppliers, purchases and goods received.", groups: [
    { label: "Buy", items: [
      { title: "Purchase Orders", url: "/purchase-orders", module: "purchases", iconName: "ShoppingCart", primary: true },
      { title: "Goods Receipts", url: "/goods-receipts", module: "purchases", iconName: "PackageCheck", primary: true },
      { title: "Suppliers", url: "/suppliers", module: "purchases", iconName: "Truck", primary: true },
      { title: "Bills", url: "/bills", module: "purchases", iconName: "FileBox", primary: true },
    ]},
  ]},
  { key: "retail-customers", label: "Customers", iconName: "Users", purpose: "Customer accounts, sales and payments.", groups: [
    { label: "Customers", items: [
      { title: "Customers", url: "/customers", module: "sales", iconName: "Users", primary: true },
      { title: "Invoices", url: "/invoices", module: "sales", iconName: "ReceiptText", primary: true },
      { title: "Receive Payments", url: "/receipts", module: "sales", iconName: "CreditCard", primary: true },
      { title: "Customer Statements", url: "/reports/customer-statement", module: "reports", iconName: "FileBarChart" },
    ]},
  ]},
  { key: "retail-reports", label: "Reports", iconName: "BarChart3", purpose: "Sales, stock and management reports.", groups: [
    { label: "Reporting", items: [
      { title: "Reports Centre", url: "/reports", module: "reports", iconName: "BarChart3", primary: true },
      { title: "Sales by Item", url: "/reports/sales-by-item", module: "reports", iconName: "BarChart3", primary: true },
      { title: "Inventory Valuation", url: "/reports/inventory-valuation", module: "reports", iconName: "Boxes", primary: true },
      { title: "POS Integrity", url: "/reports/pos-integrity", module: "reports", iconName: "ShieldCheck" },
    ]},
  ]},
  { key: "retail-settings", label: "Settings", iconName: "Settings2", purpose: "Company, staff and licensed features.", groups: [
    { label: "Setup", items: [
      { title: "Company Setup", url: "/setup", module: "admin", iconName: "Building2", primary: true },
      { title: "Users & Roles", url: "/roles", module: "admin", iconName: "ShieldCheck", primary: true },
      { title: "POS Workers", url: "/pos-workers", module: "retail_pos", iconName: "Users" },
      { title: "Modules", url: "/modules", module: "core_home", iconName: "LayoutGrid" },
    ]},
  ]},
];

/** SifoRestaurant — focused restaurant operations workspace. */
export const RESTAURANT_HUBS: HubDef[] = [
  { key: "restaurant-home", label: "Restaurant", iconName: "Utensils", purpose: "Run today's restaurant operations from one place.", groups: [
    { label: "Today", items: [
      { title: "Restaurant Dashboard", url: "/restaurant", module: "restaurant", iconName: "LayoutDashboard", primary: true },
      { title: "Restaurant POS", url: "/restaurant/pos", module: "restaurant", iconName: "ShoppingBag", primary: true },
      { title: "Orders", url: "/restaurant/orders", module: "restaurant", iconName: "Receipt", primary: true },
      { title: "Tables", url: "/restaurant/tables", module: "restaurant", iconName: "LayoutGrid", primary: true },
    ]},
  ]},
  { key: "restaurant-kitchen", label: "Kitchen", iconName: "ChefHat", purpose: "Send orders to the kitchen and track preparation.", groups: [
    { label: "Kitchen", items: [
      { title: "Kitchen Display", url: "/restaurant/kitchen", module: "restaurant", iconName: "ChefHat", primary: true },
      { title: "Menu", url: "/restaurant/menu", module: "restaurant", iconName: "Utensils", primary: true },
      { title: "Combos", url: "/restaurant/combos", module: "restaurant", iconName: "Layers", primary: true },
      { title: "Dispatch", url: "/restaurant/dispatch", module: "restaurant", iconName: "Send" },
    ]},
  ]},
  { key: "restaurant-guests", label: "Guests", iconName: "Users", purpose: "Reservations, loyalty and guest service.", groups: [
    { label: "Guest service", items: [
      { title: "Reservations", url: "/restaurant/reservations", module: "restaurant", iconName: "CalendarCheck", primary: true },
      { title: "Loyalty", url: "/restaurant/loyalty", module: "restaurant", iconName: "Heart", primary: true },
      { title: "Call Centre", url: "/restaurant/call-center", module: "restaurant", iconName: "Phone", primary: true },
    ]},
  ]},
  { key: "restaurant-stock", label: "Stock", iconName: "Boxes", purpose: "Ingredients, recipes and stock control.", groups: [
    { label: "Control", items: [
      { title: "Inventory", url: "/inventory", module: "inventory", iconName: "Boxes", primary: true },
      { title: "Recipes", url: "/restaurant/menu", module: "restaurant", iconName: "BookOpen", primary: true },
      { title: "Stock Counts", url: "/stock-counts", module: "inventory", iconName: "ClipboardList", primary: true },
      { title: "Purchasing", url: "/purchase-orders", module: "purchases", iconName: "ShoppingCart", primary: true },
    ]},
  ]},
  { key: "restaurant-reports", label: "Reports", iconName: "BarChart3", purpose: "Sales, kitchen and restaurant performance.", groups: [
    { label: "Reporting", items: [
      { title: "Restaurant Reports", url: "/restaurant/reports", module: "restaurant", iconName: "BarChart3", primary: true },
      { title: "End of Day", url: "/restaurant/end-of-day", module: "restaurant", iconName: "Moon", primary: true },
      { title: "Cash & Shifts", url: "/restaurant/cash", module: "restaurant", iconName: "Wallet", primary: true },
    ]},
  ]},
  { key: "restaurant-settings", label: "Settings", iconName: "Settings2", purpose: "Restaurant setup, staff and licensed features.", groups: [
    { label: "Setup", items: [
      { title: "Restaurant Settings", url: "/restaurant/settings", module: "restaurant", iconName: "Settings2", primary: true },
      { title: "Company Setup", url: "/setup", module: "admin", iconName: "Building2", primary: true },
      { title: "Users & Roles", url: "/roles", module: "admin", iconName: "ShieldCheck", primary: true },
      { title: "Modules", url: "/modules", module: "core_home", iconName: "LayoutGrid" },
    ]},
  ]},
];

/** Which hub set to present for a company's workspace mode or edition. */
export function hubsForMode(mode: string | null | undefined, edition?: string | null): HubDef[] {
  if (mode === "payroll_only") return PAYROLL_HUBS;
  if (mode === "hotel_only") return HOTEL_HUBS;
  if (edition === "restaurant") return RESTAURANT_HUBS;
  if (edition === "retail") return RETAIL_HUBS;
  return HUBS;
}
