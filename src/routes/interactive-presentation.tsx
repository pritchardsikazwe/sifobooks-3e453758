import { createFileRoute } from "@tanstack/react-router";
import { SifoLandingPresentation } from "@/components/sifo/SifoLandingPresentation";

export const Route = createFileRoute("/interactive-presentation")({
  head: () => ({
    meta: [
      { title: "SifoBooks — Interactive Business Presentation" },
      { name: "description", content: "Explore how SifoBooks connects accounting, sales, purchases, inventory, banking, payroll, reporting and compliance." },
    ],
  }),
  component: () => <SifoLandingPresentation />,
});
