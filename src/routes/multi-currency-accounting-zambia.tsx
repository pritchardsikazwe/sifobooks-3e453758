import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/multi-currency-accounting-zambia",
  title: "Multi-Currency Accounting Software Zambia",
  description: "Multi-currency accounting software in Zambia for exchange rates and transactions alongside ZMW accounts.",
  keywords: "multi-currency accounting software zambia, Zambia, SifoBooks, exchange rates, foreign-currency transactions, ZMW base currency, multi-currency posting",
  eyebrow: "Multi-currency accounting",
  heading: "Multi-Currency Accounting Software Zambia",
  intro: "Handle foreign-currency transactions while keeping ZMW as the base currency for connected accounting.",
  features: ["exchange rates","foreign-currency transactions","ZMW base currency","multi-currency posting","currency reporting","financial controls"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"},{"path":"/zra-smart-invoice-software","label":"ZRA Smart Invoice"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"}],
};

export const Route = createFileRoute("/multi-currency-accounting-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
