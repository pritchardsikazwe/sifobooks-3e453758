import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/clinic-zambia",
  title: "Clinic Management Software Zambia | SifoBooks",
  description: "Clinic management software in Zambia for patients, appointments and consultation billing.",
  keywords: "clinic management software, Zambia, SifoBooks, patient registry, doctor appointments, booking schedules, consultation billing",
  eyebrow: "Clinic management software",
  heading: "Clinic Management Software Zambia",
  intro: "Coordinate patient records, appointments and billing while keeping clinic finances organised.",
  features: ["patient registry","doctor appointments","booking schedules","consultation billing","receipts","financial reporting"],
  related: [{"path":"/pos-software-zambia","label":"POS Software Zambia"},{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/clinic-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
