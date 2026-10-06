import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/manufacturing-software-zambia",
  title: "Manufacturing Software Zambia | SifoBooks",
  description: "Manufacturing software in Zambia for raw materials, bills of materials, production orders and quality control.",
  keywords: "manufacturing software, Zambia, SifoBooks, raw materials stock, bills of materials, production orders, work-order status",
  eyebrow: "Manufacturing ERP",
  heading: "Manufacturing Software Zambia",
  intro: "Connect production planning and factory stock with accounting, purchasing and reporting.",
  features: ["raw materials stock","bills of materials","production orders","work-order status","quality inspections","production accounting"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/manufacturing-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
