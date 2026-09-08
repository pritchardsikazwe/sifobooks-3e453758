import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Gauge, RefreshCw, Users, Banknote, Undo2, Ban, ShoppingCart, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RequireModule } from "@/components/RequireModule";
import { usePermissions } from "@/hooks/usePermissions";
import { fmtMoney } from "@/lib/format";
import { refundSale, voidSale } from "@/lib/pos";

export const Route = createFileRoute("/_authenticated/pos/retail-command-center")({
  head: () => ({
    meta: [
      { title: "Retail Command Center — SifoBooks" },
      { name: "description", content: "Live retail till oversight for managers: cashier activity, open shifts, sales, refunds and voids." },
      { property: "og:title", content: "Retail Command Center — SifoBooks" },
      { property: "og:description", content: "Manager view of every retail till: who is selling, open shifts, refunds and voids." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <RequireModule moduleKey="retail_pos"><RetailCommandCenter /></RequireModule>,
});

type Sale = { id: string; sale_no: string | null; sold_at: string; total: number; status: string; customer_name: string; created_by: string | null; shift_id: string | null; refund_of: string | null; void_reason: string | null; discount: number; branch_id: string | null };
type Shift = { id: string; cashier_name: string | null; opened_at: string; closed_at: string | null; status: string; opening_float: number; cash_in: number; cash_out: number; expected_cash: number; actual_cash: number | null; variance: number | null; created_by: string | null; branch_id: string | null };
type Staff = { user_id: string; full_name: string | null; email: string | null };
type Override = { id: string; action: string; cashier_user_id: string; manager_user_id: string; created_at: string; expires_at: string; used_at: string | null };
const VOID_REASONS = ["Wrong product", "Wrong quantity", "Customer cancelled", "Duplicate sale", "Other"];

function RetailCommandCenter() {
  const { has, isStaff, access } = usePermissions();
  const canAll = !isStaff || has("pos.sales.view_all");
  const [sales, setSales] = useState<Sale[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [payMix, setPayMix] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [voidFor, setVoidFor] = useState<Sale | null>(null);
  const [tick, setTick] = useState(0);

  const load = async () => {
    setLoading(true);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [{ data: s }, { data: sh }, { data: st }, { data: ov }] = await Promise.all([
      supabase.from("pos_sales").select("id,sale_no,sold_at,total,status,customer_name,created_by,shift_id,refund_of,void_reason,discount,branch_id").gte("sold_at", start.toISOString()).order("sold_at", { ascending: false }).limit(500),
      supabase.from("pos_shifts").select("id,cashier_name,opened_at,closed_at,status,opening_float,cash_in,cash_out,expected_cash,actual_cash,variance,created_by,branch_id").gte("opened_at", new Date(start.getTime() - 86400000).toISOString()).order("opened_at", { ascending: false }),
      supabase.from("staff_members").select("user_id,full_name,email"),
      supabase.from("pos_manager_overrides").select("*").gte("created_at", start.toISOString()).order("created_at", { ascending: false }),
    ]);
    const list = (s ?? []) as Sale[];
    setSales(list); setShifts((sh ?? []) as Shift[]); setStaff((st ?? []) as Staff[]); setOverrides((ov ?? []) as Override[]);
    const ids = list.filter(x => x.status === "completed").map(x => x.id);
    if (ids.length) {
      const { data: pays } = await supabase.from("pos_payments").select("method,amount").in("sale_id", ids.slice(0, 500));
      const m: Record<string, number> = {};
      (pays ?? []).forEach((p: any) => { m[p.method] = (m[p.method] ?? 0) + Number(p.amount || 0); });
      setPayMix(m);
    } else setPayMix({});
    setLoading(false);
  };
  useEffect(() => { load(); }, [tick]);
  // live: refresh whenever a sale or shift changes
  useEffect(() => {
    const ch = supabase.channel("retail-cc")
      .on("postgres_changes", { event: "*", schema: "public", table: "pos_sales" }, () => setTick(t => t + 1))
      .on("postgres_changes", { event: "*", schema: "public", table: "pos_shifts" }, () => setTick(t => t + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const who = (uid: string | null) => {
    if (!uid) return "Owner";
    if (uid === access?.tenant_id) return "Owner";
    const s = staff.find(x => x.user_id === uid);
    return s?.full_name || s?.email || uid.slice(0, 8);
  };

  const kpis = useMemo(() => {
    const done = sales.filter(s => s.status === "completed" && !s.refund_of);
    const refunds = sales.filter(s => s.refund_of || s.status === "refunded");
    const voids = sales.filter(s => s.status === "voided");
    const total = done.reduce((a, s) => a + Number(s.total || 0), 0);
    return { total, count: done.length, avg: done.length ? total / done.length : 0, refunds: refunds.length, refundValue: refunds.reduce((a, s) => a + Math.abs(Number(s.total || 0)), 0), voids: voids.length, discounts: done.reduce((a, s) => a + Number(s.discount || 0), 0), openShifts: shifts.filter(s => s.status === "open").length };
  }, [sales, shifts]);

  const byCashier = useMemo(() => {
    const m: Record<string, { name: string; sales: number; count: number; refunds: number; voids: number; discounts: number; last: string }> = {};
    for (const s of sales) {
      const k = s.created_by ?? "owner";
      const row = (m[k] ??= { name: who(s.created_by), sales: 0, count: 0, refunds: 0, voids: 0, discounts: 0, last: s.sold_at });
      if (s.status === "completed" && !s.refund_of) { row.sales += Number(s.total || 0); row.count++; row.discounts += Number(s.discount || 0); }
      if (s.refund_of || s.status === "refunded") row.refunds++;
      if (s.status === "voided") row.voids++;
      if (s.sold_at > row.last) row.last = s.sold_at;
    }
    return Object.values(m).sort((a, b) => b.sales - a.sales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, staff]);

  const doRefund = async (s: Sale) => {
    if (!confirm(`Refund ${s.sale_no ?? s.id.slice(0, 8)} for ${fmtMoney(Number(s.total))}?`)) return;
    try { await refundSale(s.id); toast.success("Refunded"); setTick(t => t + 1); } catch (e: any) { toast.error(e?.message ?? "Refund failed"); }
  };

  if (!canAll) {
    return <div className="p-6 text-sm text-muted-foreground">You can only view your own sales. Open <Link to="/pos-sales" className="underline">My Sales</Link>.</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Gauge className="h-6 w-6 text-primary" /> Retail Command Center</h1>
          <p className="text-sm text-muted-foreground">Live view of every retail till today{access?.branch_name ? ` · ${access.branch_name}` : ""}. Updates automatically.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild><Link to="/pos"><ShoppingCart className="h-4 w-4 mr-1" /> Open till</Link></Button>
          <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <Kpi label="Sales today" value={fmtMoney(kpis.total)} />
        <Kpi label="Transactions" value={String(kpis.count)} />
        <Kpi label="Avg basket" value={fmtMoney(kpis.avg)} />
        <Kpi label="Open shifts" value={String(kpis.openShifts)} icon={Banknote} />
        <Kpi label="Refunds" value={`${kpis.refunds} · ${fmtMoney(kpis.refundValue)}`} icon={Undo2} warn={kpis.refunds > 0} />
        <Kpi label="Voids" value={String(kpis.voids)} icon={Ban} warn={kpis.voids > 0} />
        <Kpi label="Discounts given" value={fmtMoney(kpis.discounts)} />
      </div>

      <Tabs defaultValue="cashiers">
        <TabsList>
          <TabsTrigger value="cashiers"><Users className="h-4 w-4 mr-1" /> Cashiers</TabsTrigger>
          <TabsTrigger value="shifts"><Banknote className="h-4 w-4 mr-1" /> Shifts</TabsTrigger>
          <TabsTrigger value="sales"><ShoppingCart className="h-4 w-4 mr-1" /> Sales</TabsTrigger>
          <TabsTrigger value="exceptions"><AlertTriangle className="h-4 w-4 mr-1" /> Refunds, voids & authorisations</TabsTrigger>
        </TabsList>

        <TabsContent value="cashiers" className="mt-4">
          <Panel>
            <Table>
              <TableHeader><TableRow><TableHead>Cashier</TableHead><TableHead className="text-right">Sales</TableHead><TableHead className="text-right">Txns</TableHead><TableHead className="text-right">Discounts</TableHead><TableHead className="text-right">Refunds</TableHead><TableHead className="text-right">Voids</TableHead><TableHead>Last activity</TableHead><TableHead>Shift</TableHead></TableRow></TableHeader>
              <TableBody>
                {byCashier.map(c => {
                  const open = shifts.find(s => s.status === "open" && (s.cashier_name === c.name || who(s.created_by) === c.name));
                  return (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(c.sales)}</TableCell>
                      <TableCell className="text-right">{c.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(c.discounts)}</TableCell>
                      <TableCell className="text-right">{c.refunds ? <Badge variant="destructive">{c.refunds}</Badge> : 0}</TableCell>
                      <TableCell className="text-right">{c.voids ? <Badge variant="destructive">{c.voids}</Badge> : 0}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(c.last).toLocaleTimeString()}</TableCell>
                      <TableCell>{open ? <Badge className="bg-emerald-600">Open</Badge> : <Badge variant="secondary">Closed</Badge>}</TableCell>
                    </TableRow>
                  );
                })}
                {byCashier.length === 0 && <Empty text="No till activity yet today." />}
              </TableBody>
            </Table>
          </Panel>
        </TabsContent>

        <TabsContent value="shifts" className="mt-4">
          <Panel>
            <Table>
              <TableHeader><TableRow><TableHead>Cashier</TableHead><TableHead>Opened</TableHead><TableHead>Closed</TableHead><TableHead className="text-right">Float</TableHead><TableHead className="text-right">Cash in</TableHead><TableHead className="text-right">Cash out</TableHead><TableHead className="text-right">Expected</TableHead><TableHead className="text-right">Counted</TableHead><TableHead className="text-right">Variance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {shifts.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.cashier_name || who(s.created_by)}</TableCell>
                    <TableCell className="text-xs">{new Date(s.opened_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{s.closed_at ? new Date(s.closed_at).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(Number(s.opening_float))}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(Number(s.cash_in))}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(Number(s.cash_out))}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(Number(s.expected_cash))}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.actual_cash == null ? "—" : fmtMoney(Number(s.actual_cash))}</TableCell>
                    <TableCell className={`text-right tabular-nums font-semibold ${Number(s.variance || 0) < 0 ? "text-destructive" : ""}`}>{s.variance == null ? "—" : fmtMoney(Number(s.variance))}</TableCell>
                    <TableCell>{s.status === "open" ? <Badge className="bg-emerald-600">Open</Badge> : <Badge variant="secondary">Closed</Badge>}</TableCell>
                  </TableRow>
                ))}
                {shifts.length === 0 && <Empty text="No shifts opened in the last two days." />}
              </TableBody>
            </Table>
          </Panel>
        </TabsContent>

        <TabsContent value="sales" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(payMix).map(([m, v]) => <Badge key={m} variant="outline" className="capitalize">{m}: {fmtMoney(v)}</Badge>)}
          </div>
          <Panel>
            <Table>
              <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Time</TableHead><TableHead>Cashier</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {sales.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.sale_no ?? s.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{new Date(s.sold_at).toLocaleTimeString()}</TableCell>
                    <TableCell>{who(s.created_by)}</TableCell>
                    <TableCell className="truncate max-w-40">{s.customer_name}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmtMoney(Number(s.total))}</TableCell>
                    <TableCell><Badge variant={s.status === "completed" ? "secondary" : "destructive"} className="uppercase text-[10px]">{s.refund_of ? "refund" : s.status}</Badge></TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {s.status === "completed" && !s.refund_of && (
                        <>
                          {has("pos.refund") && <Button size="sm" variant="outline" onClick={() => doRefund(s)}>Refund</Button>}
                          {has("pos.void") && <Button size="sm" variant="ghost" className="ml-1" onClick={() => setVoidFor(s)}>Void</Button>}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && <Empty text="No sales yet today." />}
              </TableBody>
            </Table>
          </Panel>
        </TabsContent>

        <TabsContent value="exceptions" className="mt-4 space-y-4">
          <Panel title="Refunds & voids today">
            <Table>
              <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Time</TableHead><TableHead>Cashier</TableHead><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {sales.filter(s => s.status === "voided" || s.status === "refunded" || s.refund_of).map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.sale_no ?? s.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{new Date(s.sold_at).toLocaleTimeString()}</TableCell>
                    <TableCell>{who(s.created_by)}</TableCell>
                    <TableCell><Badge variant="destructive" className="uppercase text-[10px]">{s.refund_of ? "refund" : s.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.void_reason ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(Math.abs(Number(s.total)))}</TableCell>
                  </TableRow>
                ))}
                {sales.filter(s => s.status === "voided" || s.status === "refunded" || s.refund_of).length === 0 && <Empty text="No refunds or voids today." />}
              </TableBody>
            </Table>
          </Panel>
          <Panel title="Manager authorisations today">
            <Table>
              <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Cashier</TableHead><TableHead>Authorised by</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {overrides.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs">{new Date(o.created_at).toLocaleTimeString()}</TableCell>
                    <TableCell><code className="text-xs">{o.action}</code></TableCell>
                    <TableCell>{who(o.cashier_user_id)}</TableCell>
                    <TableCell>{who(o.manager_user_id)}</TableCell>
                    <TableCell>{o.used_at ? <Badge variant="secondary">Used</Badge> : new Date(o.expires_at) > new Date() ? <Badge className="bg-amber-500">Active</Badge> : <Badge variant="outline">Expired</Badge>}</TableCell>
                  </TableRow>
                ))}
                {overrides.length === 0 && <Empty text="No manager authorisations today." />}
              </TableBody>
            </Table>
          </Panel>
        </TabsContent>
      </Tabs>

      <Dialog open={!!voidFor} onOpenChange={(o) => !o && setVoidFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Void {voidFor?.sale_no}</DialogTitle></DialogHeader>
          <div className="grid gap-2">
            {VOID_REASONS.map(r => (
              <Button key={r} variant="outline" className="h-12 justify-start" onClick={async () => {
                if (!voidFor) return;
                try { await voidSale(voidFor.id, r); toast.success("Sale voided"); setVoidFor(null); setTick(t => t + 1); }
                catch (e: any) { toast.error(e?.message ?? "Void failed"); }
              }}>{r}</Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, warn }: { label: string; value: string; icon?: any; warn?: boolean }) {
  return (
    <div className={`rounded-xl border bg-card p-3 ${warn ? "border-amber-400/60" : ""}`}>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">{label}{Icon && <Icon className="h-3.5 w-3.5" />}</div>
      <div className="text-lg font-bold tabular-nums mt-1 truncate">{value}</div>
    </div>
  );
}
function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return <div className="rounded-xl border bg-card overflow-x-auto">{title && <div className="px-4 py-2.5 border-b text-sm font-semibold">{title}</div>}{children}</div>;
}
function Empty({ text }: { text: string }) {
  return <TableRow><TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-8">{text}</TableCell></TableRow>;
}
