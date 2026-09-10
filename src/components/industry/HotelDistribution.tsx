import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Board, EmptyState, MetricTile, SearchBox, StatusPill, Tile, TileGrid } from "@/components/industry/IndustryKit";
import {
  RATE_TYPES, availableRooms, occupancyFor, quoteStay, resolveRatePlan, type RatePlan,
} from "@/lib/hotel-rates";
import { CHANNEL_CATALOG, adapterFor, attemptChannelSync, channelTone, type ChannelRow } from "@/lib/hotel-channels";
import {
  computeCharge, currentUserId, loadTaxProfile, nightsBetween, todayISO, type TaxProfile,
} from "@/lib/hospitality";
import { CalendarRange, Globe2, Plug, Plus, Tag, Wallet, BedDouble } from "lucide-react";

const db: any = supabase;
const money = (n: number) => fmtMoney(n);

function useTenant() {
  const [uid, setUid] = useState<string | null>(null);
  const [tax, setTax] = useState<TaxProfile | null>(null);
  useEffect(() => {
    (async () => {
      const u = await currentUserId();
      setUid(u);
      if (u) setTax(await loadTaxProfile(u));
    })();
  }, []);
  return { uid, tax };
}

const Loading = () => (
  <div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
);

/* ================================================================== *
 * RATES & AVAILABILITY
 * ================================================================== */

