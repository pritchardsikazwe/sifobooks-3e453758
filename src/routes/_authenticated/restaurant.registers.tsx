import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, RefreshCw, Store } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurant/registers")({
  head: () => ({ meta: [{ title: "Restaurant Registers — SifoBooks" }] }),
  component: Registers,
});

function Registers() {
  const [registers,setRegisters]=useState<any[]>([]);
  const [name,setName]=useState("");
  const [loading,setLoading]=useState(true);
  const load=async()=>{
    setLoading(true);
    const {data:u}=await supabase.auth.getUser();
    if(!u.user){setLoading(false);return;}
    const {data,error}=await supabase.from("pos_registers").select("*").eq("user_id",u.user.id).order("name");
    if(error) toast.error(error.message); else setRegisters(data??[]);
    setLoading(false);
  };
  useEffect(()=>{void load()},[]);
  const add=async()=>{
    const label=name.trim();
    if(!label) return toast.error("Enter a register name.");
    const {data:u}=await supabase.auth.getUser();
    if(!u.user) return;
    const {error}=await supabase.from("pos_registers").insert({user_id:u.user.id,name:label,branch:"Restaurant",is_active:true});
    if(error) toast.error(error.message); else { setName(""); toast.success("Register created"); void load(); }
  };
  const toggle=async(r:any)=>{
    const {error}=await supabase.from("pos_registers").update({is_active:!r.is_active}).eq("id",r.id);
    if(error) toast.error(error.message); else {toast.success(r.is_active?"Register disabled":"Register enabled");void load();}
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Restaurant POS</div><h1 className="text-3xl font-black text-[#173b3a]">Registers & Tills</h1><p className="text-sm text-muted-foreground">Manage the restaurant selling terminals and register names.</p></div>
      <Button variant="outline" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>
    </div>
    <Card className="rounded-2xl"><CardHeader><CardTitle>Create register</CardTitle></CardHeader><CardContent className="flex flex-col gap-2 sm:flex-row"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Main Counter, Bar, Patio" className="rounded-xl"/><Button onClick={()=>void add()} className="rounded-xl"><Plus className="mr-2 h-4 w-4"/>Add register</Button></CardContent></Card>
    <Card className="rounded-2xl"><CardContent className="grid gap-3 p-4">{loading?<div className="p-5 text-sm text-muted-foreground">Loading registers…</div>:registers.length?registers.map(r=><div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border p-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Store className="h-5 w-5"/></div><div className="min-w-0 flex-1"><div className="font-bold">{r.name}</div><div className="text-xs text-muted-foreground">{r.branch||"Restaurant"} · Register ID {r.id}</div></div><Badge variant={r.is_active?"default":"secondary"}>{r.is_active?"ACTIVE":"DISABLED"}</Badge><Button variant="outline" onClick={()=>void toggle(r)}>{r.is_active?"Disable":"Enable"}</Button></div>):<div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No registers yet. Create the first restaurant till above.</div>}</CardContent></Card>
  </div>;
}
