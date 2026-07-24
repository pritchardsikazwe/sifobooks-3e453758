// Central module registry. Drives sidebar visibility, /modules install page, and route guards.

export type ModuleCategory =
  | "Core" | "Sales" | "Purchases" | "Finance" | "Inventory"
  | "HR & Payroll" | "CRM" | "Projects & Service" | "Reports"
  | "School ERP" | "NGO" | "Mining" | "Admin";

export type ModuleRoute = { title: string; url: string; iconName?: string };

export type ModuleDef = {
  key: string;
  label: string;
  category: ModuleCategory;
  description: string;
  routes: ModuleRoute[];
  /** Installed by default for every tenant (cannot be uninstalled unless core=false). */
  defaultInstalled: boolean;
  /** Core modules cannot be uninstalled. */
  core?: boolean;
};

// Every module in the app. Sidebar sections are grouped by `category`, ordered as below.
export const MODULES: ModuleDef[] = [
  // ---------- CORE ----------
  { key: "core_home", label: "Dashboard", category: "Core", core: true, defaultInstalled: true,
    description: "Home dashboard & summary widgets.",
    routes: [{ title: "Summary", url: "/dashboard", iconName: "Home" }] },

  // ---------- SALES ----------
  { key: "sales", label: "Sales & Invoicing", category: "Sales", defaultInstalled: true,
    description: "Customers, quotes, invoices, credit notes and receipts.",
    routes: [
      { title: "Customers", url: "/customers", iconName: "Users" },
      { title: "Quotes", url: "/quotes", iconName: "FileText" },
      { title: "Sales Invoices", url: "/invoices", iconName: "ReceiptText" },
      { title: "Credit Notes", url: "/credit-notes", iconName: "Undo2" },
      { title: "Receive Payments", url: "/receipts", iconName: "CreditCard" },
    ] },

  // ---------- PURCHASES ----------
  { key: "purchases", label: "Purchases & Bills", category: "Purchases", defaultInstalled: true,
    description: "Suppliers, purchase orders, bills, payments and expenses.",
    routes: [
      { title: "Suppliers", url: "/suppliers", iconName: "Truck" },
      { title: "Purchase Orders", url: "/purchase-orders", iconName: "ShoppingCart" },
      { title: "Bills", url: "/bills", iconName: "FileBox" },
      { title: "Supplier Payments", url: "/bill-payments", iconName: "Wallet" },
      { title: "Expenses", url: "/expenses", iconName: "Receipt" },
      { title: "Expense Categories", url: "/expense-rules", iconName: "Tags" },
    ] },

  // ---------- FINANCE ----------
  { key: "finance", label: "Finance & GL", category: "Finance", core: true, defaultInstalled: true,
    description: "Banking, chart of accounts, journals and cashbook.",
    routes: [
      { title: "Banking", url: "/banking", iconName: "Landmark" },
      { title: "Bank Accounts", url: "/bank-accounts", iconName: "Landmark" },
      { title: "Bank Rules", url: "/bank-rules", iconName: "Sparkles" },
      { title: "Reconciliation", url: "/reconciliation", iconName: "Scale" },
      { title: "Recon Sessions", url: "/reconciliation-sessions", iconName: "Scale" },
      { title: "Chart of Accounts", url: "/chart-of-accounts", iconName: "BookOpen" },
      { title: "Journal Entries", url: "/journal-entries", iconName: "BookText" },
      { title: "Cashbook", url: "/cashbook", iconName: "BookText" },
      { title: "Opening Balances", url: "/opening-balances", iconName: "Sparkles" },
      { title: "Period Close", url: "/period-close", iconName: "CalendarClock" },
    ] },
  { key: "fixed_assets", label: "Fixed Assets", category: "Finance", defaultInstalled: true,
    description: "Asset register and monthly depreciation.",
    routes: [{ title: "Fixed Assets", url: "/fixed-assets", iconName: "Landmark" }] },
  { key: "budgets", label: "Budgets", category: "Finance", defaultInstalled: true,
    description: "Budget vs. actuals.",
    routes: [{ title: "Budgets", url: "/budgets", iconName: "PiggyBank" }] },
  { key: "multi_currency", label: "Multi-Currency", category: "Finance", defaultInstalled: false,
    description: "FX rates and multi-currency posting.",
    routes: [{ title: "Exchange Rates", url: "/fx-rates", iconName: "Coins" }] },

  // ---------- INVENTORY ----------
  { key: "inventory", label: "Inventory", category: "Inventory", defaultInstalled: true,
    description: "Stock items, warehouses and adjustments.",
    routes: [
      { title: "Items", url: "/stock", iconName: "Boxes" },
      { title: "Warehouses", url: "/warehouses", iconName: "Warehouse" },
      { title: "Stock Adjustments", url: "/stock-adjustments", iconName: "ClipboardEdit" },
    ] },

  // ---------- HR & PAYROLL ----------
  { key: "hr_payroll", label: "HR & Payroll", category: "HR & Payroll", defaultInstalled: true,
    description: "Employees, attendance, leave and Zambian payroll.",
    routes: [
      { title: "Employees", url: "/employees", iconName: "UserSquare" },
      { title: "Attendance", url: "/attendance", iconName: "CalendarCheck" },
      { title: "Leave", url: "/leave", iconName: "CalendarDays" },
      { title: "Payroll", url: "/payroll", iconName: "Banknote" },
      { title: "Payroll Schedules", url: "/reports/payroll-schedules", iconName: "Banknote" },
    ] },

  // ---------- CRM ----------
  { key: "crm", label: "CRM", category: "CRM", defaultInstalled: false,
    description: "Leads, opportunities, campaigns and customer service.",
    routes: [
      { title: "Leads", url: "/leads", iconName: "UserPlus" },
      { title: "Opportunities", url: "/opportunities", iconName: "Target" },
      { title: "Campaigns", url: "/campaigns", iconName: "Megaphone" },
      { title: "Complaints", url: "/complaints", iconName: "MessageSquareWarning" },
      { title: "CSAT", url: "/csat", iconName: "Star" },
    ] },

  // ---------- PROJECTS & SERVICE ----------
  { key: "projects", label: "Projects & Service", category: "Projects & Service", defaultInstalled: false,
    description: "Projects, tasks, timesheets, tickets and job cards.",
    routes: [
      { title: "Projects", url: "/projects", iconName: "Briefcase" },
      { title: "Project Tasks", url: "/project-tasks", iconName: "ListChecks" },
      { title: "Time Entries", url: "/time-entries", iconName: "Clock" },
      { title: "Service Tickets", url: "/service-tickets", iconName: "LifeBuoy" },
      { title: "Job Cards", url: "/job-cards", iconName: "Wrench" },
    ] },

  // ---------- REPORTS ----------
  { key: "reports", label: "Reports & Statements", category: "Reports", core: true, defaultInstalled: true,
    description: "Financial statements, statutory returns and analytics.",
    routes: [
      { title: "Reports", url: "/reports", iconName: "BarChart3" },
      { title: "Trial Balance", url: "/reports/trial-balance", iconName: "BookText" },
      { title: "Customer Statement", url: "/reports/customer-statement", iconName: "Users" },
      { title: "Supplier Statement", url: "/reports/supplier-statement", iconName: "Truck" },
      { title: "Annual Financial Statements", url: "/reports/afs", iconName: "Sparkles" },
      { title: "VAT Return (VAT 3)", url: "/reports/vat-return", iconName: "Receipt" },
      { title: "Income Tax Computation", url: "/reports/income-tax", iconName: "Receipt" },
      { title: "Turnover Tax", url: "/reports/turnover-tax", iconName: "Receipt" },
    ] },
  { key: "compliance", label: "Compliance & Statutory", category: "Reports", defaultInstalled: true,
    description: "ZRA, NAPSA, NHIMA and other statutory obligations.",
    routes: [{ title: "Compliance", url: "/compliance", iconName: "ShieldCheck" }] },

  // ---------- SCHOOL ERP (opt-in) ----------
  { key: "school_erp", label: "School ERP", category: "School ERP", defaultInstalled: false,
    description: "Grants, teaching materials, workshops, imprest and tuckshop for schools & NGOs.",
    routes: [
      { title: "Grants & Donor Funds", url: "/school-grants", iconName: "Landmark" },
      { title: "Teaching Materials", url: "/teaching-materials", iconName: "BookIcon" },
      { title: "Workshops & Allowances", url: "/workshops", iconName: "GraduationCap" },
      { title: "Imprest Register", url: "/imprest", iconName: "Wallet" },
      { title: "Tuckshop POS", url: "/tuckshop", iconName: "ShoppingBag" },
    ] },

  // ---------- ADMIN ----------
  { key: "admin", label: "Administration", category: "Admin", core: true, defaultInstalled: true,
    description: "Company setup, roles, approvals, audit and notifications.",
    routes: [
      { title: "Admin Home", url: "/admin", iconName: "UserCog" },
      { title: "Modules", url: "/modules", iconName: "Sparkles" },
      { title: "Roles & Permissions", url: "/roles", iconName: "ShieldCheck" },
      { title: "Approvals", url: "/approvals", iconName: "Inbox" },
      { title: "Super Admin", url: "/super-admin", iconName: "ShieldAlert" },
      { title: "Company Setup", url: "/setup", iconName: "Building2" },
      { title: "Industry Presets", url: "/industry", iconName: "Sparkles" },
      { title: "Subscription", url: "/subscription", iconName: "Sparkles" },
      { title: "Audit Logs", url: "/audit-logs", iconName: "ShieldCheck" },
      { title: "Notifications", url: "/notifications", iconName: "Bell" },
    ] },
];

export const CATEGORY_ORDER: ModuleCategory[] = [
  "Core", "Sales", "Purchases", "Finance", "Inventory", "HR & Payroll",
  "CRM", "Projects & Service", "Reports", "School ERP", "NGO", "Mining", "Admin",
];

export function getModule(key: string): ModuleDef | undefined {
  return MODULES.find(m => m.key === key);
}

/** Given the set of installed keys, decide if a module should show. */
export function isModuleInstalled(key: string, installed: Set<string>): boolean {
  const m = getModule(key);
  if (!m) return false;
  if (m.core) return true;
  return installed.has(key) || m.defaultInstalled;
}

/** Map a route URL back to the module that owns it (first match). */
export function moduleForRoute(url: string): ModuleDef | undefined {
  return MODULES.find(m => m.routes.some(r => r.url === url || url.startsWith(r.url + "/")));
}
