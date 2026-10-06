import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/fuel-software-zambia",
  title: "Fuel Station Management Software Zambia | SifoBooks",
  description: "Fuel station management software in Zambia for pumps, tanks, meter readings, shifts and shop POS.",
  keywords: "fuel station management software, Zambia, SifoBooks, pumps and tanks, meter readings and dips, attendant shifts, fuel sales",
  eyebrow: "Fuel station management",
  heading: "Fuel Station Management Software Zambia",
  intro: "Control pump operations, tank records, attendant shifts and convenience-store sales from one system.",
  features: ["pumps and tanks","meter readings and dips","attendant shifts","fuel sales","shop POS","stock and accounting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/fuel-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
