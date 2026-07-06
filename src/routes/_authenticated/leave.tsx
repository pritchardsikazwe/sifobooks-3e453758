import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/leave")({
  head: () => ({ meta: [{ title: "Leave Requests — EdgeCore" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Leave Requests"
      icon={CalendarDays}
      table="leave_requests"
      orderBy={{ column: "start_date", ascending: false }}
      searchKeys={["leave_type", "reason", "status"]}
      columns={[
        { key: "leave_type", header: "Type" },
        { key: "start_date", header: "Start" },
        { key: "end_date", header: "End" },
        { key: "days", header: "Days" },
        { key: "status", header: "Status" },
        { key: "reason", header: "Reason" },
      ]}
      fields={[
        { name: "leave_type", label: "Leave Type", type: "select", required: true, defaultValue: "annual",
          options: [{value:"annual",label:"Annual"},{value:"sick",label:"Sick"},{value:"maternity",label:"Maternity"},{value:"paternity",label:"Paternity"},{value:"unpaid",label:"Unpaid"},{value:"compassionate",label:"Compassionate"}] },
        { name: "start_date", label: "Start Date", type: "date", required: true },
        { name: "end_date", label: "End Date", type: "date", required: true },
        { name: "days", label: "Days", type: "number", required: true, defaultValue: 1 },
        { name: "status", label: "Status", type: "select", defaultValue: "pending",
          options: [{value:"pending",label:"Pending"},{value:"approved",label:"Approved"},{value:"rejected",label:"Rejected"},{value:"cancelled",label:"Cancelled"}] },
        { name: "reason", label: "Reason", type: "textarea" },
      ]}
    />
  ),
});
