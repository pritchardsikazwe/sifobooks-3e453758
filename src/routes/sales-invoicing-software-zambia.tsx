import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/sales-invoicing-software-zambia",
  title: "Sales & Invoicing Software Zambia",
  description: "Sales and invoicing software in Zambia for customers, quotations, invoices, credit notes and receipts.",
  keywords: "sales & invoicing software zambia, Zambia, SifoBooks, customer management, quotations, sales invoices, credit notes",
  eyebrow: "Sales & invoicing software",
  heading: "Sales & Invoicing Software Zambia",
  intro: "Create quotations and invoices, collect payments and keep the sales ledger connected to your accounting records.",
  features: ["customer management","quotations","sales invoices","credit notes","receipts and payment allocation","sales reporting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"},{"path":"/zra-smart-invoice-software","label":"ZRA Smart Invoice"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"}],
};

export const Route = createFileRoute("/sales-invoicing-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
