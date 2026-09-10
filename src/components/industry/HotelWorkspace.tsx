import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import {
  Avatar, Bars, Board, Donut, EmptyState, IndustryShell, KanbanBoard, MetricTile, NotConnected,
  RecordTable, SearchBox, StatusPill, Tile, TileGrid, Timeline, type NavItem,
} from "@/components/industry/IndustryKit";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BedDouble, CalendarCheck, ClipboardCheck, CreditCard, House, LayoutDashboard, Boxes,
  ReceiptText, UtensilsCrossed, Wrench, BarChart3, Wallet, DoorOpen, Moon, ShieldCheck,
  Tag, Globe2, PartyPopper, Link2, CalendarRange,
} from "lucide-react";
import { CheckInOut, FolioWorkspace, HousekeepingBoard, NightAudit, ReservationsBoard, RoomRack } from "@/components/industry/HotelOps";
import { HotelCommandCentre } from "@/components/industry/HotelDashboard";
import { BookingEngine, ChannelManager, RatesWorkspace } from "@/components/industry/HotelDistribution";
import { EventsBoard, PreArrivalDesk } from "@/components/industry/HotelGuestServices";
import { HospitalityCompliance } from "@/components/compliance/HospitalityCompliance";

const db: any = supabase;

export const HOTEL_NAV: NavItem[] = [
  { label: "Dashboard", to: "/hotel", icon: LayoutDashboard },
  { label: "Front desk", to: "/hotel/front-desk", icon: House },
  { label: "Reservations", to: "/hotel/reservations", icon: CalendarCheck },
  { label: "Booking engine", to: "/hotel/booking", icon: CalendarRange },
  { label: "Rooms & rack", to: "/hotel/room-rack", icon: BedDouble },
  { label: "Rates & availability", to: "/hotel/rates", icon: Tag },
  { label: "Channels", to: "/hotel/channels", icon: Globe2 },
  { label: "Guests", to: "/hotel/guests", icon: CalendarCheck },
  { label: "Pre-arrival", to: "/hotel/pre-arrival", icon: Link2 },
  { label: "Check in / out", to: "/hotel/check-in-out", icon: DoorOpen },
  { label: "Housekeeping", to: "/hotel/housekeeping", icon: ClipboardCheck },
  { label: "Folios & billing", to: "/hotel/folios", icon: ReceiptText },
  { label: "Payments", to: "/hotel/payments", icon: CreditCard },
  { label: "Hotel POS", to: "/hotel/pos", icon: UtensilsCrossed },
  { label: "Events", to: "/hotel/events", icon: PartyPopper },
  { label: "Maintenance", to: "/hotel/maintenance", icon: Wrench },
  { label: "Inventory", to: "/hotel/inventory", icon: Boxes },
  { label: "Night audit", to: "/hotel/night-audit", icon: Moon },
  { label: "Accounting", to: "/hotel/accounting", icon: Wallet },
  { label: "Reports", to: "/hotel/reports", icon: BarChart3 },
  { label: "Compliance", to: "/hotel/compliance", icon: ShieldCheck },
];

