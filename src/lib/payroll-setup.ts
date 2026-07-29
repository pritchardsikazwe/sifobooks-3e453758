// Payroll setup reference data — modelled on Zambian payroll systems
// (FlexPayroll / Harvester) and the Excel Zambia Monthly Payroll template.

export const YESNO = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

export const INCOME_TYPE_OPTIONS = [
  { value: "BASIC", label: "BASIC" },
  { value: "ALLOWANCE", label: "ALLOWANCE" },
  { value: "OVERTIME", label: "OVERTIME" },
  { value: "BONUS", label: "BONUS" },
  { value: "COMMISSION", label: "COMMISSION" },
  { value: "PENSION", label: "PENSION" },
  { value: "LEAVE", label: "LEAVE" },
  { value: "TERMINAL", label: "TERMINAL BENEFIT" },
  { value: "REIMBURSEMENT", label: "REIMBURSEMENT" },
];

export const DEDUCTION_BASIS = [
  { value: "Gross", label: "Gross" },
  { value: "Basic", label: "Basic" },
  { value: "Fixed", label: "Fixed amount" },
  { value: "Formula", label: "Formula" },
  { value: "Percentage", label: "Percentage of base" },
];

export const EARN_INCLUSION = [
  { value: "Taxable", label: "Taxable earnings" },
  { value: "Full Value", label: "Full value" },
  { value: "Basic", label: "Basic only" },
];

export const SHOW_ON = [
  { value: "Payslip Only", label: "Payslip Only" },
  { value: "Payslip & Reports", label: "Payslip & Reports" },
  { value: "Reports Only", label: "Reports Only" },
  { value: "Hidden", label: "Hidden" },
];

export const THIS_MONTH_OPTIONS = [
  { value: "Show & Deduct", label: "Show & Deduct" },
  { value: "Show Only", label: "Show Only" },
  { value: "Suspend", label: "Suspend" },
];

export const PROCESS_OPTIONS = [
  { value: "TRIAL", label: "TRIAL" },
  { value: "FINAL", label: "FINAL" },
  { value: "SUBMITTED", label: "SUBMITTED" },
];

export const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((m, i) => ({ value: String(i + 1), label: m }));

export const CURRENCY_OPTIONS = [
  { value: "ZMW", label: "ZMW" },
  { value: "USD", label: "USD" },
  { value: "ZAR", label: "ZAR" },
  { value: "GBP", label: "GBP" },
  { value: "EUR", label: "EUR" },
];

type IncomeSeed = Record<string, string | number | boolean | null>;

