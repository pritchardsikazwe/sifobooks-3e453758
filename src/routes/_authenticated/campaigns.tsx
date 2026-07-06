import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Campaigns"
      icon={Megaphone}
      table="campaigns"
      orderBy={{ column: "start_date", ascending: false }}
      searchKeys={["name", "channel"]}
      columns={[
        { key: "name", header: "Campaign" },
        { key: "channel", header: "Channel" },
        { key: "status", header: "Status" },
        { key: "budget", header: "Budget" },
        { key: "actual_cost", header: "Actual" },
        { key: "start_date", header: "Start" },
        { key: "end_date", header: "End" },
      ]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "channel", label: "Channel", type: "select", defaultValue: "email",
          options: [
            { value: "email", label: "Email" }, { value: "sms", label: "SMS" },
            { value: "social", label: "Social" }, { value: "event", label: "Event" }, { value: "print", label: "Print" },
          ] },
        { name: "status", label: "Status", type: "select", defaultValue: "planned",
          options: [
            { value: "planned", label: "Planned" }, { value: "active", label: "Active" },
            { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" },
          ] },
        { name: "budget", label: "Budget", type: "number", defaultValue: 0 },
        { name: "actual_cost", label: "Actual Cost", type: "number", defaultValue: 0 },
        { name: "start_date", label: "Start Date", type: "date" },
        { name: "end_date", label: "End Date", type: "date" },
        { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
      ]}
    />
  ),
});
