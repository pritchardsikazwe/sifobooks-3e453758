import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RESERVATION_STATUSES, statusTone, toneClass, today, uid } from "@/lib/restaurant";
import { cn } from "@/lib/utils";
import { ExportMenu } from "@/lib/exports";
import { CalendarClock, Plus, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/reservations")({
  head: () => ({
    meta: [
      { title: "Reservations & Waiting List — SifoBooks" },
      { name: "description", content: "Take restaurant bookings, manage the waiting list and seat guests straight onto a table and open check." },
      { property: "og:title", content: "Reservations & Waiting List — SifoBooks" },
      { property: "og:description", content: "Bookings, guest counts, special requests and seating in one screen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reservations,
});

const db: any = supabase;
const blank = { guest_name: "", phone: "", email: "", guests: 2, reserved_date: today(), reserved_time: "18:00", table_id: "", special_requests: "" };

function Reservations() {
  const [rows, setRows] = useState<any[]>([]);
  const [wait, setWait] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [date, setDate] = useState(today());
  const [form, setForm] = useState({ ...blank });
  const [wform, setWform] = useState({ guest_name: "", phone: "", guests: 2, quoted_minutes: 15 });

  const load = async () => {
    const u = await uid();
    if (!u) return;
    const [r, w, t] = await Promise.all([
      db.from("restaurant_reservations").select("*").eq("user_id", u).eq("reserved_date", date).order("reserved_time"),
      db.from("restaurant_waitlist").select("*").eq("user_id", u).eq("status", "waiting").order("created_at"),
      db.from("restaurant_tables").select("*").eq("user_id", u).order("name"),
    ]);
    setRows(r.data ?? []); setWait(w.data ?? []); setTables(t.data ?? []);
  };
  useEffect(() => { load(); }, [date]);

  const book = async () => {
    if (!form.guest_name.trim()) return toast.error("Guest name is required");
    const u = await uid();
    const { error } = await db.from("restaurant_reservations").insert({
      user_id: u, ...form, table_id: form.table_id || null, status: "confirmed",
    });
    if (error) return toast.error(error.message);
    toast.success("Reservation booked");
    setForm({ ...blank, reserved_date: date });
    load();
  };

  const setStatus = async (r: any, status: string) => {
    const { error } = await db.from("restaurant_reservations").update({ status, updated_at: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    if (status === "seated" && r.table_id) {
      await db.from("restaurant_tables").update({ status: "occupied", occupied_since: new Date().toISOString() }).eq("id", r.table_id);
    }
    if (["completed", "cancelled", "no show"].includes(status) && r.table_id) {
      await db.from("restaurant_tables").update({ status: "dirty", occupied_since: null }).eq("id", r.table_id);
    }
    toast.success(`Reservation ${status}`);
    load();
  };

  const addWait = async () => {
    if (!wform.guest_name.trim()) return toast.error("Guest name is required");
    const u = await uid();
    const { error } = await db.from("restaurant_waitlist").insert({ user_id: u, ...wform });
    if (error) return toast.error(error.message);
    setWform({ guest_name: "", phone: "", guests: 2, quoted_minutes: 15 });
    toast.success("Added to waiting list");
    load();
  };

  const seatWait = async (w: any) => {
    await db.from("restaurant_waitlist").update({ status: "seated", updated_at: new Date().toISOString() }).eq("id", w.id);
    toast.success(`${w.guest_name} seated`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight">Reservations</h1>
          <p className="text-sm text-muted-foreground">{rows.length} bookings · {wait.length} waiting</p>
        </div>
        <Input type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        <ExportMenu filename={`reservations-${date}`} title="Reservations" rows={rows.map((r) => ({
          Time: String(r.reserved_time).slice(0, 5), Guest: r.guest_name, Phone: r.phone ?? "",
          Guests: r.guests, Table: tables.find((t) => t.id === r.table_id)?.name ?? "", Status: r.status,
        }))} />
      </div>

      <Card className="p-4 rounded-2xl grid gap-2 md:grid-cols-4">
        <Input placeholder="Guest name" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
        <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input type="number" placeholder="Guests" value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })} />
        <Input type="date" value={form.reserved_date} onChange={(e) => setForm({ ...form, reserved_date: e.target.value })} />
        <Input type="time" value={form.reserved_time} onChange={(e) => setForm({ ...form, reserved_time: e.target.value })} />
        <Select value={form.table_id || "none"} onValueChange={(v) => setForm({ ...form, table_id: v === "none" ? "" : v })}>
          <SelectTrigger><SelectValue placeholder="Table" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No table yet</SelectItem>
            {tables.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} · {t.seats} seats</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={book}><Plus className="h-4 w-4 mr-1" /> Book table</Button>
        <Textarea className="md:col-span-4" placeholder="Special requests" value={form.special_requests}
          onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 rounded-2xl lg:col-span-2">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Bookings for {date}</div>
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">No reservations for this date.</p> : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
                  <span className="font-semibold w-14">{String(r.reserved_time).slice(0, 5)}</span>
                  <span className="font-medium">{r.guest_name}</span>
                  <span className="text-sm text-muted-foreground">{r.guests} guests {r.phone ? `· ${r.phone}` : ""}</span>
                  <span className="text-sm text-muted-foreground">{tables.find((t) => t.id === r.table_id)?.name ?? "unassigned"}</span>
                  <span className={cn("text-[11px] uppercase rounded-full border px-2 py-0.5", toneClass[statusTone(r.status)])}>{r.status}</span>
                  <Select value={r.status} onValueChange={(v) => setStatus(r, v)}>
                    <SelectTrigger className="h-8 w-36 ml-auto"><SelectValue /></SelectTrigger>
                    <SelectContent>{RESERVATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  {r.special_requests && <p className="w-full text-xs text-muted-foreground">Note: {r.special_requests}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 rounded-2xl">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Waiting list</div>
          <div className="grid gap-2 mb-3">
            <Input placeholder="Guest name" value={wform.guest_name} onChange={(e) => setWform({ ...wform, guest_name: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Phone" value={wform.phone} onChange={(e) => setWform({ ...wform, phone: e.target.value })} />
              <Input type="number" value={wform.guests} onChange={(e) => setWform({ ...wform, guests: Number(e.target.value) })} />
              <Input type="number" value={wform.quoted_minutes} onChange={(e) => setWform({ ...wform, quoted_minutes: Number(e.target.value) })} />
            </div>
            <Button variant="outline" onClick={addWait}>Add to list</Button>
          </div>
          {wait.length === 0 ? <p className="text-sm text-muted-foreground">Nobody waiting.</p> : (
            <ul className="space-y-2">
              {wait.map((w) => (
                <li key={w.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{w.guest_name} · {w.guests} · ~{w.quoted_minutes}m</span>
                  <Button size="sm" variant="outline" onClick={() => seatWait(w)}>Seat</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
