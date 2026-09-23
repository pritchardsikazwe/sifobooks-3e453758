/**
 * Industry Starter Packs for SifoBooks Zambia.
 *
 * These templates drive onboarding defaults, terminology, compliance guidance,
 * role presets and industry education. They are deliberately configuration
 * data, not separate accounting systems.
 */

export type IndustryEdition = "accounting" | "retail" | "restaurant" | "hotel" | "school" | "property" | "lending" | "enterprise";

export type StarterModule = {
  key: string;
  label: string;
  description: string;
  defaultOn: boolean;
  compliance: string[];
};

export type StarterCompliance = {
  code: string;
  name: string;
  relevance: "core" | "industry";
  status: "configure" | "if_applicable" | "industry_specific";
  guidance: string;
};

export type StarterRole = {
  key: string;
  label: string;
  description: string;
  permissions: string[];
  demoUsername?: string;
};

export type IndustryStarter = {
  edition: IndustryEdition;
  industry: string;
  tagline: string;
  about: string;
  modules: StarterModule[];
  compliance: StarterCompliance[];
  roles: StarterRole[];
  coaAccounts: { code: string; name: string; type: "asset" | "liability" | "equity" | "revenue" | "expense" }[];
  demoCompanyName: string;
  demoUsername: string;
  demoPassword: string;
};

const M = (key: string, label: string, description: string, compliance: string[] = [], defaultOn = true): StarterModule =>
  ({ key, label, description, defaultOn, compliance });

const C = (code: string, name: string, guidance: string, status: StarterCompliance["status"] = "configure", relevance: StarterCompliance["relevance"] = "core"): StarterCompliance =>
  ({ code, name, guidance, status, relevance });

const R = (key: string, label: string, description: string, permissions: string[], demoUsername?: string): StarterRole =>
  ({ key, label, description, permissions, demoUsername });

const commonCompliance = [
  C("PACRA", "PACRA company records", "Maintain company registration details, annual-return information and beneficial-ownership records where applicable."),
  C("ZRA", "Zambia Revenue Authority", "Configure TPIN, applicable tax types, tax periods and filing records. Tax applicability is determined by the business and current ZRA rules."),
  C("SMART_INVOICE", "ZRA Smart Invoice", "Configure item/tax mapping and fiscalisation only where applicable. Certified invoicing-system integration requires the ZRA certification process."),
  C("NAPSA", "NAPSA", "Configure employer and employee contribution records for eligible employees."),
  C("NHIMA", "NHIMA", "Configure health-insurance contribution records for eligible employees."),
  C("WCF", "Workers' Compensation", "Configure employer registration, assessment and records where applicable."),
];

const roles: StarterRole[] = [
  R("owner", "Owner / Administrator", "Full company control.", ["company", "accounting", "inventory", "sales", "purchasing", "reports", "users"], "SifoBooksdemo"),
  R("accountant", "Accountant", "Accounting, tax, reconciliation and reporting.", ["accounting", "tax", "banking", "reports"], "accountant"),
  R("hr", "HR / Payroll", "Employees, payroll and statutory deductions.", ["employees", "payroll", "hr", "statutory"], "hr"),
];

const restaurantRoles = [
  ...roles,
  R("manager", "Restaurant Manager", "Operations, approvals, reports and staff.", ["restaurant", "inventory", "sales", "purchasing", "reports"], "manager"),
  R("cashier", "Cashier", "POS sales, payments and cash drawer.", ["pos", "payments", "cash_drawer"], "cashier1"),
  R("waiter", "Waiter", "Tables, orders and service workflow.", ["tables", "orders", "reservations"], "waiter1"),
  R("kitchen", "Kitchen / KDS", "Kitchen tickets and service completion.", ["kds", "recipes", "production"], "kitchen"),
];

