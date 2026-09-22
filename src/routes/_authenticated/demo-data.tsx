import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2, DatabaseZap, Landmark, RefreshCw, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SifoWorkspaceShell } from "@/components/sifo/SifoWorkspaceShell";
import { supabase } from "@/integrations/supabase/client";
import { LUANSOBE_JULY, LUANSOBE_AUGUST } from "@/demo/luansobe-statements";

export const Route=createFileRoute("/_authenticated/demo-data")({component:DemoData});
function DemoData(){
 const [installing,setInstalling]=useState(false);const [message,setMessage]=useState("");const [installed,setInstalled]=useState(false);
 const check=async()=>{const {data:u}=await supabase.auth.getUser();if(!u.user)return;const {data}=await supabase.from("companies").select("id").eq("user_id",u.user.id).eq("name","LUANSOBE SECONDARY SCHOOL — DEMO").maybeSingle();setInstalled(!!data)};useEffect(()=>{void check()},[]);
 const install=async()=>{setInstalling(true);setMessage("");try{
  const {data:u}=await supabase.auth.getUser();if(!u.user)throw new Error("Sign in first.");const uid=u.user.id;
  const existing=await supabase.from("companies").select("id").eq("user_id",uid).eq("name","LUANSOBE SECONDARY SCHOOL — DEMO").maybeSingle();
  if(existing.data?.id){setInstalled(true);setMessage("Demo company is already installed. Existing demo records were left untouched.");return;}
  const companyId=crypto.randomUUID(),bankId=crypto.randomUUID(),cashbookId=crypto.randomUUID();
  for(const [table,row] of [
   ["companies",{id:companyId,user_id:uid,name:"LUANSOBE SECONDARY SCHOOL — DEMO",trading_name:"Luansobe Secondary School (Demo)",address:"P O BOX 40463 LUASNSOBE SECONDARY SCHOOL MUFULIRA COPPERBELT",city:"Mufulira",country:"Zambia",base_currency:"ZMW",timezone:"Africa/Lusaka",industry:"School / Education",workspace_mode:"accounting",status:"active",is_primary:0}],
   ["company_members",{id:crypto.randomUUID(),company_id:companyId,user_id:uid,role:"owner"}],
   ["bank_accounts",{id:bankId,user_id:uid,company_id:companyId,name:"CASA — Luansobe Secondary School",bank_name:"CASA",account_number:"5786225300117",currency:"ZMW",opening_balance:48594.46,opening_date:"2026-07-01",cashbook_type:"main",is_active:1,notes:"Demo source account. Statements are source evidence; no automatic GL/VAT posting."}],
   ["cashbooks",{id:cashbookId,user_id:uid,code:"CASA-LUANSOBE",name:"CASA — Luansobe Secondary School",cashbook_type:"bank",bank_account_id:bankId,currency:"ZMW",opening_balance:48594.46,is_active:1}]
  ] as const){const {error}=await supabase.from(table).insert(row);if(error)throw error;}
  const all=[...LUANSOBE_JULY,...LUANSOBE_AUGUST];
  const rows=all.map((r,i)=>({id:crypto.randomUUID(),user_id:uid,txn_date:r.date,description:r.description,amount:r.direction==="credit"?r.amount:-r.amount,balance:r.balance,reference:r.reference,category:"DEMO_SOURCE_PENDING",source_file:r.period==="2026-07"?"Sifobooks_July_2026_Bank_Reconciliation_Working_Paper.xlsx":"CASA_Statement_August_2026.pdf",reconciled:0,currency:"ZMW",exchange_rate:1,allocated_amount:0,bank_account_id:bankId,payee:r.payee,is_allocated:0,voucher_no:"DEMO-"+r.period+"-"+String(i+1).padStart(3,"0")}));
  const {error:te}=await supabase.from("bank_transactions").insert(rows);if(te)throw te;
  const statements=[
   {period_start:"2026-07-01",period_end:"2026-07-30",source_name:"Sifobooks_July_2026_Bank_Reconciliation_Working_Paper.xlsx",opening_balance:48594.46,total_credits:564535.16,total_debits:417772,statement_closing_balance:195357.62,cashbook_closing_balance:195357.62,difference:0,entry_count:46,reconciliation_status:"pending",source_note:"The working paper calculates K195,357.62 and flags a displayed K265,295.62 closing-balance inconsistency for review."},
   {period_start:"2026-08-01",period_end:"2026-08-31",source_name:"CASA_Statement_August_2026.pdf",opening_balance:195357.62,total_credits:0,total_debits:179460,statement_closing_balance:15897.62,cashbook_closing_balance:null,difference:null,entry_count:27,reconciliation_status:"pending",source_note:"The statement reports 27 debit entries totaling K179,460.00 and no credits; cashbook/GL comparison remains pending."}
  ];
  for(const s of statements){const {error}=await supabase.from("demo_statement_register").insert({id:crypto.randomUUID(),user_id:uid,company_id:companyId,bank_account_id:bankId,...s});if(error)throw error;}
  const {error:rs}=await supabase.from("reconciliation_sessions").insert({id:crypto.randomUUID(),user_id:uid,bank_account_id:bankId,statement_date:"2026-07-30",statement_start_date:"2026-07-01",statement_balance:195357.62,opening_balance:48594.46,book_balance:195357.62,cleared_deposits:564535.16,cleared_payments:417772,difference:0,status:"draft",notes:"DEMO: July working paper. Not final; source exception remains flagged."});if(rs)throw rs;
  setInstalled(true);setMessage("Installed 46 July transactions + 27 August transactions. All remain unallocated and unreconciled for testing.");
 }catch(e:any){setMessage(e?.message||"Demo installation failed.");}finally{setInstalling(false)}};
 return <SifoWorkspaceShell title="SifoBooks Demo Data" purpose="Install the Luansobe Secondary School July–August 2026 source statements as controlled demo evidence without automatically posting GL or VAT." icon={DatabaseZap} breadcrumbs={[{label:"Home",to:"/dashboard"},{label:"Business Control Centre",to:"/business-control-centre" as any},{label:"Demo Data"}]} actions={<Button variant="outline" onClick={()=>void check()}><RefreshCw className="mr-2 h-4 w-4"/>Check</Button>}>
 <div className="grid gap-3 md:grid-cols-4"><Card className="p-4"><Building2 className="h-5 w-5 text-primary"/><div className="mt-2 text-sm font-semibold">Luansobe Secondary School</div><div className="text-xs text-muted-foreground">Mufulira · Zambia</div></Card><Card className="p-4"><Landmark className="h-5 w-5 text-primary"/><div className="mt-2 text-sm font-semibold">CASA 5786225300117</div><div className="text-xs text-muted-foreground">ZMW · July–August 2026</div></Card><Card className="p-4"><div className="text-xs text-muted-foreground">July</div><div className="text-2xl font-bold">46</div><div className="text-xs text-muted-foreground">source transactions</div></Card><Card className="p-4"><div className="text-xs text-muted-foreground">August</div><div className="text-2xl font-bold">27</div><div className="text-xs text-muted-foreground">debit entries</div></Card></div>
 <Card className="p-5"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600"/><div className="flex-1"><h2 className="font-semibold">Source-controlled demo</h2><p className="mt-1 text-sm text-muted-foreground">Bank descriptions, references, payees and running balances are preserved. GL account, VAT treatment, allocation and final reconciliation are intentionally not posted automatically.</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline">July: K195,357.62 closing</Badge><Badge variant="outline">August: K15,897.62 closing</Badge><Badge variant="outline">August: 27 debits / K179,460</Badge></div></div></div><Button className="mt-5" onClick={()=>void install()} disabled={installing||installed}>{installing?"Installing…":installed?<><CheckCircle2 className="mr-2 h-4 w-4"/>Already installed</>:<>Install Demo Company & Statements</>}</Button>{message&&<p className="mt-3 text-sm text-muted-foreground">{message}</p>}</Card>
 <Card className="p-5"><h2 className="font-semibold">What this demo tests</h2><div className="mt-3 grid gap-2 md:grid-cols-2">{["Statement import and duplicate detection","Bank → Cashbook → Reconciliation workflow","Running-balance verification","Unallocated transaction queue","Supplier/payee matching","Control exceptions and audit trail","July reconciliation with source exception","August reconciliation pending cashbook/GL comparison"].map(x=><div key={x} className="rounded-lg border p-3 text-sm">{x}</div>)}</div></Card>
 </SifoWorkspaceShell>;
}