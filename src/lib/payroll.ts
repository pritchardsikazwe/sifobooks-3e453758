// ============================================================
// Zambian Payroll Engine — SifoBooks
// Inspired by FlexPayroll and Harvester Payroll (Zambia)
//
// Statutory (2025/26 monthly bands):
//   PAYE:
//     0        – 5,100   → 0%
//     5,101    – 7,100   → 20%
//     7,101    – 9,200   → 30%
//     above 9,200        → 37%
//   NAPSA: 5% of gross, capped at ZMW 1,650.60/month (2025).
//         Employer matches the same amount.
//   NHIMA: 1% of basic (employee) + 1% employer.
//   WCF: 1.5% of gross (employer only).
//   SDL: 0.5% of gross (employer only).
// ============================================================

export type PayeBand = { upTo: number | null; rate: number };

export const DEFAULT_PAYE_BANDS: PayeBand[] = [
  { upTo: 5100, rate: 0 },
  { upTo: 7100, rate: 0.20 },
  { upTo: 9200, rate: 0.30 },
  { upTo: null, rate: 0.37 },
];

export const NAPSA_RATE = 0.05;
/** 2025 NAPSA monthly ceiling on the employee contribution (K1,708.20). */
export const NAPSA_CAP = 1708.20;
export const NHIMA_RATE = 0.01;
export const WCF_RATE = 0.015;
export const SDL_RATE = 0.005;
/** Housing allowance exempt up to this % of basic (ZRA practice). */
export const HOUSING_EXEMPT_PCT = 0.30;
/** Standard working hours per month for hourly conversion. */
export const STD_HOURS_PER_MONTH = 176;
export const OVERTIME_WEEKDAY = 1.5;
export const OVERTIME_WEEKEND = 2.0;
export const OVERTIME_HOLIDAY = 2.0;

export function calcPaye(taxable: number, bands: PayeBand[] = DEFAULT_PAYE_BANDS): number {
  if (taxable <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const b of bands) {
    const ceil = b.upTo ?? Infinity;
    const slice = Math.max(0, Math.min(taxable, ceil) - prev);
    tax += slice * b.rate;
    prev = ceil;
    if (taxable <= ceil) break;
  }
  return round2(tax);
}
export function calcNapsa(gross: number): number { return round2(Math.min(gross * NAPSA_RATE, NAPSA_CAP)); }
export function calcNhima(basic: number): number { return round2(basic * NHIMA_RATE); }
export function calcWcf(gross: number): number { return round2(gross * WCF_RATE); }
export function calcSdl(gross: number): number { return round2(gross * SDL_RATE); }
/** Total employer cost on top of net pay: employer NAPSA match + employer NHIMA + WCF + SDL. */
export function calcEmployerOncost(gross: number, basic: number): number {
  return round2(calcNapsa(gross) + calcNhima(basic) + calcWcf(gross) + calcSdl(gross));
}

/** Hourly rate derived from monthly basic. */
export function hourlyRate(basic: number, stdHours = STD_HOURS_PER_MONTH): number {
  if (!basic || !stdHours) return 0;
  return round2(basic / stdHours);
}
/** Pro-rata basic when an employee joined/exited mid-month. */
export function proRata(basic: number, daysWorked: number, daysInMonth: number): number {
  if (!daysInMonth) return basic;
  return round2((basic * daysWorked) / daysInMonth);
}
/** Zambian gratuity: usually 25% of total contract basic pay at end of fixed-term contract. */
export function calcGratuity(monthlyBasic: number, months: number, pct = 0.25): number {
  return round2(monthlyBasic * months * pct);
}
/** Leave pay: (basic / working-days-per-month) × leave days accrued. */
export function calcLeavePay(basic: number, leaveDays: number, workingDaysPerMonth = 22): number {
  return round2((basic / workingDaysPerMonth) * leaveDays);
}
/** Statutory notice pay (1 month basic per year of service, common Zambia practice). */
export function calcNoticePay(monthlyBasic: number, monthsNotice = 1): number {
  return round2(monthlyBasic * monthsNotice);
}
/** Repatriation allowance — 2 days basic per year of service (ETA guidance). */
export function calcRepatriation(dailyRate: number, yearsService: number, daysPerYear = 2): number {
  return round2(dailyRate * daysPerYear * yearsService);
}

