import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/courier-zambia",
  title: "Courier Management Software Zambia | SifoBooks",
  description: "Courier management software in Zambia for shipments, waybills, tracking, delivery routes and invoicing.",
  keywords: "courier management software, Zambia, SifoBooks, shipment records, waybills and tracking, delivery routes, consignee billing",
  eyebrow: "Courier & delivery management",
  heading: "Courier Management Software Zambia",
  intro: "Manage shipments from waybill to delivery while keeping consignee billing and operating costs visible.",
  features: ["shipment records","waybills and tracking","delivery routes","consignee billing","invoices","delivery reporting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/courier-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
