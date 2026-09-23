import { createFileRoute } from "@tanstack/react-router";
import { SchoolFeaturePage } from "@/components/industry/SchoolFeaturePage";

export const Route = createFileRoute("/_authenticated/school/preschool")({
  component: () => <SchoolFeaturePage kind="preschool" />,
});
