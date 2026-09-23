/**
 * SifoBooks Zambia Standard Chart of Accounts.
 *
 * This is a configurable SifoBooks baseline designed for Zambian businesses
 * and aligned to the three-tier reporting environment described by ZICA.
 * It is not represented as an official ZICA-published chart.
 *
 * Industry templates add sub-accounts without replacing this core.
 */
export type ZambiaAccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export type ZambiaAccountSeed = {
  code: string;
  name: string;
  type: ZambiaAccountType;
  group: string;
  reportingClass: "current_asset" | "non_current_asset" | "current_liability" | "non_current_liability" | "equity" | "revenue" | "cost_of_sales" | "operating_expense" | "finance_income" | "finance_cost";
  description?: string;
};

const A = (
  code: string,
  name: string,
  type: ZambiaAccountType,
  group: string,
  reportingClass: ZambiaAccountSeed["reportingClass"],
  description?: string,
): ZambiaAccountSeed => ({ code, name, type, group, reportingClass, description });

export const ZAMBIA_STANDARD_COA: ZambiaAccountSeed[] = [
  // ASSETS
  A("1000", "Cash & Cash Equivalents", "asset", "Current Assets", "current_asset"),
  A("1010", "Petty Cash", "asset", "Current Assets", "current_asset"),
  A("1020", "Cash at Bank", "asset", "Current Assets", "current_asset"),
  A("1030", "Mobile Money — MTN", "asset", "Current Assets", "current_asset"),
  A("1040", "Mobile Money — Airtel", "asset", "Current Assets", "current_asset"),
  A("1050", "Card Settlement Account", "asset", "Current Assets", "current_asset"),
  A("1100", "Trade Receivables", "asset", "Current Assets", "current_asset"),
  A("1110", "Other Receivables", "asset", "Current Assets", "current_asset"),
  A("1120", "Staff Advances", "asset", "Current Assets", "current_asset"),
  A("1200", "Inventory", "asset", "Current Assets", "current_asset"),
  A("1210", "Inventory — Raw Materials", "asset", "Current Assets", "current_asset"),
  A("1220", "Inventory — Finished Goods", "asset", "Current Assets", "current_asset"),
  A("1230", "Inventory — Food & Beverage", "asset", "Current Assets", "current_asset"),
  A("1240", "Inventory — Retail Goods", "asset", "Current Assets", "current_asset"),
  A("1300", "Prepayments", "asset", "Current Assets", "current_asset"),
  A("1310", "VAT Input Receivable", "asset", "Current Assets", "current_asset"),
  A("1400", "Loan Portfolio / Loans Receivable", "asset", "Current Assets", "current_asset"),
  A("1500", "Property, Plant & Equipment", "asset", "Non-current Assets", "non_current_asset"),
  A("1510", "Furniture & Fittings", "asset", "Non-current Assets", "non_current_asset"),
  A("1520", "Motor Vehicles", "asset", "Non-current Assets", "non_current_asset"),
  A("1530", "Computer Equipment", "asset", "Non-current Assets", "non_current_asset"),
  A("1540", "Buildings", "asset", "Non-current Assets", "non_current_asset"),
  A("1590", "Accumulated Depreciation", "asset", "Non-current Assets", "non_current_asset"),
  A("1600", "Security Deposits", "asset", "Non-current Assets", "non_current_asset"),

  // LIABILITIES
  A("2000", "Trade Payables", "liability", "Current Liabilities", "current_liability"),
  A("2010", "Other Payables", "liability", "Current Liabilities", "current_liability"),
  A("2020", "Accrued Expenses", "liability", "Current Liabilities", "current_liability"),
  A("2100", "VAT Output Payable", "liability", "Tax Liabilities", "current_liability"),
  A("2110", "PAYE Payable", "liability", "Statutory Liabilities", "current_liability"),
  A("2120", "NAPSA Payable", "liability", "Statutory Liabilities", "current_liability"),
  A("2130", "NHIMA Payable", "liability", "Statutory Liabilities", "current_liability"),
  A("2140", "Withholding Tax Payable", "liability", "Tax Liabilities", "current_liability"),
  A("2150", "Skills Development Levy Payable", "liability", "Statutory Liabilities", "current_liability"),
  A("2160", "Workers' Compensation Payable", "liability", "Statutory Liabilities", "current_liability"),
  A("2200", "Customer Deposits", "liability", "Current Liabilities", "current_liability"),
  A("2210", "Tenant / Guest Deposits", "liability", "Current Liabilities", "current_liability"),
  A("2300", "Loans & Borrowings", "liability", "Non-current Liabilities", "non_current_liability"),
  A("2310", "Lease Liabilities", "liability", "Non-current Liabilities", "non_current_liability"),

  // EQUITY
  A("3000", "Share Capital / Owner Capital", "equity", "Equity", "equity"),
  A("3100", "Share Premium / Additional Capital", "equity", "Equity", "equity"),
  A("3200", "Retained Earnings", "equity", "Equity", "equity"),
  A("3300", "Current Year Profit / (Loss)", "equity", "Equity", "equity"),
  A("3400", "Drawings / Owner Distributions", "equity", "Equity", "equity"),

  // REVENUE
  A("4000", "Sales Revenue", "revenue", "Revenue", "revenue"),
  A("4010", "Service Revenue", "revenue", "Revenue", "revenue"),
  A("4020", "Other Operating Income", "revenue", "Revenue", "revenue"),
  A("4030", "Discounts Received", "revenue", "Revenue", "revenue"),
  A("4040", "Interest Income", "revenue", "Other Income", "finance_income"),

  // COST OF SALES
  A("5000", "Cost of Goods Sold", "expense", "Cost of Sales", "cost_of_sales"),
  A("5010", "Food Cost", "expense", "Cost of Sales", "cost_of_sales"),
  A("5020", "Beverage Cost", "expense", "Cost of Sales", "cost_of_sales"),
  A("5030", "Inventory Wastage", "expense", "Cost of Sales", "cost_of_sales"),
  A("5040", "Inventory Shrinkage / Variance", "expense", "Cost of Sales", "cost_of_sales"),

  // OPERATING EXPENSES
  A("6000", "Salaries & Wages", "expense", "Operating Expenses", "operating_expense"),
  A("6010", "Employer NAPSA", "expense", "Operating Expenses", "operating_expense"),
  A("6020", "Employer NHIMA", "expense", "Operating Expenses", "operating_expense"),
  A("6030", "Skills Development Levy", "expense", "Operating Expenses", "operating_expense"),
  A("6040", "Workers' Compensation", "expense", "Operating Expenses", "operating_expense"),
  A("6100", "Rent & Premises", "expense", "Operating Expenses", "operating_expense"),
  A("6110", "Electricity & Utilities", "expense", "Operating Expenses", "operating_expense"),
  A("6120", "Water & Sanitation", "expense", "Operating Expenses", "operating_expense"),
  A("6130", "Telephone & Internet", "expense", "Operating Expenses", "operating_expense"),
  A("6200", "Transport & Fuel", "expense", "Operating Expenses", "operating_expense"),
  A("6210", "Repairs & Maintenance", "expense", "Operating Expenses", "operating_expense"),
  A("6300", "Marketing & Advertising", "expense", "Operating Expenses", "operating_expense"),
  A("6310", "Professional & Accounting Fees", "expense", "Operating Expenses", "operating_expense"),
  A("6320", "Insurance", "expense", "Operating Expenses", "operating_expense"),
  A("6330", "Licences & Regulatory Fees", "expense", "Operating Expenses", "operating_expense"),
  A("6400", "Office Expenses", "expense", "Operating Expenses", "operating_expense"),
  A("6410", "Bank & Payment Charges", "expense", "Operating Expenses", "operating_expense"),
  A("6500", "Depreciation Expense", "expense", "Operating Expenses", "operating_expense"),
  A("6600", "Bad Debts / Expected Credit Loss", "expense", "Operating Expenses", "operating_expense"),
  A("6700", "Other Operating Expenses", "expense", "Operating Expenses", "operating_expense"),
  A("6800", "Interest & Finance Costs", "expense", "Finance Costs", "finance_cost"),
];

export const ZAMBIA_COA_BY_CODE = Object.fromEntries(ZAMBIA_STANDARD_COA.map((a) => [a.code, a]));

export function getZambiaCoreCoa(): ZambiaAccountSeed[] {
  return ZAMBIA_STANDARD_COA.map((account) => ({ ...account }));
}
