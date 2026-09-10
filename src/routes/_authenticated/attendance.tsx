import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { supabase } from "@/integrations/supabase/client";

/** Employee attendance always links to an EXISTING employee record for this tenant. */
const EMPLOYEE_LOOKUP = {
  table: "employees",
  labelColumn: "first_name",
  labelColumns: ["last_name"],
  codeColumn: "employee_code",
  metaColumns: ["status", "phone", "email"],
  createTo: "/employees",
  createLabel: "New employee",
  emptyTitle: "No employees found for this company.",
} as const;

function AttendancePage() {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, employee_code, first_name, last_name")
        .order("first_name");
      setNames(Object.fromEntries((data ?? []).map(e => [
        e.id,
        `${e.employee_code ? e.employee_code + " · " : ""}${`${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "Employee"}`,
      ])));
    })();
  }, []);

  return (
    <SimpleCrud
      module="payroll"
      description="Daily attendance capture against existing employee records"
      title="Attendance"
      icon={CalendarCheck}
      table="attendance"
      orderBy={{ column: "attendance_date", ascending: false }}
      searchKeys={["status", "notes"]}
      columns={[
        { key: "attendance_date", header: "Date" },
        { key: "employee_id", header: "Employee", render: (row: any) => names[row.employee_id] ?? "—" },
        { key: "clock_in", header: "Clock In" },
        { key: "clock_out", header: "Clock Out" },
        { key: "hours_worked", header: "Hours", align: "right" },
        { key: "status", header: "Status" },
      ]}
      fields={[
        { name: "employee_id", label: "Employee", type: "lookup", required: true, lookup: { ...EMPLOYEE_LOOKUP, labelColumns: ["last_name"], metaColumns: ["status", "phone", "email"] } },
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
