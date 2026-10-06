import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/butchery-pos-zambia",
  title: "Butchery POS Zambia | SifoBooks",
  description: "Butchery POS and stock management software for Zambian butcheries, connecting sales, inventory, processing and accounting.",
  keywords: "butchery POS Zambia, butcher shop software Zambia, butchery software Zambia, meat shop POS Zambia, butcher POS system",
  eyebrow: "Butchery & Meat Retail",
  heading: "Butchery POS software built for Zambia.",
  intro: "Track butchery sales, stock, processing and wastage while keeping POS and accounting connected.",
  features: ["Butchery-focused POS","Stock and product control","Processing and wastage tracking","Cashier and till controls","Sales and accounting integration"],
  related: [["/pos-software-zambia","POS software"],["/inventory-software-zambia","Inventory software"],["/accounting-software-zambia","Accounting software"]].map(([path, label]) => ({ path, label })),
};

export const Route = createFileRoute("/butchery-pos-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
