import { createFileRoute } from "@tanstack/react-router";
import { ModuleSettingsCentre } from "@/components/sifo/ModuleSettingsCentre";

export const Route = createFileRoute("/_authenticated/modules")({
  head: () => ({ meta: [{ title: "Module Settings — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: ModuleSettingsCentre,
});
