import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/consultancy-zambia",
  title: "Consultancy Management Software Zambia | SifoBooks",
  description: "Consultancy management software in Zambia for clients, engagements, billable time, retainers and invoicing.",
  keywords: "consultancy management software, Zambia, SifoBooks, client registry, project engagements, billable time, retainers",
  eyebrow: "Consultancy business management",
  heading: "Consultancy Management Software Zambia",
  intro: "Track client engagements and billable work while turning approved work into invoices and financial reports.",
  features: ["client registry","project engagements","billable time","retainers","invoices","profitability reporting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/consultancy-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
