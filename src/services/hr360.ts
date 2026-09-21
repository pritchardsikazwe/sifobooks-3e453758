export const HR_DOCUMENT_TYPES = [
 "nrc","contract","qualification","bank_details","napsa","nhima","medical","training","disciplinary","policy","termination","other"
] as const;

export const ONBOARDING_TASKS = [
 ["EMPLOYEE_FILE","Complete employee master file"],["CONTRACT","Sign employment contract"],["STATUTORY","Capture NAPSA/NHIMA details"],
 ["BANK","Verify payroll bank details"],["POLICIES","Acknowledge required HR policies"],["ORIENTATION","Complete induction/orientation"]
] as const;

export const LABOUR_CONTROL_MATRIX = [
 {code:"WRITTEN_CONTRACT",label:"Written contract",area:"Contract",severity:"high"},
 {code:"CONTRACT_ATTESTATION",label:"Applicable contract attestation",area:"Contract",severity:"high"},
 {code:"MINIMUM_WAGE",label:"Applicable minimum wage",area:"Payroll",severity:"high"},
 {code:"PAYSLIPS",label:"Payslip issued",area:"Payroll",severity:"medium"},
 {code:"LEAVE_RECORDS",label:"Leave records maintained",area:"People",severity:"medium"},
 {code:"WORKERS_COMP",label:"Workers' Compensation controls",area:"Safety",severity:"high"},
 {code:"NATIONAL_PENSION",label:"NAPSA records",area:"Statutory",severity:"high"},
 {code:"HEALTH_INSURANCE",label:"NHIMA records",area:"Statutory",severity:"high"}
] as const;

export function contractMerge(template:string, values:Record<string,string|number|null|undefined>) {
 return template.replace(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g, (_,key)=>String(values[key] ?? ""));
}
