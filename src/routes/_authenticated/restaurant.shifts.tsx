import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { statusTone, toneClass, today, uid } from "@/lib/restaurant";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/shifts")({
  head: () => ({
    meta: [
      { title: "Staff Shifts & Clock-In — SifoBooks Restaurant" },
      { name: "description", content: "Clock restaurant staff in and out, declare tips, and see hours worked and sales per server for the business day." },
      { property: "og:title", content: "Staff Shifts & Clock-In — SifoBooks Restaurant" },
      { property: "og:description", content: "Clock-in, clock-out, declared tips and sales per server." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shifts,
});

const db: any = supabase;
const ROLES = ["server", "cashier", "chef", "bartender", "runner", "manager", "driver"];

function Shifts() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [form, setForm] = useState({ staff_name: "", role: "server" });
  const [tips, setTips] = useState<Record<string, number>>({});

  const load = async () => {
    const u = await uid();
    if (!u) return;
    const [s, o] = await Promise.all([
      db.from("restaurant_shifts").select("*").eq("user_id", u).order("clock_in", { ascending: false }).limit(200),
      db.from("restaurant_orders").select("server_name,total,status,business_date").eq("user_id", u).eq("business_date", today()).eq("status", "paid"),
    ]);
    setShifts(s.data ?? []); setOrders(o.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const salesByServer = useMemo(() => {
    const m = new Map<string, number>();
    orders.forEach((o) => m.set((o.server_name || "—").toLowerCase(), (m.get((o.server_name || "—").toLowerCase()) ?? 0) + Number(o.total || 0)));
    return m;
  }, [orders]);

  const clockIn = async () => {
    if (!form.staff_name.trim()) return toast.error("Enter the staff name");
    const u = await uid();
    const { error } = await db.from("restaurant_shifts").insert({
      user_id: u, staff_name: form.staff_name.trim(), role: form.role,
      business_date: today(), clock_in: new Date().toISOString(), declared_tips: 0,
    });
    if (error) return toast.error(error.message);
    setForm({ ...form, staff_name: "" });
    toast.success("Clocked in"); load();
  };

  const clockOut = async (s: any) => {
    const { error } = await db.from("restaurant_shifts").update({
      clock_out: new Date().toISOString(), declared_tips: Number(tips[s.id] ?? s.declared_tips ?? 0),
    }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Clocked out"); load();
  };

  const hours = (s: any) => {
    const end = s.clock_out ? new Date(s.clock_out) : new Date();
    return ((end.getTime() - new Date(s.clock_in).getTime()) / 3600000);
  };

  const openShifts = shifts.filter((s) => !s.clock_out);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Staff shifts</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">On shift now</div><div className="text-2xl font-semibold">{openShifts.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Hours today</div><div className="text-2xl font-semibold">{shifts.filter(s => s.business_date === today()).reduce((a, s) => a + hours(s), 0).toFixed(1)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Declared tips today</div><div className="text-2xl font-semibold">{fmtMoney(shifts.filter(s => s.business_date === today()).reduce((a, s) => a + Number(s.declared_tips || 0), 0))}</div></Card>
      </div>

      <Card className="p-4 grid gap-2 sm:grid-cols-3">
        <Input placeholder="Staff name" value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })} />
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={clockIn}>Clock in</Button>
      </Card>

      <div className="flex justify-end">
        <ExportMenu filename={`staff-shifts-${today()}`} title="Staff shifts" rows={shifts.map((s) => ({
          Staff: s.staff_name, Role: s.role, Date: s.business_date,
          "Clock in": new Date(s.clock_in).toLocaleTimeString(),
          "Clock out": s.clock_out ? new Date(s.clock_out).toLocaleTimeString() : "—",
          Hours: hours(s).toFixed(2), Tips: Number(s.declared_tips || 0),
        }))} />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>
            <th className="p-3">Staff</th><th className="p-3">Role</th><th className="p-3">Date</th>
            <th className="p-3">In</th><th className="p-3">Out</th><th className="p-3 text-right">Hours</th>
            <th className="p-3 text-right">Sales today</th><th className="p-3">Tips</th><th className="p-3" />
          </tr></thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.staff_name}</td>
                <td className="p-3"><span className={cn("rounded-full border px-2 py-0.5 text-[11px] capitalize", toneClass[statusTone(s.clock_out ? "closed" : "open")])}>{s.role}</span></td>
                <td className="p-3">{s.business_date}</td>
                <td className="p-3">{new Date(s.clock_in).toLocaleTimeString()}</td>
                <td className="p-3">{s.clock_out ? new Date(s.clock_out).toLocaleTimeString() : "—"}</td>
                <td className="p-3 text-right">{hours(s).toFixed(2)}</td>
                <td className="p-3 text-right">{fmtMoney(salesByServer.get((s.staff_name || "").toLowerCase()) ?? 0)}</td>
                <td className="p-3">
                  {s.clock_out ? fmtMoney(Number(s.declared_tips || 0)) : (
                    <Input className="h-8 w-24" type="number" value={tips[s.id] ?? 0} onChange={(e) => setTips({ ...tips, [s.id]: Number(e.target.value) })} />
                  )}
                </td>
                <td className="p-3 text-right">{!s.clock_out && <Button size="sm" variant="outline" onClick={() => clockOut(s)}>Clock out</Button>}</td>
              </tr>
            ))}
            {!shifts.length && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No shifts recorded yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
