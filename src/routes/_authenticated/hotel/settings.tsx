import { createFileRoute } from "@tanstack/react-router";
import { POSSettingsWorkspace } from "@/components/pos/POSSettingsWorkspace";

export const Route = createFileRoute("/_authenticated/hotel/settings")({
  head: () => ({
    meta: [
      { title: "Hotel Administration & Settings — SifoBooks" },
      { name: "description", content: "Standalone SifoHotel administration, terminals, permissions, printing, fiscal readiness and system health." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <POSSettingsWorkspace edition="SifoHotel" />,
});
