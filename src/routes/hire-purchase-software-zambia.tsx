import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/hire-purchase-software-zambia",
  title: "Hire Purchase Software Zambia | SifoBooks",
  description: "Hire purchase software in Zambia for instalment contracts, payment schedules, receipts and customer reminders.",
  keywords: "hire purchase software, Zambia, SifoBooks, hire purchase agreements, instalment schedules, payment receipts, customer balances",
  eyebrow: "Hire purchase management",
  heading: "Hire Purchase Software Zambia",
  intro: "Manage instalment sales and collections with contract schedules, receipts and automated reminders.",
  features: ["hire purchase agreements","instalment schedules","payment receipts","customer balances","SMS reminders","accounting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/hire-purchase-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
