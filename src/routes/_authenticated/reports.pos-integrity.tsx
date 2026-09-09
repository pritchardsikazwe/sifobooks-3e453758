import { createFileRoute } from "@tanstack/react-router";
import { PosIntegrityCheck } from "@/components/sifo/PosIntegrityCheck";

export const Route = createFileRoute("/_authenticated/reports/pos-integrity")({
  head: () => ({
    meta: [
      { title: "Till & Stock Health Check — SifoBooks" },
      { name: "description", content: "Review older till sales and stock movements that are missing shift, store or cost details." },
      { property: "og:title", content: "Till & Stock Health Check — SifoBooks" },
      { property: "og:description", content: "Review older till sales and stock movements that are missing shift, store or cost details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PosIntegrityCheck,
});
