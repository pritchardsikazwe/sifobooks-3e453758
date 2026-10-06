import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/college-software-zambia",
  title: "College Management Software Zambia | SifoBooks",
  description: "College management software in Zambia for students, programmes, tuition, examinations and finance.",
  keywords: "college management software, Zambia, SifoBooks, college students, programmes and courses, semester setup, tuition billing and receipts",
  eyebrow: "Tertiary education software",
  heading: "College Management Software Zambia",
  intro: "Run college administration, academic records and fee operations from one connected SifoBooks workspace.",
  features: ["college students","programmes and courses","semester setup","tuition billing and receipts","examinations and transcripts","finance and reporting"],
  related: [{"path":"/school-management-software-zambia","label":"School Management Software"},{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/college-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
