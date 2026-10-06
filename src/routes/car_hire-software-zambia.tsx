import { createFileRoute } from "@tanstack/react-router";
import { SeoSolutionPage, seoHead, type SeoSolution } from "@/components/sifo/SeoSolutionPage";

const solution: SeoSolution = {
  path: "/car_hire-software-zambia",
  title: "Car Hire Software Zambia | SifoBooks",
  description: "Car hire software in Zambia for bookings, rental contracts, vehicle inspections and security deposits.",
  keywords: "car hire software, Zambia, SifoBooks, vehicle bookings, rental contracts, check-in and check-out inspections, security deposits",
  eyebrow: "Car rental management",
  heading: "Car Hire Software Zambia",
  intro: "Manage reservations, rental agreements, vehicle condition and deposits with connected billing.",
  features: ["vehicle bookings","rental contracts","check-in and check-out inspections","security deposits","customer billing","fleet records"],
  related: [{"path":"/accounting-software-zambia","label":"Accounting Software Zambia"},{"path":"/inventory-software-zambia","label":"Inventory Software Zambia"},{"path":"/payroll-software-zambia","label":"Payroll Software Zambia"},{"path":"/erp-software-zambia","label":"ERP Software Zambia"}],
};

export const Route = createFileRoute("/car_hire-software-zambia")({
  head: () => seoHead(solution),
  component: () => <SeoSolutionPage solution={solution} />,
});
