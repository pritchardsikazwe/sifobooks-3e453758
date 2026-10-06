import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/hardware-software-zambia",
  title: "Hardware Store POS Software Zambia | SifoBooks",
  description: "Hardware store POS software in Zambia for counter sales, wide SKU inventories and supplier purchasing.",
  keywords: "hardware store pos software, Zambia, SifoBooks, counter pos, sku inventory, stock levels, supplier orders",
  eyebrow: "Hardware retail POS",
  heading: "Hardware Store POS Software Zambia",
  intro: "Run a hardware shop with fast counter sales, stock visibility and supplier purchasing controls.",
  features: ["counter POS","SKU inventory","stock levels","supplier orders","purchasing","sales and accounting"],
  related: [{"path":"/pos-software-zambia","label":"POS Software Zambia"},{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/hardware-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
