import { createFileRoute } from "@tanstack/react-router";
import { SchoolWorkspace } from "@/components/industry/SchoolWorkspace";

export const Route = createFileRoute("/_authenticated/school")({
  component: () => <SchoolWorkspace screen="/school" />,
});