const baseAccountingModules = [
  M("accounting", "Accounting", "Double-entry ledger, journals, trial balance and financial statements.", ["ZRA", "PACRA"]),
  M("tax", "Tax & Compliance", "Tax configuration, statutory accounts and compliance calendar.", ["ZRA", "SMART_INVOICE", "NAPSA", "NHIMA"]),
  M("banking", "Banking", "Bank accounts, cashbooks and reconciliation.", []),
  M("purchasing", "Purchasing", "Suppliers, purchase orders, bills and payments.", ["ZRA"]),
  M("sales", "Sales & Invoicing", "Quotes, invoices, receipts and customer balances.", ["ZRA", "SMART_INVOICE"]),
  M("inventory", "Inventory & Warehouses", "Items, warehouses, stock movement, valuation and stock take.", ["ZRA", "SMART_INVOICE"]),
  M("payroll", "HR & Payroll", "Employees, payroll, payslips and statutory deductions.", ["NAPSA", "NHIMA", "WCF", "ZRA"]),
  M("reports", "Reports & Analytics", "Financial, tax, operational and industry reports."),
];

const editions: IndustryStarter[] = [
  {
    edition: "accounting", industry: "Accounting & Professional Services",
    tagline: "A disciplined Zambia accounting workspace for accountants, bookkeepers and service firms.",
    about: "SifoBooks Accounting is configured around double-entry bookkeeping, client billing, payables, receivables, banking, payroll and Zambia tax records. Use the reporting-framework setting to select the applicable Zambian reporting basis for the entity.",
    modules: [...baseAccountingModules, M("clients", "Clients & Engagements", "Client register, jobs and recurring billing.", ["PACRA", "ZRA"])],
    compliance: [...commonCompliance],
    roles: roles,
    coaAccounts: [
      { code: "4000", name: "Professional Service Revenue", type: "revenue" },
      { code: "4010", name: "Accounting & Bookkeeping Fees", type: "revenue" },
      { code: "4020", name: "Consulting Revenue", type: "revenue" },
    ],
    demoCompanyName: "SifoBooks Demo Accounting",
    demoUsername: "SifoBooksdemo",
    demoPassword: "Demo2026",
  },
  {
    edition: "retail", industry: "Retail",
    tagline: "Point-of-sale, stock, purchasing and accounting for Zambian shops.",
    about: "SifoBooks Retail connects every till sale to stock, payments, cash-up and accounting. The starter pack includes barcode-friendly items, warehouses, suppliers, customer balances and cashier controls.",
    modules: [...baseAccountingModules, M("pos", "Retail POS", "Barcode checkout, cash drawer, returns and cashier shifts.", ["ZRA", "SMART_INVOICE"]), M("cashiers", "Cashiers & Till Control", "Cashier users, shifts, cash-up and audit trail.", [])],
    compliance: [...commonCompliance],
    roles: [...roles, R("manager", "Retail Manager", "Manage stock, purchasing, POS and reports.", ["retail", "inventory", "sales", "purchasing", "reports"], "manager"), R("cashier", "Cashier", "Till sales and cash-up.", ["pos", "payments", "cash_drawer"], "cashier1")],
    coaAccounts: [{ code: "4000", name: "Retail Sales", type: "revenue" }, { code: "5000", name: "Retail Cost of Goods Sold", type: "expense" }],
    demoCompanyName: "SifoBooks Demo Retail",
    demoUsername: "SifoBooksdemo",
    demoPassword: "Demo2026",
  },
  {
    edition: "restaurant", industry: "Restaurant & Food Service",
    tagline: "Restaurant POS, tables, kitchen, recipes, stock and accounting in one system.",
    about: "SifoBooks Restaurant is configured for table service, takeaway and delivery, kitchen production, recipes, food and beverage stock, cashier shifts and restaurant profitability. Sales, payment, recipe consumption and accounting are designed to reconcile as one workflow.",
    modules: [...baseAccountingModules, M("pos", "Restaurant POS", "Tables, orders, payments, cashier shifts and receipts.", ["ZRA", "SMART_INVOICE"]), M("restaurant", "Restaurant Operations", "Floor plan, tables, reservations and order lifecycle.", []), M("kds", "Kitchen Display", "Kitchen tickets, production and service completion.", []), M("recipes", "Recipe Costing", "Ingredients, recipes, food cost and consumption.", []), M("wastage", "Wastage & Stock Control", "Wastage, stock take and variance.", [])],
    compliance: [...commonCompliance, C("COUNCIL", "Local authority requirements", "Configure applicable business levies, health, fire and signage records with the relevant local authority.", "if_applicable", "industry"), C("TOURISM", "Tourism / hospitality licensing", "Configure tourism licensing records when the restaurant falls within an applicable tourism or hospitality licensing category.", "if_applicable", "industry")],
    roles: restaurantRoles,
    coaAccounts: [
      { code: "4100", name: "Food Sales", type: "revenue" }, { code: "4110", name: "Beverage Sales", type: "revenue" },
      { code: "4120", name: "Delivery & Service Charges", type: "revenue" }, { code: "5010", name: "Food Cost", type: "expense" },
      { code: "5020", name: "Beverage Cost", type: "expense" }, { code: "5030", name: "Kitchen Wastage", type: "expense" },
    ],
    demoCompanyName: "SifoBooks Demo Restaurant",
    demoUsername: "SifoBooksdemo",
    demoPassword: "Demo2026",
  },
  {
    edition: "hotel", industry: "Hotel & Hospitality",
    tagline: "Rooms, reservations, guests, housekeeping, restaurant and hotel accounting.",
    about: "SifoBooks Hotel combines room operations and financial control: reservations, guests, check-in/out, folios, deposits, housekeeping, restaurant/POS, stock, payroll and departmental profitability.",
    modules: [...baseAccountingModules, M("rooms", "Rooms & Rates", "Room types, rooms, rates and availability.", ["ZRA"]), M("reservations", "Reservations & Front Desk", "Bookings, check-in, check-out and guest accounts.", ["ZRA"]), M("folios", "Guest Folios", "Room charges, deposits and settlements.", ["ZRA", "SMART_INVOICE"]), M("housekeeping", "Housekeeping", "Room status, cleaning and maintenance.", []), M("hotel_pos", "Hotel POS", "Restaurant, bar and other outlet sales.", ["ZRA", "SMART_INVOICE"]), M("departments", "Departmental Accounting", "Accommodation, F&B and other department performance.", [])],
    compliance: [...commonCompliance, C("TOURISM", "Tourism / hospitality licensing", "Maintain applicable tourism/accommodation licensing records and renewal dates.", "industry_specific", "industry"), C("COUNCIL", "Local authority requirements", "Maintain applicable council levies, fire, health and signage records.", "if_applicable", "industry")],
    roles: [...roles, R("hotel_manager", "Hotel Manager", "Front office, rooms, outlets and reports.", ["hotel", "reports", "approvals"], "manager"), R("front_desk", "Front Desk", "Reservations, check-in/out and guest folios.", ["reservations", "front_desk", "folios"], "frontdesk"), R("cashier", "Outlet Cashier", "POS payments and shifts.", ["pos", "payments", "cash_drawer"], "cashier1"), R("housekeeping", "Housekeeping", "Room status and housekeeping workflow.", ["housekeeping", "rooms"], "housekeeping")],
    coaAccounts: [
      { code: "4100", name: "Accommodation Revenue", type: "revenue" }, { code: "4110", name: "Food & Beverage Revenue", type: "revenue" },
      { code: "4120", name: "Laundry Revenue", type: "revenue" }, { code: "4130", name: "Conference & Events Revenue", type: "revenue" },
      { code: "5010", name: "Food Cost", type: "expense" }, { code: "5020", name: "Beverage Cost", type: "expense" },
    ],
    demoCompanyName: "SifoBooks Demo Hotel",
    demoUsername: "SifoBooksdemo",
    demoPassword: "Demo2026",
  },
  {
    edition: "school", industry: "School & Education",
    tagline: "Students, fees, attendance, payroll, procurement and school finance.",
    about: "SifoBooks School is configured for student billing and collections alongside normal accounting. It keeps student balances, receipts, payroll, purchasing, inventory and school reporting connected.",
    modules: [...baseAccountingModules, M("students", "Students & Guardians", "Admissions, student profiles and guardians.", []), M("fees", "Fees Management", "Fee structures, invoices, receipts and statements.", ["ZRA"]), M("attendance", "Attendance", "Student and staff attendance.", []), M("academics", "Academic Records", "Classes, subjects, assessments and results.", []), M("transport", "School Transport", "Routes, vehicles and transport charges.", []), M("hostel", "Boarding / Hostel", "Rooms, boarders and boarding charges.", [])],
    compliance: [...commonCompliance, C("TEVETA", "TEVETA", "Configure the Skills Development Levy where the employer and workforce are within its scope.", "if_applicable", "industry"), C("COUNCIL", "Local authority requirements", "Maintain applicable school premises, fire, health and levy records.", "if_applicable", "industry")],
    roles: [...roles, R("bursar", "School Bursar", "Fees, receipts, billing and accounting.", ["fees", "accounting", "reports"], "bursar"), R("teacher", "Teacher", "Academic and attendance workflows.", ["academics", "attendance"], "teacher")],
    coaAccounts: [
      { code: "4100", name: "Tuition Income", type: "revenue" }, { code: "4110", name: "Boarding Income", type: "revenue" },
      { code: "4120", name: "Transport Income", type: "revenue" }, { code: "4130", name: "Other School Fees", type: "revenue" },
      { code: "6000", name: "Teacher Salaries", type: "expense" },
    ],
    demoCompanyName: "SifoBooks Demo Academy",
    demoUsername: "SifoBooksdemo",
    demoPassword: "Demo2026",
  },
  {
    edition: "property", industry: "Property Management",
    tagline: "Properties, units, tenants, leases, rent, deposits and maintenance.",
    about: "SifoBooks Property connects leases and rent schedules to receivables, receipts, deposits, maintenance costs and property-level reporting.",
    modules: [...baseAccountingModules.filter(m => !["inventory"].includes(m.key)), M("properties", "Properties & Units", "Buildings, units and property details.", []), M("tenants", "Tenants", "Tenant profiles and balances.", []), M("leases", "Lease Management", "Lease terms, deposits and renewals.", []), M("rent", "Rent & Receivables", "Rent invoices, receipts and arrears.", ["ZRA", "SMART_INVOICE"]), M("maintenance", "Maintenance", "Requests, suppliers and maintenance costs.", [])],
    compliance: [...commonCompliance, C("COUNCIL", "Local authority requirements", "Maintain applicable property rates, levies and premises records.", "if_applicable", "industry")],
    roles: [...roles, R("property_manager", "Property Manager", "Units, tenants, leases and maintenance.", ["properties", "tenants", "leases", "maintenance"], "manager"), R("rent_clerk", "Rent Clerk", "Rent billing, receipts and tenant statements.", ["rent", "receipts", "reports"], "rentclerk")],
    coaAccounts: [{ code: "4100", name: "Rental Income", type: "revenue" }, { code: "4110", name: "Service Charge Income", type: "revenue" }, { code: "2210", name: "Tenant Deposits", type: "liability" }, { code: "6210", name: "Property Repairs & Maintenance", type: "expense" }],
    demoCompanyName: "SifoBooks Demo Properties",
    demoUsername: "SifoBooksdemo",
    demoPassword: "Demo2026",
  },
  {
    edition: "lending", industry: "Lending & Microfinance",
    tagline: "Borrowers, KYC, loans, schedules, repayments, arrears and collections.",
    about: "SifoBooks Lending is configured for a controlled lending workflow with borrower records, KYC, loan products, schedules, repayments, arrears, collections and loan accounting. Regulatory applicability must be configured for the institution's licence and activities.",
    modules: [M("accounting", "Accounting", "Double-entry lending and operating ledger.", []), M("banking", "Banking & Mobile Money", "Disbursements, collections and reconciliation.", []), M("borrowers", "Borrowers & KYC", "Borrower profiles and verification records.", ["PACRA"]), M("loans", "Loan Management", "Loan products, applications and schedules.", []), M("repayments", "Repayments & Collections", "Receipts, arrears and field collections.", []), M("portfolio", "Portfolio Reporting", "PAR, aging, collections and loan performance.", []), M("reports", "Reports & Analytics", "Financial and portfolio reports.", [])],
    compliance: [...commonCompliance, C("BOZ", "Bank of Zambia / applicable financial-sector rules", "Configure the institution's applicable licensing, consumer-protection and reporting requirements before production use.", "if_applicable", "industry")],
    roles: [...roles, R("credit_officer", "Credit Officer", "Applications, assessment and borrower records.", ["borrowers", "applications", "kyc"], "credit"), R("collections", "Collections Officer", "Repayments, arrears and field collections.", ["repayments", "collections", "arrears"], "collections")],
    coaAccounts: [{ code: "1400", name: "Loan Portfolio", type: "asset" }, { code: "4040", name: "Interest Income", type: "revenue" }, { code: "4050", name: "Penalty Income", type: "revenue" }, { code: "6600", name: "Loan Loss / Bad Debt Expense", type: "expense" }],
    demoCompanyName: "SifoBooks Demo Finance",
    demoUsername: "SifoBooksdemo",
    demoPassword: "Demo2026",
  },
  {
    edition: "enterprise", industry: "Enterprise / Multi-Department",
    tagline: "Full SifoBooks across finance, inventory, HR, procurement, sales and operations.",
    about: "SifoBooks Enterprise enables the complete business suite with branches, warehouses, accounting, procurement, inventory, sales, HR, payroll, assets, banking, compliance and industry extensions.",
    modules: [...baseAccountingModules, M("assets", "Fixed Assets", "Asset register, depreciation and disposal.", []), M("projects", "Projects & Cost Centres", "Budgets, projects and departmental reporting.", []), M("approvals", "Approvals & Controls", "Approval workflows and segregation of duties.", []), M("branches", "Branches & Multi-Location", "Branches, warehouses and consolidated reporting.", [])],
    compliance: [...commonCompliance, C("ZEMA", "ZEMA", "Configure environmental approvals and reporting where the enterprise activity requires them.", "if_applicable", "industry"), C("ZPPA", "ZPPA", "Configure supplier/procurement records where public procurement participation applies.", "if_applicable", "industry")],
    roles: [...roles, R("manager", "Department / Operations Manager", "Operational approvals and departmental reporting.", ["operations", "approvals", "reports"], "manager")],
    coaAccounts: [
      { code: "4100", name: "Operating Revenue", type: "revenue" }, { code: "4200", name: "Other Business Revenue", type: "revenue" },
      { code: "5000", name: "Cost of Sales", type: "expense" }, { code: "6500", name: "Depreciation Expense", type: "expense" },
    ],
    demoCompanyName: "SifoBooks Demo Enterprise",
    demoUsername: "SifoBooksdemo",
    demoPassword: "Demo2026",
  },
];

export const INDUSTRY_STARTERS: IndustryStarter[] = editions;

export function getIndustryStarter(edition?: string | null): IndustryStarter {
  const value = String(edition || "").toLowerCase();
  return INDUSTRY_STARTERS.find((starter) => starter.edition === value) ?? INDUSTRY_STARTERS.find((starter) => starter.edition === "enterprise")!;
}

export function getIndustryStarterByIndustry(industry?: string | null): IndustryStarter {
  const value = String(industry || "").toLowerCase();
  return INDUSTRY_STARTERS.find((starter) => starter.industry.toLowerCase() === value || starter.edition === value)
    ?? getIndustryStarter(value);
}

export function starterModuleKeys(edition?: string | null): string[] {
  return getIndustryStarter(edition).modules.filter((module) => module.defaultOn).map((module) => module.key);
}
