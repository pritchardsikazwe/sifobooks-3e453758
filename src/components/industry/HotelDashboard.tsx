import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bars, Board, Donut, MetricTile, StatusPill, Tile, TileGrid } from "@/components/industry/IndustryKit";
import { adrRevpar, occupancyFor } from "@/lib/hotel-rates";
import { adapterFor } from "@/lib/hotel-channels";
import { currentUserId, folioTotals, todayISO } from "@/lib/hospitality";
import { BedDouble, BrushCleaning, CalendarClock, LogIn, LogOut, TriangleAlert, Users, Wallet } from "lucide-react";

const db: any = supabase;
const money = (n: number) => fmtMoney(n);

/**
 * Live hotel command centre. Every figure comes from the tenant's own
 * hotel records; each card links to the screen holding those records.
 */
export function HotelCommandCentre() {
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [res, setRes] = useState<any[]>([]);
  const [folios, setFolios] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const uid = await currentUserId();
    if (!uid) { setLoading(false); return; }
    const today = todayISO();
    const monthStart = `${today.slice(0, 7)}-01`;
    const [r, rs, f, c, t, a, e] = await Promise.all([
      db.from("hotel_rooms").select("*").eq("user_id", uid).order("number"),
      db.from("hotel_reservations").select("*").eq("user_id", uid).gte("check_out", monthStart).order("check_in"),
      db.from("hotel_folios").select("*").eq("user_id", uid).order("opened_at", { ascending: false }).limit(300),
      db.from("hotel_folio_charges").select("*").eq("user_id", uid).gte("charge_date", monthStart).limit(3000),
      db.from("hotel_housekeeping_tasks").select("*").eq("user_id", uid).eq("task_date", today),
      db.from("hotel_night_audits").select("*").eq("user_id", uid).order("audit_date", { ascending: false }).limit(7),
      db.from("hotel_events").select("*").eq("user_id", uid).gte("ends_at", new Date().toISOString()).order("starts_at").limit(10),
    ]);
    setRooms(r.data ?? []); setRes(rs.data ?? []); setFolios(f.data ?? []);
    setCharges(c.data ?? []); setTasks(t.data ?? []); setAudits(a.data ?? []); setEvents(e.data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const today = todayISO();
  const monthStart = `${today.slice(0, 7)}-01`;

  const occ = useMemo(() => occupancyFor(rooms as any, res as any, today), [rooms, res, today]);
  const arrivals = res.filter((r) => r.check_in === today && ["confirmed", "enquiry"].includes(r.status));
  const departures = res.filter((r) => r.check_out === today && r.status === "checked_in");
  const inHouse = res.filter((r) => r.status === "checked_in");

  const dirty = rooms.filter((r) => r.housekeeping_status === "dirty" || r.housekeeping_status === "cleaning").length;
  const clean = rooms.filter((r) => r.housekeeping_status === "clean" || r.housekeeping_status === "inspected").length;
  const ooo = rooms.filter((r) => r.out_of_order || r.status === "out_of_order").length;
  const vacant = rooms.filter((r) => r.status === "vacant" && !r.out_of_order).length;

  const revenueCharges = charges.filter((c) => !["payment", "deposit", "discount"].includes(c.category));
  const sum = (rows: any[]) => rows.reduce((s, c) => s + Number(c.amount || 0) + Number(c.vat_amount || 0) + Number(c.levy_amount || 0) + Number(c.service_charge || 0), 0);
  const revToday = sum(revenueCharges.filter((c) => c.charge_date === today));
  const revMtd = sum(revenueCharges);
  const roomRevMtd = sum(revenueCharges.filter((c) => c.category === "room"));
  const roomsSoldMtd = revenueCharges.filter((c) => c.category === "room").length;
  const { adr, revpar } = adrRevpar(roomRevMtd, roomsSoldMtd, Math.max(1, occ.sellable) * Math.max(1, new Date(today).getDate()));
  const depositsHeld = res.filter((r) => ["confirmed", "checked_in"].includes(r.status)).reduce((s, r) => s + Number(r.deposit || 0), 0);

  const openFolios = folios.filter((f) => f.status === "open");
  const outstanding = openFolios.reduce((s, f) => s + folioTotals(charges.filter((c) => c.folio_id === f.id)).balance, 0);

  const sourceMix = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of res) {
      if (["cancelled", "no_show"].includes(r.status)) continue;
      const k = r.source || "other";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].map(([k, v]) => ({ label: adapterFor(k).name, value: v })).sort((a, b) => b.value - a.value);
  }, [res]);

  const projected = res
    .filter((r) => ["confirmed", "checked_in"].includes(r.status) && r.check_out >= today)
    .reduce((s, r) => {
      const from = r.check_in > today ? r.check_in : today;
      const nights = Math.max(0, Math.round((new Date(r.check_out).getTime() - new Date(from).getTime()) / 86400000));
      return s + nights * Number(r.nightly_rate || 0);
    }, 0);

  const alerts: { key: string; text: string; to: string }[] = [];
  if (ooo) alerts.push({ key: "ooo", text: `${ooo} room(s) out of order`, to: "/hotel/maintenance" });
  if (dirty) alerts.push({ key: "dirty", text: `${dirty} room(s) awaiting housekeeping`, to: "/hotel/housekeeping" });
  const unassigned = arrivals.filter((r) => !r.room_id).length;
  if (unassigned) alerts.push({ key: "unassigned", text: `${unassigned} arrival(s) with no room assigned`, to: "/hotel/reservations" });
  const overdue = inHouse.filter((r) => r.check_out < today).length;
  if (overdue) alerts.push({ key: "overdue", text: `${overdue} guest(s) past their departure date`, to: "/hotel/check-in-out" });
  const lastAudit = audits[0];
  if (!lastAudit || lastAudit.audit_date < new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
    alerts.push({ key: "audit", text: "Night audit has not been run for yesterday", to: "/hotel/night-audit" });
  }
  if (outstanding > 0) alerts.push({ key: "bal", text: `${money(outstanding)} outstanding on open folios`, to: "/hotel/folios" });

  if (loading) {
    return <div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;
  }

  if (rooms.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <MetricTile label="Occupancy today" value={`${occ.pct}%`} hint={`${occ.occupied} of ${occ.sellable} sellable`} icon={BedDouble} progress={occ.pct} tone="info" />
        <MetricTile label="Arrivals" value={String(arrivals.length)} icon={LogIn} tone="good" />
        <MetricTile label="Departures" value={String(departures.length)} icon={LogOut} tone="warn" />
        <MetricTile label="In house" value={String(inHouse.length)} icon={Users} />
        <MetricTile label="Revenue today" value={money(revToday)} hint={`${money(revMtd)} month to date`} icon={Wallet} tone="good" />
        <MetricTile label="Outstanding folios" value={money(outstanding)} hint={`${openFolios.length} open`} icon={Wallet} tone={outstanding > 0 ? "warn" : "good"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Donut value={occ.pct} label="Occupancy" caption={`${vacant} vacant · ${ooo} out of order`} accent="hotel" />
        <div className="grid grid-cols-2 gap-3">
          <MetricTile label="ADR (MTD)" value={money(adr)} hint="Average room rate achieved" />
          <MetricTile label="RevPAR (MTD)" value={money(revpar)} hint="Revenue per available room" />
          <MetricTile label="Deposits held" value={money(depositsHeld)} icon={Wallet} tone="info" />
          <MetricTile label="Projected room income" value={money(projected)} hint="Remaining nights already booked" icon={CalendarClock} />
        </div>
        <Board title="Booking sources" hint="Where this month's bookings came from.">
          <Bars items={sourceMix} />
        </Board>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Board title="Room status" hint="Live housekeeping and availability position.">
          <TileGrid>
            <Tile title={String(vacant)} subtitle="Vacant" status="good" to="/hotel/room-rack" />
            <Tile title={String(clean)} subtitle="Clean / inspected" status="good" to="/hotel/housekeeping" />
            <Tile title={String(dirty)} subtitle="Dirty / cleaning" status="warn" to="/hotel/housekeeping" />
            <Tile title={String(ooo)} subtitle="Out of order" status="bad" to="/hotel/maintenance" />
          </TileGrid>
        </Board>

        <Board title="Management alerts" hint="Things that need a decision today.">
          {alerts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nothing needs attention — the property is clean, assigned and audited.</p>
          ) : (
            <div className="divide-y">
              {alerts.map((a) => (
                <Link key={a.key} to={a.to as never} className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted/50">
                  <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="flex-1">{a.text}</span>
                </Link>
              ))}
            </div>
          )}
        </Board>

        <Board title="Housekeeping today" hint={`${tasks.filter((t) => t.status !== "done").length} open task(s)`}>
          {tasks.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No housekeeping tasks raised for today.</p>
          ) : (
            <div className="max-h-64 divide-y overflow-y-auto">
              {tasks.slice(0, 12).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span className="flex items-center gap-2"><BrushCleaning className="h-4 w-4 text-muted-foreground" />{t.task_type ?? "Clean"}</span>
                  <span className="truncate text-xs text-muted-foreground">{t.assigned_to ?? "Unassigned"}</span>
                  <StatusPill status={t.status} />
                </div>
              ))}
            </div>
          )}
        </Board>
      </div>

      {events.length ? (
        <Board title="Upcoming events" hint="Conferences and functions already in the diary.">
          <div className="divide-y">
            {events.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                <span className="font-medium">{e.name}</span>
                <span className="text-xs text-muted-foreground">{e.venue || "Venue TBC"} · {new Date(e.starts_at).toLocaleString()}</span>
                <span className="tabular-nums">{e.guests} guests</span>
                <StatusPill status={e.status} />
              </div>
            ))}
          </div>
        </Board>
      ) : null}

      <Card className="rounded-2xl p-4 text-xs text-muted-foreground">
        Figures come from your own rooms, bookings, folios and housekeeping records. Nothing on this screen posts to the ledger.
      </Card>
    </div>
  );
}
