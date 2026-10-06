import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/law-software-zambia",
  title: "Law Firm Management Software Zambia | SifoBooks",
  description: "Law firm management software in Zambia for clients, cases, court dates, time tracking, trust accounts and billing.",
  keywords: "law firm management software, Zambia, SifoBooks, client registry and kyc, cases and court dates, billable time, trust account ledgers",
  eyebrow: "Legal practice management",
  heading: "Law Firm Management Software Zambia",
  intro: "Organise legal matters, billable time, client trust records and invoices in one business system.",
  features: ["client registry and KYC","cases and court dates","billable time","trust account ledgers","retainers","legal billing"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/law-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
