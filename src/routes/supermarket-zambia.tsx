import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/supermarket-zambia",
  title: "Supermarket POS Software Zambia | SifoBooks",
  description: "Supermarket POS software in Zambia for multi-till checkout, inventory, promotions and shrinkage control.",
  keywords: "supermarket pos software, Zambia, SifoBooks, multi-till POS, SKU inventory, stock movements, shrinkage control",
  eyebrow: "Supermarket POS & inventory",
  heading: "Supermarket POS Software Zambia",
  intro: "Manage multiple tills, high-SKU stock and promotions while keeping sales and inventory connected.",
  features: ["multi-till POS","SKU inventory","stock movements","shrinkage control","promotions","sales reporting"],
  related: [{"path":"/pos-software-zambia","label":"POS Software Zambia"},{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/supermarket-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
