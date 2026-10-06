import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/hospital-software-zambia",
  title: "Hospital Management Software Zambia | SifoBooks",
  description: "Hospital management software in Zambia for patients, appointments, wards, billing, insurance and pharmacy operations.",
  keywords: "hospital management software, Zambia, SifoBooks, patient registration, appointments and reminders, wards and beds, admissions and discharge",
  eyebrow: "Healthcare management software",
  heading: "Hospital Management Software Zambia",
  intro: "Manage patient administration, appointments, beds, billing and in-house pharmacy operations while keeping finance connected.",
  features: ["patient registration","appointments and reminders","wards and beds","admissions and discharge","billing and insurance claims","in-house pharmacy stock"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/hospital-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
