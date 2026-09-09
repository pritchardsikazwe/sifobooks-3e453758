export type PublicToolCategory = "Recruitment" | "Procurement" | "Sales" | "Customer" | "Operations" | "Employee";

export type PublicTool = {
  key: string;
  label: string;
  description: string;
  category: PublicToolCategory;
  path: string;
  audience: string;
  privacy: "public" | "private";
};

/**
 * Canonical catalogue for SifoBooks tools that may expose a controlled public
 * entry point. Public routes must never query private tenant records directly.
 */
export const PUBLIC_TOOLS: PublicTool[] = [
  { key: "job-application", label: "Job Applications", description: "Publish a vacancy and collect candidate applications and CVs.", category: "Recruitment", path: "/apply", audience: "Job applicants", privacy: "public" },
  { key: "supplier-rfq", label: "Supplier RFQ", description: "Invite suppliers to submit quotations against a controlled request.", category: "Procurement", path: "/supplier-rfq", audience: "Suppliers", privacy: "public" },
  { key: "quotation-submission", label: "Quotation Submission", description: "Receive supplier quotation documents for internal comparison.", category: "Procurement", path: "/quotation-submit", audience: "Suppliers", privacy: "public" },
  { key: "invoice-verification", label: "Invoice Verification", description: "Allow a recipient to verify an issued invoice using a secure reference.", category: "Sales", path: "/invoice-verify", audience: "Customers", privacy: "public" },
  { key: "payment-link", label: "Payment Link", description: "Provide a controlled payment entry point without exposing the accounting workspace.", category: "Sales", path: "/pay", audience: "Customers", privacy: "public" },
  { key: "customer-onboarding", label: "Customer Onboarding", description: "Collect customer profile and business information through a controlled form.", category: "Customer", path: "/customer-onboard", audience: "Customers", privacy: "public" },
  { key: "service-request", label: "Service Request", description: "Receive maintenance, support, project or service requests from customers.", category: "Operations", path: "/service-request", audience: "Customers", privacy: "public" },
  { key: "appointment-request", label: "Appointment Request", description: "Collect appointment or consultation requests for internal scheduling.", category: "Operations", path: "/appointment", audience: "Customers", privacy: "public" },
  { key: "employee-self-service", label: "Employee Self-Service", description: "Provide authenticated employees with controlled requests such as leave and timesheets.", category: "Employee", path: "/employee-portal", audience: "Employees", privacy: "private" },
];

export const PUBLIC_TOOL_SECURITY_RULES = [
  "Use opaque, revocable public tokens rather than exposing tenant or record IDs.",
  "Validate that a published resource is active, unexpired and belongs to the tenant before accepting data.",
  "Collect only fields required for the public task; never expose GL, payroll, inventory or other private records.",
  "Scan uploaded files and enforce file type, size and rate limits before processing.",
  "Record submissions and administrative actions in an auditable trail without exposing private audit data publicly.",
  "Keep AI recommendations explainable and advisory; final hiring, purchasing and financial decisions remain with authorised users.",
];
