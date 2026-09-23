import { createFileRoute } from "@tanstack/react-router";
import { SchoolFeaturePage } from "@/components/industry/SchoolFeaturePage";

export const Route = createFileRoute("/_authenticated/school/student-profile")({
  component: () => <SchoolFeaturePage kind="profile" />,
});
