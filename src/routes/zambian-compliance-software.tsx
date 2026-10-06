import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/zambian-compliance-software",
  title: "Zambian Compliance Software | SifoBooks",
  description: "Zambian compliance software for VAT, PAYE, NAPSA, NHIMA and ZRA Smart Invoice workflows.",
  keywords: "zambian compliance software, Zambia, SifoBooks, ZRA Smart Invoice, VAT reporting, PAYE and payroll compliance, NAPSA and NHIMA workflows",
  eyebrow: "Zambian tax & compliance",
  heading: "Zambian Compliance Software",
  intro: "Keep statutory workflows, filing controls and business transactions connected in one Zambia-focused platform.",
  features: ["ZRA Smart Invoice","VAT reporting","PAYE and payroll compliance","NAPSA and NHIMA workflows","compliance calendar","audit trail"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"},{"path":"/zra-smart-invoice-software","label":"ZRA Smart Invoice"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"}],
};

export const Route = createFileRoute("/zambian-compliance-software")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