const TITLES: Record<string, [string, string]> = {
  "/hotel": ["Hotel operations", "Live occupancy, arrivals, revenue and alerts from your own property records."],
  "/hotel/front-desk": ["Front desk", "Open guest accounts and today's settlements, from your live ledger."],
  "/hotel/guests": ["Guests", "Your existing guest accounts. Select a guest to open the real record."],
  "/hotel/folios": ["Folios & billing", "Guest folios — room, restaurant and bar charges, taxes, deposits and payments."],
  "/hotel/payments": ["Payments", "Money received from guests, allocated to their folios."],
  "/hotel/pos": ["Hotel POS", "Restaurant and bar checks captured through your POS."],
  "/hotel/maintenance": ["Maintenance", "Property maintenance tickets by priority and status."],
  "/hotel/inventory": ["Inventory", "Housekeeping, kitchen and bar stock currently on hand."],
  "/hotel/accounting": ["Hotel accounting", "Where hotel activity lands in your books."],
  "/hotel/reports": ["Hotel reports", "Revenue, receivables and cost reporting on real data."],
  "/hotel/rooms": ["Rooms", "Your property's real rooms, room types and rates."],
  "/hotel/room-rack": ["Rooms & room rack", "Live room board — occupancy, housekeeping and out-of-order state."],
  "/hotel/reservations": ["Reservations", "Availability, bookings, deposits and room assignment."],
  "/hotel/booking": ["Booking engine", "Dates → available room → rate → guest → extras → deposit → confirmation."],
  "/hotel/rates": ["Rates & availability", "Rate plans, seasons, contract rates and forward availability."],
  "/hotel/channels": ["Channels", "Booking sources, channel adapters and synchronisation audit."],
  "/hotel/pre-arrival": ["Pre-arrival & guest services", "Secure pre-check-in links and live in-house guest balances."],
  "/hotel/events": ["Events & functions", "Conference, banquet and function diary with folio billing."],
  "/hotel/check-in-out": ["Check in / check out", "Reservation → room → folio → payment, in order."],
  "/hotel/housekeeping": ["Housekeeping", "Room states and the attendant task queue."],
  "/hotel/night-audit": ["Night audit", "Day close: occupancy, ADR, RevPAR, taxes, payments and exceptions."],
  "/hotel/compliance": ["Licences & tax compliance", "Tourism licence, permits, VAT, tourism levy, service charge and ZRA Smart Invoice."],
};

const OPS = new Set([
  "/hotel/folios", "/hotel/rooms", "/hotel/room-rack", "/hotel/reservations", "/hotel/check-in-out",
  "/hotel/housekeeping", "/hotel/night-audit", "/hotel/compliance", "/hotel/rates", "/hotel/booking",
  "/hotel/channels", "/hotel/events", "/hotel/pre-arrival", "/hotel/guest-portal",
]);

const UNAVAILABLE: Record<string, string> = {
  "/hotel/restaurant": "Hotel restaurant module",
};

