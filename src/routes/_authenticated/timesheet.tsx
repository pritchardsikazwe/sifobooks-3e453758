import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { EntitySelector, type EntityOption } from "@/components/selectors/EntitySelector";
import { ChevronLeft, ChevronRight, Save, Clock } from "lucide-react";

type Employee = { id: string; first_name: string; last_name: string; employee_code?: string | null; email?: string | null; phone?: string | null };
type Entry = { id?: string; employee_id: string | null; work_date: string; hours: number; description?: string | null; billable?: boolean };

function startOfWeek(d: Date) {
  const c = new Date(d); const day = (c.getDay() + 6) % 7; // Monday = 0
  c.setDate(c.getDate() - day); c.setHours(0,0,0,0); return c;
}
function addDays(d: Date, n: number) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }
function iso(d: Date) { return d.toISOString().slice(0, 10); }
const DOW = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function Timesheet() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empId, setEmpId] = useState<string>("");
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()));
  const [grid, setGrid] = useState<Record<string, Entry>>({});
  const [uid, setUid] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const employeeOptions = useMemo<EntityOption[]>(() => employees.map(e => ({
    id: e.id,
    code: e.employee_code ?? null,
    label: `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "—",
    meta: [e.email, e.phone].filter(Boolean).join(" · ") || null,
  })), [employees]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUid(user.id);
      const { data } = await supabase.from("employees").select("id, first_name, last_name, employee_code, email, phone").eq("status","active").order("first_name");
      setEmployees(data ?? []);
      if (!empId && data?.[0]) setEmpId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!empId) return;
    (async () => {
      setLoading(true);
      const from = iso(weekStart), to = iso(addDays(weekStart, 6));
      const { data } = await supabase.from("time_entries")
        .select("id, employee_id, work_date, hours, description, billable")
        .eq("employee_id", empId).gte("work_date", from).lte("work_date", to);
      const g: Record<string, Entry> = {};
      weekDays.forEach(d => {
        const key = iso(d);
        const existing = (data ?? []).find(e => e.work_date === key);
        g[key] = existing ?? { employee_id: empId, work_date: key, hours: 0, description: "", billable: true };
      });
      setGrid(g);
      setLoading(false);
    })();
  }, [empId, weekStart.getTime()]);

  const totalHours = Object.values(grid).reduce((s, e) => s + Number(e.hours || 0), 0);

  const save = async () => {
    if (!uid) { toast.error("Not signed in"); return; }
    const upserts = Object.values(grid).map(e => ({
      ...(e.id ? { id: e.id } : {}),
      user_id: uid,
      employee_id: empId,
      work_date: e.work_date,
      hours: Number(e.hours || 0),
      description: e.description ?? null,
      billable: e.billable ?? true,
    }));
    // Only save rows with hours > 0 or already existing rows we want to update
    const filtered = upserts.filter(u => u.hours > 0 || (u as any).id);
    if (!filtered.length) { toast.info("Nothing to save"); return; }
    const { error } = await supabase.from("time_entries").upsert(filtered as any, { onConflict: "id" });
    if (error) toast.error(error.message); else { toast.success("Timesheet saved"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-emerald-600" />
          <h1 className="text-xl font-semibold">Weekly Timesheet</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="min-w-[220px]">
            <EntitySelector
              label=""
              options={employeeOptions}
              value={empId || null}
              onChange={v => setEmpId(v ?? "")}
              placeholder="Search employees…"
              recentKey="timesheet-employee"
              emptyTitle="No active employees found."
              emptyActionLabel="Go to employees"
              emptyActionTo="/employees"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>This week</Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="save" size="sm" onClick={save} ><Save className="h-4 w-4 mr-1" /> Save</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-muted/40 px-4 py-2 text-xs text-muted-foreground border-b flex items-center justify-between">
          <span>Week of {iso(weekStart)} — {iso(addDays(weekStart, 6))}</span>
          <span>Total: <span className="font-semibold text-emerald-600">{totalHours.toFixed(2)} hrs</span></span>
        </div>
        <div className="grid grid-cols-7">
          {weekDays.map((d, i) => {
            const key = iso(d);
            const e = grid[key];
            const isWeekend = i >= 5;
            return (
              <div key={key} className={`p-3 border-r last:border-r-0 ${isWeekend ? "bg-slate-50" : ""}`}>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{DOW[i]}</div>
                <div className="text-sm font-medium mb-2">{d.getDate()}/{d.getMonth()+1}</div>
                <Input
                  type="number" step="0.25" min="0" max="24"
                  value={e?.hours ?? 0}
                  onChange={ev => setGrid(g => ({ ...g, [key]: { ...g[key], hours: Number(ev.target.value) } }))}
                  className="h-9 text-center font-mono"
                  disabled={loading}
                />
                <Input
                  placeholder="Notes…"
                  value={e?.description ?? ""}
                  onChange={ev => setGrid(g => ({ ...g, [key]: { ...g[key], description: ev.target.value } }))}
                  className="h-8 mt-2 text-xs"
                  disabled={loading}
                />
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Enter daily hours (0.25 = 15 mins). Weekend cells are shaded. Saved entries feed the payroll overtime calculation for the pay period.
      </p>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/timesheet")({
  head: () => ({ meta: [{ title: "Weekly Timesheet — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: Timesheet,
});
