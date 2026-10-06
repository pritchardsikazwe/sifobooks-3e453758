import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/school-management-software-zambia",
  title: "School Management Software Zambia | SifoBooks",
  description: "School management and accounting software for Zambian schools, with fees, students, payroll, accounting and reporting workflows.",
  keywords: "school management software Zambia, school accounting software Zambia, school fees software Zambia, school ERP Zambia, school finance software Zambia",
  eyebrow: "Schools & Education",
  heading: "School management software for Zambia.",
  intro: "Connect school administration and financial workflows so fees, expenses, payroll and accounting are easier to manage.",
  features: ["Student and school records","Fees and billing workflows","School accounting and reports","Payroll and staff workflows","Management controls and audit trail"],
  related: [["/accounting-software-zambia","Accounting software"],["/payroll-software-zambia","Payroll software"],["/inventory-software-zambia","Inventory software"]].map(([path, label]) => ({ path, label })),
};

export const Route = createFileRoute("/school-management-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
