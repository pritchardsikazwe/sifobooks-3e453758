import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/zra-smart-invoice-software",
  title: "ZRA Smart Invoice Software Zambia | SifoBooks",
  description: "SifoBooks connects invoicing and accounting workflows with Zambia tax and ZRA Smart Invoice processes.",
  keywords: "ZRA Smart Invoice software, ZRA Smart Invoice Zambia, ZRA invoicing software, VAT software Zambia, ZRA tax software",
  eyebrow: "Zambia Tax & Compliance",
  heading: "ZRA Smart Invoice and tax workflows in SifoBooks.",
  intro: "Keep sales, VAT, invoices and compliance records connected so tax work starts from the transactions that created the figures.",
  features: ["ZRA Smart Invoice workflow support","VAT reporting and reconciliation","Invoice and credit/debit note controls","Tax audit trail","Accounting and compliance in one system"],
  related: [["/accounting-software-zambia","Accounting software"],["/payroll-software-zambia","Payroll software"],["/pos-software-zambia","POS software"]].map(([path, label]) => ({ path, label })),
};

export const Route = createFileRoute("/zra-smart-invoice-software")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
