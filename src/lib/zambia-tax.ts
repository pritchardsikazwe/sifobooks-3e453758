// Zambia statutory reference — configurable rates & rules used across SifoBooks.
// These are indicative and should be verified against current ZRA/NAPSA/NHIMA guidance.

export const ZAMBIA_TAX_YEAR = 2026;

/** PAYE monthly bands (ZMW). Configurable in Payroll settings. */
export const PAYE_BANDS_MONTHLY = [
  { upTo: 5100,   rate: 0.00, label: "K0 – K5,100" },
  { upTo: 7100,   rate: 0.20, label: "K5,101 – K7,100" },
  { upTo: 9200,   rate: 0.30, label: "K7,101 – K9,200" },
  { upTo: Infinity, rate: 0.37, label: "Above K9,200" },
];

export const NAPSA = { employeeRate: 0.05, employerRate: 0.05, monthlyCeiling: 32438.40 };
export const NHIMA = { employeeRate: 0.01, employerRate: 0.01 };
export const SDL   = { rate: 0.005, base: "gross payroll" };
export const WCF   = { rateDefault: 0.015, base: "gross payroll", note: "Sector-specific; verify with WCFCB." };

export const VAT = { standard: 0.16, zeroRated: 0.00, exempt: null as null | number };
export const TURNOVER_TAX = { rate: 0.05, thresholdAnnual: 800000, note: "Businesses not registered for VAT." };
export const WHT = {
  rent: 0.10, dividends: 0.15, interest: 0.15, management: 0.15,
  royalties: 0.15, commissions: 0.15, publicEnt: 0.15,
};
export const INCOME_TAX = {
  companyStandard: 0.30, mining: 0.30, mobileOperators: 0.35,
  farming: 0.10, exportOfNonTraditional: 0.15,
};

/** Filing calendar — day of the month each return is due. */
export const FILING_CALENDAR = [
  { body: "NAPSA",   obligation: "Employer & employee contributions", frequency: "Monthly", dueDay: 10 },
  { body: "NHIMA",   obligation: "Health insurance contributions",    frequency: "Monthly", dueDay: 10 },
  { body: "ZRA",     obligation: "PAYE return & remittance",          frequency: "Monthly", dueDay: 14 },
  { body: "ZRA",     obligation: "VAT return (VAT 3)",                frequency: "Monthly", dueDay: 18 },
  { body: "ZRA",     obligation: "Withholding tax return",            frequency: "Monthly", dueDay: 14 },
  { body: "ZRA",     obligation: "Turnover tax return",               frequency: "Monthly", dueDay: 14 },
  { body: "TEVETA",  obligation: "Skills Development Levy",           frequency: "Monthly", dueDay: 20 },
  { body: "ZRA",     obligation: "Provisional Income Tax return",     frequency: "Quarterly", dueDay: 10 },
  { body: "ZRA",     obligation: "Annual Income Tax return (ITF12)",  frequency: "Annual",  dueDay: 30 /* June */ },
  { body: "WCFCB",   obligation: "Workers' comp assessment return",   frequency: "Annual",  dueDay: 31 /* March */ },
  { body: "PACRA",   obligation: "Annual return & B.O. filing",       frequency: "Annual",  dueDay: 30 },
];

/** Official portals & filing URLs. */
export const PORTALS = [
  { name: "ZRA TaxOnline",   url: "https://taxonline.zra.org.zm",                 purpose: "PAYE, VAT, WHT, TOT, Income Tax filing" },
  { name: "ZRA Smart Invoice", url: "https://smartinvoice.zra.org.zm",            purpose: "e-invoicing / fiscalisation" },
  { name: "NAPSA e-Services", url: "https://eservices.napsa.co.zm",               purpose: "Employer contribution schedules" },
  { name: "NHIMA Portal",     url: "https://portal.nhima.co.zm",                  purpose: "Health insurance contributions" },
  { name: "PACRA Online",     url: "https://onlineservices.pacra.org.zm",         purpose: "Annual returns & beneficial ownership" },
  { name: "WCFCB",            url: "https://www.workers.gov.zm",                  purpose: "Workers' compensation" },
  { name: "TEVETA",           url: "https://www.teveta.org.zm",                   purpose: "Skills Development Levy" },
];

export type PayeInput = { taxable: number };
export function computePAYE({ taxable }: PayeInput): number {
  let tax = 0, prev = 0;
  for (const band of PAYE_BANDS_MONTHLY) {
    const top = Math.min(taxable, band.upTo);
    if (top > prev) tax += (top - prev) * band.rate;
    prev = band.upTo;
    if (taxable <= band.upTo) break;
  }
  return +tax.toFixed(2);
}
