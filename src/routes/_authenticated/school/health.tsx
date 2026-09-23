import { createFileRoute } from "@tanstack/react-router";
import { SchoolFeaturePage } from "@/components/industry/SchoolFeaturePage";

export const Route = createFileRoute("/_authenticated/school/health")({
  component: () => <SchoolFeaturePage kind="health" />,
});
