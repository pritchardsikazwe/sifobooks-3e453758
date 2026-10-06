import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/salon-zambia",
  title: "Salon Management Software Zambia | SifoBooks",
  description: "Salon management software in Zambia for services, appointments, stylists and commissions.",
  keywords: "salon management software, Zambia, SifoBooks, service catalogue, appointments, bookings, stylist records",
  eyebrow: "Salon management & POS",
  heading: "Salon Management Software Zambia",
  intro: "Manage salon bookings, services, stylist activity and commissions with connected sales and accounting.",
  features: ["service catalogue","appointments","bookings","stylist records","commissions","sales and reporting"],
  related: [{"path":"/pos-software-zambia","label":"POS Software Zambia"},{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/salon-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
