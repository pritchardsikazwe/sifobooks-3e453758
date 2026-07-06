import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/project-tasks")({
  head: () => ({ meta: [{ title: "Project Tasks — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Project Tasks"
      icon={ListChecks}
      table="project_tasks"
      orderBy={{ column: "due_date", ascending: true }}
      searchKeys={["title", "assignee"]}
      columns={[
        { key: "title", header: "Task" },
        { key: "assignee", header: "Assignee" },
        { key: "status", header: "Status" },
        { key: "priority", header: "Priority" },
        { key: "due_date", header: "Due" },
        { key: "estimated_hours", header: "Est h" },
        { key: "actual_hours", header: "Actual h" },
      ]}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "assignee", label: "Assignee" },
        { name: "status", label: "Status", type: "select", defaultValue: "todo",
          options: [
            { value: "todo", label: "To Do" }, { value: "in_progress", label: "In Progress" },
            { value: "blocked", label: "Blocked" }, { value: "done", label: "Done" },
          ] },
        { name: "priority", label: "Priority", type: "select", defaultValue: "medium",
          options: [
            { value: "low", label: "Low" }, { value: "medium", label: "Medium" },
            { value: "high", label: "High" }, { value: "urgent", label: "Urgent" },
          ] },
        { name: "due_date", label: "Due Date", type: "date" },
        { name: "estimated_hours", label: "Estimated Hours", type: "number", defaultValue: 0 },
        { name: "actual_hours", label: "Actual Hours", type: "number", defaultValue: 0 },
        { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
      ]}
    />
  ),
});
