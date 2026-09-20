import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, AlertTriangle, Boxes, ArrowRightLeft, ShoppingCart, ReceiptText, Scale, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route=createFileRoute("/_authenticated/compliance-centre")({
  head:()=>({meta:[{title:"Compliance Centre — SifoBooks"},{name:"description",content:"SifoBooks accounting, inventory and ZRA compliance control centre."}]}),
  component:ComplianceCentre,
});

type Row=Record<string,any>;
const money=(v:any)=>new Intl.NumberFormat("en-ZM",{style:"currency",currency:"ZMW",maximumFractionDigits:2}).format(Number(v||0));

function ComplianceCentre(){
  const [uid,setUid]=useState("");
  const [busy,setBusy]=useState(false);
  const [sales,setSales]=useState<Row[]>([]);
  const [queue,setQueue]=useState<Row[]>([]);
  const [outbox,setOutbox]=useState<Row[]>([]);
  const [transfers,setTransfers]=useState<Row[]>([]);
  const [grns,setGrns]=useState<Row[]>([]);
  const [counts,setCounts]=useState<Row[]>([]);
  const [fiscal,setFiscal]=useState<Row[]>([]);

  const load=useCallback(async(userId:string)=>{
    setBusy(true);
    try{
      const [s,q,o,t,g,c,f]=await Promise.all([
        supabase.from("pos_sales").select("id,sale_no,total,status,sold_at").order("sold_at",{ascending:false}).limit(200),
        supabase.from("zra_invoice_queue").select("id,invoice_number,total,status,response_code,response_message,zra_receipt_number,updated_at").order("updated_at",{ascending:false}).limit(100),
        supabase.from("zra_outbox").select("id,operation,source_id,status,result_code,error_message,attempt_count,updated_at").order("updated_at",{ascending:false}).limit(100),
        supabase.from("inventory_transfers").select("id,transfer_number,from_location_id,to_location_id,status,transfer_date").order("updated_at",{ascending:false}).limit(50),
        supabase.from("purchase_receipts").select("id,receipt_number,supplier_id,total,status,receipt_date").order("updated_at",{ascending:false}).limit(50),
        supabase.from("stock_reconciliations").select("id,count_number,status,total_variance_value,count_date").order("updated_at",{ascending:false}).limit(50),
        supabase.from("fiscal_transaction_controls").select("id,sale_id,invoice_number,state,zra_receipt_number,error_code,error_message,updated_at").order("updated_at",{ascending:false}).limit(100),
      ]);
      setSales((s.data||[]) as Row[]); setQueue((q.data||[]) as Row[]); setOutbox((o.data||[]) as Row[]);
      setTransfers((t.data||[]) as Row[]); setGrns((g.data||[]) as Row[]); setCounts((c.data||[]) as Row[]); setFiscal((f.data||[]) as Row[]);
    } finally{setBusy(false);}
  },[]);

  useEffect(()=>{void (async()=>{const {data}=await supabase.auth.getUser();if(data.user){setUid(data.user.id);await load(data.user.id);}})();},[load]);

  const todaySales=useMemo(()=>sales.filter(s=>String(s.sold_at||"").slice(0,10)===new Date().toISOString().slice(0,10)),[sales]);
  const fiscalized=fiscal.filter(x=>x.state==="FISCALIZED");
  const pending=queue.filter(x=>["pending","submitting"].includes(String(x.status)));
  const rejected=fiscal.filter(x=>x.state==="REJECTED") .length;
  const exceptions=outbox.filter(x=>["FAILED","RETRY_REQUIRED","MANUAL_REVIEW"].includes(String(x.status))).length;
  const variance=counts.reduce((n,x)=>n+Number(x.total_variance_value||0),0);

  return <div className="space-y-6 p-4 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">SifoBooks Compliance Centre</h1><p className="text-sm text-muted-foreground">Neutral control view for accounting, inventory and fiscalization exceptions.</p></div>
      <Button variant="outline" onClick={()=>uid&&void load(uid)} disabled={busy}><RefreshCw className={busy?"mr-2 h-4 w-4 animate-spin":"mr-2 h-4 w-4"}/>Refresh</Button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-4"><div className="flex items-center justify-between"><span>Today's Sales</span><ShoppingCart className="h-5 w-5"/></div><div className="mt-2 text-2xl font-bold">{money(todaySales.reduce((n,x)=>n+Number(x.total||0),0))}</div><p className="text-xs text-muted-foreground">{todaySales.length} transactions</p></Card>
      <Card className="p-4"><div className="flex items-center justify-between"><span>Fiscalized</span><ShieldCheck className="h-5 w-5"/></div><div className="mt-2 text-2xl font-bold">{fiscalized.length}</div><p className="text-xs text-muted-foreground">Recorded ZRA fiscal state</p></Card>
      <Card className="p-4"><div className="flex items-center justify-between"><span>Pending ZRA</span><ReceiptText className="h-5 w-5"/></div><div className="mt-2 text-2xl font-bold">{pending.length}</div><p className="text-xs text-muted-foreground">Requires processing/review</p></Card>
      <Card className="p-4"><div className="flex items-center justify-between"><span>Exceptions</span><AlertTriangle className="h-5 w-5"/></div><div className="mt-2 text-2xl font-bold">{exceptions+rejected}</div><p className="text-xs text-muted-foreground">Compliance exceptions</p></Card>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5"><div className="mb-4 flex items-center gap-2 font-semibold"><LockKeyhole className="h-5 w-5"/>Fiscal control</div>
        <div className="space-y-2 text-sm">
          {fiscal.slice(0,8).map(x=><div key={x.id} className="flex items-center justify-between border-b py-2"><div><div className="font-medium">{x.invoice_number||x.sale_id}</div><div className="text-xs text-muted-foreground">{x.error_message||x.zra_receipt_number||"No fiscal message"}</div></div><Badge variant={x.state==="FISCALIZED"?"default":x.state==="REJECTED"?"destructive":"secondary"}>{x.state}</Badge></div>)}
          {!fiscal.length&&<p className="text-muted-foreground">No fiscal control records yet.</p>}
        </div>
      </Card>
      <Card className="p-5"><div className="mb-4 flex items-center gap-2 font-semibold"><Scale className="h-5 w-5"/>Stock reconciliation</div>
        <div className="mb-3 text-sm">Net recorded variance value: <strong>{money(variance)}</strong></div>
        <div className="space-y-2 text-sm">{counts.slice(0,8).map(x=><div key={x.id} className="flex items-center justify-between border-b py-2"><div><div className="font-medium">{x.count_number}</div><div className="text-xs text-muted-foreground">{x.count_date}</div></div><div className="text-right"><Badge variant={x.status==="POSTED"?"default":"secondary"}>{x.status}</Badge><div className="text-xs">{money(x.total_variance_value)}</div></div></div>)}{!counts.length&&<p className="text-muted-foreground">No stock counts yet.</p>}</div>
      </Card>
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><Boxes className="h-5 w-5"/>Purchasing / GRN</div><p className="mb-3 text-xs text-muted-foreground">{grns.length} recent receipts</p>{grns.slice(0,6).map(x=><div key={x.id} className="flex justify-between border-b py-2 text-sm"><span>{x.receipt_number}</span><span>{money(x.total)}</span></div>)}</Card>
      <Card className="p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><ArrowRightLeft className="h-5 w-5"/>Warehouse transfers</div><p className="mb-3 text-xs text-muted-foreground">{transfers.length} recent transfers</p>{transfers.slice(0,6).map(x=><div key={x.id} className="flex justify-between border-b py-2 text-sm"><span>{x.transfer_number}</span><Badge variant="secondary">{x.status}</Badge></div>)}</Card>
      <Card className="p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="h-5 w-5"/>ZRA outbox</div>{outbox.slice(0,6).map(x=><div key={x.id} className="flex justify-between border-b py-2 text-sm"><div><div>{x.operation}</div><div className="text-xs text-muted-foreground">{x.result_code||x.error_message||"queued"}</div></div><Badge variant={["SUCCESS"].includes(x.status)?"default":["FAILED","RETRY_REQUIRED"].includes(x.status)?"destructive":"secondary"}>{x.status}</Badge></div>)}</Card>
    </div>
  </div>;
}
