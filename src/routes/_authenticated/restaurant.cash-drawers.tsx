import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtMoney } from "@/lib/format";
import { today, uid } from "@/lib/restaurant";
import { toast } from "sonner";
import { WalletCards } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/cash-drawers")({
  head: () => ({ meta: [
    { title: "Cash Drawers — SifoBooks Restaurant" },
    { name: "description", content: "Open, manage and reconcile restaurant cash drawers and cashier shifts." },
  ]}),
  component: CashDrawers,
});

function CashDrawers() {
  const [drawers, setDrawers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [cashTxns, setCashTxns] = useState<any[]>([]);
  const [name, setName] = useState("Drawer 1");
  const [station, setStation] = useState("POS 1");
  const [float, setFloat] = useState("0");
  const [counted, setCounted] = useState<Record<string,string>>({});
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [txnType, setTxnType] = useState<"payout"|"drop">("payout");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const u = await uid(); if (!u) return;
    const [d,p,c] = await Promise.all([
      supabase.from("restaurant_cash_drawers").select("*").eq("user_id",u).eq("business_date",today()).order("opened_at",{ascending:false}),
      supabase.from("restaurant_payments").select("amount,method,order_id").eq("user_id",u),
      supabase.from("restaurant_cash_transactions").select("*").eq("user_id",u).order("id",{ascending:false}).limit(200),
    ]);
    setDrawers(d.data ?? []); setPayments(p.data ?? []); setCashTxns(c.data ?? []);
  };
  useEffect(()=>{ void load(); },[]);

  const openDrawer = async () => {
    const u = await uid(); if (!u) return;
    if (!name.trim()) return toast.error("Enter a drawer name");
    const existing = drawers.find(d => d.status === "open");
    if (existing) return toast.error("An open drawer already exists for today");
    setBusy(true);
    const { error } = await supabase.from("restaurant_cash_drawers").insert({
      id: crypto.randomUUID(), user_id:u, name:name.trim(), station:station.trim(),
      business_date:today(), opening_float:Number(float||0), expected_cash:Number(float||0),
      opened_at:new Date().toISOString(), opened_by:u, created_by:u, status:"open",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Cash drawer opened"); void load();
  };

  const active = drawers.find(d=>d.status==="open");
  const cashSales = useMemo(()=>payments.filter(p=>String(p.method).toLowerCase()==="cash").reduce((s,p)=>s+Number(p.amount||0),0),[payments]);
  const drawerTxns = useMemo(()=>cashTxns.filter(t=>!active || t.drawer_id===active.id),[cashTxns,active]);
  const payouts = drawerTxns.filter(t=>t.txn_type==="payout").reduce((s,t)=>s+Number(t.amount||0),0);
  const drops = drawerTxns.filter(t=>t.txn_type==="drop").reduce((s,t)=>s+Number(t.amount||0),0);

  const refreshExpected = async (d:any) => {
    const expected=Number(d.opening_float||0)+cashSales-payouts-drops;
    await supabase.from("restaurant_cash_drawers").update({cash_sales:cashSales,cash_payouts:payouts,cash_drops:drops,expected_cash:expected,updated_at:new Date().toISOString()}).eq("id",d.id);
    return expected;
  };

  const addCashTxn = async () => {
    if (!active) return toast.error("Open a drawer first");
    const value=Number(amount||0); if(value<=0) return toast.error("Enter an amount");
    const u=await uid(); if(!u) return;
    const {error}=await supabase.from("restaurant_cash_transactions").insert({
      id:crypto.randomUUID(),user_id:u,drawer_id:active.id,txn_type:txnType,amount:value,reason:reason.trim()||null,reference:null,approved_by:u
    });
    if(error) return toast.error(error.message);
    setAmount(""); setReason(""); toast.success(txnType==="payout"?"Cash paid out":"Cash drop recorded"); void load();
  };

  const closeDrawer = async (d:any) => {
    const actual=Number(counted[d.id]??"");
    if(!Number.isFinite(actual)||actual<0) return toast.error("Enter the counted cash");
    const expected=Number(d.opening_float||0)+cashSales-payouts-drops;
    const variance=actual-expected;
    const u=await uid(); if(!u) return;
    setBusy(true);
    const {error}=await supabase.from("restaurant_cash_drawers").update({
      cash_sales:cashSales,cash_payouts:payouts,cash_drops:drops,expected_cash:expected,
      counted_cash:actual,variance,closed_at:new Date().toISOString(),closed_by:u,status:"closed",
      updated_at:new Date().toISOString(),
    }).eq("id",d.id);
    setBusy(false);
    if(error) return toast.error(error.message);
    toast.success(`Drawer closed — variance ${fmtMoney(variance)}`); void load();
  };

  return <div className="restaurant-2026-page space-y-4">
    <div><h1 className="text-2xl font-semibold flex items-center gap-2"><WalletCards className="h-5 w-5"/> Cash drawers</h1>
      <p className="text-sm text-muted-foreground">Open float → cash sales → pay-outs/drops → expected cash → physical count.</p></div>

    {!active && <Card className="p-4 rounded-2xl grid gap-3 md:grid-cols-4">
      <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Drawer name"/>
      <Input value={station} onChange={e=>setStation(e.target.value)} placeholder="POS station"/>
      <Input value={float} onChange={e=>setFloat(e.target.value)} type="number" min="0" placeholder="Opening float"/>
      <Button disabled={busy} onClick={openDrawer}>Open drawer</Button>
    </Card>}

    {active && <Card className="p-4 rounded-2xl space-y-3">
      <div className="flex flex-wrap items-center gap-3"><div className="mr-auto"><div className="font-semibold">{active.name} · {active.station}</div><div className="text-xs text-muted-foreground">Opening float {fmtMoney(active.opening_float)}</div></div>
        <div className="text-right"><div className="text-xs text-muted-foreground">Expected cash</div><div className="text-xl font-bold">{fmtMoney(Number(active.opening_float)+cashSales-payouts-drops)}</div></div></div>
      <div className="grid gap-2 md:grid-cols-4">
        <Input value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="0" placeholder="Cash amount"/>
        <Input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason / reference"/>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={txnType} onChange={e=>setTxnType(e.target.value as any)}><option value="payout">Pay out</option><option value="drop">Cash drop</option></select>
        <Button onClick={addCashTxn}>Record cash movement</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Cash sales" value={cashSales}/>
        <Metric label="Cash paid out" value={payouts}/>
        <Metric label="Cash drops" value={drops}/>
      </div>
    </Card>}

    <Card className="overflow-hidden rounded-2xl"><div className="p-4 font-semibold">Today's drawers</div>
      <table className="w-full text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Drawer</th><th className="p-3">Float</th><th className="p-3">Expected</th><th className="p-3">Counted</th><th className="p-3">Variance</th><th className="p-3">Status</th><th className="p-3"/></tr></thead>
      <tbody>{drawers.map(d=><tr className="border-t" key={d.id}><td className="p-3">{d.name}<div className="text-xs text-muted-foreground">{d.station}</div></td><td className="p-3">{fmtMoney(d.opening_float)}</td><td className="p-3">{fmtMoney(d.expected_cash)}</td><td className="p-3">{d.status==="open"?<Input className="h-8 w-28" type="number" value={counted[d.id]??""} onChange={e=>setCounted({...counted,[d.id]:e.target.value})}/>:fmtMoney(d.counted_cash)}</td><td className={`p-3 font-semibold ${Number(d.variance||0)<0?"text-rose-600":"text-emerald-600"}`}>{fmtMoney(d.variance)}</td><td className="p-3 capitalize">{d.status}</td><td className="p-3 text-right">{d.status==="open"&&<Button size="sm" onClick={()=>closeDrawer(d)} disabled={busy}>Close & count</Button>}</td></tr>)}</tbody></table>
    </Card>
  </div>;
}

function Metric({label,value}:{label:string;value:number}){return <Card className="p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-semibold">{fmtMoney(value)}</div></Card>}
