import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { supabase } from "@/integrations/supabase/client";

type Balance = {
  employee_id: string;
  name: string;
  entitlement: number;
  taken: number;
  pending: number;
  balance: number;
};

function LeaveBalances() {
  const [rows, setRows] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data: emps } = await supabase.from("employees")
        .select("id, first_name, last_name, leave_days_entitlement")
        .eq("status", "active")
        .order("first_name");
      const { data: reqs } = await supabase.from("leave_requests")
        .select("employee_id, days, status")
        .in("leave_type", ["annual"]);
      const byEmp = new Map<string, { taken: number; pending: number }>();
      (reqs ?? []).forEach(r => {
        const b = byEmp.get(r.employee_id) ?? { taken: 0, pending: 0 };
        if (r.status === "approved") b.taken += Number(r.days ?? 0);
        else if (r.status === "pending") b.pending += Number(r.days ?? 0);
        byEmp.set(r.employee_id, b);
      });
      setRows((emps ?? []).map(e => {
        const b = byEmp.get(e.id) ?? { taken: 0, pending: 0 };
        const ent = Number(e.leave_days_entitlement ?? 24);
        return {
          employee_id: e.id,
          name: `${e.first_name} ${e.last_name}`,
          entitlement: ent, taken: b.taken, pending: b.pending,
          balance: ent - b.taken - b.pending,
        };
      }));
      setLoading(false);
    })();
  }, []);
  if (loading) return <div className="text-sm text-muted-foreground p-4">Loading balances…</div>;
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="font-semibold">Annual Leave Balances</h2>
          <p className="text-xs text-muted-foreground">Entitlement − Approved − Pending = Available</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left p-3">Employee</th>
            <th className="text-right p-3">Entitlement</th>
            <th className="text-right p-3">Taken</th>
            <th className="text-right p-3">Pending</th>
            <th className="text-right p-3">Balance</th>
            <th className="p-3 w-40">Usage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const pct = r.entitlement ? Math.min(100, Math.max(0, ((r.taken + r.pending) / r.entitlement) * 100)) : 0;
            const low = r.balance <= 3;
            return (
              <tr key={r.employee_id} className="border-t">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-right">{r.entitlement.toFixed(1)}</td>
                <td className="p-3 text-right">{r.taken.toFixed(1)}</td>
                <td className="p-3 text-right text-amber-600">{r.pending.toFixed(1)}</td>
                <td className={`p-3 text-right font-semibold ${low ? "text-rose-600" : "text-emerald-600"}`}>{r.balance.toFixed(1)}</td>
                <td className="p-3">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No active employees.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/leave")({
  head: () => ({ meta: [{ title: "Leave Management — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="space-y-6">
      <LeaveBalances />
      <SimpleCrud
      module="payroll"
      description="Leave requests, balances and register"
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
            options: [{value:"annual",label:"Annual"},{value:"sick",label:"Sick"},{value:"maternity",label:"Maternity"},{value:"paternity",label:"Paternity"},{value:"unpaid",label:"Unpaid"},{value:"compassionate",label:"Compassionate"},{value:"study",label:"Study"},{value:"bereavement",label:"Bereavement"}] },
          { name: "start_date", label: "Start Date", type: "date", required: true },
          { name: "end_date", label: "End Date", type: "date", required: true },
          { name: "days", label: "Days", type: "number", required: true, defaultValue: 1 },
          { name: "status", label: "Status", type: "select", defaultValue: "pending",
            options: [{value:"pending",label:"Pending"},{value:"approved",label:"Approved"},{value:"rejected",label:"Rejected"},{value:"cancelled",label:"Cancelled"}] },
          { name: "reason", label: "Reason", type: "textarea" },
        ]}
      />
    </div>
  ),
});
