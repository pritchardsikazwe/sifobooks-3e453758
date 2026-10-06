import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/construction-software-zambia",
  title: "Construction Management Software Zambia | SifoBooks",
  description: "Construction management software in Zambia for projects, BOQs, progress certificates, materials and labour.",
  keywords: "construction management software, Zambia, SifoBooks, projects and sites, bill of quantities, progress certificates, site materials",
  eyebrow: "Construction project management",
  heading: "Construction Management Software Zambia",
  intro: "Connect construction project controls, materials and labour with progress billing and financial reporting.",
  features: ["projects and sites","bill of quantities","progress certificates","site materials","site labour","project costing"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/construction-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
