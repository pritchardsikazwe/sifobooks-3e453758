import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/university-software-zambia",
  title: "University Management Software Zambia | SifoBooks",
  description: "University management software in Zambia for students, faculties, fees, research grants and finance.",
  keywords: "university management software, Zambia, SifoBooks, student admissions and records, faculties and departments, programmes, tuition and residence billing",
  eyebrow: "University management software",
  heading: "University Management Software Zambia",
  intro: "Connect university administration, academic structures, fee billing and research projects with the financial records.",
  features: ["student admissions and records","faculties and departments","programmes","tuition and residence billing","research grants","finance and reporting"],
  related: [{"path":"/school-management-software-zambia","label":"School Management Software"},{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/university-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
