import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/pos-software-zambia",
  title: "POS Software Zambia | SifoBooks",
  description: "POS software for shops, supermarkets and growing businesses in Zambia. Connect sales, stock and accounting with SifoBooks.",
  keywords: "POS software Zambia, point of sale Zambia, retail POS Zambia, supermarket POS Zambia, shop POS software Zambia",
  eyebrow: "Retail & Point of Sale",
  heading: "POS software for shops and retailers in Zambia.",
  intro: "Run checkout, track stock and connect sales to your accounts. SifoBooks brings point of sale and back-office operations together.",
  features: ["Fast retail checkout","Inventory-aware sales","Cashier and till controls","Receipts and sales reporting","Sales flowing into accounting"],
  related: [["/inventory-software-zambia","Inventory software"],["/accounting-software-zambia","Accounting software"],["/butchery-pos-zambia","Butchery POS"]].map(([path, label]) => ({ path, label })),
};

export const Route = createFileRoute("/pos-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
