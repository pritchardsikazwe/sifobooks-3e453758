import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/lending-zambia",
  title: "Lending & Microfinance Software Zambia | SifoBooks",
  description: "Lending and microfinance software in Zambia for borrowers, loan products, disbursements, repayments and collections.",
  keywords: "lending & microfinance software, Zambia, SifoBooks, borrowers and KYC, loan products, loan applications, disbursements",
  eyebrow: "Lending & microfinance",
  heading: "Lending & Microfinance Software Zambia",
  intro: "Manage the lending cycle from borrower application and disbursement through repayments, collections and portfolio reporting.",
  features: ["borrowers and KYC","loan products","loan applications","disbursements","repayments and collections","portfolio reporting"],
  related: [{"path":"/erp-software-zambia","label":"Business ERP Zambia"},{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/lending-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
