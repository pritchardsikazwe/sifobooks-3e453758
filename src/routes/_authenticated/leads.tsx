import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Leads — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Leads"
      icon={UserPlus}
      table="leads"
      orderBy={{ column: "created_at", ascending: false }}
      searchKeys={["name", "company", "email"]}
      columns={[
        { key: "name", header: "Name" },
        { key: "company", header: "Company" },
        { key: "source", header: "Source" },
        { key: "stage", header: "Stage" },
        { key: "estimated_value", header: "Est. Value" },
        { key: "owner", header: "Owner" },
      ]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "company", label: "Company" },
        { name: "email", label: "Email" },
        { name: "phone", label: "Phone" },
        { name: "source", label: "Source", type: "select", defaultValue: "web",
          options: [
            { value: "web", label: "Website" }, { value: "referral", label: "Referral" },
            { value: "campaign", label: "Campaign" }, { value: "cold-call", label: "Cold Call" },
            { value: "event", label: "Event" }, { value: "other", label: "Other" },
          ] },
        { name: "stage", label: "Stage", type: "select", defaultValue: "new",
          options: [
            { value: "new", label: "New" }, { value: "contacted", label: "Contacted" },
            { value: "qualified", label: "Qualified" }, { value: "won", label: "Won" }, { value: "lost", label: "Lost" },
          ] },
        { name: "estimated_value", label: "Estimated Value", type: "number", defaultValue: 0 },
        { name: "owner", label: "Owner" },
        { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
      ]}
    />
  ),
});
