import { createFileRoute } from "@tanstack/react-router";
import { SifoLandingShowcase } from "@/components/sifo/SifoLandingShowcase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SifoBooks — Smart Business. Simplified." },
      { name: "description", content: "SifoBooks connects accounting, sales, purchases, inventory, POS, banking, payroll, compliance and business reporting in one controlled platform." },
      { name: "keywords", content: "SifoBooks, accounting software Zambia, POS Zambia, inventory software, payroll, ZRA compliance, business management" },
      { property: "og:title", content: "SifoBooks — Smart Business. Simplified." },
      { property: "og:description", content: "See the business screen, the transaction, the ledger and the compliance record in one connected platform." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sifobooks.com/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SifoBooks — Smart Business. Simplified." },
    ],
    links: [{ rel: "canonical", href: "https://sifobooks.com/" }],
  }),
  component: SifoLandingShowcase,
});
