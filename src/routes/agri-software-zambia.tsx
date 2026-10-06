import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/agri-software-zambia",
  title: "Agriculture Management Software Zambia | SifoBooks",
  description: "Agriculture management software in Zambia for fields, livestock, crops, harvests and farm accounting.",
  keywords: "agriculture management software, Zambia, SifoBooks, farm fields and crops, livestock records, herd health, harvest yields",
  eyebrow: "Agriculture management",
  heading: "Agriculture Management Software Zambia",
  intro: "Track farm operations and production records while connecting harvest and livestock activity to financial reporting.",
  features: ["farm fields and crops","livestock records","herd health","harvest yields","storage","farm accounting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/agri-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
