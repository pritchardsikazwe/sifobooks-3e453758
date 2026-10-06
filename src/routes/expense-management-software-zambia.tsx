import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/expense-management-software-zambia",
  title: "Expense Management Software Zambia",
  description: "Expense management software in Zambia for expense capture, categories, approvals and accounting.",
  keywords: "expense management software zambia, Zambia, SifoBooks, expense capture, expense categories, approval controls, supplier and staff expenses",
  eyebrow: "Expense management",
  heading: "Expense Management Software Zambia",
  intro: "Capture business expenses consistently and connect approved costs to the accounting records.",
  features: ["expense capture","expense categories","approval controls","supplier and staff expenses","accounting posting","expense reporting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"},{"path":"/zra-smart-invoice-software","label":"ZRA Smart Invoice"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"}],
};

export const Route = createFileRoute("/expense-management-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
