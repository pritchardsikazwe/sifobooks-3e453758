import { createFileRoute } from "@tanstack/react-router";
import { SifoModuleAudit } from "@/components/sifo/SifoModuleAudit";

export const Route = createFileRoute("/_authenticated/module-audit")({
  head: () => ({
    meta: [
      { title: "Module Audit — SifoBooks" },
      { name: "description", content: "SifoBooks 2026 workspace and posting audit." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SifoModuleAudit,
});