export type EarningLine = { label: string; amount: number; taxable?: boolean };
export type DeductionLine = { label: string; amount: number };
export type LoanSchedule = { principal: number; installment: number; balance: number };

export type PayslipInput = {
  basic: number;
  utility_allowance?: number;
  housing_allowance?: number;
  transport_allowance?: number;
  overtime?: number;
  shift_differential?: number;
  bonus?: number;
  commission?: number;
  backpay?: number;
  leave_pay?: number;
  gratuity?: number;
  acting_allowance?: number;
  responsibility_allowance?: number;
  other_earnings?: EarningLine[];
  // deductions
  loan_recovery?: number;
  advances?: number;
  absentism?: number;
  late_reporting?: number;
  union_dues?: number;
  garnishment?: number;
  savings?: number;
  other_deductions?: DeductionLine[];
  // toggles
  napsa_applies?: boolean;
  nhima_applies?: boolean;
  paye_applies?: boolean;
  /** Override housing exemption percentage (default 30%). */
  housing_exempt_pct?: number;
};

export type PayslipComputed = {
  earnings: EarningLine[];
  deductions: DeductionLine[];
  gross: number;
  taxable: number;
  paye: number;
  napsa: number;
  nhima: number;
  wcf: number;
  sdl: number;
  employer_napsa: number;
  employer_oncost: number;
  total_deductions: number;
  net: number;
};

/**
 * Compute a Zambian payslip.
 * - Housing allowance is exempt up to `housing_exempt_pct` of basic (default 30%);
 *   the excess is added to taxable pay.
 * - Utility and transport allowances are non-taxable by default.
 * - Bonuses, commissions, backpay, gratuity, acting/responsibility allowances,
 *   overtime, shift differential and any `other_earnings` are fully taxable.
 */
