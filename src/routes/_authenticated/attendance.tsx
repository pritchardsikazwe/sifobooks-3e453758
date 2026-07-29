import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { supabase } from "@/integrations/supabase/client";

function AttendancePage() {
  const [employees, setEmployees] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .order("first_name");
      setEmployees(
        (data ?? []).map(e => ({
          value: e.id,
          label: `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "Employee",
        })),
      );
    })();
  }, []);

  return (
    <SimpleCrud
      title="Attendance"
      icon={CalendarCheck}
      table="attendance"
      orderBy={{ column: "attendance_date", ascending: false }}
      searchKeys={["status", "notes"]}
      columns={[
        { key: "attendance_date", header: "Date" },
        { key: "employee_id", header: "Employee",
          render: (row: any) => employees.find(e => e.value === row.employee_id)?.label ?? "—" },
        { key: "clock_in", header: "Clock In" },
        { key: "clock_out", header: "Clock Out" },
        { key: "hours_worked", header: "Hours" },
        { key: "status", header: "Status" },
      ]}
      fields={[
        { name: "employee_id", label: "Employee", type: "select", required: true, options: employees },
        { name: "attendance_date", label: "Date", type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        { name: "clock_in", label: "Clock In (HH:MM)", type: "text" },
        { name: "clock_out", label: "Clock Out (HH:MM)", type: "text" },
        { name: "hours_worked", label: "Hours Worked", type: "number" },
        { name: "status", label: "Status", type: "select", defaultValue: "present",
          options: [{ value: "present", label: "Present" }, { value: "absent", label: "Absent" }, { value: "late", label: "Late" }, { value: "leave", label: "On Leave" }, { value: "holiday", label: "Holiday" }] },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "Attendance — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: AttendancePage,
});

