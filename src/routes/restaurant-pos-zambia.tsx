import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/restaurant-pos-zambia",
  title: "Restaurant POS Zambia | SifoBooks",
  description: "Restaurant POS and business management software for cafés, restaurants and bars in Zambia.",
  keywords: "restaurant POS Zambia, restaurant software Zambia, cafe POS Zambia, bar POS Zambia, hospitality POS Zambia",
  eyebrow: "Restaurants & Cafés",
  heading: "Restaurant POS software for Zambia.",
  intro: "Manage restaurant sales and daily operations while keeping stock, accounting and reporting connected.",
  features: ["Restaurant and café POS","Order and sales workflows","Inventory and stock control","Cashier and till management","Connected accounting and reports"],
  related: [["/pos-software-zambia","POS software"],["/inventory-software-zambia","Inventory software"],["/accounting-software-zambia","Accounting software"]].map(([path, label]) => ({ path, label })),
};

export const Route = createFileRoute("/restaurant-pos-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
