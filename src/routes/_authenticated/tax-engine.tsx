import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Save, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route=createFileRoute("/_authenticated/tax-engine")({
  head:()=>({meta:[{title:"Tax Engine — SifoBooks"},{name:"description",content:"Centralized tax code configuration and historical tax control."}]}),
  component:TaxEngine,
});

function TaxEngine(){
  const [rows,setRows]=useState<any[]>([]);
  const [uid,setUid]=useState("");
  const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({code:"VAT16",name:"VAT Standard",tax_type:"VAT",rate:"16",category:"standard",inclusive_default:true,effective_from:new Date().toISOString().slice(0,10),effective_to:"",zra_tax_code:""});
  const load=async()=>{
    const {data:u}=await supabase.auth.getUser(); if(!u.user)return;
    setUid(u.user.id);
    const {data}=await supabase.from("tax_codes").select("*").order("effective_from",{ascending:false});
    setRows((data||[]) as any[]);
  };
  useEffect(()=>{void load();},[]);
  const save=async()=>{
    if(!uid||!form.code||!form.name)return;
    setBusy(true);
    try{
      const {error}=await supabase.from("tax_codes").upsert({...form,user_id:uid,company_id:null,rate:Number(form.rate),inclusive_default:form.inclusive_default?1:0,effective_to:form.effective_to||null,active:1} as any,{onConflict:"user_id,company_id,code,effective_from"});
      if(error)throw error;
      await load();
      setForm(f=>({...f,code:"",name:"",rate:"16",zra_tax_code:""}));
    } finally{setBusy(false);}
  };
  return <div className="space-y-6 p-4 md:p-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Central Tax Engine</h1><p className="text-sm text-muted-foreground">Tax rates are configured centrally and transaction lines keep their historical tax snapshot.</p></div><Button variant="outline" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div>
    <Card className="p-5"><div className="mb-4 flex items-center gap-2 font-semibold"><Plus className="h-5 w-5"/>Add tax code</div><div className="grid gap-4 md:grid-cols-4">
      <div><Label>Code</Label><Input value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></div>
      <div><Label>Name</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
      <div><Label>Rate %</Label><Input type="number" value={form.rate} onChange={e=>setForm({...form,rate:e.target.value})}/></div>
      <div><Label>Category</Label><Input value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></div>
      <div><Label>Effective from</Label><Input type="date" value={form.effective_from} onChange={e=>setForm({...form,effective_from:e.target.value})}/></div>
      <div><Label>Effective to</Label><Input type="date" value={form.effective_to} onChange={e=>setForm({...form,effective_to:e.target.value})}/></div>
      <div><Label>ZRA tax code</Label><Input value={form.zra_tax_code} onChange={e=>setForm({...form,zra_tax_code:e.target.value})}/></div>
      <div className="flex items-end"><Button onClick={()=>void save()} disabled={busy}><Save className="mr-2 h-4 w-4"/>Save tax code</Button></div>
    </div></Card>
    <Card className="p-5"><h2 className="mb-4 font-semibold">Configured tax codes</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Code</th><th className="p-2">Name</th><th className="p-2">Type</th><th className="p-2">Rate</th><th className="p-2">Effective</th><th className="p-2">Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-b"><td className="p-2 font-medium">{r.code}</td><td className="p-2">{r.name}</td><td className="p-2">{r.tax_type}</td><td className="p-2">{r.rate}%</td><td className="p-2">{r.effective_from}{r.effective_to ? " → "+r.effective_to : " → current"}</td><td className="p-2"><Badge variant={r.active?"default":"secondary"}>{r.active?"Active":"Inactive"}</Badge></td></tr>)}{!rows.length&&<tr><td className="p-4 text-muted-foreground" colSpan={6}>No tax codes configured yet.</td></tr>}</tbody></table></div></Card>
  </div>;
}
