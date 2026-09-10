import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import {
  Board, IndustryShell, NotConnected, RecordTable, SearchBox, StatGrid, StatusPill, type NavItem,
} from "@/components/industry/IndustryKit";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BedDouble, CalendarCheck, ClipboardCheck, CreditCard, House, LayoutDashboard, Boxes,
  ReceiptText, UtensilsCrossed, Wrench, BarChart3, Wallet,
} from "lucide-react";

const db: any = supabase;

export const HOTEL_NAV: NavItem[] = [
  { label: "Dashboard", to: "/hotel", icon: LayoutDashboard },
  { label: "Front desk", to: "/hotel/front-desk", icon: House },
  { label: "Guests", to: "/hotel/guests", icon: CalendarCheck },
  { label: "Folios & billing", to: "/hotel/folios", icon: ReceiptText },
  { label: "Payments", to: "/hotel/payments", icon: CreditCard },
  { label: "Hotel POS", to: "/hotel/pos", icon: UtensilsCrossed },
  { label: "Maintenance", to: "/hotel/maintenance", icon: Wrench },
  { label: "Inventory", to: "/hotel/inventory", icon: Boxes },
  { label: "Accounting", to: "/hotel/accounting", icon: Wallet },
  { label: "Reports", to: "/hotel/reports", icon: BarChart3 },
  { label: "Rooms", to: "/hotel/rooms", icon: BedDouble, supported: false },
  { label: "Reservations", to: "/hotel/reservations", icon: CalendarCheck, supported: false },
  { label: "Housekeeping", to: "/hotel/housekeeping", icon: ClipboardCheck, supported: false },
];

const TITLES: Record<string, [string, string]> = {
  "/hotel": ["Hotel operations", "Live guest billing, food & beverage revenue and property costs from your own records."],
  "/hotel/front-desk": ["Front desk", "Open guest accounts and today's settlements, from your live ledger."],
  "/hotel/guests": ["Guests", "Your existing guest accounts. Select a guest to open the real record."],
  "/hotel/folios": ["Folios & billing", "Guest folios are your open invoices — charges, payments and balance."],
  "/hotel/payments": ["Payments", "Money received from guests, allocated to their folios."],
  "/hotel/pos": ["Hotel POS", "Restaurant and bar checks captured through your POS."],
  "/hotel/maintenance": ["Maintenance", "Property maintenance tickets by priority and status."],
  "/hotel/inventory": ["Inventory", "Housekeeping, kitchen and bar stock currently on hand."],
  "/hotel/accounting": ["Hotel accounting", "Where hotel activity lands in your books."],
  "/hotel/reports": ["Hotel reports", "Revenue, receivables and cost reporting on real data."],
};

