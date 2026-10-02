import { createFileRoute } from "@tanstack/react-router";
import { ModuleGate } from "@/components/ModuleGate";
import { ButcherySuite } from "@/components/butchery/ButcherySuite";

export const Route = createFileRoute("/_authenticated/retail/butchery-sales")({
  head: () => ({ meta: [{ title: "Butchery Sales — SifoBooks" }] }),
  component: () => <ModuleGate name="Butchery" tables={["butchery_products","butchery_scale_devices"]}><ButcherySuite section="sales" /></ModuleGate>,
});
