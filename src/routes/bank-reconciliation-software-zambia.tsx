import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/bank-reconciliation-software-zambia",
  title: "Bank Reconciliation Software Zambia",
  description: "Bank reconciliation software in Zambia for bank accounts, statement matching, reconciliation and cash control.",
  keywords: "bank reconciliation software zambia, Zambia, SifoBooks, bank accounts, statement reconciliation, reconciliation sessions, cashbook",
  eyebrow: "Bank reconciliation & cash management",
  heading: "Bank Reconciliation Software Zambia",
  intro: "Keep bank transactions aligned with the general ledger and identify unreconciled items before month end.",
  features: ["bank accounts","statement reconciliation","reconciliation sessions","cashbook","bank rules","audit trail"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"},{"path":"/zra-smart-invoice-software","label":"ZRA Smart Invoice"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"}],
};

export const Route = createFileRoute("/bank-reconciliation-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
