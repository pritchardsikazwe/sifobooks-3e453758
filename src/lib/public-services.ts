export type PublicServiceCategory = "Procurement" | "Sales" | "HR" | "Customer" | "Operations";

export type PublicService = {
  key: string;
  label: string;
  description: string;
  category: PublicServiceCategory;
  audience: string;
  path: string;
  requiresCompanyContext: boolean;
};

/** Public-facing tools intentionally expose forms/workflows, not private accounting data. */
export const PUBLIC_SERVICES: PublicService[] = [
  { key: "job-application", label: "Job Applications", description: "Apply for a published vacancy using a secure public form.", category: "HR", audience: "Applicants", path: "/public/jobs", requiresCompanyContext: true },
  { key: "job-listings", label: "Public Jobs", description: "Publish selected company vacancies with shareable links.", category: "HR", audience: "Applicants", path: "/public/jobs", requiresCompanyContext: true },
  { key: "supplier-quotation", label: "Supplier Quotation Submission", description: "Invite suppliers to submit quotations against a procurement request.", category: "Procurement", audience: "Suppliers", path: "/public/supplier-quotations", requiresCompanyContext: true },
  { key: "quotation-request", label: "Request a Quotation", description: "Collect customer or supplier quotation requests through a public form.", category: "Procurement", audience: "Customers / Suppliers", path: "/public/quotation-request", requiresCompanyContext: true },
  { key: "invoice-view", label: "Invoice / Document Link", description: "Allow an external recipient to securely view a shared document.", category: "Sales", audience: "Customers", path: "/public/document", requiresCompanyContext: true },
  { key: "payment-request", label: "Payment Request", description: "Present a secure payment request linked to a published document.", category: "Sales", audience: "Customers", path: "/public/payment", requiresCompanyContext: true },
  { key: "customer-statement", label: "Customer Statement", description: "Share a controlled statement view with a customer.", category: "Customer", audience: "Customers", path: "/public/statement", requiresCompanyContext: true },
  { key: "product-catalogue", label: "Product Catalogue", description: "Publish selected products and prices without exposing the accounting workspace.", category: "Sales", audience: "Customers", path: "/public/catalogue", requiresCompanyContext: true },
  { key: "qr-menu", label: "QR Menu / Ordering", description: "Publish a restaurant menu and collect orders through a public experience.", category: "Sales", audience: "Guests", path: "/public/menu", requiresCompanyContext: true },
  { key: "service-request", label: "Service Request", description: "Collect support, maintenance or service requests from external users.", category: "Operations", audience: "Customers / Public", path: "/public/service-request", requiresCompanyContext: true },
];

export const PUBLIC_SERVICE_KEYS = new Set(PUBLIC_SERVICES.map(service => service.key));
