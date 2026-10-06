import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/mining-zambia",
  title: "Mining Management Software Zambia | SifoBooks",
  description: "Mining management software in Zambia for production, equipment, royalties, stores and cost control.",
  keywords: "mining management software, Zambia, SifoBooks, production records, heavy equipment, fuel and consumables, mineral royalties",
  eyebrow: "Mining ERP",
  heading: "Mining Management Software Zambia",
  intro: "Connect mining production, equipment and royalty controls with stores and financial reporting.",
  features: ["production records","heavy equipment","fuel and consumables","mineral royalties","cost centres","mining reports"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/mining-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
