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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MetricTile } from "@/components/industry/IndustryKit";

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
  const [bookOpen, setBookOpen] = useState(false);

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

  const covers = rows.filter((r) => !["cancelled", "no show"].includes((r.status ?? "").toLowerCase()))
    .reduce((s, r) => s + Number(r.guests || 0), 0);
  const seats = tables.reduce((s, t) => s + Number(t.seats || 0), 0);
  const seated = rows.filter((r) => (r.status ?? "").toLowerCase() === "seated").length;
  const utilisation = seats ? Math.min(100, (covers / seats) * 100) : 0;

  const slots = Array.from({ length: 14 }, (_, i) => i + 9); // 09:00 – 22:00 service window
  const byHour = new Map<number, any[]>();
  rows.forEach((r) => {
    const h = Number(String(r.reserved_time).slice(0, 2));
    byHour.set(h, [...(byHour.get(h) ?? []), r]);
  });
  const peak = Math.max(1, ...slots.map((h) => (byHour.get(h) ?? []).reduce((s, r) => s + Number(r.guests || 0), 0)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight">Reservations</h1>
          <p className="text-sm text-muted-foreground">Bookings, covers and the waiting list for one service day.</p>
        </div>
        <Input type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        <ExportMenu filename={`reservations-${date}`} title="Reservations" rows={rows.map((r) => ({
          Time: String(r.reserved_time).slice(0, 5), Guest: r.guest_name, Phone: r.phone ?? "",
          Guests: r.guests, Table: tables.find((t) => t.id === r.table_id)?.name ?? "", Status: r.status,
        }))} />
        <Dialog open={bookOpen} onOpenChange={setBookOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New booking</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Book a table</DialogTitle></DialogHeader>
            <div className="grid gap-2 md:grid-cols-2">
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
              <Textarea className="md:col-span-2" placeholder="Special requests" value={form.special_requests}
                onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setBookOpen(false)}>Cancel</Button>
              <Button onClick={book}>Book table</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Bookings" value={String(rows.length)} icon={CalendarClock} />
        <MetricTile label="Covers booked" value={String(covers)} icon={Users} hint={seats ? `${seats} seats on the floor` : "No seat capacity set"} progress={utilisation} tone={utilisation > 90 ? "warn" : "good"} />
        <MetricTile label="Seated" value={String(seated)} icon={Users} tone="good" />
        <MetricTile label="Waiting" value={String(wait.length)} icon={Users} tone={wait.length ? "warn" : "good"} />
      </div>

      <Card className="rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4" /> Service timeline · {date}</div>
        <div className="flex h-32 items-end gap-1">
          {slots.map((h) => {
            const list = byHour.get(h) ?? [];
            const c = list.reduce((s, r) => s + Number(r.guests || 0), 0);
            return (
              <div key={h} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn("w-full rounded-t-md transition-all", c === 0 ? "bg-muted" : c / Math.max(1, seats) > 0.7 ? "bg-amber-500/80" : "bg-primary/70")}
                  style={{ height: `${Math.max(4, (c / peak) * 100)}%` }}
                  title={`${c} covers at ${h}:00`}
                />
                <span className="text-[10px] text-muted-foreground">{h}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl p-4 lg:col-span-2">
          <div className="mb-3 text-sm font-semibold">Bookings for {date}</div>
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No reservations for this date. Use “New booking” to take one.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map((r) => (
                <div key={r.id} className={cn("rounded-2xl border-2 p-3", toneClass[statusTone(r.status)])}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-lg font-bold tabular-nums">{String(r.reserved_time).slice(0, 5)}</div>
                      <div className="truncate font-medium">{r.guest_name}</div>
                    </div>
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase">{r.status}</span>
                  </div>
                  <div className="mt-1 text-xs opacity-80">
                    {r.guests} guests{r.phone ? ` · ${r.phone}` : ""} · {tables.find((t) => t.id === r.table_id)?.name ?? "table unassigned"}
                  </div>
                  {r.special_requests ? <p className="mt-2 rounded-lg bg-background/60 px-2 py-1 text-xs">Note: {r.special_requests}</p> : null}
                  <Select value={r.status} onValueChange={(v) => setStatus(r, v)}>
                    <SelectTrigger className="mt-3 h-8 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>{RESERVATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> Waiting list</div>
          <div className="mb-3 grid gap-2">
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
                <li key={w.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
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
