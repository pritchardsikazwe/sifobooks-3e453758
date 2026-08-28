import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { statusTone, toneClass, today, uid } from "@/lib/restaurant";
import { cn } from "@/lib/utils";
import { Banknote } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/cash")({
  head: () => ({
    meta: [
      { title: "Cash Drawers & Payouts — SifoBooks" },
      { name: "description", content: "Open and close cash drawers, record payouts and drops, and reconcile counted cash against expected takings." },
      { property: "og:title", content: "Cash Drawers & Payouts — SifoBooks" },
      { property: "og:description", content: "Float, cash sales, payouts, drops, expected vs counted and variance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Cash,
});

const db: any = supabase;

function Cash() {
  const [drawers, setDrawers] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [open, setOpen] = useState({ name: "Drawer 1", station: "Front counter", opening_float: 500, opened_by: "" });
  const [move, setMove] = useState({ drawer_id: "", txn_type: "payout", amount: 0, reason: "", approved_by: "" });
  const [count, setCount] = useState<Record<string, number>>({});

  const load = async () => {
    const u = await uid();
    if (!u) return;
    const [d, t, o] = await Promise.all([
      db.from("restaurant_cash_drawers").select("*").eq("user_id", u).order("opened_at", { ascending: false }).limit(60),
      db.from("restaurant_cash_transactions").select("*").eq("user_id", u).order("created_at", { ascending: false }).limit(200),
      db.from("restaurant_orders").select("*").eq("user_id", u).eq("business_date", today()).eq("status", "paid"),
    ]);
    setDrawers(d.data ?? []); setTxns(t.data ?? []); setOrders(o.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const cashSalesToday = orders
    .filter((o) => (o.payment_method || "").toLowerCase() === "cash")
    .reduce((s, o) => s + Number(o.total || 0), 0);

  const openDrawer = async () => {
    const u = await uid();
    const { error } = await db.from("restaurant_cash_drawers").insert({ user_id: u, ...open, status: "open", business_date: today() });
    if (error) return toast.error(error.message);
    toast.success("Cash drawer opened");
    load();
  };

  const addTxn = async () => {
    if (!move.drawer_id || !move.amount) return toast.error("Pick a drawer and enter an amount");
    const u = await uid();
    const { error } = await db.from("restaurant_cash_transactions").insert({ user_id: u, ...move });
    if (error) return toast.error(error.message);
    const d = drawers.find((x) => x.id === move.drawer_id);
    const field = move.txn_type === "drop" ? "cash_drops" : move.txn_type === "received" ? "cash_sales" : "cash_payouts";
    await db.from("restaurant_cash_drawers").update({ [field]: Number(d?.[field] || 0) + Number(move.amount) }).eq("id", move.drawer_id);
    setMove({ ...move, amount: 0, reason: "" });
    toast.success("Cash movement recorded");
    load();
  };

  const closeDrawer = async (d: any) => {
    const counted = Number(count[d.id] ?? 0);
    const cashSales = Number(d.cash_sales || 0) || (drawers.filter((x) => x.status === "open").length === 1 ? cashSalesToday : 0);
    const expected = Number(d.opening_float || 0) + cashSales - Number(d.cash_payouts || 0) - Number(d.cash_drops || 0);
    const { error } = await db.from("restaurant_cash_drawers").update({
      status: "closed", closed_at: new Date().toISOString(),
      cash_sales: cashSales, expected_cash: expected, counted_cash: counted, variance: counted - expected,
    }).eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success(`Drawer closed — variance ${fmtMoney(counted - expected)}`);
    load();
  };

  const openDrawers = drawers.filter((d) => d.status === "open");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Banknote className="h-5 w-5" /> Cash management</h1>
          <p className="text-sm text-muted-foreground">{openDrawers.length} drawer(s) open · cash sales today {fmtMoney(cashSalesToday)}</p>
        </div>
        <ExportMenu filename={`cash-drawers-${today()}`} title="Cash drawers" rows={drawers.map((d) => ({
          Drawer: d.name, Date: d.business_date, Status: d.status, Float: Number(d.opening_float),
          "Cash sales": Number(d.cash_sales), Payouts: Number(d.cash_payouts), Drops: Number(d.cash_drops),
          Expected: Number(d.expected_cash), Counted: Number(d.counted_cash), Variance: Number(d.variance),
        }))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 rounded-2xl grid gap-2 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-semibold">Open a drawer</div>
          <Input placeholder="Drawer name" value={open.name} onChange={(e) => setOpen({ ...open, name: e.target.value })} />
          <Input placeholder="Station" value={open.station} onChange={(e) => setOpen({ ...open, station: e.target.value })} />
          <Input type="number" placeholder="Opening float" value={open.opening_float} onChange={(e) => setOpen({ ...open, opening_float: Number(e.target.value) })} />
          <Input placeholder="Opened by" value={open.opened_by} onChange={(e) => setOpen({ ...open, opened_by: e.target.value })} />
          <Button className="md:col-span-2" onClick={openDrawer}>Open drawer</Button>
        </Card>

        <Card className="p-4 rounded-2xl grid gap-2 md:grid-cols-2">
          <div className="md:col-span-2 text-sm font-semibold">Payout, drop or cash received</div>
          <Select value={move.drawer_id} onValueChange={(v) => setMove({ ...move, drawer_id: v })}>
            <SelectTrigger><SelectValue placeholder="Drawer" /></SelectTrigger>
            <SelectContent>{openDrawers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={move.txn_type} onValueChange={(v) => setMove({ ...move, txn_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["payout", "drop", "received"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Amount" value={move.amount} onChange={(e) => setMove({ ...move, amount: Number(e.target.value) })} />
          <Input placeholder="Approved by (manager)" value={move.approved_by} onChange={(e) => setMove({ ...move, approved_by: e.target.value })} />
          <Input className="md:col-span-2" placeholder="Reason" value={move.reason} onChange={(e) => setMove({ ...move, reason: e.target.value })} />
          <Button className="md:col-span-2" variant="outline" onClick={addTxn}>Record movement</Button>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {drawers.map((d) => {
          const expected = Number(d.opening_float || 0) + Number(d.cash_sales || 0) - Number(d.cash_payouts || 0) - Number(d.cash_drops || 0);
          return (
            <Card key={d.id} className="p-4 rounded-2xl space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{d.name}</span>
                <span className="text-xs text-muted-foreground">{d.station} · {d.business_date}</span>
                <span className={cn("ml-auto text-[11px] uppercase rounded-full border px-2 py-0.5", toneClass[statusTone(d.status)])}>{d.status}</span>
              </div>
              <Line label="Opening float" v={Number(d.opening_float)} />
              <Line label="Cash sales" v={Number(d.cash_sales)} />
              <Line label="Payouts" v={-Number(d.cash_payouts)} />
              <Line label="Drops" v={-Number(d.cash_drops)} />
              <Line label="Expected cash" v={d.status === "open" ? expected : Number(d.expected_cash)} bold />
              {d.status === "open" ? (
                <div className="flex gap-2 pt-2">
                  <Input type="number" placeholder="Counted cash" value={count[d.id] ?? ""}
                    onChange={(e) => setCount({ ...count, [d.id]: Number(e.target.value) })} />
                  <Button onClick={() => closeDrawer(d)}>Close & count</Button>
                </div>
              ) : (
                <>
                  <Line label="Counted" v={Number(d.counted_cash)} />
                  <Line label="Variance" v={Number(d.variance)} bold />
                </>
              )}
            </Card>
          );
        })}
        {drawers.length === 0 && <Card className="p-10 rounded-2xl text-center text-sm text-muted-foreground md:col-span-2">No drawers yet.</Card>}
      </div>

      <Card className="p-4 rounded-2xl">
        <div className="text-sm font-semibold mb-2">Cash movements</div>
        {txns.length === 0 ? <p className="text-sm text-muted-foreground">No payouts or drops recorded.</p> : (
          <ul className="space-y-1 text-sm">
            {txns.slice(0, 25).map((t) => (
              <li key={t.id} className="flex justify-between rounded-lg border px-3 py-2">
                <span className="capitalize">{t.txn_type} — {t.reason || "no reason given"} {t.approved_by ? `(${t.approved_by})` : ""}</span>
                <span className="tabular-nums">{fmtMoney(Number(t.amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Line({ label, v, bold }: { label: string; v: number; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between text-sm", bold && "font-semibold border-t pt-1")}>
      <span>{label}</span><span className="tabular-nums">{fmtMoney(v)}</span>
    </div>
  );
}
