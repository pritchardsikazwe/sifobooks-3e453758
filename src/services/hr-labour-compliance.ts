export type LabourRequirement = {
  code: string;
  name: string;
  authority: string;
  legalReference: string;
  frequency: string;
  description: string;
};

export const ZAMBIA_LABOUR_REQUIREMENTS: LabourRequirement[] = [
  { code: "EMPLOYER_REGISTRATION", name: "Employer registration / labour records", authority: "MLSS", legalReference: "Employment Code Act No. 3 of 2019", frequency: "ongoing", description: "Maintain employer registration and employment records required by the Labour Commissioner." },
  { code: "WRITTEN_CONTRACT", name: "Written employment contracts", authority: "MLSS", legalReference: "Employment Code Act, sections 22–25 and Second Schedule", frequency: "on engagement", description: "Ensure contracts contain the statutory minimum particulars and are kept with employee records." },
  { code: "CONTRACT_ATTESTATION", name: "Contract attestation", authority: "MLSS", legalReference: "MLSS contract attestation guidance", frequency: "on engagement", description: "Track submission/attestation status for applicable non-unionised contracts." },
  { code: "PAYSLIPS", name: "Payslips", authority: "MLSS", legalReference: "Employment Code Act, section 105", frequency: "monthly", description: "Issue a compliant payslip for each pay period." },
  { code: "MINIMUM_WAGE", name: "Minimum wage check", authority: "MLSS", legalReference: "Applicable Minimum Wages and Conditions of Employment instruments", frequency: "monthly", description: "Flag remuneration below the applicable statutory minimum for the worker category." },
  { code: "EMPLOYMENT_POLICIES", name: "Employment policies and procedures", authority: "MLSS", legalReference: "Employment Code Act, section 95", frequency: "annual review", description: "Maintain employment policy/procedure, code of conduct, grievance, harassment and health/wellness controls as applicable." },
  { code: "LABOUR_STATISTICS", name: "Labour statistics submission", authority: "MLSS", legalReference: "Employment Code Act and MLSS labour statistics guidance", frequency: "as prescribed", description: "Track the employer's required labour statistics submissions and evidence." },
  { code: "WORKERS_COMP", name: "Workers' Compensation", authority: "Workers' Compensation Fund Control Board", legalReference: "Workers' Compensation Act", frequency: "annual / ongoing", description: "Track registration, assessment and workplace incident obligations." },
  { code: "NATIONAL_PENSION", name: "NAPSA membership", authority: "NAPSA", legalReference: "National Pension Scheme Act", frequency: "monthly", description: "Validate employee membership numbers and payroll contribution processing." },
  { code: "HEALTH_INSURANCE", name: "NHIMA membership", authority: "NHIMA", legalReference: "National Health Insurance Act", frequency: "monthly", description: "Validate membership numbers and payroll contribution processing." },
];

export function getLabourRequirement(code: string) {
  return ZAMBIA_LABOUR_REQUIREMENTS.find((r) => r.code === code);
}
