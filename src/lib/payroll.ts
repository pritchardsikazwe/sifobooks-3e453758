// Zambian payroll calculations.
// PAYE 2024/2025 monthly bands (ZMW):
//   0 - 5,100          → 0%
//   5,101 - 7,100      → 20%
//   7,101 - 9,200      → 30%
//   above 9,200        → 37%
// NAPSA: 5% of gross, capped at K1,342.40/month (2024 ceiling).
// NHIMA: 1% of basic salary (employee contribution).

export type PayeBand = { upTo: number | null; rate: number };

export const DEFAULT_PAYE_BANDS: PayeBand[] = [
  { upTo: 5100, rate: 0 },
  { upTo: 7100, rate: 0.20 },
  { upTo: 9200, rate: 0.30 },
  { upTo: null, rate: 0.37 },
];

export const NAPSA_RATE = 0.05;
export const NAPSA_CAP = 1342.40;
export const NHIMA_RATE = 0.01;
// Employer statutory contributions (Zambia)
export const WCF_RATE = 0.015;   // Workers' Compensation Fund — 1.5% of gross (employer)
export const SDL_RATE = 0.005;   // Skills Development Levy — 0.5% of gross (employer)

export function calcWcf(gross: number): number { return round2(gross * WCF_RATE); }
export function calcSdl(gross: number): number { return round2(gross * SDL_RATE); }
/** Total employer cost on top of net pay: employer NAPSA match + WCF + SDL. */
export function calcEmployerOncost(gross: number): number {
  return round2(calcNapsa(gross) + calcWcf(gross) + calcSdl(gross));
}

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

export function calcNapsa(gross: number): number {
  return round2(Math.min(gross * NAPSA_RATE, NAPSA_CAP));
}

export function calcNhima(basic: number): number {
  return round2(basic * NHIMA_RATE);
}

export type EarningLine = { label: string; amount: number };
export type DeductionLine = { label: string; amount: number };

export type PayslipInput = {
  basic: number;
  utility_allowance?: number;
  housing_allowance?: number;
  transport_allowance?: number;
  overtime?: number;
  shift_differential?: number;
  bonus?: number;
  other_earnings?: EarningLine[];
  // deductions
  loan_recovery?: number;
  advances?: number;
  absentism?: number;
  late_reporting?: number;
  other_deductions?: DeductionLine[];
  // toggles
  napsa_applies?: boolean;   // default true
  nhima_applies?: boolean;   // default true
  paye_applies?: boolean;    // default true
};

export type PayslipComputed = {
  earnings: EarningLine[];
  deductions: DeductionLine[];
  gross: number;
  taxable: number;
  paye: number;
  napsa: number;
  nhima: number;
  total_deductions: number;
  net: number;
};

/**
 * Compute a Zambian payslip.
 * Housing allowance up to 30% of basic is tax-exempt (common practice);
 * we treat only Basic + Overtime + Shift Diff + Bonus + Other as taxable.
 * Utility, Housing and Transport allowances are treated as non-taxable by default.
 * Consumers can override by moving figures into `other_earnings` (which are taxable).
 */
export function computePayslip(i: PayslipInput): PayslipComputed {
  const basic = num(i.basic);
  const overtime = num(i.overtime);
  const shift = num(i.shift_differential);
  const bonus = num(i.bonus);
  const utility = num(i.utility_allowance);
  const housing = num(i.housing_allowance);
  const transport = num(i.transport_allowance);
  const otherEarnings = (i.other_earnings ?? []).filter(l => num(l.amount) !== 0);

  const earnings: EarningLine[] = [
    { label: "Basic Pay", amount: basic },
    ...(utility ? [{ label: "Utility Allowance", amount: utility }] : []),
    ...(housing ? [{ label: "Housing Allowance", amount: housing }] : []),
    ...(transport ? [{ label: "Transport Allowance", amount: transport }] : []),
    ...(overtime ? [{ label: "Overtime", amount: overtime }] : []),
    ...(shift ? [{ label: "Shift Differential", amount: shift }] : []),
    ...(bonus ? [{ label: "Bonus", amount: bonus }] : []),
    ...otherEarnings,
  ];

  const gross = round2(earnings.reduce((s, l) => s + num(l.amount), 0));

  // Taxable pay: everything except explicit non-taxable allowances (utility/housing/transport
  // fields). Custom "other_earnings" ARE taxable.
  const taxable = round2(basic + overtime + shift + bonus + otherEarnings.reduce((s, l) => s + num(l.amount), 0));

  const paye = i.paye_applies === false ? 0 : calcPaye(taxable);
  const napsa = i.napsa_applies === false ? 0 : calcNapsa(gross);
  const nhima = i.nhima_applies === false ? 0 : calcNhima(basic);

  const loan = num(i.loan_recovery);
  const adv = num(i.advances);
  const abs = num(i.absentism);
  const late = num(i.late_reporting);
  const otherDeds = (i.other_deductions ?? []).filter(l => num(l.amount) !== 0);

  const deductions: DeductionLine[] = [
    ...(paye ? [{ label: "PAYE", amount: paye }] : []),
    ...(napsa ? [{ label: "NAPSA", amount: napsa }] : []),
    ...(nhima ? [{ label: "NHIMA", amount: nhima }] : []),
    ...(abs ? [{ label: "Absentism", amount: abs }] : []),
    ...(late ? [{ label: "Late Reporting", amount: late }] : []),
    ...(adv ? [{ label: "Advances", amount: adv }] : []),
    ...(loan ? [{ label: "Loan Recovery", amount: loan }] : []),
    ...otherDeds,
  ];

  const total_deductions = round2(deductions.reduce((s, l) => s + num(l.amount), 0));
  const net = round2(gross - total_deductions);

  return { earnings, deductions, gross, taxable, paye, napsa, nhima, total_deductions, net };
}

function num(v: any) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function round2(n: number) { return Math.round(n * 100) / 100; }
