import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/sacco-software-zambia",
  title: "SACCO Management Software Zambia | SifoBooks",
  description: "SACCO management software in Zambia for members, shares, savings, loans and cooperative finance.",
  keywords: "sacco management software, Zambia, SifoBooks, member registry, shares and savings, member loans, repayments",
  eyebrow: "SACCO management",
  heading: "SACCO Management Software Zambia",
  intro: "Manage member records, share capital, savings and member loans with connected financial reporting.",
  features: ["member registry","shares and savings","member loans","repayments","member balances","financial reporting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/sacco-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
