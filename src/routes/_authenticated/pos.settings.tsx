import { createFileRoute } from "@tanstack/react-router";
import { POSSettingsWorkspace } from "@/components/pos/POSSettingsWorkspace";

export const Route = createFileRoute("/_authenticated/pos/settings")({
  head: () => ({ meta: [{ title: "POS Control Centre — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => <POSSettingsWorkspace edition="SifoBooks POS" />,
});
