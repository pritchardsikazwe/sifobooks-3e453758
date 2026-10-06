import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/internet-cafe-zambia",
  title: "Internet Cafe Software Zambia | SifoBooks",
  description: "Internet cafe software in Zambia for timed sessions, printing, copy services and POS billing.",
  keywords: "internet cafe software, Zambia, SifoBooks, timed sessions, session billing, printing and copying, service rates",
  eyebrow: "Internet cafe management",
  heading: "Internet Cafe Software Zambia",
  intro: "Track customer sessions and printing services with simple billing and accounting.",
  features: ["timed sessions","session billing","printing and copying","service rates","receipts","cash control"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/internet-cafe-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
