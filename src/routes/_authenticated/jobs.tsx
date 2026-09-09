import { createFileRoute } from "@tanstack/react-router";
import { BriefcaseBusiness } from "lucide-react";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { JobRecruitmentCentre } from "@/components/sifo/JobRecruitmentCentre";

export const Route = createFileRoute("/_authenticated/jobs")({ component: JobsPage });

function JobsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
      <SifoModuleHeader
        module="payroll"
        icon={BriefcaseBusiness}
        title="Jobs & Recruitment"
        description="Publish opportunities, receive applications and use explainable screening support inside the company workspace."
      />
      <JobRecruitmentCentre />
    </div>
  );
}
