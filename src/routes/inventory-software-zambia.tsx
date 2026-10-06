import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/inventory-software-zambia",
  title: "Inventory Software Zambia | SifoBooks",
  description: "Inventory and stock management software for Zambian businesses. Track products, warehouses, purchases, sales and stock controls.",
  keywords: "inventory software Zambia, stock management Zambia, inventory management software Zambia, warehouse software Zambia, stock control Zambia",
  eyebrow: "Inventory & Stock",
  heading: "Inventory software for Zambian businesses.",
  intro: "Know what is in stock, where it is, what it costs and how sales and purchases affect your inventory and accounts.",
  features: ["Multi-warehouse stock control","Stock receiving and transfers","Stock counts and adjustments","Inventory linked to sales and purchases","Inventory reporting and audit controls"],
  related: [["/pos-software-zambia","POS software"],["/accounting-software-zambia","Accounting software"],["/butchery-pos-zambia","Butchery POS"]].map(([path, label]) => ({ path, label })),
};

export const Route = createFileRoute("/inventory-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
