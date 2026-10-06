import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/fixed-assets-software-zambia",
  title: "Fixed Assets Software Zambia",
  description: "Fixed assets software in Zambia for asset registers, depreciation and accounting control.",
  keywords: "fixed assets software zambia, Zambia, SifoBooks, asset register, asset acquisition records, monthly depreciation, asset balances",
  eyebrow: "Fixed asset management",
  heading: "Fixed Assets Software Zambia",
  intro: "Maintain an accurate asset register and connect depreciation and asset movements to financial reporting.",
  features: ["asset register","asset acquisition records","monthly depreciation","asset balances","disposals and transfers","financial reporting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"},{"path":"/zra-smart-invoice-software","label":"ZRA Smart Invoice"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"}],
};

export const Route = createFileRoute("/fixed-assets-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
