import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/logistics-zambia",
  title: "Logistics Management Software Zambia | SifoBooks",
  description: "Logistics management software in Zambia for warehousing, transport and fleet operations.",
  keywords: "logistics management software, Zambia, SifoBooks, warehouse inbound and outbound, transport operations, fleet records, delivery costs",
  eyebrow: "Logistics management",
  heading: "Logistics Management Software Zambia",
  intro: "Connect warehouse movements and transport operations with the accounting and reporting layer.",
  features: ["warehouse inbound and outbound","transport operations","fleet records","delivery costs","inventory","accounting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/logistics-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
