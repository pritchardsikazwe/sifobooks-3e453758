import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/payroll-software-zambia",
  title: "Payroll Software Zambia | SifoBooks",
  description: "Payroll software for Zambia with employee records, PAYE, NAPSA, NHIMA and statutory payroll workflows.",
  keywords: "payroll software Zambia, payroll system Zambia, PAYE software Zambia, NAPSA payroll Zambia, NHIMA payroll Zambia",
  eyebrow: "Payroll & HR",
  heading: "Payroll software for Zambian employers.",
  intro: "Keep employee records, payroll calculations, statutory schedules and accounting together in one workflow.",
  features: ["Employee records and payroll periods","PAYE calculations and schedules","NAPSA and NHIMA workflows","Payroll-to-ledger posting","Statutory reporting controls"],
  related: [["/accounting-software-zambia","Accounting software"],["/zra-smart-invoice-software","ZRA compliance"],["/inventory-software-zambia","Inventory software"]].map(([path, label]) => ({ path, label })),
};

export const Route = createFileRoute("/payroll-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
