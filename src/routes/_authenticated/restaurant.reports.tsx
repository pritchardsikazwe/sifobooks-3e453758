import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { summarise, today, uid } from "@/lib/restaurant";
import { BarChart3 } from "lucide-react";

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

  useEffect(() => {
    (async () => {
      const u = await uid();
      if (!u) return;
      const { data: o } = await db.from("restaurant_orders").select("*").eq("user_id", u)
        .gte("business_date", from).lte("business_date", to);
      const ids = (o ?? []).map((x: any) => x.id);
      const [li, mi] = await Promise.all([
        ids.length ? db.from("restaurant_order_items").select("*").in("order_id", ids) : Promise.resolve({ data: [] }),
        db.from("restaurant_menu_items").select("*").eq("user_id", u),
      ]);
      setOrders(o ?? []); setLines(li.data ?? []); setItems(mi.data ?? []);
    })();
  }, [from, to]);

  const t = useMemo(() => summarise(orders), [orders]);
  const live = orders.filter((o) => o.status !== "void");

  const group = (rows: any[], key: (r: any) => string, val: (r: any) => number) => {
    const m: Record<string, number> = {};
    rows.forEach((r) => { const k = key(r) || "—"; m[k] = (m[k] ?? 0) + val(r); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };

  const byHour = group(live, (o) => `${String(new Date(o.created_at).getHours()).padStart(2, "0")}:00`, (o) => Number(o.total || 0))
    .sort((a, b) => a[0].localeCompare(b[0]));
  const byItem = group(lines, (l) => l.name, (l) => Number(l.line_total ?? Number(l.price || 0) * Number(l.quantity || 0)));
  const byCategory = group(lines, (l) => items.find((i) => i.id === l.menu_item_id)?.category ?? "Other",
    (l) => Number(l.line_total ?? Number(l.price || 0) * Number(l.quantity || 0)));
  const byServer = group(live, (o) => o.server_name || "Unassigned", (o) => Number(o.total || 0));
  const byType = Object.entries(t.byType);
  const byMethod = Object.entries(t.byMethod);
  const discounts = group(live.filter((o) => Number(o.discount || 0) > 0), (o) => `#${o.order_number}`, (o) => Number(o.discount));
  const voids = orders.filter((o) => o.status === "void").map((o) => [`#${o.order_number} ${o.server_name ?? ""}`, Number(o.total || 0)] as [string, number]);

  const foodCost = lines.reduce((s, l) => {
    const it = items.find((i) => i.id === l.menu_item_id);
    return s + Number(it?.cost || 0) * Number(l.quantity || 0);
  }, 0);
  const grossProfit = t.gross - foodCost;

  const reports: { key: string; label: string; rows: [string, number][]; unit?: string }[] = [
    { key: "hour", label: "Sales by hour", rows: byHour },
    { key: "item", label: "Sales by item", rows: byItem },
    { key: "category", label: "Sales by category", rows: byCategory },
    { key: "server", label: "Sales by server", rows: byServer },
    { key: "type", label: "Sales by order type", rows: byType as [string, number][] },
    { key: "method", label: "Payment methods", rows: byMethod as [string, number][] },
    { key: "discount", label: "Discounts", rows: discounts },
    { key: "void", label: "Voids", rows: voids },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Restaurant reports</h1>
          <p className="text-sm text-muted-foreground">{live.length} settled checks · net {fmtMoney(t.net)}</p>
        </div>
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Net sales" value={fmtMoney(t.net)} />
        <Kpi label="Average ticket" value={fmtMoney(t.orders ? t.net / t.orders : 0)} />
        <Kpi label="Food cost" value={fmtMoney(foodCost)} />
        <Kpi label="Gross profit" value={fmtMoney(grossProfit)} />
      </div>

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
