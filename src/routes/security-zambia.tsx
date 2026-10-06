import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/security-zambia",
  title: "Security Company Software Zambia | SifoBooks",
  description: "Security company software in Zambia for guarded sites, guards, rosters, deployments and contracts.",
  keywords: "security company software, Zambia, SifoBooks, guarded sites, guard records, rosters and deployment, client contracts",
  eyebrow: "Security company management",
  heading: "Security Company Software Zambia",
  intro: "Coordinate guard deployment and client contracts while keeping payroll and billing connected.",
  features: ["guarded sites","guard records","rosters and deployment","client contracts","billing","payroll"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/security-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
