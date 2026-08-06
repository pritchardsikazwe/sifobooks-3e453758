import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/time-entries")({
  head: () => ({ meta: [{ title: "Time Entries — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      module="payroll"
      description="Timesheets feeding payroll and jobs"
      title="Time Entries"
      icon={Clock}
      table="time_entries"
      orderBy={{ column: "work_date", ascending: false }}
      searchKeys={["description"]}
      columns={[
        { key: "work_date", header: "Date" },
        { key: "hours", header: "Hours" },
        { key: "billable", header: "Billable", render: r => (r.billable ? "Yes" : "No") },
        { key: "hourly_rate", header: "Rate" },
        { key: "description", header: "Description" },
      ]}
      fields={[
        { name: "work_date", label: "Work Date", type: "date" },
        { name: "hours", label: "Hours", type: "number", required: true, defaultValue: 0 },
        { name: "hourly_rate", label: "Hourly Rate", type: "number", defaultValue: 0 },
        { name: "billable", label: "Billable", type: "select", defaultValue: "true",
          options: [{ value: "true", label: "Billable" }, { value: "false", label: "Non-billable" }] },
        { name: "description", label: "Description", type: "textarea", colSpan: 2 },
      ]}
    />
  ),
});
