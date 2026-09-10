import { createFileRoute } from "@tanstack/react-router";
import { HospitalityCompliance } from "@/components/compliance/HospitalityCompliance";

export const Route = createFileRoute("/_authenticated/school/compliance")({
  head: () => ({
    meta: [
      { title: "School Licences & Compliance — SifoBooks" },
      { name: "description", content: "Track school registration, public health, fire safety and council approvals with renewal reminders." },
      { property: "og:title", content: "School Licences & Compliance — SifoBooks" },
      { property: "og:description", content: "Registration and permit records with expiry alerts for your school." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SchoolCompliance,
});

function SchoolCompliance() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Licences & compliance</h1>
        <p className="text-sm text-muted-foreground">
          Registration, health, fire and council records for your school, with renewal reminders.
        </p>
      </div>
      <HospitalityCompliance scope="school" />
    </div>
  );
}
