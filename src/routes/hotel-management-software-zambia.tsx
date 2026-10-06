import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/hotel-management-software-zambia",
  title: "Hotel Management Software Zambia | SifoBooks",
  description: "Hotel management software for Zambian accommodation businesses, connecting operations, accounting, POS, inventory and reporting.",
  keywords: "hotel management software Zambia, hotel software Zambia, hotel accounting Zambia, hotel POS Zambia, hospitality software Zambia",
  eyebrow: "Hotels & Accommodation",
  heading: "Hotel management software for Zambian businesses.",
  intro: "Bring hotel operations and financial control into one connected platform, with tools that can grow from daily operations into accounting and reporting.",
  features: ["Hotel operations workflows","Bookings and guest management","Hotel POS and payments","Inventory and accounting integration","Management reports and controls"],
  related: [["/accounting-software-zambia","Accounting software"],["/restaurant-pos-zambia","Restaurant POS"],["/pos-software-zambia","POS software"]].map(([path, label]) => ({ path, label })),
};

export const Route = createFileRoute("/hotel-management-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
