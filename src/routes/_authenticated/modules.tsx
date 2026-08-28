import { createFileRoute, redirect } from "@tanstack/react-router";

// Modules are no longer a plugin store. Business configuration now lives on the
// Industry & Business page (business type, industry solution, suites, features).
export const Route = createFileRoute("/_authenticated/modules")({
  beforeLoad: () => {
    throw redirect({ to: "/industry" });
  },
});
