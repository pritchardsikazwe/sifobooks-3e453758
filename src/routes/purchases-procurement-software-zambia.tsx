import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/purchases-procurement-software-zambia",
  title: "Purchases & Procurement Software Zambia",
  description: "Purchases and procurement software in Zambia for suppliers, purchase orders, bills, expenses and supplier payments.",
  keywords: "purchases & procurement software zambia, Zambia, SifoBooks, supplier management, purchase orders, quotation comparison, supplier bills",
  eyebrow: "Purchases & procurement",
  heading: "Purchases & Procurement Software Zambia",
  intro: "Control supplier purchasing from quotation and purchase order through bills, payments and expense records.",
  features: ["supplier management","purchase orders","quotation comparison","supplier bills","supplier payments","expense management"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"},{"path":"/zra-smart-invoice-software","label":"ZRA Smart Invoice"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"}],
};

export const Route = createFileRoute("/purchases-procurement-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
