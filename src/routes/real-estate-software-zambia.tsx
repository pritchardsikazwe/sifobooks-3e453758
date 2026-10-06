import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/real-estate-software-zambia",
  title: "Real Estate Software Zambia | SifoBooks",
  description: "Real estate software in Zambia for property listings, deals, sales and agent commissions.",
  keywords: "real estate software, Zambia, SifoBooks, property listings, offers and deals, closing records, agent commissions",
  eyebrow: "Real estate CRM & finance",
  heading: "Real Estate Software Zambia",
  intro: "Track property listings, offers, closings and commissions while keeping sales and accounting connected.",
  features: ["property listings","offers and deals","closing records","agent commissions","customer records","sales reporting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/real-estate-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
