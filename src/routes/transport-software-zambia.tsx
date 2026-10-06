import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/transport-software-zambia",
  title: "Transport Management Software Zambia | SifoBooks",
  description: "Transport management software in Zambia for trips, vehicles, drivers, fuel and maintenance.",
  keywords: "transport management software, Zambia, SifoBooks, trip logs and manifests, vehicle registry, driver records, fuel purchases and consumption",
  eyebrow: "Transport management",
  heading: "Transport Management Software Zambia",
  intro: "Coordinate transport operations, trip records, drivers, fuel and vehicle maintenance while keeping costs visible.",
  features: ["trip logs and manifests","vehicle registry","driver records","fuel purchases and consumption","maintenance","accounting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/transport-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