export function HotelWorkspace({ screen }: { screen: string }) {
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [data, setData] = useState<Record<string, any[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) { setLoading(false); return; }
      const today = new Date().toISOString().slice(0, 10);
      const [cust, inv, rec, ord, tick, stock] = await Promise.all([
        db.from("customers").select("id,name,phone,email,active,city").eq("user_id", uid).order("name").limit(200),
        db.from("invoices").select("id,number,issue_date,due_date,total,amount_paid,balance_due,status,customer_id").eq("user_id", uid).order("issue_date", { ascending: false }).limit(200),
        db.from("receipts").select("id,number,receipt_date,amount,method,status,customer_id,payer_name").eq("user_id", uid).order("receipt_date", { ascending: false }).limit(200),
        db.from("restaurant_orders").select("id,order_no,order_type,status,total,business_date").eq("user_id", uid).eq("business_date", today).limit(200),
        db.from("service_tickets").select("id,ticket_number,subject,priority,status,opened_at").eq("user_id", uid).order("opened_at", { ascending: false }).limit(100),
        db.from("stock_items").select("id,name,sku,quantity_on_hand,reorder_level,unit").eq("user_id", uid).order("name").limit(200),
      ]);
      if (cancelled) return;
      setData({
        customers: cust.data ?? [], invoices: inv.data ?? [], receipts: rec.data ?? [],
        orders: ord.data ?? [], tickets: tick.data ?? [], stock: stock.data ?? [],
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [screen]);

  const customers = data.customers ?? [];
  const invoices = data.invoices ?? [];
  const receipts = data.receipts ?? [];
  const orders = data.orders ?? [];
  const tickets = data.tickets ?? [];
  const stock = data.stock ?? [];
  const nameOf = useMemo(() => new Map(customers.map((c: any) => [c.id, c.name])), [customers]);
  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());

  const openFolios = invoices.filter((i: any) => Number(i.balance_due) > 0 && i.status !== "void");
  const outstanding = openFolios.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);
  const posToday = orders.filter((o: any) => o.status !== "void").reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const receivedToday = receipts
    .filter((r: any) => r.receipt_date === new Date().toISOString().slice(0, 10) && r.status !== "reversed")
    .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  const [title, subtitle] = TITLES[screen] ?? ["Hotel", "Hotel operations workspace."];

  const body = () => {
    if (OPS.has(screen)) {
      switch (screen) {
        case "/hotel/rooms":
        case "/hotel/room-rack": return <RoomRack />;
        case "/hotel/reservations": return <ReservationsBoard />;
        case "/hotel/check-in-out": return <CheckInOut />;
        case "/hotel/housekeeping": return <HousekeepingBoard />;
        case "/hotel/night-audit": return <NightAudit />;
        case "/hotel/folios": return <FolioWorkspace />;
        default: return <HospitalityCompliance scope="hospitality" />;
      }
    }
    if (UNAVAILABLE[screen]) {
      return (
        <NotConnected
          title={`${UNAVAILABLE[screen]} are not part of your account yet`}
          reason="Your SifoBooks account has no room, reservation or housekeeping records, so there is nothing real to display here. Rather than show invented rooms and guests, this screen stays empty until the rooms module is enabled for your company. Everything below already works on your live data."
          alternatives={[
            { label: "Guests", to: "/hotel/guests" },
            { label: "Folios & billing", to: "/hotel/folios" },
            { label: "Payments", to: "/hotel/payments" },
            { label: "Hotel POS", to: "/hotel/pos" },
          ]}
        />
      );
    }

    if (loading) return <div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;

    const ageOf = (d?: string | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0);
    const folioTone = (i: any) => {
      const age = ageOf(i.due_date ?? i.issue_date);
      return Number(i.balance_due) <= 0 ? "good" : age > 30 ? "bad" : age > 7 ? "warn" : "info";
    };

    switch (screen) {
      case "/hotel":
      case "/hotel/front-desk": {
        const settled = invoices.length
          ? (invoices.reduce((s: number, i: any) => s + Number(i.amount_paid || 0), 0) /
             Math.max(1, invoices.reduce((s: number, i: any) => s + Number(i.total || 0), 0))) * 100
          : 0;
        const tiles = openFolios
          .filter((i: any) => match(`${i.number} ${nameOf.get(i.customer_id) ?? ""}`))
          .sort((a: any, b: any) => Number(b.balance_due) - Number(a.balance_due))
          .slice(0, 12);
        const methodMix = Object.entries(
          receipts.reduce((m: Record<string, number>, r: any) => {
            m[r.method ?? "other"] = (m[r.method ?? "other"] ?? 0) + Number(r.amount || 0);
            return m;
          }, {}),
        ).map(([label, value]) => ({ label, value: value as number }));

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label="Open folios" value={String(openFolios.length)} hint="Guest accounts with a balance" icon={ReceiptText} tone={openFolios.length ? "warn" : "good"} />
              <MetricTile label="Outstanding" value={fmtMoney(outstanding)} hint="Owed by guests" icon={Wallet} tone={outstanding > 0 ? "warn" : "good"} />
              <MetricTile label="Received today" value={fmtMoney(receivedToday)} hint="Guest payments banked" icon={CreditCard} tone="good" />
              <MetricTile label="F&B today" value={fmtMoney(posToday)} hint={`${orders.length} POS checks`} icon={UtensilsCrossed} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Donut value={settled} label="Folio settlement" caption="Share of everything charged to guests that has already been paid." accent="hotel" />
              <Board title="Payment mix" hint="How guests are settling their folios."><Bars items={methodMix} format={fmtMoney} /></Board>
              <Board title="Latest guest payments" hint="Most recent receipts against folios.">
                <Timeline
                  empty="No guest payments recorded yet."
                  items={receipts.slice(0, 6).map((r: any) => ({
                    key: r.id,
                    when: r.receipt_date,
                    title: nameOf.get(r.customer_id) ?? r.payer_name ?? "Guest",
                    detail: `${r.method ?? "—"} · ${r.number}`,
                    amount: fmtMoney(Number(r.amount)),
                  }))}
                />
              </Board>
            </div>

            <Board
              title="Open guest folios"
              hint="Each card is a real guest account — open it to see the full folio."
              right={<SearchBox value={q} onChange={setQ} placeholder="Search guest or folio…" />}
            >
              {tiles.length === 0 ? (
                <EmptyState title="No open guest folios" message="Every guest account in your books is settled. New folios appear here as soon as you invoice a guest." action={{ label: "Create an invoice", to: "/invoices" }} />
              ) : (
                <TileGrid>
                  {tiles.map((i: any) => (
                    <Tile
                      key={i.id}
                      to="/invoice-detail/$id"
                      params={{ id: i.id }}
                      status={folioTone(i) as any}
                      title={nameOf.get(i.customer_id) ?? "Guest"}
                      subtitle={`${i.number} · ${i.issue_date}`}
                      meta={<>Balance {fmtMoney(Number(i.balance_due))}</>}
                      badge={<StatusPill status={i.status} />}
                    />
                  ))}
                </TileGrid>
              )}
            </Board>
          </div>
        );
      }
      case "/hotel/guests": {
        const rows = customers.filter((c: any) => match(`${c.name} ${c.phone ?? ""} ${c.email ?? ""}`)).slice(0, 60);
        const balanceOf = (id: string) => invoices.filter((i: any) => i.customer_id === id).reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0);
        return (
          <Board title="Guest accounts" hint="Existing guests first — open a guest to see stays, folios and payments." right={<SearchBox value={q} onChange={setQ} />}>
            {rows.length === 0 ? (
              <EmptyState title="No guests match" message="Guest accounts are your customer records. None match this search yet." action={{ label: "Open customers", to: "/customers" }} />
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((c: any) => {
                  const bal = balanceOf(c.id);
                  return (
                    <Link
                      key={c.id}
                      to="/customers/$id"
                      params={{ id: c.id }}
                      className="flex items-center gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                    >
                      <Avatar name={c.name} accent="hotel" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{c.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{c.phone ?? c.email ?? c.city ?? "—"}</div>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-sm font-semibold tabular-nums", bal > 0 ? "text-amber-600" : "text-muted-foreground")}>{fmtMoney(bal)}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">{bal > 0 ? "on folio" : "settled"}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Board>
        );
      }
      case "/hotel/folios": {
        const filtered = invoices.filter((i: any) => match(`${i.number} ${nameOf.get(i.customer_id) ?? ""}`));
        const rows = filtered.slice(0, 100);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label="Folios" value={String(invoices.length)} icon={ReceiptText} />
              <MetricTile label="Open" value={String(openFolios.length)} icon={CalendarCheck} tone={openFolios.length ? "warn" : "good"} />
              <MetricTile label="Outstanding" value={fmtMoney(outstanding)} icon={Wallet} tone={outstanding > 0 ? "warn" : "good"} />
              <MetricTile label="Received today" value={fmtMoney(receivedToday)} icon={CreditCard} tone="good" />
            </div>
            <Board title="Folio board" hint="Colour shows how long the balance has been outstanding." right={<SearchBox value={q} onChange={setQ} />}>
              {rows.length === 0 ? (
                <EmptyState title="No folios yet" message="A folio is the guest invoice carrying room, restaurant and other charges." action={{ label: "Create an invoice", to: "/invoices" }} />
              ) : (
                <TileGrid>
                  {rows.slice(0, 12).map((i: any) => (
                    <Tile
                      key={i.id}
                      to="/invoice-detail/$id"
                      params={{ id: i.id }}
                      status={folioTone(i) as any}
                      title={nameOf.get(i.customer_id) ?? "Guest"}
                      subtitle={`${i.number} · due ${i.due_date ?? "—"}`}
                      meta={<>{fmtMoney(Number(i.amount_paid))} paid of {fmtMoney(Number(i.total))}</>}
                      badge={<StatusPill status={i.status} />}
                    />
                  ))}
                </TileGrid>
              )}
              <div className="border-t">
                <RecordTable
                  columns={["Folio", "Guest", "Issued", "Due", "Charged", "Balance", "Status"]}
                  rows={rows.map((i: any) => ({
                    key: i.id, to: "/invoice-detail/$id", params: { id: i.id },
                    cells: [i.number, nameOf.get(i.customer_id) ?? "—", i.issue_date, i.due_date ?? "—", fmtMoney(Number(i.total)), fmtMoney(Number(i.balance_due)), <StatusPill status={i.status} />],
                  }))}
                />
              </div>
            </Board>
          </div>
        );
      }
      case "/hotel/payments": {
        const rows = receipts.filter((r: any) => match(`${r.number} ${r.payer_name ?? ""} ${nameOf.get(r.customer_id) ?? ""}`)).slice(0, 100);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label="Receipts" value={String(receipts.length)} icon={CreditCard} />
              <MetricTile label="Received today" value={fmtMoney(receivedToday)} icon={Wallet} tone="good" />
              <MetricTile label="Still outstanding" value={fmtMoney(outstanding)} icon={ReceiptText} tone={outstanding > 0 ? "warn" : "good"} />
              <MetricTile label="Open folios" value={String(openFolios.length)} icon={CalendarCheck} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Board title="Payment history" hint="Newest guest settlements first." right={<Link to="/receipts" className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Receive money</Link>}>
                <Timeline
                  empty="No guest payments recorded."
                  items={rows.slice(0, 12).map((r: any) => ({
                    key: r.id, when: r.receipt_date,
                    title: nameOf.get(r.customer_id) ?? r.payer_name ?? "Guest",
                    detail: `${r.method ?? "—"} · ${r.number}`,
                    amount: fmtMoney(Number(r.amount)),
                  }))}
                />
              </Board>
              <Board title="All payments" hint="Search and inspect every guest receipt." right={<SearchBox value={q} onChange={setQ} />}>
                <RecordTable
                  columns={["Receipt", "Guest", "Date", "Method", "Amount", "Status"]}
                  rows={rows.map((r: any) => ({
                    key: r.id,
                    cells: [r.number, nameOf.get(r.customer_id) ?? r.payer_name ?? "—", r.receipt_date, r.method, fmtMoney(Number(r.amount)), <StatusPill status={r.status} />],
                  }))}
                />
              </Board>
            </div>
          </div>
        );
      }
      case "/hotel/pos": {
        const rows = orders.filter((o: any) => match(`${o.order_no} ${o.order_type}`));
        const typeMix = Object.entries(
          orders.reduce((m: Record<string, number>, o: any) => { m[o.order_type ?? "other"] = (m[o.order_type ?? "other"] ?? 0) + Number(o.total || 0); return m; }, {}),
        ).map(([label, value]) => ({ label, value: value as number }));
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label="Checks today" value={String(orders.length)} icon={UtensilsCrossed} />
              <MetricTile label="Value today" value={fmtMoney(posToday)} icon={Wallet} tone="good" />
              <MetricTile label="Open checks" value={String(orders.filter((o: any) => o.status === "open" || o.status === "held").length)} icon={CalendarCheck} tone="warn" />
              <MetricTile label="Average check" value={fmtMoney(orders.length ? posToday / orders.length : 0)} icon={BarChart3} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Board title="Revenue by service" hint="Where food & beverage revenue came from today."><Bars items={typeMix} format={fmtMoney} /></Board>
              <div className="lg:col-span-2">
                <Board title="Today's checks" hint="Captured in the restaurant POS and posted to your books." right={<Link to="/restaurant/pos" className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Open POS</Link>}>
                  {rows.length === 0 ? (
                    <EmptyState title="No checks today" message="Food and beverage checks raised in the POS appear here in real time." action={{ label: "Open POS", to: "/restaurant/pos" }} />
                  ) : (
                    <TileGrid>
                      {rows.slice(0, 12).map((o: any) => (
                        <Tile
                          key={o.id}
                          title={o.order_no}
                          subtitle={o.order_type}
                          meta={fmtMoney(Number(o.total))}
                          status={o.status === "open" || o.status === "held" ? "warn" : "good"}
                          badge={<StatusPill status={o.status} />}
                        />
                      ))}
                    </TileGrid>
                  )}
                </Board>
              </div>
            </div>
          </div>
        );
      }
      case "/hotel/maintenance": {
        const rows = tickets.filter((t: any) => match(`${t.subject} ${t.ticket_number ?? ""}`));
        const bucket = (s: string) => rows.filter((t: any) => (t.status ?? "").toLowerCase() === s);
        const other = rows.filter((t: any) => !["open", "in progress", "resolved"].includes((t.status ?? "").toLowerCase()));
        const card = (t: any) => ({
          key: t.id,
          title: t.subject,
          subtitle: `${t.ticket_number ?? "—"} · ${t.priority ?? "normal"} priority`,
          meta: `Opened ${String(t.opened_at ?? "").slice(0, 10)}`,
        });
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label="Open work orders" value={String(bucket("open").length)} icon={Wrench} tone="warn" />
              <MetricTile label="In progress" value={String(bucket("in progress").length)} icon={Wrench} />
              <MetricTile label="Resolved" value={String(bucket("resolved").length)} icon={ClipboardCheck} tone="good" />
              <MetricTile label="High priority" value={String(rows.filter((t: any) => (t.priority ?? "").toLowerCase() === "high").length)} icon={Wrench} tone="bad" />
            </div>
            <Board title="Maintenance board" hint="Property work orders, grouped by where they stand." right={<div className="flex gap-2"><SearchBox value={q} onChange={setQ} /><Link to="/service-tickets" className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted">Service desk</Link></div>}>
              <KanbanBoard
                empty="No maintenance work orders logged for your property."
                columns={[
                  { key: "open", title: "Reported", tone: "warn", cards: bucket("open").map(card) },
                  { key: "prog", title: "In progress", tone: "info", cards: bucket("in progress").map(card) },
                  { key: "done", title: "Resolved", tone: "good", cards: bucket("resolved").map(card) },
                  { key: "other", title: "Other", tone: "muted", cards: other.map(card) },
                ]}
              />
            </Board>
          </div>
        );
      }
      case "/hotel/inventory": {
        const low = stock.filter((s: any) => Number(s.quantity_on_hand) <= Number(s.reorder_level ?? 0));
        const rows = stock.filter((s: any) => match(`${s.name} ${s.sku ?? ""}`)).slice(0, 100);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label="Items" value={String(stock.length)} icon={Boxes} />
              <MetricTile label="At reorder level" value={String(low.length)} icon={Boxes} tone={low.length ? "bad" : "good"} />
              <MetricTile label="Maintenance open" value={String(tickets.filter((t: any) => t.status !== "resolved").length)} icon={Wrench} tone="warn" />
              <MetricTile label="F&B value today" value={fmtMoney(posToday)} icon={UtensilsCrossed} />
            </div>
            {low.length ? (
              <Board title="Reorder now" hint="Housekeeping, kitchen and bar items at or below their reorder level.">
                <TileGrid>
                  {low.slice(0, 8).map((s: any) => (
                    <Tile key={s.id} status="bad" title={s.name} subtitle={s.sku ?? "—"} meta={`${s.quantity_on_hand} ${s.unit ?? ""} on hand`} />
                  ))}
                </TileGrid>
              </Board>
            ) : null}
            <Board title="Stock on hand" hint="Live quantities from your inventory." right={<SearchBox value={q} onChange={setQ} />}>
              <RecordTable
                columns={["Item", "SKU", "On hand", "Reorder level", "Unit"]}
                rows={rows.map((s: any) => ({ key: s.id, cells: [s.name, s.sku ?? "—", s.quantity_on_hand, s.reorder_level ?? "—", s.unit ?? "—"] }))}
              />
            </Board>
          </div>
        );
      }

      default:
        return (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Trial balance", "/reports/trial-balance"], ["Profit & loss", "/reports/pnl"],
              ["Balance sheet", "/reports/balance-sheet"], ["Aged receivables", "/reports/aged-receivables"],
              ["Cashbook", "/cashbook"], ["Sales by item", "/reports/sales-by-item"],
            ].map(([label, to]) => (
              <Link key={to} to={to as never} className="rounded-2xl border bg-card p-4 font-medium transition hover:-translate-y-0.5 hover:border-primary/50">
                {label}
              </Link>
            ))}
          </div>
        );
    }
  };

  return (
    <IndustryShell accent="hotel" product="SifoBooks Hotel" title={title} subtitle={subtitle} nav={HOTEL_NAV} active={screen}>
      {body()}
    </IndustryShell>
  );
}
