import { createFileRoute } from "@tanstack/react-router";
import { BriefcaseBusiness } from "lucide-react";
import { SifoDocumentLayout } from "@/components/sifo/SifoDocumentLayout";
import { JobRecruitmentCentre } from "@/components/sifo/JobRecruitmentCentre";

export const Route = createFileRoute("/_authenticated/jobs")({ component: JobsPage });

function JobsPage() {
  return <SifoDocumentLayout module="hr" icon={BriefcaseBusiness} title="Jobs & Recruitment" description="Publish opportunities, receive applications and use explainable screening support inside the company workspace."><JobRecruitmentCentre /></SifoDocumentLayout>;
}
