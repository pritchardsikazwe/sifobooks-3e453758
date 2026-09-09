import { createFileRoute } from "@tanstack/react-router";
import { SifoLandingHome } from "@/components/sifo/SifoLandingHome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SifoBooks — Connected Business Management Platform" },
      { name: "description", content: "Explore SifoBooks visually: accounting, sales, purchases, inventory, banking, payroll, compliance and connected business workflows." },
      { name: "keywords", content: "SifoBooks, accounting software Zambia, business management Zambia, payroll, inventory, POS, compliance" },
      { property: "og:title", content: "SifoBooks — Connected Business Management Platform" },
      { property: "og:description", content: "One connected workspace for the whole business." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sifobooks.com/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://sifobooks.com/" }],
  }),
  component: SifoLandingHome,
});
