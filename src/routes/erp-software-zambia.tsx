import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/erp-software-zambia",
  title: "ERP Software Zambia | SifoBooks",
  description: "SifoBooks is a connected ERP and business management platform for Zambian businesses, combining accounting, POS, inventory, payroll and compliance.",
  keywords: "ERP software Zambia, ERP system Zambia, business management software Zambia, SME ERP Zambia, accounting ERP Zambia",
  eyebrow: "Business Management ERP",
  heading: "A connected ERP for businesses in Zambia.",
  intro: "Start with the modules you need and expand as your business grows. SifoBooks connects accounting, sales, inventory, payroll and compliance.",
  features: ["Accounting and financial control","POS and sales","Inventory and warehouses","Payroll and statutory workflows","Zambia tax and compliance"],
  related: [["/accounting-software-zambia","Accounting"],["/pos-software-zambia","POS"],["/payroll-software-zambia","Payroll"]].map(([path, label]) => ({ path, label })),
};

export const Route = createFileRoute("/erp-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
