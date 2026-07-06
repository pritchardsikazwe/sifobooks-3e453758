export type StatutoryBody = {
  code: string;
  name: string;
  full: string;
  obligations: string[];
  frequency: "monthly" | "quarterly" | "annual" | "as-needed";
  dueDay: number; // day of month the filing is due
  color: string; // tailwind class
};

// Zambia-focused statutory bodies (10+ covered)
export const STATUTORY_BODIES: StatutoryBody[] = [
  { code: "ZRA",     name: "ZRA",     full: "Zambia Revenue Authority",           obligations: ["VAT Return", "PAYE", "Income Tax", "Withholding Tax", "Turnover Tax"], frequency: "monthly",   dueDay: 18, color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { code: "NAPSA",   name: "NAPSA",   full: "National Pension Scheme Authority",   obligations: ["Employer Contribution"],                                              frequency: "monthly",   dueDay: 10, color: "bg-blue-100 text-blue-800 border-blue-200" },
  { code: "NHIMA",   name: "NHIMA",   full: "National Health Insurance Management",obligations: ["Health Insurance Contribution"],                                      frequency: "monthly",   dueDay: 10, color: "bg-teal-100 text-teal-800 border-teal-200" },
  { code: "WCFCB",   name: "WCFCB",   full: "Workers' Compensation Fund",          obligations: ["Assessment Return", "Annual Levy"],                                   frequency: "annual",    dueDay: 31, color: "bg-orange-100 text-orange-800 border-orange-200" },
  { code: "PACRA",   name: "PACRA",   full: "Patents & Companies Registration",    obligations: ["Annual Return", "Beneficial Ownership"],                              frequency: "annual",    dueDay: 30, color: "bg-purple-100 text-purple-800 border-purple-200" },
  { code: "ZPPA",    name: "ZPPA",    full: "Zambia Public Procurement Authority", obligations: ["Supplier Registration Renewal"],                                      frequency: "annual",    dueDay: 30, color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { code: "COUNCIL", name: "Council", full: "Local Council Business Levies",       obligations: ["Business Levy", "Signage & Fire Levy"],                               frequency: "annual",    dueDay: 31, color: "bg-slate-100 text-slate-800 border-slate-200" },
  { code: "TEVETA",  name: "TEVETA",  full: "Technical Education & Vocational",    obligations: ["Skills Development Levy"],                                            frequency: "monthly",   dueDay: 20, color: "bg-amber-100 text-amber-800 border-amber-200" },
  { code: "ZICTA",   name: "ZICTA",   full: "Zambia ICT Authority",                obligations: ["Annual Licence Fee"],                                                 frequency: "annual",    dueDay: 31, color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  { code: "ERB",     name: "ERB",     full: "Energy Regulation Board",             obligations: ["Annual Licence Fee"],                                                 frequency: "annual",    dueDay: 31, color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { code: "ZEMA",    name: "ZEMA",    full: "Zambia Environmental Mgmt Agency",    obligations: ["EIA / Compliance Report"],                                            frequency: "quarterly", dueDay: 15, color: "bg-lime-100 text-lime-800 border-lime-200" },
  { code: "IMMIG",   name: "Immig.",  full: "Immigration Department",              obligations: ["Work Permit Renewals"],                                               frequency: "as-needed", dueDay: 1,  color: "bg-rose-100 text-rose-800 border-rose-200" },
];

export const bodyByCode = (code: string) =>
  STATUTORY_BODIES.find(b => b.code === code);
