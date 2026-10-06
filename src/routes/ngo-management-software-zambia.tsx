import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/ngo-management-software-zambia",
  title: "NGO Management Software Zambia | SifoBooks",
  description: "NGO management software in Zambia for donors, grants, projects, M&E, workshops, imprest and fixed assets.",
  keywords: "ngo management software, Zambia, SifoBooks, donor registry, grants and donor funds, project budgets, monitoring and evaluation",
  eyebrow: "NGO & nonprofit management",
  heading: "NGO Management Software Zambia",
  intro: "Manage donor-funded projects, grants, programme costs and financial controls from one workspace.",
  features: ["donor registry","grants and donor funds","project budgets","monitoring and evaluation","workshops and allowances","imprest and fixed assets"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/ngo-management-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
