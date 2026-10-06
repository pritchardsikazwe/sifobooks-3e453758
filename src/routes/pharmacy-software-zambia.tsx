import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/pharmacy-software-zambia",
  title: "Pharmacy POS Software Zambia | SifoBooks",
  description: "Pharmacy POS software in Zambia with medicine inventory, batch and expiry tracking, prescriptions and insurance claims.",
  keywords: "pharmacy pos software, Zambia, SifoBooks, medicine inventory, batch and expiry tracking, barcode pos, prescription capture",
  eyebrow: "Pharmacy POS & inventory",
  heading: "Pharmacy POS Software Zambia",
  intro: "Run pharmacy sales and stock control with batch-aware inventory and expiry visibility.",
  features: ["medicine inventory","batch and expiry tracking","barcode POS","prescription capture","insurance claims","stock and purchasing"],
  related: [{"path":"/pos-software-zambia","label":"POS Software Zambia"},{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/pharmacy-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
