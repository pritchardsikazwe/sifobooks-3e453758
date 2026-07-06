import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Projects"
      icon={Briefcase}
      table="projects"
      orderBy={{ column: "created_at", ascending: false }}
      searchKeys={["name", "code", "manager"]}
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "manager", header: "Manager" },
        { key: "status", header: "Status" },
        { key: "start_date", header: "Start" },
        { key: "end_date", header: "End" },
        { key: "budget", header: "Budget" },
        { key: "actual_cost", header: "Actual" },
      ]}
      fields={[
        { name: "code", label: "Code" },
        { name: "name", label: "Name", required: true },
        { name: "manager", label: "Manager" },
        { name: "status", label: "Status", type: "select", defaultValue: "planned",
          options: [
            { value: "planned", label: "Planned" }, { value: "active", label: "Active" },
            { value: "on_hold", label: "On Hold" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" },
          ] },
        { name: "start_date", label: "Start Date", type: "date" },
        { name: "end_date", label: "End Date", type: "date" },
        { name: "budget", label: "Budget", type: "number", defaultValue: 0 },
        { name: "actual_cost", label: "Actual Cost", type: "number", defaultValue: 0 },
        { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
      ]}
    />
  ),
});