export function computePayslip(i: PayslipInput): PayslipComputed {
  const basic = num(i.basic);
  const overtime = num(i.overtime);
  const shift = num(i.shift_differential);
  const bonus = num(i.bonus);
  const commission = num(i.commission);
  const backpay = num(i.backpay);
  const leavePay = num(i.leave_pay);
  const gratuity = num(i.gratuity);
  const acting = num(i.acting_allowance);
  const responsibility = num(i.responsibility_allowance);
  const utility = num(i.utility_allowance);
  const housing = num(i.housing_allowance);
  const transport = num(i.transport_allowance);
  const otherEarnings = (i.other_earnings ?? []).filter(l => num(l.amount) !== 0);

  const exemptPct = i.housing_exempt_pct ?? HOUSING_EXEMPT_PCT;
  const housingExempt = Math.min(housing, basic * exemptPct);
  const housingTaxable = Math.max(0, housing - housingExempt);

  const earnings: EarningLine[] = [
    { label: "Basic Pay", amount: basic, taxable: true },
    ...(utility ? [{ label: "Utility Allowance", amount: utility, taxable: false }] : []),
    ...(housing ? [{ label: "Housing Allowance", amount: housing, taxable: housingTaxable > 0 }] : []),
    ...(transport ? [{ label: "Transport Allowance", amount: transport, taxable: false }] : []),
    ...(overtime ? [{ label: "Overtime", amount: overtime, taxable: true }] : []),
    ...(shift ? [{ label: "Shift Differential", amount: shift, taxable: true }] : []),
    ...(acting ? [{ label: "Acting Allowance", amount: acting, taxable: true }] : []),
    ...(responsibility ? [{ label: "Responsibility Allowance", amount: responsibility, taxable: true }] : []),
    ...(commission ? [{ label: "Commission", amount: commission, taxable: true }] : []),
    ...(bonus ? [{ label: "Bonus", amount: bonus, taxable: true }] : []),
    ...(backpay ? [{ label: "Backpay / Arrears", amount: backpay, taxable: true }] : []),
    ...(leavePay ? [{ label: "Leave Pay", amount: leavePay, taxable: true }] : []),
    ...(gratuity ? [{ label: "Gratuity", amount: gratuity, taxable: true }] : []),
    ...otherEarnings.map(l => ({ ...l, taxable: l.taxable ?? true })),
  ];

  const gross = round2(earnings.reduce((s, l) => s + num(l.amount), 0));

  const taxable = round2(
    basic + overtime + shift + bonus + commission + backpay + leavePay + gratuity +
    acting + responsibility + housingTaxable +
    otherEarnings.filter(l => (l.taxable ?? true)).reduce((s, l) => s + num(l.amount), 0)
  );

  const paye = i.paye_applies === false ? 0 : calcPaye(taxable);
  const napsa = i.napsa_applies === false ? 0 : calcNapsa(gross);
  const nhima = i.nhima_applies === false ? 0 : calcNhima(basic);
  const wcf = calcWcf(gross);
  const sdl = calcSdl(gross);
  const employer_napsa = napsa;
  const employer_oncost = round2(employer_napsa + nhima + wcf + sdl);

  const loan = num(i.loan_recovery);
  const adv = num(i.advances);
  const abs = num(i.absentism);
  const late = num(i.late_reporting);
  const union = num(i.union_dues);
  const garn = num(i.garnishment);
  const savings = num(i.savings);
  const otherDeds = (i.other_deductions ?? []).filter(l => num(l.amount) !== 0);

  const deductions: DeductionLine[] = [
    ...(paye ? [{ label: "PAYE", amount: paye }] : []),
    ...(napsa ? [{ label: "NAPSA (5%)", amount: napsa }] : []),
    ...(nhima ? [{ label: "NHIMA (1%)", amount: nhima }] : []),
    ...(abs ? [{ label: "Absenteeism", amount: abs }] : []),
    ...(late ? [{ label: "Late Reporting", amount: late }] : []),
    ...(union ? [{ label: "Union Dues", amount: union }] : []),
    ...(garn ? [{ label: "Garnishment", amount: garn }] : []),
    ...(adv ? [{ label: "Salary Advance", amount: adv }] : []),
    ...(loan ? [{ label: "Loan Recovery", amount: loan }] : []),
    ...(savings ? [{ label: "Savings / Sacco", amount: savings }] : []),
    ...otherDeds,
  ];

  const total_deductions = round2(deductions.reduce((s, l) => s + num(l.amount), 0));
  const net = round2(gross - total_deductions);

  return {
    earnings, deductions,
    gross, taxable, paye, napsa, nhima, wcf, sdl,
    employer_napsa, employer_oncost,
    total_deductions, net,
  };
}

function num(v: any) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function round2(n: number) { return Math.round(n * 100) / 100; }

// ---------------------------------------------------------------
// Net-to-Basic solver: given a target NET, solve for the BASIC pay
// such that computePayslip(basic, …opts) yields (approx) the net.
// Uses bisection — deterministic and works with the piece-wise PAYE.
// ---------------------------------------------------------------
export type NetToBasicOpts = Omit<PayslipInput, "basic"> & { tolerance?: number; maxIterations?: number };
export function solveBasicFromNet(targetNet: number, opts: NetToBasicOpts = {}): { basic: number; result: PayslipComputed } {
  const tol = opts.tolerance ?? 0.01;
  const maxIt = opts.maxIterations ?? 60;
  let lo = 0, hi = Math.max(targetNet * 2, 5000);
  // Grow upper bound until net(hi) >= target
  for (let i = 0; i < 20; i++) {
    const r = computePayslip({ ...opts, basic: hi });
    if (r.net >= targetNet) break;
    hi *= 2;
  }
  let mid = lo, result = computePayslip({ ...opts, basic: lo });
  for (let i = 0; i < maxIt; i++) {
    mid = (lo + hi) / 2;
    result = computePayslip({ ...opts, basic: mid });
    if (Math.abs(result.net - targetNet) <= tol) break;
    if (result.net < targetNet) lo = mid; else hi = mid;
  }
  return { basic: round2(mid), result };
}

