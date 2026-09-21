export type GovernmentStatus =
  | "CONNECTED" | "CONFIGURED" | "TESTING" | "PENDING_APPROVAL"
  | "MANUAL_WORKFLOW" | "API_NOT_AVAILABLE" | "ERROR" | "DISCONNECTED" | "NOT_CONFIGURED";

export type GovernmentProvider = {
  code: string;
  name: string;
  purpose: string;
  status: GovernmentStatus;
  environment: "TEST" | "PRODUCTION";
  integrationType: "API" | "PORTAL" | "VSDC" | "MANUAL";
  liveApiConfigured: boolean;
  officialUrl: string;
};

export const GOVERNMENT_PROVIDERS: GovernmentProvider[] = [
  { code: "ZRA_VSDC", name: "ZRA Smart Invoice / VSDC", purpose: "Fiscalisation, invoice submission and ZRA item mapping", status: "CONFIGURED", environment: "TEST", integrationType: "VSDC", liveApiConfigured: false, officialUrl: "https://www.zra.org.zm/smart-invoice-learn-more/" },
  { code: "ZRA_ROYALTY", name: "ZRA Mineral Royalty", purpose: "Monthly mineral royalty preparation and reconciliation", status: "MANUAL_WORKFLOW", environment: "TEST", integrationType: "PORTAL", liveApiConfigured: false, officialUrl: "https://www.zra.org.zm/tax-information/" },
  { code: "NAPSA", name: "NAPSA iCARE", purpose: "Employee verification, payroll returns and contribution reconciliation", status: "MANUAL_WORKFLOW", environment: "TEST", integrationType: "API", liveApiConfigured: false, officialUrl: "https://www.napsa.co.zm/" },
  { code: "NHIMA", name: "NHIMA", purpose: "Employer/member records, contributions and returns", status: "MANUAL_WORKFLOW", environment: "TEST", integrationType: "PORTAL", liveApiConfigured: false, officialUrl: "https://www.nhima.co.zm/" },
  { code: "WCFCB", name: "Workers' Compensation", purpose: "Employer compliance, assessment and annual return control", status: "MANUAL_WORKFLOW", environment: "TEST", integrationType: "PORTAL", liveApiConfigured: false, officialUrl: "https://www.workers.com.zm/" },
  { code: "NCC", name: "National Council for Construction", purpose: "Contractor/project registration and certificate tracking", status: "MANUAL_WORKFLOW", environment: "TEST", integrationType: "PORTAL", liveApiConfigured: false, officialUrl: "https://www.ncc.org.zm/" },
];

export type SubmissionStatus =
  | "DRAFT" | "READY" | "VALIDATING" | "QUEUED" | "SUBMITTING"
  | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "FAILED"
  | "RETRY_REQUIRED" | "RECONCILIATION_REQUIRED";

export const SUBMISSION_STATUSES: SubmissionStatus[] = [
  "DRAFT","READY","VALIDATING","QUEUED","SUBMITTING","SUBMITTED",
  "ACCEPTED","REJECTED","FAILED","RETRY_REQUIRED","RECONCILIATION_REQUIRED",
];

export type StatutoryTask = {
  provider: string;
  obligation: string;
  period: string;
  dueDate: string;
  status: "UPCOMING" | "DUE" | "OVERDUE" | "FILED";
};

export function calculateMineralRoyalty(input: {
  value: number;
  rate: number;
  method: "GROSS_VALUE" | "NORM_VALUE";
}) {
  const base = Math.max(0, Number(input.value) || 0);
  const rate = Math.max(0, Number(input.rate) || 0);
  const royalty = Number((base * rate).toFixed(2));
  return { base, rate, royalty, method: input.method };
}

export function integrationLabel(status: GovernmentStatus) {
  return {
    CONNECTED: "Connected",
    CONFIGURED: "Configured",
    TESTING: "Testing",
    PENDING_APPROVAL: "Pending approval",
    MANUAL_WORKFLOW: "Portal / manual workflow",
    API_NOT_AVAILABLE: "API not configured",
    ERROR: "Connection error",
    DISCONNECTED: "Disconnected",
    NOT_CONFIGURED: "Not configured",
  }[status];
}
