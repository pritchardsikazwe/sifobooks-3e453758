import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/insurance-zambia",
  title: "Insurance Broker Software Zambia | SifoBooks",
  description: "Insurance broker software in Zambia for policies, commissions and claims tracking.",
  keywords: "insurance broker software, Zambia, SifoBooks, policy registry, commission tracking, claims tracking, client records",
  eyebrow: "Insurance broker management",
  heading: "Insurance Broker Software Zambia",
  intro: "Keep policy records, commission income and claims activity organised with connected business accounting.",
  features: ["policy registry","commission tracking","claims tracking","client records","invoicing","financial reporting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/insurance-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
