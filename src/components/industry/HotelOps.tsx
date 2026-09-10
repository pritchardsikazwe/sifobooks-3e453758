import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Board, EmptyState, KanbanBoard, MetricTile, SearchBox, Tile, TileGrid, Timeline, type TileStatus,
} from "@/components/industry/IndustryKit";
import {
  CHARGE_CATEGORIES, HOUSEKEEPING_STATUSES, PAYMENT_METHODS, RESERVATION_STATUSES,
  computeCharge, currentUserId, ensureFolio, folioTotals, loadTaxProfile, nightsBetween,
  reservationTone, roomTone, todayISO, type TaxProfile,
} from "@/lib/hospitality";
import { cn } from "@/lib/utils";
import {
  BedDouble, CalendarDays, DoorOpen, LogIn, LogOut, Plus, Sparkles, Wallet, Users, Moon,
} from "lucide-react";

const db: any = supabase;

const money = (n: number) => fmtMoney(n);
const label = (s?: string | null) => String(s ?? "").replace(/_/g, " ");

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

function Loading() {
  return <div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;
}

/* ================================================================== *
 * ROOM RACK — visual room grid, real records only
 * ================================================================== */

export function RoomRack() {
  const { uid } = useTenant();
  const [rooms, setRooms] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [stays, setStays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [floor, setFloor] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [newRoom, setNewRoom] = useState(false);
  const [form, setForm] = useState({ number: "", floor: "", room_type_id: "", rate_override: "" });
  const [newType, setNewType] = useState({ code: "", name: "", base_rate: "", capacity: "2" });

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const [r, t, s] = await Promise.all([
      db.from("hotel_rooms").select("*").eq("user_id", uid).order("number"),
      db.from("hotel_room_types").select("*").eq("user_id", uid).order("name"),
      db.from("hotel_reservations").select("*").eq("user_id", uid).eq("status", "checked_in"),
    ]);
    setRooms(r.data ?? []); setTypes(t.data ?? []); setStays(s.data ?? []);
    setLoading(false);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const typeOf = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);
  const stayOf = useMemo(() => new Map(stays.map((s) => [s.room_id, s])), [stays]);
  const floors = Array.from(new Set(rooms.map((r) => r.floor).filter(Boolean))) as string[];
  const visible = rooms.filter((r) =>
    (floor === "all" || r.floor === floor) &&
    `${r.number} ${typeOf.get(r.room_type_id)?.name ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  const counts = {
    total: rooms.length,
    occupied: rooms.filter((r) => r.status === "occupied").length,
    vacant: rooms.filter((r) => r.status === "vacant" && !r.out_of_order).length,
    dirty: rooms.filter((r) => r.housekeeping_status === "dirty").length,
    ooo: rooms.filter((r) => r.out_of_order).length,
  };
  const occupancy = counts.total ? (counts.occupied / counts.total) * 100 : 0;

  const createType = async () => {
    if (!uid || !newType.name.trim()) return toast.error("Room type name is required");
    const { error } = await db.from("hotel_room_types").insert({
      user_id: uid, code: newType.code || newType.name.slice(0, 4).toUpperCase(), name: newType.name,
      base_rate: Number(newType.base_rate || 0), capacity: Number(newType.capacity || 2),
    });
    if (error) return toast.error(error.message);
    setNewType({ code: "", name: "", base_rate: "", capacity: "2" });
    toast.success("Room type added");
    load();
  };

  const createRoom = async () => {
    if (!uid || !form.number.trim()) return toast.error("Room number is required");
    const { error } = await db.from("hotel_rooms").insert({
      user_id: uid, number: form.number.trim(), floor: form.floor || null,
      room_type_id: form.room_type_id || null,
      rate_override: form.rate_override ? Number(form.rate_override) : null,
    });
    if (error) return toast.error(error.message);
    setForm({ number: "", floor: "", room_type_id: "", rate_override: "" });
    setNewRoom(false);
    toast.success("Room added");
    load();
  };

  const patchRoom = async (id: string, patch: Record<string, any>) => {
    const { error } = await db.from("hotel_rooms").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setSelected((s: any) => (s && s.id === id ? { ...s, ...patch } : s));
    load();
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricTile label="Occupancy" value={`${occupancy.toFixed(0)}%`} icon={BedDouble} progress={occupancy} tone={occupancy > 80 ? "good" : "warn"} />
        <MetricTile label="Occupied" value={String(counts.occupied)} icon={Users} tone="info" />
        <MetricTile label="Vacant ready" value={String(counts.vacant)} icon={DoorOpen} tone="good" />
        <MetricTile label="Dirty" value={String(counts.dirty)} icon={Sparkles} tone={counts.dirty ? "warn" : "good"} />
        <MetricTile label="Out of order" value={String(counts.ooo)} icon={BedDouble} tone={counts.ooo ? "bad" : "good"} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[220px] flex-1"><SearchBox value={q} onChange={setQ} placeholder="Search room number or type…" /></div>
        <Select value={floor} onValueChange={setFloor}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All floors</SelectItem>
            {floors.map((f) => <SelectItem key={f} value={f}>Floor {f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Dialog open={newRoom} onOpenChange={setNewRoom}>
          <DialogTrigger asChild><Button variant="outline"><Plus className="mr-1 h-4 w-4" /> New room</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add a room</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div><Label>Room number</Label><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
                <div><Label>Floor</Label><Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label>Room type</Label>
                  <Select value={form.room_type_id || "none"} onValueChange={(v) => setForm({ ...form, room_type_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} · {money(Number(t.base_rate))}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Rate override</Label><Input type="number" value={form.rate_override} onChange={(e) => setForm({ ...form, rate_override: e.target.value })} /></div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="mb-2 text-sm font-semibold">Room types</div>
                {types.length === 0 ? <p className="mb-2 text-xs text-muted-foreground">No room types yet. Add one below.</p> : (
                  <div className="mb-2 flex flex-wrap gap-1">{types.map((t) => <span key={t.id} className="rounded-full border px-2 py-0.5 text-xs">{t.name} · {money(Number(t.base_rate))}</span>)}</div>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Input placeholder="Name" value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })} />
                  <Input placeholder="Code" value={newType.code} onChange={(e) => setNewType({ ...newType, code: e.target.value })} />
                  <Input placeholder="Rate" type="number" value={newType.base_rate} onChange={(e) => setNewType({ ...newType, base_rate: e.target.value })} />
                  <Button variant="outline" onClick={createType}>Add type</Button>
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={createRoom}>Add room</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Board title="Room rack" hint="Click a room to open its live workspace. Adding a room is a separate action.">
        {visible.length === 0 ? (
          <EmptyState title="No rooms recorded yet" message="Your account has no room records. Use “New room” to set up your property — nothing is created for you." />
        ) : (
          <TileGrid>
            {visible.map((r) => {
              const t = typeOf.get(r.room_type_id);
              const stay = stayOf.get(r.id);
              return (
                <Tile
                  key={r.id}
                  title={`Room ${r.number}`}
                  subtitle={`${t?.name ?? "No type"}${r.floor ? ` · floor ${r.floor}` : ""}`}
                  meta={
                    <span className="space-y-1 block">
                      <span className="block">{money(Number(r.rate_override ?? t?.base_rate ?? 0))} / night</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {label(r.status)} · {label(r.housekeeping_status)}
                        {stay ? ` · ${stay.guest_name}` : ""}
                      </span>
                    </span>
                  }
                  status={roomTone(r) as TileStatus}
                  onClick={() => setSelected(r)}
                />
              );
            })}
          </TileGrid>
        )}
      </Board>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader><SheetTitle>Room {selected.number}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border p-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{typeOf.get(selected.room_type_id)?.name ?? "Unassigned"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span>{money(Number(selected.rate_override ?? typeOf.get(selected.room_type_id)?.base_rate ?? 0))}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Guest in house</span><span>{stayOf.get(selected.id)?.guest_name ?? "—"}</span></div>
                </div>
                <div>
                  <Label>Occupancy status</Label>
                  <Select value={selected.status} onValueChange={(v) => patchRoom(selected.id, { status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["vacant", "occupied", "reserved", "out_of_order"].map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Housekeeping</Label>
                  <Select value={selected.housekeeping_status} onValueChange={(v) => patchRoom(selected.id, { housekeeping_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{HOUSEKEEPING_STATUSES.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button variant={selected.out_of_order ? "default" : "outline"} className="w-full"
                  onClick={() => patchRoom(selected.id, { out_of_order: !selected.out_of_order })}>
                  {selected.out_of_order ? "Return room to service" : "Mark out of order"}
                </Button>
                <Textarea placeholder="Room notes" defaultValue={selected.notes ?? ""}
                  onBlur={(e) => patchRoom(selected.id, { notes: e.target.value })} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ================================================================== *
 * RESERVATIONS — availability grid + booking cards
 * ================================================================== */

export function ReservationsBoard() {
  const { uid } = useTenant();
  const [rooms, setRooms] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(todayISO());
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const blank = { guest_name: "", phone: "", email: "", company: "", customer_id: "", room_id: "", adults: 1, children: 0, check_in: todayISO(), check_out: todayISO(), nightly_rate: 0, deposit: 0, source: "direct", walk_in: false, special_requests: "" };
  const [form, setForm] = useState({ ...blank });

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const horizon = new Date(new Date(from).getTime() + 14 * 86400000).toISOString().slice(0, 10);
    const [r, res, cust] = await Promise.all([
      db.from("hotel_rooms").select("*").eq("user_id", uid).order("number"),
      db.from("hotel_reservations").select("*").eq("user_id", uid).lte("check_in", horizon).gte("check_out", from).order("check_in"),
      db.from("customers").select("id,name,phone,email").eq("user_id", uid).order("name").limit(300),
    ]);
    setRooms(r.data ?? []); setRows(res.data ?? []); setCustomers(cust.data ?? []);
    setLoading(false);
  }, [uid, from]);
  useEffect(() => { load(); }, [load]);

  const days = Array.from({ length: 14 }, (_, i) => new Date(new Date(from).getTime() + i * 86400000).toISOString().slice(0, 10));
  const roomOf = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const live = rows.filter((r) => !["cancelled", "no_show"].includes(r.status));

  const arrivals = rows.filter((r) => r.check_in === todayISO() && ["confirmed", "enquiry"].includes(r.status));
  const departures = rows.filter((r) => r.check_out === todayISO() && r.status === "checked_in");
  const inHouse = rows.filter((r) => r.status === "checked_in");

  const create = async () => {
    if (!uid || !form.guest_name.trim()) return toast.error("Guest name is required");
    if (form.check_out < form.check_in) return toast.error("Departure cannot be before arrival");
    const { error } = await db.from("hotel_reservations").insert({
      user_id: uid, ...form,
      customer_id: form.customer_id || null,
      room_id: form.room_id || null,
      status: form.walk_in ? "confirmed" : "confirmed",
    });
    if (error) return toast.error(error.message);
    setForm({ ...blank });
    setOpen(false);
    toast.success("Reservation recorded");
    load();
  };

  const setStatus = async (r: any, status: string) => {
    const { error } = await db.from("hotel_reservations").update({ status }).eq("id", r.id);
    if (error) return toast.error(error.message);
    if (status === "cancelled" || status === "no_show") {
      if (r.room_id) await db.from("hotel_rooms").update({ status: "vacant" }).eq("id", r.room_id);
    }
    toast.success(`Reservation ${label(status)}`);
    load();
  };

  const assignRoom = async (r: any, roomId: string) => {
    const room = roomOf.get(roomId);
    const { error } = await db.from("hotel_reservations").update({
      room_id: roomId,
      nightly_rate: Number(r.nightly_rate || 0) || Number(room?.rate_override ?? 0),
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(`Assigned room ${room?.number ?? ""}`);
    load();
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Arrivals today" value={String(arrivals.length)} icon={LogIn} tone="info" />
        <MetricTile label="Departures today" value={String(departures.length)} icon={LogOut} tone="warn" />
        <MetricTile label="In house" value={String(inHouse.length)} icon={Users} tone="good" />
        <MetricTile label="Bookings in window" value={String(live.length)} icon={CalendarDays} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" className="w-44" value={from} onChange={(e) => setFrom(e.target.value)} />
        <div className="min-w-[200px] flex-1"><SearchBox value={q} onChange={setQ} placeholder="Search guest, company or reference…" /></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New reservation</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record a reservation</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Existing guest account (optional)</Label>
                <Select value={form.customer_id || "none"} onValueChange={(v) => {
                  const c = customers.find((x) => x.id === v);
                  setForm({ ...form, customer_id: v === "none" ? "" : v, guest_name: c?.name ?? form.guest_name, phone: c?.phone ?? form.phone, email: c?.email ?? form.email });
                }}>
                  <SelectTrigger><SelectValue placeholder="Search your customers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not linked</SelectItem>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div><Label>Guest name</Label><Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} /></div>
                <div><Label>Company / corporate</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Arrival</Label><Input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} /></div>
                <div><Label>Departure</Label><Input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} /></div>
                <div><Label>Adults</Label><Input type="number" value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })} /></div>
                <div><Label>Children</Label><Input type="number" value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })} /></div>
                <div>
                  <Label>Room</Label>
                  <Select value={form.room_id || "none"} onValueChange={(v) => {
                    const room = roomOf.get(v);
                    setForm({ ...form, room_id: v === "none" ? "" : v, nightly_rate: Number(room?.rate_override ?? form.nightly_rate) });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Assign later" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Assign later</SelectItem>
                      {rooms.map((r) => <SelectItem key={r.id} value={r.id}>Room {r.number}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Nightly rate</Label><Input type="number" value={form.nightly_rate} onChange={(e) => setForm({ ...form, nightly_rate: Number(e.target.value) })} /></div>
                <div><Label>Deposit taken</Label><Input type="number" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })} /></div>
                <div>
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["direct", "walk-in", "phone", "corporate", "agent", "online"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea placeholder="Special requests" value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
            </div>
            <DialogFooter><Button onClick={create}>Save reservation</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Board title="Availability" hint={`Rooms across 14 nights from ${from}. Shaded cells are booked.`}>
        {rooms.length === 0 ? (
          <EmptyState title="No rooms to plan against" message="Add your rooms in the room rack first — the availability grid is built from your real rooms." action={{ label: "Room rack", to: "/hotel/room-rack" }} />
        ) : (
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[720px] border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th className="w-24 text-left font-semibold">Room</th>
                  {days.map((d) => <th key={d} className="text-center font-medium text-muted-foreground">{d.slice(8)}</th>)}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td className="whitespace-nowrap font-medium">Room {room.number}</td>
                    {days.map((d) => {
                      const booked = live.find((r) => r.room_id === room.id && r.check_in <= d && r.check_out > d);
                      return (
                        <td key={d}>
                          <div
                            title={booked ? `${booked.guest_name} · ${label(booked.status)}` : "Available"}
                            className={cn("h-7 rounded-md border text-center leading-7",
                              !booked ? "border-dashed bg-muted/30 text-muted-foreground"
                                : booked.status === "checked_in" ? "border-sky-500/50 bg-sky-500/25"
                                : "border-emerald-500/50 bg-emerald-500/20")}
                          >
                            {booked ? booked.guest_name.split(" ")[0]?.slice(0, 6) : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Board>

      <Board title="Bookings" hint="Existing reservations first. Click a status to move the booking along.">
        {rows.length === 0 ? (
          <EmptyState title="No reservations in this window" message="Nothing is booked between these dates in your account." />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.filter((r) => `${r.guest_name} ${r.company ?? ""} ${r.reference ?? ""}`.toLowerCase().includes(q.toLowerCase())).map((r) => {
              const tone = reservationTone(r.status);
              const room = roomOf.get(r.room_id);
              const nights = nightsBetween(r.check_in, r.check_out);
              return (
                <div key={r.id} className={cn("rounded-2xl border-2 p-4",
                  tone === "info" ? "border-sky-500/40 bg-sky-500/10"
                  : tone === "good" ? "border-emerald-500/40 bg-emerald-500/10"
                  : tone === "bad" ? "border-rose-500/40 bg-rose-500/10"
                  : tone === "warn" ? "border-amber-500/40 bg-amber-500/10" : "border-border bg-muted/40")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{r.guest_name}</div>
                      <div className="text-xs opacity-80">{r.company ? `${r.company} · ` : ""}{r.adults} adults{r.children ? ` · ${r.children} children` : ""}</div>
                    </div>
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase">{label(r.status)}</span>
                  </div>
                  <div className="mt-2 text-sm">{r.check_in} → {r.check_out} · {nights} night{nights > 1 ? "s" : ""}</div>
                  <div className="text-sm font-semibold tabular-nums">{money(Number(r.nightly_rate || 0) * nights)}{r.deposit ? ` · deposit ${money(Number(r.deposit))}` : ""}</div>
                  {r.special_requests ? <p className="mt-2 rounded-lg bg-background/60 px-2 py-1 text-xs">{r.special_requests}</p> : null}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Select value={r.room_id ?? "none"} onValueChange={(v) => v !== "none" && assignRoom(r, v)}>
                      <SelectTrigger className="h-8 bg-background"><SelectValue placeholder="Assign room" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{room ? `Room ${room.number}` : "Assign room"}</SelectItem>
                        {rooms.map((x) => <SelectItem key={x.id} value={x.id}>Room {x.number}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={r.status} onValueChange={(v) => setStatus(r, v)}>
                      <SelectTrigger className="h-8 bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>{RESERVATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Board>
    </div>
  );
}

/* ================================================================== *
 * CHECK-IN / CHECK-OUT — guided workflow
 * ================================================================== */

export function CheckInOut() {
  const { uid, tax } = useTenant();
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [departures, setDepartures] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const t = todayISO();
    const [a, d, r] = await Promise.all([
      db.from("hotel_reservations").select("*").eq("user_id", uid).lte("check_in", t).in("status", ["confirmed", "enquiry"]).order("check_in"),
      db.from("hotel_reservations").select("*").eq("user_id", uid).eq("status", "checked_in").order("check_out"),
      db.from("hotel_rooms").select("*").eq("user_id", uid).order("number"),
    ]);
    setArrivals(a.data ?? []); setDepartures(d.data ?? []); setRooms(r.data ?? []);
    setLoading(false);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const checkIn = async (r: any) => {
    if (!uid || !tax) return;
    if (!r.room_id) return toast.error("Assign a room before checking the guest in");
    setBusy(r.id);
    try {
      const folio = await ensureFolio(uid, r);
      const nights = nightsBetween(r.check_in, r.check_out);
      const gross = Number(r.nightly_rate || 0) * nights;
      if (gross > 0) {
        const t = computeCharge(gross, "room", tax);
        await db.from("hotel_folio_charges").insert({
          user_id: uid, folio_id: folio.id, category: "room",
          description: `Accommodation ${r.check_in} → ${r.check_out} (${nights} night${nights > 1 ? "s" : ""})`,
          quantity: nights, unit_price: Number(r.nightly_rate || 0), amount: t.net,
          vat_amount: t.vat, levy_amount: t.levy, service_charge: t.serviceCharge,
        });
      }
      if (Number(r.deposit) > 0) {
        await db.from("hotel_folio_charges").insert({
          user_id: uid, folio_id: folio.id, category: "deposit",
          description: "Reservation deposit", amount: Number(r.deposit),
        });
      }
      await db.from("hotel_reservations").update({ status: "checked_in", actual_check_in: new Date().toISOString() }).eq("id", r.id);
      await db.from("hotel_rooms").update({ status: "occupied" }).eq("id", r.room_id);
      toast.success(`${r.guest_name} checked in · folio ${folio.folio_number}`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Check-in failed");
    } finally { setBusy(null); }
  };

  const checkOut = async (r: any) => {
    if (!uid) return;
    setBusy(r.id);
    try {
      const { data: folio } = await db.from("hotel_folios").select("*").eq("reservation_id", r.id).eq("status", "open").maybeSingle();
      if (folio) {
        const { data: charges } = await db.from("hotel_folio_charges").select("*").eq("folio_id", folio.id);
        const totals = folioTotals(charges ?? []);
        if (totals.balance > 0.009) {
          toast.error(`Folio ${folio.folio_number} still owes ${money(totals.balance)} — settle it on the folio screen first.`);
          setBusy(null);
          return;
        }
        await db.from("hotel_folios").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", folio.id);
      }
      await db.from("hotel_reservations").update({ status: "checked_out", actual_check_out: new Date().toISOString() }).eq("id", r.id);
      if (r.room_id) {
        await db.from("hotel_rooms").update({ status: "vacant", housekeeping_status: "dirty" }).eq("id", r.room_id);
        await db.from("hotel_housekeeping_tasks").insert({
          user_id: uid, room_id: r.room_id, task_type: "departure clean", priority: "high", status: "pending",
        });
      }
      toast.success(`${r.guest_name} checked out · room queued for housekeeping`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Check-out failed");
    } finally { setBusy(null); }
  };

  if (loading) return <Loading />;
  const roomOf = new Map(rooms.map((r) => [r.id, r]));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Board title="Arrivals" hint="Reservation → room → folio → check in. Room charge and taxes post to the folio automatically.">
        {arrivals.length === 0 ? <EmptyState title="No arrivals waiting" message="No confirmed reservation is due to check in today." /> : (
          <div className="space-y-3 p-4">
            {arrivals.map((r) => (
              <div key={r.id} className="rounded-2xl border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.guest_name}</span>
                  <span className="text-sm text-muted-foreground">{r.check_in} → {r.check_out}</span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs", r.room_id ? "border-emerald-500/50" : "border-amber-500/50")}>
                    {r.room_id ? `Room ${roomOf.get(r.room_id)?.number}` : "No room assigned"}
                  </span>
                  <Button size="sm" className="ml-auto" disabled={busy === r.id} onClick={() => checkIn(r)}>
                    <LogIn className="mr-1 h-4 w-4" /> Check in
                  </Button>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {money(Number(r.nightly_rate || 0))}/night · {nightsBetween(r.check_in, r.check_out)} nights
                  {tax ? ` · VAT ${tax.vat_rate}%${tax.levy_on_accommodation ? ` + tourism levy ${tax.tourism_levy_rate}%` : ""}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Board>

      <Board title="In house & departures" hint="Check-out is blocked while the folio still has a balance.">
        {departures.length === 0 ? <EmptyState title="Nobody in house" message="No guest is currently checked in." /> : (
          <div className="space-y-3 p-4">
            {departures.map((r) => (
              <div key={r.id} className="rounded-2xl border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.guest_name}</span>
                  <span className="text-sm text-muted-foreground">Room {roomOf.get(r.room_id)?.number ?? "—"} · leaves {r.check_out}</span>
                  <Button size="sm" variant="outline" className="ml-auto" disabled={busy === r.id} onClick={() => checkOut(r)}>
                    <LogOut className="mr-1 h-4 w-4" /> Check out
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Board>
    </div>
  );
}

/* ================================================================== *
 * FOLIOS — charges, payments, settlement
 * ================================================================== */

export function FolioWorkspace() {
  const { uid, tax } = useTenant();
  const [folios, setFolios] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [charge, setCharge] = useState({ category: "food", description: "", amount: 0 });
  const [pay, setPay] = useState({ method: "cash", amount: 0 });

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const [f, c] = await Promise.all([
      db.from("hotel_folios").select("*").eq("user_id", uid).order("opened_at", { ascending: false }).limit(200),
      db.from("hotel_folio_charges").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(1000),
    ]);
    setFolios(f.data ?? []); setCharges(c.data ?? []);
    setLoading(false);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const byFolio = useMemo(() => {
    const m = new Map<string, any[]>();
    charges.forEach((c) => m.set(c.folio_id, [...(m.get(c.folio_id) ?? []), c]));
    return m;
  }, [charges]);

  const current = folios.find((f) => f.id === openId) ?? null;
  const currentCharges = current ? (byFolio.get(current.id) ?? []) : [];
  const currentTotals = folioTotals(currentCharges);

  const addCharge = async () => {
    if (!uid || !current || !tax) return;
    if (!charge.description.trim() || !charge.amount) return toast.error("Description and amount are required");
    const t = computeCharge(Number(charge.amount), charge.category, tax);
    const { error } = await db.from("hotel_folio_charges").insert({
      user_id: uid, folio_id: current.id, category: charge.category, description: charge.description,
      amount: t.net, vat_amount: t.vat, levy_amount: t.levy, service_charge: t.serviceCharge,
    });
    if (error) return toast.error(error.message);
    setCharge({ category: "food", description: "", amount: 0 });
    toast.success("Charge posted to folio");
    load();
  };

  const addPayment = async () => {
    if (!uid || !current) return;
    if (!pay.amount) return toast.error("Enter the amount received");
    const { error } = await db.from("hotel_folio_charges").insert({
      user_id: uid, folio_id: current.id, category: "payment",
      description: `Payment · ${pay.method}`, amount: Number(pay.amount), payment_method: pay.method,
    });
    if (error) return toast.error(error.message);
    setPay({ method: "cash", amount: 0 });
    toast.success("Payment recorded on folio");
    load();
  };

  if (loading) return <Loading />;

  const open = folios.filter((f) => f.status === "open");
  const outstanding = open.reduce((s, f) => s + folioTotals(byFolio.get(f.id) ?? []).balance, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Open folios" value={String(open.length)} icon={Wallet} tone={open.length ? "info" : "good"} />
        <MetricTile label="Outstanding" value={money(outstanding)} icon={Wallet} tone={outstanding > 0 ? "warn" : "good"} />
        <MetricTile label="Closed folios" value={String(folios.length - open.length)} icon={Wallet} />
        <MetricTile label="Charges posted" value={String(charges.length)} icon={Wallet} />
      </div>

      <SearchBox value={q} onChange={setQ} placeholder="Search folio number or guest…" />

      <Board title="Guest folios" hint="Click a folio to post charges, take payment and settle.">
        {folios.length === 0 ? (
          <EmptyState title="No folios opened yet" message="A folio opens automatically when you check a guest in." action={{ label: "Check-in desk", to: "/hotel/check-in-out" }} />
        ) : (
          <TileGrid>
            {folios.filter((f) => `${f.folio_number} ${f.guest_name ?? ""}`.toLowerCase().includes(q.toLowerCase())).map((f) => {
              const t = folioTotals(byFolio.get(f.id) ?? []);
              const status: TileStatus = f.status !== "open" ? "muted" : t.balance > 0 ? "warn" : "good";
              return (
                <Tile key={f.id} title={f.folio_number} subtitle={f.guest_name ?? "Guest"} status={status}
                  badge={<span className="rounded-full border px-2 py-0.5 text-[10px] uppercase">{f.status}</span>}
                  meta={<span className="block"><span className="block">{money(t.gross)} charged</span><span className="block text-xs font-normal text-muted-foreground">Balance {money(t.balance)}</span></span>}
                  onClick={() => setOpenId(f.id)} />
              );
            })}
          </TileGrid>
        )}
      </Board>

      <Sheet open={!!current} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {current ? (
            <>
              <SheetHeader><SheetTitle>{current.folio_number} · {current.guest_name}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4">
                <Card className="rounded-2xl p-3 text-sm">
                  {[["Charges", currentTotals.revenue], ["Service charge", currentTotals.service], ["Tourism levy", currentTotals.levy], ["VAT", currentTotals.vat], ["Discounts", -currentTotals.discounts], ["Paid", -currentTotals.payments]].map(([k, v]) => (
                    <div key={String(k)} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="tabular-nums">{money(Number(v))}</span></div>
                  ))}
                  <div className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>Balance due</span><span className="tabular-nums">{money(currentTotals.balance)}</span></div>
                </Card>

                <Timeline empty="No charges on this folio yet." items={currentCharges.map((c: any) => ({
                  key: c.id,
                  when: c.charge_date,
                  title: c.description,
                  detail: label(c.category),
                  amount: money(Number(c.amount) + Number(c.vat_amount || 0) + Number(c.levy_amount || 0) + Number(c.service_charge || 0)),
                }))} />

                {current.status === "open" ? (
                  <>
                    <div className="rounded-2xl border p-3">
                      <div className="mb-2 text-sm font-semibold">Post a charge</div>
                      <div className="grid gap-2">
                        <Select value={charge.category} onValueChange={(v) => setCharge({ ...charge, category: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{CHARGE_CATEGORIES.filter((c) => !["payment", "deposit"].includes(c)).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input placeholder="Description" value={charge.description} onChange={(e) => setCharge({ ...charge, description: e.target.value })} />
                        <Input type="number" placeholder="Amount" value={charge.amount || ""} onChange={(e) => setCharge({ ...charge, amount: Number(e.target.value) })} />
                        {tax && charge.amount ? (
                          <p className="text-xs text-muted-foreground">
                            {(() => { const t = computeCharge(Number(charge.amount), charge.category, tax); return `Net ${money(t.net)} · service ${money(t.serviceCharge)} · levy ${money(t.levy)} · VAT ${money(t.vat)} · total ${money(t.gross)}`; })()}
                          </p>
                        ) : null}
                        <Button variant="outline" onClick={addCharge}>Post charge</Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border p-3">
                      <div className="mb-2 text-sm font-semibold">Take payment</div>
                      <div className="grid gap-2">
                        <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" placeholder="Amount received" value={pay.amount || ""} onChange={(e) => setPay({ ...pay, amount: Number(e.target.value) })} />
                        <Button onClick={addPayment}>Record payment</Button>
                      </div>
                    </div>
                  </>
                ) : <p className="text-sm text-muted-foreground">This folio is closed. Charges and payments can no longer be added.</p>}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ================================================================== *
 * HOUSEKEEPING BOARD
 * ================================================================== */

export function HousekeepingBoard() {
  const { uid } = useTenant();
  const [rooms, setRooms] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendant, setAttendant] = useState("");

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const [r, t] = await Promise.all([
      db.from("hotel_rooms").select("*").eq("user_id", uid).order("number"),
      db.from("hotel_housekeeping_tasks").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(300),
    ]);
    setRooms(r.data ?? []); setTasks(t.data ?? []);
    setLoading(false);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const setHk = async (room: any, status: string) => {
    const { error } = await db.from("hotel_rooms").update({ housekeeping_status: status }).eq("id", room.id);
    if (error) return toast.error(error.message);
    load();
  };
  const patchTask = async (id: string, patch: Record<string, any>) => {
    const { error } = await db.from("hotel_housekeeping_tasks").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <Loading />;
  const roomOf = new Map(rooms.map((r) => [r.id, r]));
  const group = (s: string) => rooms.filter((r) => r.housekeeping_status === s);

  const columns = [
    { key: "dirty", title: "Dirty", tone: "bad" as TileStatus, rooms: group("dirty") },
    { key: "cleaning", title: "Cleaning", tone: "warn" as TileStatus, rooms: group("cleaning") },
    { key: "inspected", title: "Inspected", tone: "info" as TileStatus, rooms: group("inspected") },
    { key: "clean", title: "Clean & ready", tone: "good" as TileStatus, rooms: group("clean") },
  ];
  const next: Record<string, string> = { dirty: "cleaning", cleaning: "inspected", inspected: "clean", clean: "dirty" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {columns.map((c) => <MetricTile key={c.key} label={c.title} value={String(c.rooms.length)} icon={Sparkles} tone={c.tone === "bad" ? "bad" : c.tone === "warn" ? "warn" : "good"} />)}
      </div>

      <Board title="Housekeeping board" hint="Tap a room card to move it to the next state.">
        {rooms.length === 0 ? <EmptyState title="No rooms recorded" message="Housekeeping works from your real rooms. Add rooms in the room rack first." action={{ label: "Room rack", to: "/hotel/room-rack" }} /> : (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((col) => (
              <div key={col.key} className="rounded-2xl border bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{col.title}</span>
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold tabular-nums">{col.rooms.length}</span>
                </div>
                <div className="space-y-2">
                  {col.rooms.length === 0 ? <p className="px-1 py-3 text-xs text-muted-foreground">None</p> : null}
                  {col.rooms.map((r) => (
                    <Tile key={r.id} title={`Room ${r.number}`} subtitle={r.floor ? `Floor ${r.floor}` : undefined}
                      meta={<span className="text-xs font-normal text-muted-foreground">{label(r.status)} → tap for {label(next[col.key] ?? "")}</span>}
                      status={col.tone} onClick={() => setHk(r, next[col.key] ?? "clean")} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Board>

      <Board title="Task queue" hint="Departure cleans are queued automatically at check-out." right={
        <Input className="h-8 w-44" placeholder="Attendant name" value={attendant} onChange={(e) => setAttendant(e.target.value)} />
      }>
        {tasks.length === 0 ? <EmptyState title="No housekeeping tasks" message="Tasks appear here when guests check out or you add them." /> : (
          <div className="space-y-2 p-4">
            {tasks.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm">
                <span className="font-semibold">Room {roomOf.get(t.room_id)?.number ?? "—"}</span>
                <span className="text-muted-foreground">{t.task_type} · {t.priority} priority</span>
                <span className="rounded-full border px-2 py-0.5 text-xs">{label(t.status)}</span>
                <span className="text-xs text-muted-foreground">{t.assigned_to ? `Assigned to ${t.assigned_to}` : "Unassigned"}</span>
                <div className="ml-auto flex gap-2">
                  {attendant && !t.assigned_to ? <Button size="sm" variant="outline" onClick={() => patchTask(t.id, { assigned_to: attendant })}>Assign {attendant}</Button> : null}
                  {t.status !== "done" ? <Button size="sm" onClick={() => patchTask(t.id, { status: "done", completed_at: new Date().toISOString() })}>Mark done</Button> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Board>
    </div>
  );
}

/* ================================================================== *
 * NIGHT AUDIT / DAY CLOSE
 * ================================================================== */

export function NightAudit() {
  const { uid } = useTenant();
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [stays, setStays] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const [r, s, c, o, a] = await Promise.all([
      db.from("hotel_rooms").select("*").eq("user_id", uid),
      db.from("hotel_reservations").select("*").eq("user_id", uid).lte("check_in", date).gt("check_out", date).in("status", ["checked_in", "checked_out"]),
      db.from("hotel_folio_charges").select("*").eq("user_id", uid).eq("charge_date", date),
      db.from("restaurant_orders").select("id,total,status,business_date").eq("user_id", uid).eq("business_date", date),
      db.from("hotel_night_audits").select("*").eq("user_id", uid).order("audit_date", { ascending: false }).limit(30),
    ]);
    setRooms(r.data ?? []); setStays(s.data ?? []); setCharges(c.data ?? []); setOrders(o.data ?? []); setAudits(a.data ?? []);
    setLoading(false);
  }, [uid, date]);
  useEffect(() => { load(); }, [load]);

  const sum = (cat: string[], field = "amount") =>
    charges.filter((c) => cat.includes(c.category)).reduce((s, c) => s + Number(c[field] || 0), 0);

  const roomRevenue = sum(["room"]);
  const fnbRevenue = sum(["food", "beverage", "minibar"]) + orders.filter((o) => o.status !== "void").reduce((s, o) => s + Number(o.total || 0), 0);
  const otherRevenue = sum(["laundry", "transfer", "conference hire", "conference package", "other"]);
  const vatTotal = charges.reduce((s, c) => s + Number(c.vat_amount || 0), 0);
  const levyTotal = charges.reduce((s, c) => s + Number(c.levy_amount || 0), 0);
  const serviceTotal = charges.reduce((s, c) => s + Number(c.service_charge || 0), 0);
  const paymentsByMethod = charges.filter((c) => c.category === "payment").reduce((m: Record<string, number>, c) => {
    const k = c.payment_method ?? "unspecified";
    m[k] = (m[k] ?? 0) + Number(c.amount || 0);
    return m;
  }, {});
  const available = rooms.filter((r) => !r.out_of_order).length;
  const occupied = stays.length;
  const occupancy = available ? (occupied / available) * 100 : 0;
  const adr = occupied ? roomRevenue / occupied : 0;
  const revpar = available ? roomRevenue / available : 0;
  const exceptions = [
    ...(rooms.filter((r) => r.status === "occupied" && !stays.some((s) => s.room_id === r.id)).map((r) => `Room ${r.number} is flagged occupied with no checked-in reservation`)),
    ...(charges.filter((c) => c.category === "payment" && !c.payment_method).length ? ["Payments recorded without a payment method"] : []),
  ];
  const alreadyRun = audits.find((a) => a.audit_date === date);

  const runAudit = async () => {
    if (!uid) return;
    if (alreadyRun) return toast.error("A night audit already exists for this date");
    setSaving(true);
    const { error } = await db.from("hotel_night_audits").insert({
      user_id: uid, audit_date: date, rooms_available: available, rooms_occupied: occupied,
      room_revenue: roomRevenue, fnb_revenue: fnbRevenue, other_revenue: otherRevenue,
      vat_total: vatTotal, levy_total: levyTotal, service_charge_total: serviceTotal,
      payments: paymentsByMethod, exceptions, status: exceptions.length ? "review" : "closed", run_by: uid,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Night audit saved");
    load();
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button className="ml-auto" disabled={saving || !!alreadyRun} onClick={runAudit}>
          <Moon className="mr-1 h-4 w-4" /> {alreadyRun ? "Audit already saved" : "Save night audit"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Occupancy" value={`${occupancy.toFixed(0)}%`} icon={BedDouble} progress={occupancy} tone={occupancy > 60 ? "good" : "warn"} hint={`${occupied} of ${available} sellable rooms`} />
        <MetricTile label="ADR" value={money(adr)} icon={Wallet} hint="Average daily rate" />
        <MetricTile label="RevPAR" value={money(revpar)} icon={Wallet} hint="Revenue per available room" />
        <MetricTile label="Food & beverage" value={money(fnbRevenue)} icon={Wallet} tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Board title="Revenue & taxes" hint={`Business date ${date}`}>
          <div className="space-y-1 p-4 text-sm">
            {[["Accommodation", roomRevenue], ["Food & beverage", fnbRevenue], ["Other services", otherRevenue], ["Service charge", serviceTotal], ["Tourism levy", levyTotal], ["VAT", vatTotal]].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between border-b py-1 last:border-0">
                <span className="text-muted-foreground">{k}</span><span className="font-medium tabular-nums">{money(Number(v))}</span>
              </div>
            ))}
          </div>
        </Board>

        <Board title="Payments by channel" hint="Reconcile these against the cashier and bank.">
          {Object.keys(paymentsByMethod).length === 0 ? <EmptyState title="No payments on this date" message="No folio payments were recorded for this business date." /> : (
            <div className="space-y-1 p-4 text-sm">
              {Object.entries(paymentsByMethod).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b py-1 last:border-0"><span className="text-muted-foreground">{k}</span><span className="font-medium tabular-nums">{money(v)}</span></div>
              ))}
            </div>
          )}
        </Board>
      </div>

      <Board title="Exceptions" hint="Resolve these before closing the day.">
        {exceptions.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No exceptions found for {date}.</div> : (
          <ul className="space-y-2 p-4 text-sm">
            {exceptions.map((e) => <li key={e} className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">{e}</li>)}
          </ul>
        )}
      </Board>

      <Board title="Audit history" hint="Saved day closes, newest first.">
        {audits.length === 0 ? <EmptyState title="No night audits saved" message="Saved audits appear here as a permanent day-close record." /> : (
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[600px] text-sm">
              <thead><tr className="text-left text-muted-foreground">{["Date", "Occ.", "Room revenue", "F&B", "VAT", "Levy", "Status"].map((h) => <th key={h} className="pb-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-2">{a.audit_date}</td>
                    <td>{a.rooms_available ? Math.round((a.rooms_occupied / a.rooms_available) * 100) : 0}%</td>
                    <td className="tabular-nums">{money(Number(a.room_revenue))}</td>
                    <td className="tabular-nums">{money(Number(a.fnb_revenue))}</td>
                    <td className="tabular-nums">{money(Number(a.vat_total))}</td>
                    <td className="tabular-nums">{money(Number(a.levy_total))}</td>
                    <td>{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Board>
    </div>
  );
}

/* Column-kanban helper kept for future use by other hotel screens. */
export { KanbanBoard };
