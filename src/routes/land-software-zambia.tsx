import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/land-software-zambia",
  title: "Land Installment Sales Software Zambia | SifoBooks",
  description: "Land installment sales software in Zambia for plots, sale contracts, title details and payment plans.",
  keywords: "land installment sales software, Zambia, SifoBooks, plot registry and survey numbers, sale agreements, title details, instalment plans",
  eyebrow: "Land sales management",
  heading: "Land Installment Sales Software Zambia",
  intro: "Track plots, sale agreements and instalment collections without losing the accounting trail.",
  features: ["plot registry and survey numbers","sale agreements","title details","instalment plans","receipts and balances","accounting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/land-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
