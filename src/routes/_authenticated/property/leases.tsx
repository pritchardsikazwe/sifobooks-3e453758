import { createFileRoute } from "@tanstack/react-router";
import { PropertyWorkspace } from "@/components/industry/PropertyWorkspace";
export const Route = createFileRoute("/_authenticated/property/leases")({ component: () => <PropertyWorkspace initialTab="leases" /> });
