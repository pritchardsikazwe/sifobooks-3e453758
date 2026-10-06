import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/property-zambia",
  title: "Property Management Software Zambia | SifoBooks",
  description: "Property management software in Zambia for properties, tenants, leases, rent collection, deposits and maintenance.",
  keywords: "property management software, Zambia, SifoBooks, property and unit registry, tenant records, lease agreements, rent invoicing and collection",
  eyebrow: "Property & tenancy management",
  heading: "Property Management Software Zambia",
  intro: "Manage rental properties, tenant records, lease agreements and rent collections with connected accounting.",
  features: ["property and unit registry","tenant records","lease agreements","rent invoicing and collection","tenant deposits","maintenance requests"],
  related: [{"path":"/hotel-management-software-zambia","label":"Hotel Management Software"},{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/property-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
