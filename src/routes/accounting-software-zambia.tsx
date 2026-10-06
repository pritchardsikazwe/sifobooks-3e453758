import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/accounting-software-zambia",
  title: "Accounting Software Zambia | SifoBooks",
  description: "Accounting software for Zambian businesses with invoicing, ledgers, reports, VAT and connected business controls.",
  keywords: "accounting software Zambia, accounting software in Zambia, Zambian accounting software, bookkeeping software Zambia, SME accounting Zambia",
  eyebrow: "Accounting software for Zambia",
  heading: "Accounting software built for Zambian businesses.",
  intro: "Manage accounts, invoices, purchases, expenses and financial reports in one connected workspace, with workflows designed around the needs of businesses operating in Zambia.",
  features: ["General ledger and financial reports","Sales, invoices and customer balances","Purchases, expenses and supplier balances","VAT and Zambia tax workflows","Multi-company and branch management"],
  related: [["/pos-software-zambia","POS software"],["/payroll-software-zambia","Payroll software"],["/zra-smart-invoice-software","ZRA Smart Invoice"]].map(([path, label]) => ({ path, label })),
};

export const Route = createFileRoute("/accounting-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
