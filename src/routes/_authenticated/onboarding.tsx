import { createFileRoute } from "@tanstack/react-router";
import { CompanyOnboardingWizard } from "@/components/company/CompanyOnboardingWizard";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "SifoBooks Setup — Company Onboarding" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CompanyOnboardingWizard,
});
