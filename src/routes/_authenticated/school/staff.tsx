import { createFileRoute } from "@tanstack/react-router";
import { SchoolWorkspace } from "@/components/industry/SchoolWorkspace";

export const Route = createFileRoute("/_authenticated/school/staff")({
  component: () => <SchoolWorkspace screen="/school/staff" />,
});
