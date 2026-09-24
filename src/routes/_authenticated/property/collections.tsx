import { createFileRoute } from "@tanstack/react-router";
import { PropertyWorkspace } from "@/components/industry/PropertyWorkspace";
export const Route = createFileRoute("/_authenticated/property/collections")({ component: () => <PropertyWorkspace initialTab="collections" /> });
