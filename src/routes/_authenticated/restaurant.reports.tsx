import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { summarise, today, uid } from "@/lib/restaurant";
import { BarChart3, Printer, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/reports")({
  head: () => ({
    meta: [
      { title: "Restaurant Reports — SifoBooks" },
      { name: "description", content: "Sales by hour, item, category, server, order type and payment method, plus discounts, voids and food cost — all exportable." },
      { property: "og:title", content: "Restaurant Reports — SifoBooks" },
      { property: "og:description", content: "Every restaurant report over any date range, exportable to PDF, CSV or Excel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reports,
});

const db: any = supabase;

function Reports() {
  const start = new Date(); start.setDate(start.getDate() - 30);
  const [from, setFrom] = useState(start.toISOString().slice(0, 10));
  const [to, setTo] = useState(today());
  const [orders, setOrders] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [drawers, setDrawers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const u = await uid();
      if (!u) return;
      const { data: o } = await db.from("restaurant_orders").select("*").eq("user_id", u)
        .gte("business_date", from).lte("business_date", to);
      const ids = (o ?? []).map((x: any) => x.id);
      const [li, mi, pa, sh, dr] = await Promise.all([
        ids.length ? db.from("restaurant_order_items").select("*").in("order_id", ids) : Promise.resolve({ data: [] }),
        db.from("restaurant_menu_items").select("*").eq("user_id", u),
        ids.length ? db.from("restaurant_payments").select("*").in("order_id", ids) : Promise.resolve({ data: [] }),
        db.from("restaurant_shifts").select("*").eq("user_id", u).gte("business_date", from).lte("business_date", to),
        db.from("restaurant_cash_drawers").select("*").eq("user_id", u).gte("business_date", from).lte("business_date", to),
      ]);
      setOrders(o ?? []); setLines(li.data ?? []); setItems(mi.data ?? []); setPayments(pa.data ?? []); setShifts(sh.data ?? []); setDrawers(dr.data ?? []);
    })();
  }, [from, to]);

const settled = orders.filter((o) => o.status === "paid");
  const refunded = orders.filter((o) => o.status === "refunded");
  const t = useMemo(() => summarise(settled), [settled]);
  const live = settled;

  const group =
    const m: Record<string, number> = {};
    rows.forEach((r) => { const k = key(r) || "—"; m[k] = (m[k] ?? 0) + val(r); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };

const byHour = group(live, (o) => {
    const dt = new Date(o.opened_at || o.created_at || Date.now());
    return `${String(dt.getHours()).padStart(2, "0")}:00`;
  }, (o) => Number(o.total || 0))
    .sort((a, b) => a[0].localeCompare(b[0]));
  const paidIds =
  const soldLines = lines.filter((l) => paidIds.has(l.order_id));
  const byItem = group(soldLines, (l) => l.item_name || l.name || "Unnamed item", (l) => Number(l.line_total ?? Number(l.price || 0) * Number(l.qty || 0)));
  const byCategory = group(soldLines, (l) => items.find((i) => i.id === l.menu_item_id)?.category ?? l.category ?? "Other",
    (l) => Number(l.line_total ?? Number(l.price || 0) * Number(l.qty || 0)));
  const byServer = group(live, (o) => o.server_name || "Unassigned", (o) => Number(o.total || 0));
  const byType = Object.entries(t.byType);
  const byMethod = Object.entries(t.byMethod);
  const discounts = group(live.filter((o) => Number(o.discount || 0) > 0), (o) => `#${o.order_no || o.id}`, (o) => Number(o.discount));
  const voids = orders.filter((o) => o.status === "void").map((o) => [`#${o.order_no || o.id} ${o.server_name ?? ""}`, Number(o.total || 0)] as [string, number]);

  /* Cost comes from the line cost the server calculated from recipes — never a client figure. */
  const foodCost = soldLines.reduce((s, l) => s + Number(l.unit_cost || 0) * Number(l.qty || 0), 0);
  const paymentMap: Record<string,number> = {};
  payments.forEach((p) => { const k=String(p.method||"other").toLowerCase(); paymentMap[k]=(paymentMap[k]||0)+Number(p.amount||0); });
  const byPayment = Object.entries(paymentMap).sort((a,b)=>b[1]-a[1]);
const byCashier = group(live, o => o.server_name || "Unassigned", o => Number(o.total || 0));
  const refundAmount = refunded.reduce((s, o) => s + Number(o.total || 0), 0);
  const saleRows = orders
    .filter((o) => o.status === "paid" || o.status === "refunded")
    .sort((a, b) => new Date(b.opened_at || b.created_at || 0).getTime() - new Date(a.opened_at || a.created_at || 0).getTime());
  const uncosted =
  const grossProfit = t.gross - foodCost;

  const reports: { key: string; label: string; rows: [string, number][]; unit?: string }[] = [
    { key: "hour", label: "Sales by hour", rows: byHour },
    { key: "item", label: "Sales by item", rows: byItem },
    { key: "category", label: "Sales by category", rows: byCategory },
    { key: "server", label: "Sales by server", rows: byServer },
    { key: "type", label: "Sales by order type", rows: byType as [string, number][] },
    { key: "method", label: "Payment methods", rows: byPayment as [string, number][] },
    { key: "cashier", label: "Cashier / server sales", rows: byCashier },
    { key: "shift", label: "Shift hours & tips", rows: shifts.map((s:any)=>[`${s.staff_name} · ${s.business_date}`, ((new Date(s.clock_out||Date.now()).getTime()-new Date(s.clock_in).getTime())/3600000)] as [string,number]) },
    { key: "drawer", label: "Cash drawer variance", rows: drawers.map((d:any)=>[`${d.name} · ${d.business_date}`, Number(d.variance||0)] as [string,number]) },
    { key: "discount", label: "Discounts", rows: discounts },
    { key: "void", label: "Voids", rows: voids },
  ];

  return (
    <div className="restaurant-2026-page space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Restaurant reports</h1>
          <p className="text-sm text-muted-foreground">{settled.length} completed sales · {refunded.length} refunds · net {fmtMoney(t.net)}</p>
        </div>
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Net sales" value={fmtMoney(t.net)} />
        <Kpi label="Average ticket" value={fmtMoney(t.orders ? t.net / t.orders : 0)} />
        <Kpi label="Food cost" value={fmtMoney(foodCost)} />
        <Kpi label="Gross profit" value={fmtMoney(grossProfit)} />
        <Kpi label="Refunds" value={fmtMoney(refundAmount)} />
      </div>
      {uncosted > 0 && (
        <p className="text-xs text-amber-600">
          {uncosted} sold line(s) have no recipe or item cost, so food cost and margin are understated. Add recipes on the Menu screen.
        </p>
      )}
      <Card className="rounded-2xl">
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <div className="mr-auto">
            <div className="font-semibold">Sales register</div>
            <div className="text-xs text-muted-foreground">Every completed restaurant sale in the selected period.</div>
          </div>
          <ExportMenu filename={`restaurant-sales-register-${from}-${to}`} title="Restaurant sales register" rows={saleRows.map((o) => ({
            Check: o.order_no ?? o.id,
            Date: o.business_date,
            Status: o.status,
            Cashier: o.server_name ?? "",
            Type: o.order_type ?? "",
            Total: Number(o.total || 0),
            Net: o.status === "refunded" ? 0 : Number(o.total || 0),
          }))} />
        </div>
        {saleRows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No completed sales in this period.</div>
        ) : (
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/90">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3">Check</th><th className="p-3">Time</th><th className="p-3">Cashier</th>
                  <th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {saleRows.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="p-3 font-medium">{o.order_no ?? o.id}</td>
                    <td className="p-3">{new Date(o.opened_at || o.created_at || Date.now()).toLocaleString()}</td>
                    <td className="p-3">{o.server_name ?? "Unassigned"}</td>
                    <td className="p-3">{o.order_type ?? "—"}</td>
                    <td className="p-3 uppercase">{o.status}</td>
                    <td className="p-3 text-right tabular-nums">{fmtMoney(Number(o.total || 0))}</td>
                    <td className="p-3 text-right tabular-nums">{fmtMoney(o.status === "refunded" ? 0 : Number(o.total || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>


      <Tabs defaultValue="hour">
        <TabsList className="flex-wrap h-auto">
          {reports.map((r) => <TabsTrigger key={r.key} value={r.key}>{r.label}</TabsTrigger>)}
        </TabsList>
        {reports.map((r) => (
          <TabsContent key={r.key} value={r.key}>
            <Card className="p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="font-semibold">{r.label}</div>
                <span className="text-xs text-muted-foreground">{from} → {to}</span>
                <div className="ml-auto">
                  <ExportMenu filename={`restaurant-${r.key}-${from}-${to}`} title={r.label}
                    rows={r.rows.map(([k, v]) => ({ Item: k, Amount: v }))} />
                </div>
              </div>
              {r.rows.length === 0 ? <p className="text-sm text-muted-foreground">Nothing in this period.</p> : (
                <ul className="space-y-1 text-sm">
                  {r.rows.map(([k, v]) => (
                    <li key={k} className="flex justify-between rounded-lg border px-3 py-2 capitalize">
                      <span>{k}</span><span className="tabular-nums">{fmtMoney(v)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between px-3 pt-2 font-semibold border-t">
                    <span>Total</span><span className="tabular-nums">{fmtMoney(r.rows.reduce((s, x) => s + x[1], 0))}</span>
                  </li>
                </ul>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 rounded-2xl">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}
