import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/budgeting-software-zambia",
  title: "Budgeting Software Zambia",
  description: "Budgeting software in Zambia for budgets, actuals and management variance analysis.",
  keywords: "budgeting software zambia, Zambia, SifoBooks, budget setup, budget vs actuals, department and branch planning, variance analysis",
  eyebrow: "Budget management",
  heading: "Budgeting Software Zambia",
  intro: "Plan budgets and compare actual business performance against approved targets.",
  features: ["budget setup","budget vs actuals","department and branch planning","variance analysis","management reporting","financial controls"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"},{"path":"/zra-smart-invoice-software","label":"ZRA Smart Invoice"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"}],
};

export const Route = createFileRoute("/budgeting-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
