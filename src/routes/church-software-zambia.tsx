import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/church-software-zambia",
  title: "Church Management Software Zambia | SifoBooks",
  description: "Church management software in Zambia for members, offerings, tithes and church projects.",
  keywords: "church management software, Zambia, SifoBooks, membership registry, offerings and tithes, contribution tracking, church projects",
  eyebrow: "Church finance & administration",
  heading: "Church Management Software Zambia",
  intro: "Bring membership, contribution tracking and church project finances into one controlled system.",
  features: ["membership registry","offerings and tithes","contribution tracking","church projects","receipts","financial reporting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/church-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