const UNAVAILABLE: Record<string, string> = {
  "/hotel/rooms": "Room records",
  "/hotel/room-rack": "Room rack",
  "/hotel/reservations": "Room reservations",
  "/hotel/housekeeping": "Housekeeping tasks",
  "/hotel/check-in-out": "Check-in / check-out",
  "/hotel/night-audit": "Night audit",
  "/hotel/events": "Events & functions",
  "/hotel/guest-portal": "Guest portal",
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

    switch (screen) {
      case "/hotel":
      case "/hotel/front-desk": {
        const rows = openFolios.filter((i: any) => match(`${i.number} ${nameOf.get(i.customer_id) ?? ""}`)).slice(0, 25);
        return (
          <div className="space-y-4">
            <StatGrid items={[
              { label: "Open folios", value: String(openFolios.length), hint: "Guest accounts with a balance" },
              { label: "Outstanding", value: fmtMoney(outstanding), hint: "Owed by guests" },
              { label: "Received today", value: fmtMoney(receivedToday), hint: "Guest payments banked" },
              { label: "F&B checks today", value: fmtMoney(posToday), hint: `${orders.length} POS orders` },
            ]} />
            <Board
              title="Open guest folios"
              hint="Click a folio to open the real invoice."
              right={<SearchBox value={q} onChange={setQ} placeholder="Search guest or folio…" />}
            >
              <RecordTable
                columns={["Folio", "Guest", "Issued", "Charged", "Paid", "Balance", "Status"]}
                empty="No open guest folios in your account."
                rows={rows.map((i: any) => ({
                  key: i.id,
                  to: "/invoice-detail/$id",
                  params: { id: i.id },
                  cells: [
                    i.number, nameOf.get(i.customer_id) ?? "—", i.issue_date,
                    fmtMoney(Number(i.total)), fmtMoney(Number(i.amount_paid)),
                    <span className="font-semibold tabular-nums">{fmtMoney(Number(i.balance_due))}</span>,
                    <StatusPill status={i.status} />,
                  ],
                }))}
              />
            </Board>
          </div>
        );
      }
      case "/hotel/guests": {
        const rows = customers.filter((c: any) => match(`${c.name} ${c.phone ?? ""} ${c.email ?? ""}`)).slice(0, 100);
        return (
          <Board title="Guest accounts" hint="Existing guests first — open a guest to see stays, folios and payments." right={<SearchBox value={q} onChange={setQ} />}>
            <RecordTable
              columns={["Guest", "Phone", "Email", "City", "Status"]}
              rows={rows.map((c: any) => ({
                key: c.id, to: "/customers/$id", params: { id: c.id },
                cells: [c.name, c.phone ?? "—", c.email ?? "—", c.city ?? "—", <StatusPill status={c.active ? "active" : "inactive"} />],
              }))}
            />
          </Board>
        );
      }
      case "/hotel/folios": {
        const rows = invoices.filter((i: any) => match(`${i.number} ${nameOf.get(i.customer_id) ?? ""}`)).slice(0, 100);
        return (
          <div className="space-y-4">
            <StatGrid items={[
              { label: "Folios", value: String(invoices.length) },
              { label: "Open", value: String(openFolios.length) },
              { label: "Outstanding", value: fmtMoney(outstanding) },
              { label: "Received today", value: fmtMoney(receivedToday) },
            ]} />
            <Board title="Guest folios" hint="A folio is the guest invoice: room, restaurant and other charges." right={<SearchBox value={q} onChange={setQ} />}>
              <RecordTable
                columns={["Folio", "Guest", "Issued", "Due", "Charged", "Balance", "Status"]}
                rows={rows.map((i: any) => ({
                  key: i.id, to: "/invoice-detail/$id", params: { id: i.id },
                  cells: [i.number, nameOf.get(i.customer_id) ?? "—", i.issue_date, i.due_date ?? "—", fmtMoney(Number(i.total)), fmtMoney(Number(i.balance_due)), <StatusPill status={i.status} />],
                }))}
              />
            </Board>
          </div>
        );
      }
      case "/hotel/payments": {
        const rows = receipts.filter((r: any) => match(`${r.number} ${r.payer_name ?? ""} ${nameOf.get(r.customer_id) ?? ""}`)).slice(0, 100);
        return (
          <Board
            title="Guest payments"
            hint="Recorded through Customer Receipts and allocated to guest folios."
            right={<div className="flex gap-2"><SearchBox value={q} onChange={setQ} /><Link to="/receipts" className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Receive money</Link></div>}
          >
            <RecordTable
              columns={["Receipt", "Guest", "Date", "Method", "Amount", "Status"]}
              rows={rows.map((r: any) => ({
                key: r.id,
                cells: [r.number, nameOf.get(r.customer_id) ?? r.payer_name ?? "—", r.receipt_date, r.method, fmtMoney(Number(r.amount)), <StatusPill status={r.status} />],
              }))}
            />
          </Board>
        );
      }
      case "/hotel/pos": {
        const rows = orders.filter((o: any) => match(`${o.order_no} ${o.order_type}`));
        return (
          <div className="space-y-4">
            <StatGrid items={[
              { label: "Checks today", value: String(orders.length) },
              { label: "Value today", value: fmtMoney(posToday) },
              { label: "Open checks", value: String(orders.filter((o: any) => o.status === "open" || o.status === "held").length) },
              { label: "Average check", value: fmtMoney(orders.length ? posToday / orders.length : 0) },
            ]} />
            <Board title="Today's food & beverage checks" hint="Captured in the restaurant POS and posted to your books." right={<Link to="/restaurant/pos" className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Open POS</Link>}>
              <RecordTable
                columns={["Check", "Type", "Status", "Total"]}
                empty="No POS checks recorded today."
                rows={rows.map((o: any) => ({ key: o.id, cells: [o.order_no, o.order_type, <StatusPill status={o.status} />, fmtMoney(Number(o.total))] }))}
              />
            </Board>
          </div>
        );
      }
      case "/hotel/maintenance": {
        const rows = tickets.filter((t: any) => match(`${t.subject} ${t.ticket_number ?? ""}`));
        return (
          <Board title="Maintenance tickets" hint="Property issues logged in your service desk." right={<Link to="/service-tickets" className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted">Open service desk</Link>}>
            <RecordTable
              columns={["Ticket", "Issue", "Priority", "Opened", "Status"]}
              empty="No maintenance tickets logged."
              rows={rows.map((t: any) => ({ key: t.id, cells: [t.ticket_number ?? "—", t.subject, t.priority, String(t.opened_at ?? "").slice(0, 10), <StatusPill status={t.status} />] }))}
            />
          </Board>
        );
      }
      case "/hotel/inventory": {
        const low = stock.filter((s: any) => Number(s.quantity_on_hand) <= Number(s.reorder_level ?? 0));
        const rows = stock.filter((s: any) => match(`${s.name} ${s.sku ?? ""}`)).slice(0, 100);
        return (
          <div className="space-y-4">
            <StatGrid items={[
              { label: "Items", value: String(stock.length) },
              { label: "At reorder level", value: String(low.length) },
              { label: "Maintenance open", value: String(tickets.filter((t: any) => t.status !== "resolved").length) },
              { label: "F&B value today", value: fmtMoney(posToday) },
            ]} />
            <Board title="Stock on hand" hint="Housekeeping, kitchen and bar items from your inventory." right={<SearchBox value={q} onChange={setQ} />}>
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
