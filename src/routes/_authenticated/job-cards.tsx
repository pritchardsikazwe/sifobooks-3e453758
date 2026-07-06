import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/job-cards")({
  head: () => ({ meta: [{ title: "Job Cards — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Job Cards"
      icon={Wrench}
      table="job_cards"
      orderBy={{ column: "service_date", ascending: false }}
      searchKeys={["job_number", "technician"]}
      columns={[
        { key: "job_number", header: "Job #" },
        { key: "service_date", header: "Date" },
        { key: "technician", header: "Technician" },
        { key: "parts_cost", header: "Parts" },
        { key: "labour_cost", header: "Labour" },
        { key: "total_cost", header: "Total" },
        { key: "status", header: "Status" },
      ]}
      fields={[
        { name: "job_number", label: "Job #" },
        { name: "service_date", label: "Service Date", type: "date" },
        { name: "technician", label: "Technician" },
        { name: "description", label: "Description", type: "textarea", colSpan: 2 },
        { name: "parts_cost", label: "Parts Cost", type: "number", defaultValue: 0 },
        { name: "labour_cost", label: "Labour Cost", type: "number", defaultValue: 0 },
        { name: "total_cost", label: "Total Cost", type: "number", defaultValue: 0 },
        { name: "status", label: "Status", type: "select", defaultValue: "open",
          options: [
            { value: "open", label: "Open" }, { value: "in_progress", label: "In Progress" },
            { value: "completed", label: "Completed" }, { value: "invoiced", label: "Invoiced" },
          ] },
        { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
      ]}
    />
  ),
});
