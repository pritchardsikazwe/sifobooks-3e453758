import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/wholesale-zambia",
  title: "Wholesale Distribution Software Zambia | SifoBooks",
  description: "Wholesale distribution software in Zambia for bulk orders, warehouse stock, sales agents and route operations.",
  keywords: "wholesale distribution software, Zambia, SifoBooks, warehouse stock, bulk orders, sales agents, routes",
  eyebrow: "Wholesale & distribution ERP",
  heading: "Wholesale Distribution Software Zambia",
  intro: "Manage bulk sales, warehouse inventory and sales-agent activity from one connected business system.",
  features: ["warehouse stock","bulk orders","sales agents","routes","customer accounts","sales and accounting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/wholesale-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