/** Zambian default earnings list. */
export const DEFAULT_INCOME_TYPES: IncomeSeed[] = [
  { code: "BP", name: "Basic Pay", short_name: "Basic", type: "BASIC", basis: "Monthly", taxable: true, taxable_pct: 100, has_napsa: true, has_nhima: true, to_all: true, show_on: "Payslip & Reports", employee_formula: "BASICPAY", status: "Active" },
  { code: "HSE", name: "Housing Allowance", short_name: "House", type: "ALLOWANCE", basis: "Monthly", taxable: true, taxable_pct: 70, has_napsa: true, has_nhima: false, show_on: "Payslip & Reports", employee_formula: "BASICPAY * 30%", status: "Active" },
  { code: "TRS", name: "Transport Allowance", short_name: "Trans", type: "ALLOWANCE", basis: "Monthly", taxable: false, taxable_pct: 0, has_napsa: false, has_nhima: false, show_on: "Payslip & Reports", status: "Active" },
  { code: "UTL", name: "Utility Allowance", short_name: "Util", type: "ALLOWANCE", basis: "Monthly", taxable: false, taxable_pct: 0, status: "Active" },
  { code: "LUN", name: "Lunch Allowance", short_name: "Lunch", type: "ALLOWANCE", basis: "Monthly", taxable: true, taxable_pct: 100, status: "Active" },
  { code: "OT1", name: "Overtime (Weekday 1.5x)", short_name: "OT1.5", type: "OVERTIME", basis: "Monthly", taxable: true, taxable_pct: 100, has_napsa: true, employee_formula: "HOURLYRATE * 1.5 * HOURS", status: "Active" },
  { code: "OT2", name: "Overtime (Weekend/Holiday 2x)", short_name: "OT2", type: "OVERTIME", basis: "Monthly", taxable: true, taxable_pct: 100, has_napsa: true, employee_formula: "HOURLYRATE * 2 * HOURS", status: "Active" },
  { code: "SHF", name: "Shift Differential", short_name: "Shift", type: "ALLOWANCE", basis: "Monthly", taxable: true, taxable_pct: 100, status: "Active" },
  { code: "ACT", name: "Acting Allowance", short_name: "Acting", type: "ALLOWANCE", basis: "Monthly", taxable: true, taxable_pct: 100, status: "Active" },
  { code: "RSP", name: "Responsibility Allowance", short_name: "Resp", type: "ALLOWANCE", basis: "Monthly", taxable: true, taxable_pct: 100, status: "Active" },
  { code: "COM", name: "Commission", short_name: "Comm", type: "COMMISSION", basis: "Monthly", taxable: true, taxable_pct: 100, has_napsa: true, status: "Active" },
  { code: "BON", name: "Annual Bonus", short_name: "Bonus", type: "BONUS", basis: "Annual", taxable: true, taxable_pct: 100, status: "Active" },
  { code: "BKP", name: "Backpay / Arrears", short_name: "Backpay", type: "BASIC", basis: "Once Off", taxable: true, taxable_pct: 100, has_napsa: true, status: "Active" },
  { code: "LVE", name: "Leave Pay", short_name: "Leave", type: "LEAVE", basis: "Monthly", taxable: true, taxable_pct: 100, recover_days: true, status: "Active" },
  { code: "GRT", name: "Gratuity", short_name: "Gratuity", type: "PENSION", basis: "Once Off", taxable: false, taxable_pct: 0, deductible: true, has_napsa: false, to_all: true, recover_days: true, show_on: "Payslip Only", employer_formula: "BASICPAY * 25%", status: "Active" },
  { code: "SEV", name: "Severance / Terminal Benefit", short_name: "Sever", type: "TERMINAL", basis: "Once Off", taxable: true, taxable_pct: 100, status: "Active" },
];

/** Zambian default deductions / statutory contributions. */
export const DEFAULT_DEDUCTION_TYPES: IncomeSeed[] = [
  { code: "PAYE", name: "PAYE (Income Tax)", rate: 0, employer_rate: 0, basis: "Formula", earn_inclusion: "Taxable", statutory: true, show_on: "Payslip & Reports", employee_formula: "PAYE_BANDS(TAXABLE)", status: "Active" },
  { code: "NAPSA", name: "NAPSA (Social Security)", rate: 0.05, employer_rate: 0.05, basis: "Gross", earn_inclusion: "Taxable", earnings_max: 34164, statutory: true, show_on: "Payslip & Reports", status: "Active" },
  { code: "NHIMA", name: "NHIMA (National Health Insurance)", rate: 0.01, employer_rate: 0.01, basis: "Basic", earn_inclusion: "Basic", statutory: true, show_on: "Payslip & Reports", status: "Active" },
  { code: "WCF", name: "Workers' Compensation Fund", rate: 0, employer_rate: 0.015, basis: "Gross", earn_inclusion: "Full Value", statutory: true, show_on: "Reports Only", status: "Active" },
  { code: "SDL", name: "Skills Development Levy", rate: 0, employer_rate: 0.005, basis: "Gross", earn_inclusion: "Full Value", statutory: true, show_on: "Reports Only", status: "Active" },
  { code: "LOAN", name: "Loan Recovery", rate: 0, basis: "Fixed", earn_inclusion: "Full Value", status: "Active" },
  { code: "ADV", name: "Salary Advance", rate: 0, basis: "Fixed", earn_inclusion: "Full Value", status: "Active" },
  { code: "UNION", name: "Union Dues", rate: 0.01, basis: "Basic", earn_inclusion: "Basic", status: "Active" },
  { code: "SACCO", name: "Savings / SACCO", rate: 0, basis: "Fixed", earn_inclusion: "Full Value", status: "Active" },
  { code: "GARN", name: "Garnishment / Court Order", rate: 0, basis: "Fixed", earn_inclusion: "Full Value", status: "Active" },
  { code: "ABS", name: "Absenteeism", rate: 0, basis: "Formula", earn_inclusion: "Basic", employee_formula: "DAILYRATE * DAYS", status: "Active" },
  { code: "LATE", name: "Late Reporting", rate: 0, basis: "Fixed", earn_inclusion: "Basic", status: "Active" },
];
