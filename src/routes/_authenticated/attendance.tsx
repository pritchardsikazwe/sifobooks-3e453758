import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "Attendance — EdgeCore" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Attendance"
      icon={CalendarCheck}
      table="attendance"
      orderBy={{ column: "attendance_date", ascending: false }}
      searchKeys={["status", "notes"]}
      columns={[
        { key: "attendance_date", header: "Date" },
        { key: "clock_in", header: "Clock In" },
        { key: "clock_out", header: "Clock Out" },
        { key: "hours_worked", header: "Hours" },
        { key: "status", header: "Status" },
      ]}
      fields={[
        { name: "attendance_date", label: "Date", type: "date", required: true, defaultValue: new Date().toISOString().slice(0,10) },
        { name: "hours_worked", label: "Hours Worked", type: "number" },
        { name: "status", label: "Status", type: "select", defaultValue: "present",
          options: [{value:"present",label:"Present"},{value:"absent",label:"Absent"},{value:"late",label:"Late"},{value:"leave",label:"On Leave"},{value:"holiday",label:"Holiday"}] },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  ),
});
