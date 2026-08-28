import { createFileRoute } from "@tanstack/react-router";
import POSCommandCenter from "@/pages/pos/POSCommandCenter";

export const Route = createFileRoute("/_authenticated/pos/command-center")({
  head: () => ({
    meta: [
      { title: "POS Worker Command Center — SifoBooks" },
      { name: "description", content: "Role-aware SifoBooks POS worker terminal: orders, tables, cash drawer, stock transfers, kitchen display and end of day." },
      { property: "og:title", content: "POS Worker Command Center — SifoBooks" },
      { property: "og:description", content: "Role-aware POS terminal for cashiers, waiters, supervisors and managers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: POSCommandCenter,
});