export function RatesWorkspace() {
  const { uid } = useTenant();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [res, setRes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(todayISO());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const blank = {
    code: "", name: "", room_type_id: "", nightly_rate: 0, weekend_rate: "", min_stay: 1,
    max_occupancy: 2, extra_adult_rate: 0, extra_child_rate: 0, customer_id: "",
    rate_type: "standard", season_start: "", season_end: "", priority: 0, includes: "", active: true,
  };
  const [form, setForm] = useState<any>({ ...blank });

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const horizon = new Date(new Date(from).getTime() + 30 * 86400000).toISOString().slice(0, 10);
    const [p, t, r, rs, c] = await Promise.all([
      db.from("hotel_rate_plans").select("*").eq("user_id", uid).order("priority", { ascending: false }),
      db.from("hotel_room_types").select("*").eq("user_id", uid).order("name"),
      db.from("hotel_rooms").select("*").eq("user_id", uid).order("number"),
      db.from("hotel_reservations").select("id,room_id,check_in,check_out,status").eq("user_id", uid).lte("check_in", horizon).gte("check_out", from),
      db.from("customers").select("id,name").eq("user_id", uid).order("name").limit(300),
    ]);
    setPlans(p.data ?? []); setTypes(t.data ?? []); setRooms(r.data ?? []);
    setRes(rs.data ?? []); setCustomers(c.data ?? []);
    setLoading(false);
  }, [uid, from]);
  useEffect(() => { load(); }, [load]);

  const typeName = useMemo(() => new Map(types.map((t) => [t.id, t.name])), [types]);
  const custName = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);

  const save = async () => {
    if (!uid) return;
    if (!form.code.trim() || !form.name.trim()) return toast.error("Give the rate plan a code and a name");
    const payload = {
      user_id: uid,
      code: form.code.trim(),
      name: form.name.trim(),
      room_type_id: form.room_type_id || null,
      nightly_rate: Number(form.nightly_rate || 0),
      weekend_rate: form.weekend_rate === "" ? null : Number(form.weekend_rate),
      min_stay: Math.max(1, Number(form.min_stay || 1)),
      max_occupancy: form.max_occupancy === "" ? null : Number(form.max_occupancy),
      extra_adult_rate: Number(form.extra_adult_rate || 0),
      extra_child_rate: Number(form.extra_child_rate || 0),
      customer_id: form.customer_id || null,
      rate_type: form.rate_type,
      season_start: form.season_start || null,
      season_end: form.season_end || null,
      priority: Number(form.priority || 0),
      includes: form.includes || null,
      active: Boolean(form.active),
    };
    const { error } = editing
      ? await db.from("hotel_rate_plans").update(payload).eq("id", editing.id)
      : await db.from("hotel_rate_plans").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Rate plan updated" : "Rate plan added");
    setOpen(false); setEditing(null); setForm({ ...blank });
    load();
  };

  const startEdit = (p: any) => {
    setEditing(p);
    setForm({
      ...blank, ...p,
      room_type_id: p.room_type_id ?? "",
      customer_id: p.customer_id ?? "",
      weekend_rate: p.weekend_rate ?? "",
      max_occupancy: p.max_occupancy ?? "",
      season_start: p.season_start ?? "",
      season_end: p.season_end ?? "",
      includes: p.includes ?? "",
    });
    setOpen(true);
  };

  const days = Array.from({ length: 14 }, (_, i) => new Date(new Date(from).getTime() + i * 86400000).toISOString().slice(0, 10));
  const filtered = plans.filter((p) =>
    !q || `${p.code} ${p.name} ${typeName.get(p.room_type_id) ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Rate plans" value={String(plans.filter((p) => p.active).length)} icon={Tag} />
        <MetricTile label="Room types" value={String(types.length)} icon={BedDouble} />
        <MetricTile label="Sellable rooms" value={String(rooms.filter((r) => r.active !== false && !r.out_of_order).length)} icon={BedDouble} tone="good" />
        <MetricTile label="Contract rates" value={String(plans.filter((p) => p.customer_id).length)} icon={Wallet} tone="info" />
      </div>

      <Board
        title="Availability — next 14 nights"
        hint="Sellable rooms less confirmed and in-house stays. Out-of-order rooms are excluded."
        right={<Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />}
      >
        <div className="overflow-x-auto p-4">
          <div className="flex min-w-max gap-2">
            {days.map((d) => {
              const o = occupancyFor(rooms as any, res as any, d);
              const free = o.sellable - o.occupied;
              return (
                <div key={d} className="w-24 rounded-xl border p-2 text-center">
                  <div className="text-[11px] uppercase text-muted-foreground">{new Date(d).toLocaleDateString(undefined, { weekday: "short" })}</div>
                  <div className="text-xs text-muted-foreground">{d.slice(5)}</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{free}</div>
                  <div className="text-[11px] text-muted-foreground">free · {o.pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </Board>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[220px] flex-1"><SearchBox value={q} onChange={setQ} placeholder="Search your rate plans…" /></div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ ...blank }); } }}>
          <DialogTrigger asChild><Button variant="outline"><Plus className="mr-1 h-4 w-4" /> New rate plan</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit rate plan" : "New rate plan"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <Label>Room type</Label>
                <Select value={form.room_type_id || "any"} onValueChange={(v) => setForm({ ...form, room_type_id: v === "any" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All room types</SelectItem>
                    {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rate type</Label>
                <Select value={form.rate_type} onValueChange={(v) => setForm({ ...form, rate_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RATE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nightly rate</Label><Input type="number" value={form.nightly_rate} onChange={(e) => setForm({ ...form, nightly_rate: e.target.value })} /></div>
              <div><Label>Weekend rate (optional)</Label><Input type="number" value={form.weekend_rate} onChange={(e) => setForm({ ...form, weekend_rate: e.target.value })} /></div>
              <div><Label>Minimum stay (nights)</Label><Input type="number" value={form.min_stay} onChange={(e) => setForm({ ...form, min_stay: e.target.value })} /></div>
              <div><Label>Rate includes occupancy of</Label><Input type="number" value={form.max_occupancy} onChange={(e) => setForm({ ...form, max_occupancy: e.target.value })} /></div>
              <div><Label>Extra adult / night</Label><Input type="number" value={form.extra_adult_rate} onChange={(e) => setForm({ ...form, extra_adult_rate: e.target.value })} /></div>
              <div><Label>Extra child / night</Label><Input type="number" value={form.extra_child_rate} onChange={(e) => setForm({ ...form, extra_child_rate: e.target.value })} /></div>
              <div><Label>Season from</Label><Input type="date" value={form.season_start} onChange={(e) => setForm({ ...form, season_start: e.target.value })} /></div>
              <div><Label>Season to</Label><Input type="date" value={form.season_end} onChange={(e) => setForm({ ...form, season_end: e.target.value })} /></div>
              <div>
                <Label>Contract company (optional)</Label>
                <Select value={form.customer_id || "none"} onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Open to everyone</SelectItem>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>What the rate includes</Label><Textarea value={form.includes} onChange={(e) => setForm({ ...form, includes: e.target.value })} /></div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <span className="text-sm">Available for sale</span>
              </div>
            </div>
            <DialogFooter><Button onClick={save}>{editing ? "Save changes" : "Add rate plan"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Board title="Rate plans" hint="Select a plan to edit it. Contract rates apply only to their company.">
        {filtered.length === 0 ? (
          <EmptyState title="No rate plans yet" message="Add the rates you actually sell — season, weekend, corporate contract or promotional." action={{ label: "Room types", to: "/hotel/rooms" }} />
        ) : (
          <TileGrid>
            {filtered.map((p) => (
              <Tile
                key={p.id}
                title={p.name}
                subtitle={`${p.code} · ${typeName.get(p.room_type_id) ?? "All room types"}`}
                meta={`${money(Number(p.nightly_rate))} / night${p.weekend_rate ? ` · ${money(Number(p.weekend_rate))} weekend` : ""}`}
                badge={<StatusPill status={p.active ? p.rate_type : "inactive"} />}
                status={p.active ? (p.customer_id ? "info" : "good") : "muted"}
                onClick={() => startEdit(p)}
              />
            ))}
          </TileGrid>
        )}
      </Board>

      {plans.some((p) => p.customer_id) ? (
        <Board title="Contract rates" hint="Negotiated company rates, applied automatically when the booking is for that company.">
          <div className="divide-y">
            {plans.filter((p) => p.customer_id).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="truncate">{custName.get(p.customer_id) ?? "Company"}</span>
                <span className="truncate text-muted-foreground">{p.name}</span>
                <span className="tabular-nums font-medium">{money(Number(p.nightly_rate))}</span>
              </div>
            ))}
          </div>
        </Board>
      ) : null}
    </div>
  );
}

/* ================================================================== *
 * BOOKING ENGINE — availability → room & rate → guest → extras → deposit
 * ================================================================== */

const EXTRAS = [
  { key: "breakfast", label: "Breakfast", category: "food", price: 0 },
  { key: "airport_transfer", label: "Airport transfer", category: "transfer", price: 0 },
  { key: "late_checkout", label: "Late checkout", category: "other", price: 0 },
];

export function BookingEngine() {
  const { uid, tax } = useTenant();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [res, setRes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const [stay, setStay] = useState({
    check_in: todayISO(),
    check_out: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    adults: 2, children: 0, room_type_id: "", customer_id: "",
  });
  const [roomId, setRoomId] = useState("");
  const [planId, setPlanId] = useState("");
  const [guest, setGuest] = useState({ guest_name: "", phone: "", email: "", company: "", special_requests: "" });
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [deposit, setDeposit] = useState(0);
  const [source, setSource] = useState("direct_web");

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const [r, t, p, rs, c, ch] = await Promise.all([
      db.from("hotel_rooms").select("*").eq("user_id", uid).order("number"),
      db.from("hotel_room_types").select("*").eq("user_id", uid).order("name"),
      db.from("hotel_rate_plans").select("*").eq("user_id", uid).eq("active", true),
      db.from("hotel_reservations").select("id,room_id,check_in,check_out,status").eq("user_id", uid).gte("check_out", todayISO()),
      db.from("customers").select("id,name,phone,email").eq("user_id", uid).order("name").limit(300),
      db.from("hotel_channels").select("*").eq("user_id", uid).eq("active", true),
    ]);
    setRooms(r.data ?? []); setTypes(t.data ?? []); setPlans(p.data ?? []);
    setRes(rs.data ?? []); setCustomers(c.data ?? []); setChannels(ch.data ?? []);
    setLoading(false);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const nights = nightsBetween(stay.check_in, stay.check_out);
  const free = useMemo(
    () => availableRooms(rooms as any, res as any, stay.check_in, stay.check_out, stay.room_type_id || null),
    [rooms, res, stay],
  );
  const room = free.find((r) => r.id === roomId) ?? null;
  const eligible = useMemo(
    () => plans.filter((p: any) =>
      (!p.room_type_id || !room?.room_type_id || p.room_type_id === room.room_type_id)),
    [plans, room],
  );
  const suggested = useMemo(
    () => resolveRatePlan(plans as RatePlan[], {
      roomTypeId: room?.room_type_id ?? stay.room_type_id ?? null,
      checkIn: stay.check_in, checkOut: stay.check_out,
      adults: stay.adults, children: stay.children, customerId: stay.customer_id || null,
    }),
    [plans, room, stay],
  );
  useEffect(() => { if (!planId && suggested) setPlanId(suggested.id); }, [suggested, planId]);

  const plan = (eligible.find((p: any) => p.id === planId) ?? suggested) as RatePlan | null;
  const quote = plan ? quoteStay(plan, {
    roomTypeId: room?.room_type_id ?? null, checkIn: stay.check_in, checkOut: stay.check_out,
    adults: stay.adults, children: stay.children, customerId: stay.customer_id || null,
  }) : null;

  const extrasTotal = Object.values(extras).reduce((s, v) => s + Number(v || 0), 0);
  const roomNet = quote?.total ?? 0;
  const taxProfile = tax;
  const roomTax = taxProfile ? computeCharge(roomNet, "room", taxProfile) : null;
  const grandTotal = (roomTax?.gross ?? roomNet) + extrasTotal;

  const confirm = async () => {
    if (!uid) return;
    if (!guest.guest_name.trim()) return toast.error("Enter the guest name");
    if (stay.check_out <= stay.check_in) return toast.error("Departure must be after arrival");
    if (roomId && free.every((r) => r.id !== roomId)) return toast.error("That room is no longer available for these dates");
    setBusy(true);
    const reference = `WEB-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await db.from("hotel_reservations").insert({
      user_id: uid,
      customer_id: stay.customer_id || null,
      room_id: roomId || null,
      reference,
      guest_name: guest.guest_name.trim(),
      phone: guest.phone || null,
      email: guest.email || null,
      company: guest.company || null,
      adults: stay.adults,
      children: stay.children,
      check_in: stay.check_in,
      check_out: stay.check_out,
      nightly_rate: quote ? Number((quote.total / Math.max(1, quote.nights)).toFixed(2)) : 0,
      deposit: Number(deposit || 0),
      status: "confirmed",
      source,
      walk_in: false,
      special_requests: [guest.special_requests, ...Object.keys(extras).filter((k) => extras[k])].filter(Boolean).join(" · ") || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${reference} confirmed`);
    setGuest({ guest_name: "", phone: "", email: "", company: "", special_requests: "" });
    setExtras({}); setDeposit(0); setRoomId("");
    load();
  };

  if (loading) return <Loading />;

  const paymentChannel = channels.find((c: any) => c.channel_key === "direct_web");

  return (
    <div className="space-y-4">
      <Board title="1 · Dates & guests" hint="Availability is checked against your real rooms and live bookings.">
        <div className="grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <div><Label>Arrival</Label><Input type="date" value={stay.check_in} onChange={(e) => { setStay({ ...stay, check_in: e.target.value }); setRoomId(""); }} /></div>
          <div><Label>Departure</Label><Input type="date" value={stay.check_out} onChange={(e) => { setStay({ ...stay, check_out: e.target.value }); setRoomId(""); }} /></div>
          <div><Label>Adults</Label><Input type="number" min={1} value={stay.adults} onChange={(e) => setStay({ ...stay, adults: Number(e.target.value) })} /></div>
          <div><Label>Children</Label><Input type="number" min={0} value={stay.children} onChange={(e) => setStay({ ...stay, children: Number(e.target.value) })} /></div>
          <div>
            <Label>Room type</Label>
            <Select value={stay.room_type_id || "any"} onValueChange={(v) => { setStay({ ...stay, room_type_id: v === "any" ? "" : v }); setRoomId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Booking source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CHANNEL_CATALOG.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </Board>

      <Board title={`2 · Available rooms — ${nights} night${nights === 1 ? "" : "s"}`} hint="Only rooms free for the whole stay are shown. Overbooking is blocked.">
        {free.length === 0 ? (
          <EmptyState title="Nothing free for those dates" message="Every sellable room is already committed for part of this stay. Try different dates or a different room type." action={{ label: "Room rack", to: "/hotel/room-rack" }} />
        ) : (
          <TileGrid>
            {free.map((r) => (
              <Tile
                key={r.id}
                title={`Room ${r.number}`}
                subtitle={types.find((t) => t.id === r.room_type_id)?.name ?? "Room"}
                meta={r.rate_override ? `${money(Number(r.rate_override))} override` : undefined}
                status={roomId === r.id ? "info" : "good"}
                onClick={() => setRoomId(r.id)}
              />
            ))}
          </TileGrid>
        )}
      </Board>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Board title="3 · Rate">
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div>
                <Label>Rate plan</Label>
                <Select value={planId || "none"} onValueChange={(v) => setPlanId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Choose a rate" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No rate plan selected</SelectItem>
                    {eligible.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} — {money(Number(p.nightly_rate))}</SelectItem>)}
                  </SelectContent>
                </Select>
                {suggested && planId !== suggested.id ? (
                  <p className="mt-1 text-xs text-muted-foreground">Best applicable rate: {suggested.name}</p>
                ) : null}
              </div>
              <div>
                <Label>Existing guest or company account</Label>
                <Select value={stay.customer_id || "none"} onValueChange={(v) => {
                  const c = customers.find((x) => x.id === v);
                  setStay({ ...stay, customer_id: v === "none" ? "" : v });
                  if (c) setGuest((g) => ({ ...g, guest_name: g.guest_name || c.name, phone: g.phone || c.phone || "", email: g.email || c.email || "" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not linked</SelectItem>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {quote ? (
              <div className="border-t px-4 py-3">
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Nightly breakdown</div>
                <div className="space-y-1 text-sm">
                  {quote.lines.map((l) => (
                    <div key={l.date} className="flex justify-between"><span>{l.date}</span><span className="tabular-nums">{money(l.amount)}</span></div>
                  ))}
                </div>
              </div>
            ) : null}
          </Board>

          <Board title="4 · Guest & extras">
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div><Label>Guest name</Label><Input value={guest.guest_name} onChange={(e) => setGuest({ ...guest, guest_name: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={guest.company} onChange={(e) => setGuest({ ...guest, company: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Requests</Label><Textarea value={guest.special_requests} onChange={(e) => setGuest({ ...guest, special_requests: e.target.value })} /></div>
              {EXTRAS.map((x) => (
                <div key={x.key}>
                  <Label>{x.label} (total)</Label>
                  <Input type="number" value={extras[x.key] ?? ""} placeholder="0.00" onChange={(e) => setExtras({ ...extras, [x.key]: Number(e.target.value) })} />
                </div>
              ))}
            </div>
          </Board>
        </div>

        <Card className="h-fit rounded-2xl p-4">
          <div className="text-sm font-semibold">5 · Confirm</div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Room ({quote?.nights ?? nights} nights)</span><span className="tabular-nums">{money(quote?.roomTotal ?? 0)}</span></div>
            {quote?.extraGuestTotal ? <div className="flex justify-between"><span>Extra guests</span><span className="tabular-nums">{money(quote.extraGuestTotal)}</span></div> : null}
            {roomTax?.serviceCharge ? <div className="flex justify-between"><span>Service charge</span><span className="tabular-nums">{money(roomTax.serviceCharge)}</span></div> : null}
            {roomTax?.levy ? <div className="flex justify-between"><span>Tourism levy</span><span className="tabular-nums">{money(roomTax.levy)}</span></div> : null}
            {roomTax?.vat ? <div className="flex justify-between"><span>VAT</span><span className="tabular-nums">{money(roomTax.vat)}</span></div> : null}
            {extrasTotal ? <div className="flex justify-between"><span>Extras</span><span className="tabular-nums">{money(extrasTotal)}</span></div> : null}
            <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span className="tabular-nums">{money(grandTotal)}</span></div>
          </div>
          <div className="mt-3">
            <Label>Deposit taken now</Label>
            <Input type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} />
          </div>
          <p className="mt-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            {paymentChannel?.credentials_present
              ? "An online payment provider is configured for the direct booking engine."
              : "No online payment provider is connected yet, so a deposit recorded here is a front-desk receipt, not an online charge."}
          </p>
          <Button className="mt-3 w-full" disabled={busy || !guest.guest_name.trim()} onClick={confirm}>
            {busy ? "Confirming…" : "Confirm booking"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">Charges post to the guest folio at check-in; nothing hits the ledger from this screen.</p>
        </Card>
      </div>
    </div>
  );
}

/* ================================================================== *
 * CHANNEL MANAGER
 * ================================================================== */

export function ChannelManager() {
  const { uid } = useTenant();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ChannelRow[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [res, setRes] = useState<any[]>([]);
  const [sel, setSel] = useState<ChannelRow | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const [c, l, r] = await Promise.all([
      db.from("hotel_channels").select("*").eq("user_id", uid).order("name"),
      db.from("hotel_channel_sync_log").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
      db.from("hotel_reservations").select("id,source,status,nightly_rate,check_in,check_out").eq("user_id", uid).gte("check_in", new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)),
    ]);
    setRows(c.data ?? []); setLog(l.data ?? []); setRes(r.data ?? []);
    setLoading(false);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const enable = async (key: string) => {
    if (!uid) return;
    const adapter = adapterFor(key);
    const { error } = await db.from("hotel_channels").insert({
      user_id: uid, channel_key: adapter.key, name: adapter.name,
      status: adapter.kind === "ota" ? "not_connected" : "connected",
      sync_mode: adapter.kind === "ota" ? "manual" : "native",
    });
    if (error) return toast.error(error.message);
    toast.success(`${adapter.name} added`);
    load();
  };

  const update = async (row: ChannelRow, patch: Record<string, unknown>) => {
    const { error } = await db.from("hotel_channels").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const sync = async (row: ChannelRow, direction: "push_availability" | "push_rates" | "pull_reservations") => {
    if (!uid) return;
    const out = await attemptChannelSync(uid, row, direction);
    (out.ok ? toast.success : toast.warning)(out.message);
    load();
  };

  const mix = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of res) {
      if (["cancelled", "no_show"].includes(r.status)) continue;
      const k = r.source || "other";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [res]);

  if (loading) return <Loading />;

  const missing = CHANNEL_CATALOG.filter((c) => !rows.some((r) => r.channel_key === c.key));

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-amber-500/40 bg-amber-500/5 p-4 text-sm">
        <div className="flex items-start gap-2">
          <Plug className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            SifoBooks models channel availability, rates and reconciliation. No booking site is connected
            until your property supplies certified credentials through an accredited connectivity partner —
            until then nothing is sent or received, and every attempt is logged as blocked.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Channels configured" value={String(rows.length)} icon={Globe2} />
        <MetricTile label="Live connections" value={String(rows.filter((r) => r.status === "connected" && adapterFor(r.channel_key).kind === "ota").length)} icon={Plug} tone={rows.some((r) => r.status === "connected" && adapterFor(r.channel_key).kind === "ota") ? "good" : "warn"} />
        <MetricTile label="Bookings (90 days)" value={String(res.filter((r) => !["cancelled", "no_show"].includes(r.status)).length)} icon={CalendarRange} />
        <MetricTile label="Sync attempts logged" value={String(log.length)} icon={CalendarRange} />
      </div>

      <Board title="Channels" hint="Select a channel to record its credentials, commission and sync mode.">
        <TileGrid>
          {rows.map((r) => (
            <Tile
              key={r.id}
              title={r.name}
              subtitle={adapterFor(r.channel_key).kind === "ota" ? "Online travel agent" : adapterFor(r.channel_key).kind === "direct" ? "Direct" : "Offline source"}
              meta={r.last_sync_at ? `Last attempt ${new Date(r.last_sync_at).toLocaleString()} · ${r.last_sync_status ?? ""}` : "No sync attempted"}
              badge={<StatusPill status={r.status.replace(/_/g, " ")} />}
              status={channelTone(r.status)}
              onClick={() => setSel(r)}
            />
          ))}
        </TileGrid>
        {missing.length ? (
          <div className="flex flex-wrap gap-2 border-t p-4">
            {missing.map((c) => (
              <Button key={c.key} size="sm" variant="outline" onClick={() => enable(c.key)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> {c.name}
              </Button>
            ))}
          </div>
        ) : null}
      </Board>

      <div className="grid gap-4 lg:grid-cols-2">
        <Board title="Booking source mix" hint="Where your last 90 days of bookings actually came from.">
          {mix.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No bookings in the period.</p> : (
            <div className="divide-y">
              {mix.map(([k, n]) => (
                <div key={k} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="capitalize">{adapterFor(k).name}</span>
                  <span className="tabular-nums font-medium">{n}</span>
                </div>
              ))}
            </div>
          )}
        </Board>
        <Board title="Sync audit" hint="Every attempt, with the exact reason nothing moved.">
          {log.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No sync attempts yet.</p> : (
            <div className="max-h-80 divide-y overflow-y-auto">
              {log.map((l) => (
                <div key={l.id} className="px-4 py-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium capitalize">{String(l.direction).replace(/_/g, " ")}</span>
                    <StatusPill status={l.outcome} />
                  </div>
                  <p className="text-xs text-muted-foreground">{l.message}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </Board>
      </div>

      <Dialog open={Boolean(sel)} onOpenChange={(v) => !v && setSel(null)}>
        <DialogContent>
          {sel ? (
            <>
              <DialogHeader><DialogTitle>{sel.name}</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">{adapterFor(sel.channel_key).note}</p>
              {adapterFor(sel.channel_key).requires.length ? (
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {adapterFor(sel.channel_key).requires.map((r) => <li key={r}>{r}</li>)}
                </ul>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Commission %</Label>
                  <Input type="number" defaultValue={sel.commission_rate} onBlur={(e) => update(sel, { commission_rate: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Sync mode</Label>
                  <Select value={sel.sync_mode} onValueChange={(v) => { update(sel, { sync_mode: v }); setSel({ ...sel, sync_mode: v }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="native">Native (direct)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Switch checked={sel.credentials_present} onCheckedChange={(v) => { update(sel, { credentials_present: v, status: v ? "pending" : "not_connected" }); setSel({ ...sel, credentials_present: v, status: v ? "pending" : "not_connected" }); }} />
                  <span className="text-sm">Certified credentials have been supplied to this property</span>
                </div>
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => sync(sel, "push_availability")}>Push availability</Button>
                <Button variant="outline" size="sm" onClick={() => sync(sel, "push_rates")}>Push rates</Button>
                <Button variant="outline" size="sm" onClick={() => sync(sel, "pull_reservations")}>Pull bookings</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
