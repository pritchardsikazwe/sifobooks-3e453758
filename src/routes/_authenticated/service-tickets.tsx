import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/service-tickets")({
  head: () => ({ meta: [{ title: "Service Tickets — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Service Tickets"
      icon={LifeBuoy}
      table="service_tickets"
      orderBy={{ column: "opened_at", ascending: false }}
      searchKeys={["subject", "ticket_number"]}
      columns={[
        { key: "ticket_number", header: "Ticket #" },
        { key: "subject", header: "Subject" },
        { key: "priority", header: "Priority" },
        { key: "status", header: "Status" },
        { key: "opened_at", header: "Opened" },
        { key: "resolved_at", header: "Resolved" },
      ]}
      fields={[
        { name: "ticket_number", label: "Ticket #" },
        { name: "subject", label: "Subject", required: true },
        { name: "description", label: "Description", type: "textarea", colSpan: 2 },
        { name: "priority", label: "Priority", type: "select", defaultValue: "medium",
          options: [
            { value: "low", label: "Low" }, { value: "medium", label: "Medium" },
            { value: "high", label: "High" }, { value: "urgent", label: "Urgent" },
          ] },
        { name: "status", label: "Status", type: "select", defaultValue: "open",
          options: [
            { value: "open", label: "Open" }, { value: "in_progress", label: "In Progress" },
            { value: "resolved", label: "Resolved" }, { value: "closed", label: "Closed" },
          ] },
        { name: "resolution", label: "Resolution", type: "textarea", colSpan: 2 },
      ]}
    />
  ),
});
