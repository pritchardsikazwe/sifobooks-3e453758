import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/financial-reporting-software-zambia",
  title: "Financial Reporting Software Zambia",
  description: "Financial reporting software in Zambia for financial statements, trial balance, VAT and management reports.",
  keywords: "financial reporting software zambia, Zambia, SifoBooks, trial balance, profit and loss, balance sheet, customer and supplier statements",
  eyebrow: "Financial reporting",
  heading: "Financial Reporting Software Zambia",
  intro: "Turn posted transactions into financial statements, statutory reports and operational analysis.",
  features: ["trial balance","profit and loss","balance sheet","customer and supplier statements","VAT reporting","management analytics"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"},{"path":"/zra-smart-invoice-software","label":"ZRA Smart Invoice"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"}],
};

export const Route = createFileRoute("/financial-reporting-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
