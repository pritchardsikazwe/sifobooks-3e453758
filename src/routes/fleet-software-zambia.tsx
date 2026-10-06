import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/fleet-software-zambia",
  title: "Fleet Management Software Zambia | SifoBooks",
  description: "Fleet management software in Zambia for vehicles, GPS identifiers, maintenance, licences, insurance and fuel.",
  keywords: "fleet management software, Zambia, SifoBooks, vehicle registry, gps identifiers, scheduled maintenance, licences and insurance renewals",
  eyebrow: "Fleet management",
  heading: "Fleet Management Software Zambia",
  intro: "Keep vehicle operations under control with service schedules, renewals, fuel records and fleet costs.",
  features: ["vehicle registry","GPS identifiers","scheduled maintenance","licences and insurance renewals","fuel usage","fleet reporting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/fleet-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
