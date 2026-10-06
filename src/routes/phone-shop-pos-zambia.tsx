import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/phone-shop-pos-zambia",
  title: "Phone Shop POS Software Zambia | SifoBooks",
  description: "Phone shop POS software in Zambia for phones, accessories, IMEI capture, repairs, warranties and inventory.",
  keywords: "phone shop pos software, Zambia, SifoBooks, imei sales capture, repair job cards, repair status, warranty registry",
  eyebrow: "Phone shop POS & repairs",
  heading: "Phone Shop POS Software Zambia",
  intro: "Track device sales, IMEI details, repair jobs, warranties and stock from one retail workspace.",
  features: ["IMEI sales capture","repair job cards","repair status","warranty registry","inventory and transfers","retail POS"],
  related: [{"path":"/pos-software-zambia","label":"POS Software Zambia"},{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/phone-shop-pos-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
