import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Board, EmptyState, KanbanBoard, MetricTile, SearchBox, StatusPill, Tile, TileGrid } from "@/components/industry/IndustryKit";
import {
  computeCharge, currentUserId, ensureFolio, folioTotals, loadTaxProfile, todayISO, type TaxProfile,
} from "@/lib/hospitality";
import { CalendarClock, Link2, PartyPopper, Plus, Send, Users } from "lucide-react";

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
  <div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
);

/* ================================================================== *
 * EVENTS & BANQUETS
 * ================================================================== */

const EVENT_TYPES = ["conference", "banquet", "wedding", "meeting", "private function"] as const;
const EVENT_STATUSES = ["enquiry", "provisional", "confirmed", "in_progress", "completed", "cancelled"] as const;

export function EventsBoard() {
  const { uid, tax } = useTenant();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<any | null>(null);

  const blank = {
    name: "", venue: "", event_type: "conference", customer_id: "",
    starts_at: `${todayISO()}T09:00`, ends_at: `${todayISO()}T17:00`,
    guests: 0, package_rate: 0, package_basis: "per_person", deposit: 0,
    contact_name: "", contact_phone: "", notes: "",
  };
  const [form, setForm] = useState<any>({ ...blank });

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const [e, c] = await Promise.all([
      db.from("hotel_events").select("*").eq("user_id", uid).order("starts_at", { ascending: false }).limit(300),
      db.from("customers").select("id,name,phone").eq("user_id", uid).order("name").limit(300),
    ]);
    setRows(e.data ?? []); setCustomers(c.data ?? []);
    setLoading(false);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const valueOf = (e: any) =>
    e.package_basis === "per_person" ? Number(e.package_rate || 0) * Number(e.guests || 0) : Number(e.package_rate || 0);

  const create = async () => {
    if (!uid) return;
    if (!form.name.trim()) return toast.error("Give the event a name");
    if (new Date(form.ends_at) <= new Date(form.starts_at)) return toast.error("The event must end after it starts");
    const clash = rows.find((r) =>
      r.venue && form.venue && r.venue.toLowerCase() === form.venue.toLowerCase() &&
      !["cancelled", "completed"].includes(r.status) &&
      new Date(form.starts_at) < new Date(r.ends_at) && new Date(r.starts_at) < new Date(form.ends_at));
    if (clash) return toast.error(`${form.venue} is already booked for ${clash.name}`);
    const { error } = await db.from("hotel_events").insert({
      user_id: uid, ...form,
      reference: `EV-${Date.now().toString(36).toUpperCase()}`,
      customer_id: form.customer_id || null,
      guests: Number(form.guests || 0),
      package_rate: Number(form.package_rate || 0),
      deposit: Number(form.deposit || 0),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      status: "enquiry",
    });
    if (error) return toast.error(error.message);
    toast.success("Event recorded");
    setForm({ ...blank }); setOpen(false); load();
  };

  const setStatus = async (e: any, status: string) => {
    const { error } = await db.from("hotel_events").update({ status }).eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success(`Event ${status.replace(/_/g, " ")}`);
    setSel(null); load();
  };

  /** Bill the event package onto a folio — same tax engine as room charges. */
  const billToFolio = async (e: any) => {
    if (!uid || !tax) return;
    const net = valueOf(e);
    if (net <= 0) return toast.error("Set the package rate and guest count first");
    let folioId = e.folio_id;
    if (!folioId) {
      const folio = await ensureFolio(uid, {
        id: null, customer_id: e.customer_id, branch_id: e.branch_id,
        guest_name: e.contact_name || e.name, company: e.customer_id ? "company" : null,
      }).catch(() => null);
      folioId = folio?.id;
    }
    if (!folioId) return toast.error("Could not open a folio for this event");
    const category = Number(e.guests || 0) >= 25 ? "conference package" : "conference hire";
    const t = computeCharge(net, category, tax);
    const { error } = await db.from("hotel_folio_charges").insert({
      user_id: uid, folio_id: folioId, charge_date: todayISO(), category,
      description: `${e.name}${e.venue ? ` — ${e.venue}` : ""}`,
      quantity: e.package_basis === "per_person" ? Number(e.guests || 0) : 1,
      unit_price: Number(e.package_rate || 0),
      amount: t.net, vat_amount: t.vat, levy_amount: t.levy, service_charge: t.serviceCharge,
      source_ref: e.reference,
    });
    if (error) return toast.error(error.message);
    await db.from("hotel_events").update({ folio_id: folioId, status: "confirmed" }).eq("id", e.id);
    toast.success("Event billed to the folio");
    setSel(null); load();
  };

  if (loading) return <Loading />;

  const upcoming = rows.filter((r) => new Date(r.ends_at) >= new Date() && !["cancelled"].includes(r.status));
  const filtered = rows.filter((r) => !q || `${r.name} ${r.venue ?? ""} ${r.reference ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Upcoming events" value={String(upcoming.length)} icon={PartyPopper} tone="info" />
        <MetricTile label="Expected guests" value={String(upcoming.reduce((s, e) => s + Number(e.guests || 0), 0))} icon={Users} />
        <MetricTile label="Contracted value" value={money(upcoming.reduce((s, e) => s + valueOf(e), 0))} icon={CalendarClock} tone="good" />
        <MetricTile label="Deposits held" value={money(upcoming.reduce((s, e) => s + Number(e.deposit || 0), 0))} icon={CalendarClock} tone="warn" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[220px] flex-1"><SearchBox value={q} onChange={setQ} placeholder="Search events, venues or references…" /></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="outline"><Plus className="mr-1 h-4 w-4" /> New event</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record an event</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Existing company or guest account</Label>
                <Select value={form.customer_id || "none"} onValueChange={(v) => {
                  const c = customers.find((x) => x.id === v);
                  setForm({ ...form, customer_id: v === "none" ? "" : v, contact_name: c?.name ?? form.contact_name, contact_phone: c?.phone ?? form.contact_phone });
                }}>
                  <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not linked</SelectItem>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Event name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Guests</Label><Input type="number" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} /></div>
              <div><Label>Starts</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
              <div><Label>Ends</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
              <div>
                <Label>Package basis</Label>
                <Select value={form.package_basis} onValueChange={(v) => setForm({ ...form, package_basis: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_person">Per person</SelectItem>
                    <SelectItem value="flat">Flat venue hire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Package rate</Label><Input type="number" value={form.package_rate} onChange={(e) => setForm({ ...form, package_rate: e.target.value })} /></div>
              <div><Label>Deposit</Label><Input type="number" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} /></div>
              <div><Label>Contact</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={create}>Record event</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Board title="Event diary" hint="Select an event to confirm it, bill the package to a folio or cancel it.">
        {filtered.length === 0 ? (
          <EmptyState title="No events yet" message="Conferences, banquets and functions you book will appear here with venue clash protection." action={{ label: "Folios & billing", to: "/hotel/folios" }} />
        ) : (
          <KanbanBoard
            columns={EVENT_STATUSES.filter((s) => s !== "cancelled").map((s) => ({
              key: s,
              title: s.replace(/_/g, " "),
              cards: filtered.filter((r) => r.status === s).map((r) => ({
                key: r.id,
                title: r.name,
                subtitle: `${r.venue || "Venue TBC"} · ${new Date(r.starts_at).toLocaleString()}`,
                meta: `${r.guests} guests · ${money(valueOf(r))}`,
              })),
            }))}
          />
        )}
      </Board>

      <Board title="All events">
        <TileGrid>
          {filtered.slice(0, 24).map((r) => (
            <Tile
              key={r.id}
              title={r.name}
              subtitle={`${r.venue || "Venue TBC"} · ${new Date(r.starts_at).toLocaleDateString()}`}
              meta={`${r.guests} guests · ${money(valueOf(r))}`}
              badge={<StatusPill status={r.status.replace(/_/g, " ")} />}
              status={r.status === "confirmed" ? "good" : r.status === "cancelled" ? "bad" : "warn"}
              onClick={() => setSel(r)}
            />
          ))}
        </TileGrid>
      </Board>

      <Dialog open={Boolean(sel)} onOpenChange={(v) => !v && setSel(null)}>
        <DialogContent>
          {sel ? (
            <>
              <DialogHeader><DialogTitle>{sel.name}</DialogTitle></DialogHeader>
              <div className="space-y-1 text-sm">
                <div>{sel.reference} · {sel.event_type}</div>
                <div>{sel.venue || "Venue TBC"}</div>
                <div>{new Date(sel.starts_at).toLocaleString()} → {new Date(sel.ends_at).toLocaleString()}</div>
                <div>{sel.guests} guests · {money(valueOf(sel))}{sel.deposit ? ` · deposit ${money(Number(sel.deposit))}` : ""}</div>
                {sel.notes ? <p className="text-muted-foreground">{sel.notes}</p> : null}
                {sel.folio_id ? <p className="text-emerald-600">Already billed to a folio.</p> : null}
              </div>
              <DialogFooter className="flex-wrap gap-2">
                {sel.status !== "confirmed" ? <Button size="sm" variant="outline" onClick={() => setStatus(sel, "confirmed")}>Confirm</Button> : null}
                {!sel.folio_id ? <Button size="sm" onClick={() => billToFolio(sel)}>Bill package to folio</Button> : null}
                <Button size="sm" variant="outline" onClick={() => setStatus(sel, "completed")}>Mark completed</Button>
                <Button size="sm" variant="destructive" onClick={() => setStatus(sel, "cancelled")}>Cancel event</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================================================================== *
 * PRE-ARRIVAL / GUEST SERVICES DESK
 * ================================================================== */

export function PreArrivalDesk() {
  const { uid } = useTenant();
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<any[]>([]);
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [inHouse, setInHouse] = useState<any[]>([]);
  const [folios, setFolios] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const horizon = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const [l, a, h, f, c] = await Promise.all([
      db.from("hotel_precheckin_links").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(200),
      db.from("hotel_reservations").select("*").eq("user_id", uid).gte("check_in", todayISO()).lte("check_in", horizon).in("status", ["confirmed", "enquiry"]).order("check_in"),
      db.from("hotel_reservations").select("*").eq("user_id", uid).eq("status", "checked_in").order("check_out"),
      db.from("hotel_folios").select("*").eq("user_id", uid).eq("status", "open"),
      db.from("hotel_folio_charges").select("*").eq("user_id", uid).limit(2000),
    ]);
    setLinks(l.data ?? []); setArrivals(a.data ?? []); setInHouse(h.data ?? []);
    setFolios(f.data ?? []); setCharges(c.data ?? []);
    setLoading(false);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const linkFor = useMemo(() => {
    const m = new Map<string, any>();
    for (const l of links) if (!m.has(l.reservation_id)) m.set(l.reservation_id, l);
    return m;
  }, [links]);

  const balanceFor = (reservationId: string) => {
    const folio = folios.find((f) => f.reservation_id === reservationId);
    if (!folio) return null;
    return folioTotals(charges.filter((c) => c.folio_id === folio.id)).balance;
  };

  const issue = async (r: any) => {
    if (!uid) return;
    const existing = linkFor.get(r.id);
    if (existing && existing.status !== "expired" && new Date(existing.expires_at) > new Date()) {
      await navigator.clipboard?.writeText(`${window.location.origin}/guest/${existing.token}`).catch(() => undefined);
      return toast.success("Existing pre-arrival link copied");
    }
    const token = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, "");
    const { error } = await db.from("hotel_precheckin_links").insert({
      user_id: uid, reservation_id: r.id, token, status: "sent",
      expires_at: new Date(new Date(r.check_out).getTime() + 86400000).toISOString(),
    });
    if (error) return toast.error(error.message);
    await navigator.clipboard?.writeText(`${window.location.origin}/guest/${token}`).catch(() => undefined);
    toast.success("Pre-arrival link created and copied");
    load();
  };

  const markReviewed = async (l: any) => {
    const { error } = await db.from("hotel_precheckin_links").update({ status: "reviewed" }).eq("id", l.id);
    if (error) return toast.error(error.message);
    toast.success("Marked as reviewed");
    load();
  };

  if (loading) return <Loading />;

  const filtered = arrivals.filter((r) => !q || `${r.guest_name} ${r.reference ?? ""} ${r.company ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const submitted = links.filter((l) => l.status === "submitted");

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-sky-500/40 bg-sky-500/5 p-4 text-sm">
        <div className="flex items-start gap-2">
          <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
          <p>
            Each pre-arrival link is a single-use web address tied to one booking and expires after departure.
            A guest can only ever see their own booking — no other guest's details are reachable from the link.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Arrivals next 14 days" value={String(arrivals.length)} icon={CalendarClock} tone="info" />
        <MetricTile label="Links issued" value={String(links.length)} icon={Send} />
        <MetricTile label="Guest details returned" value={String(submitted.length)} icon={Users} tone={submitted.length ? "good" : "default"} />
        <MetricTile label="In-house guests" value={String(inHouse.length)} icon={Users} />
      </div>

      <div className="min-w-[220px]"><SearchBox value={q} onChange={setQ} placeholder="Search arrivals by guest, company or reference…" /></div>

      <Board title="Pre-arrival check-in" hint="Issue a secure link so the guest confirms their details before they arrive.">
        {filtered.length === 0 ? (
          <EmptyState title="No arrivals in the window" message="Confirmed bookings arriving in the next fortnight appear here." action={{ label: "Reservations", to: "/hotel/reservations" }} />
        ) : (
          <div className="divide-y">
            {filtered.map((r) => {
              const l = linkFor.get(r.id);
              return (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-[180px]">
                    <div className="font-medium">{r.guest_name}</div>
                    <div className="text-xs text-muted-foreground">{r.reference ?? "—"} · arrives {r.check_in} · {r.adults} adult(s)</div>
                  </div>
                  <StatusPill status={l ? l.status : "not sent"} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => issue(r)}>{l ? "Copy link" : "Create link"}</Button>
                    {l?.status === "submitted" ? <Button size="sm" onClick={() => markReviewed(l)}>Mark reviewed</Button> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Board>

      <Board title="In-house guest services" hint="Live folio balance for each guest currently staying.">
        {inHouse.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No guests are checked in right now.</p>
        ) : (
          <TileGrid>
            {inHouse.map((r) => {
              const bal = balanceFor(r.id);
              return (
                <Tile
                  key={r.id}
                  title={r.guest_name}
                  subtitle={`Departs ${r.check_out}`}
                  meta={bal == null ? "No folio open" : `${money(bal)} outstanding`}
                  status={bal && bal > 0 ? "warn" : "good"}
                  to="/hotel/folios"
                />
              );
            })}
          </TileGrid>
        )}
      </Board>
    </div>
  );
}
