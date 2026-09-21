import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, BarChart3, Boxes, CheckCircle2, ClipboardCheck, FileCheck2, Landmark, ReceiptText, RefreshCw, ShieldCheck, ShoppingCart, UsersRound, WalletCards, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SifoWorkspaceShell } from "@/components/sifo/SifoWorkspaceShell";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";

export const Route=createFileRoute("/_authenticated/business-control-centre")({component:BusinessControlCentre,head:()=>({meta:[{title:"Business Control Centre — SifoBooks"},{name:"robots",content:"noindex"}]})});
function BusinessControlCentre(){
  const [currency,setCurrency]=useState("ZMW"); const [company,setCompany]=useState("Your business"); const [loading,setLoading]=useState(true);
  const [s,setS]=useState({ar:0,ap:0,stock:0,bank:0,sales:0,bills:0,approvals:0,exceptions:0,zra:0,alerts:0});
  const [alerts,setAlerts]=useState<any[]>([]);
  const load=async()=>{setLoading(true);try{const {data:u}=await supabase.auth.getUser();if(!u.user)return;
    const [{data:c},{data:i},{data:b},{data:st},{data:bt},{data:a},{data:e},{data:z},{data:al}]=await Promise.all([
      supabase.from("companies").select("name,trading_name,base_currency").eq("user_id",u.user.id).maybeSingle(),
      supabase.from("invoices").select("total,balance_due,status"),supabase.from("bills").select("total,balance_due,status"),
      supabase.from("stock_items").select("quantity_on_hand,cost_price"),supabase.from("bank_transactions").select("amount").limit(5000),
      supabase.from("approval_requests").select("id").eq("status","pending"),supabase.from("control_exceptions").select("id").eq("status","open"),
      supabase.from("stock_items").select("zra_sync_status"),supabase.from("business_alerts").select("id,severity,title,message,action_url").eq("status","open").order("created_at",{ascending:false}).limit(8)
    ]);
    setCompany(c?.trading_name||c?.name||"Your business");setCurrency(c?.base_currency||"ZMW");
    setS({ar:(i??[]).reduce((x:number,r:any)=>x+Number(r.balance_due||0),0),ap:(b??[]).reduce((x:number,r:any)=>x+Number(r.balance_due||0),0),
      stock:(st??[]).reduce((x:number,r:any)=>x+Number(r.quantity_on_hand||0)*Number(r.cost_price||0),0),bank:(bt??[]).reduce((x:number,r:any)=>x+Number(r.amount||0),0),
      sales:(i??[]).reduce((x:number,r:any)=>x+Number(r.total||0),0),bills:(b??[]).reduce((x:number,r:any)=>x+Number(r.total||0),0),
      approvals:(a??[]).length,exceptions:(e??[]).length,zra:(z??[]).filter((r:any)=>!["mapped","synced","registered"].includes(String(r.zra_sync_status||"unmapped").toLowerCase())).length,alerts:(al??[]).length});
    setAlerts(al??[]);
  }finally{setLoading(false)}}; useEffect(()=>{void load()},[]);
  const money=(n:number)=>fmtMoney(n,currency);
  const links=[["Bank → Cashbook → Reconciliation","Import, match, allocate, post and reconcile bank activity.","/reconciliation",Landmark],
    ["Compliance Centre","Track applicable tax, payroll and sector obligations with evidence.","/compliance-centre",ShieldCheck],
    ["ZRA Item Mapping","Review classification, unit and tax mappings before registration.","/zra-item-mapping",FileCheck2],
    ["Control Exceptions","Work the queue for duplicate invoices and other control failures.","/control-exceptions",AlertTriangle],
    ["Approval Centre","Maker-checker queue for controlled transactions.","/approval-centre",ClipboardCheck],
    ["Import & Landed Cost","Capture freight, duty, insurance and other landed costs.","/import-landed-cost",Boxes],
    ["Accountant Practice","Controlled multi-client foundation for accountants.","/accountant-practice",UsersRound],
    ["Business Assurance","Recurring reconciliations, evidence and management review.","/business-assurance",CheckCircle2],["Supplier Invoice Control","Detect duplicate supplier invoice references.","/supplier-invoice-control",FileCheck2],["Data Quality Centre","Scan master data for missing control fields.","/data-quality-centre",ShieldCheck],["Cash Flow Control","Review bank movement, receivables and payables together.","/cash-flow-control",WalletCards]] as const;
  return <SifoWorkspaceShell title="Business Control Centre" purpose="One control layer connecting accounting, banking, inventory, payroll, compliance and management without replacing existing SifoBooks workflows." icon={Activity} breadcrumbs={[{label:"Home",to:"/dashboard"},{label:"Business Control Centre"}]} actions={<Button variant="outline" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>}>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[WalletCards,"Receivables",money(s.ar),"/reports/aged-receivables"],[ShoppingCart,"Payables",money(s.ap),"/reports/aged-payables"],[Boxes,"Inventory at cost",money(s.stock),"/inventory"],[Landmark,"Bank movement",money(s.bank),"/banking"]].map(([Icon,label,value,to]:any)=><Link key={label} to={to}><Card className="p-4 transition-colors hover:border-primary/40"><div className="flex justify-between text-xs text-muted-foreground">{label}<Icon className="h-4 w-4 text-primary"/></div><div className="mt-2 text-xl font-bold">{value}</div></Card></Link>)}</div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Mini l="Sales recorded" v={money(s.sales)} i={ReceiptText}/><Mini l="Bills recorded" v={money(s.bills)} i={ShoppingCart}/><Mini l="Pending approvals" v={String(s.approvals)} i={ClipboardCheck}/><Mini l="Control exceptions" v={String(s.exceptions)} i={AlertTriangle}/><Mini l="ZRA items to review" v={String(s.zra)} i={ShieldCheck}/></div>
    <section><div className="mb-3"><h2 className="text-sm font-semibold">{company} control workflows</h2><p className="text-xs text-muted-foreground">Existing SifoBooks routes remain the system of record.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{links.map(([title,desc,to,Icon])=><Link key={to} to={to as any}><Card className="h-full p-4 hover:border-primary/40"><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4"/></span><div><div className="text-sm font-semibold">{title}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{desc}</p></div></div><div className="mt-3 flex items-center text-xs font-semibold text-primary">Open <ArrowRight className="ml-1 h-3.5 w-3.5"/></div></Card></Link>)}</div></section>
    <section className="grid gap-4 lg:grid-cols-2"><Card className="p-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Open alerts</h2><p className="text-xs text-muted-foreground">Unresolved control events.</p></div><Badge variant="outline">{s.alerts}</Badge></div><div className="mt-3 space-y-2">{alerts.length?alerts.map(a=><div key={a.id} className="flex items-start gap-3 rounded-lg border p-3">{a.severity==="critical"?<XCircle className="h-4 w-4 text-destructive"/>:<AlertTriangle className="h-4 w-4 text-amber-600"}/><div className="flex-1"><div className="text-sm font-medium">{a.title}</div><div className="text-xs text-muted-foreground">{a.message}</div></div>{a.action_url&&<Button asChild size="sm" variant="ghost"><Link to={a.action_url as any}>Open</Link></Button>}</div>):<div className="p-6 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-2 h-5 w-5"/>No open alerts.</div>}</div></Card>
      <Card className="p-4"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary"/><h2 className="text-sm font-semibold">Management shortcuts</h2></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{[["/reports","Reports Hub"],["/reports/trial-balance","Trial Balance"],["/reports/pnl","Profit & Loss"],["/reports/vat-return","VAT Return"],["/payroll-dashboard","Payroll Control"],["/inventory-control-centre","Inventory Control"],["/audit-logs","Audit Trail"],["/approvals","Existing Approvals"]].map(([to,label])=><Link key={to} to={to as any} className="flex justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted">{label}<ArrowRight className="h-3.5 w-3.5 text-muted-foreground"/></Link>)}</div></Card></section>
    {loading&&<div className="text-center text-xs text-muted-foreground">Loading live control data…</div>}
  </SifoWorkspaceShell>
}
function Mini({l,v,i:Icon}:{l:string;v:string;i:any}){return <Card className="p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5"/>{l}</div><div className="mt-1 text-sm font-semibold">{v}</div></Card>}