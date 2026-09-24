import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Monitor, Plus, RefreshCw } from "lucide-react";
export const Route = createFileRoute("/_authenticated/restaurant/registers")({ component: RestaurantRegisters });
function RestaurantRegisters(){
 const [rows,setRows]=useState<any[]>([]); const [name,setName]=useState(""); const [busy,setBusy]=useState(false);
 const load=async()=>{const {data:u}=await supabase.auth.getUser(); if(!u.user)return; const {data,error}=await supabase.from("pos_registers").select("id,name,branch,is_active").eq("is_active",true).order("name"); if(error)toast.error(error.message); else setRows(data??[])};
 useEffect(()=>{void load()},[]);
 const add=async()=>{if(!name.trim())return toast.error("Enter a register name"); setBusy(true); const {error}=await supabase.from("pos_registers").insert({name:name.trim(),branch:"Restaurant",is_active:true}); setBusy(false); if(error)toast.error(error.message); else {toast.success("Restaurant register created");setName("");void load()}};
 return <div className="restaurant-2026-page space-y-5"><div className="flex flex-wrap items-center gap-3"><div className="mr-auto"><div className="text-[11px] font-black uppercase tracking-[.18em] text-[#07834f]">POS control</div><h1 className="text-2xl font-black text-[#173b3a]">Restaurant Registers</h1><p className="text-sm text-muted-foreground">Create and verify the tills used by restaurant POS terminals.</p></div><Button variant="outline" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div><Card className="rounded-2xl p-4"><div className="flex gap-2"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Register name e.g. Restaurant Till 01"/><Button disabled={busy} onClick={()=>void add()}><Plus className="mr-2 h-4 w-4"/>Create register</Button></div></Card><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{rows.map(r=><Card key={r.id} className="rounded-2xl p-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Monitor className="h-5 w-5"/></div><div><div className="font-bold">{r.name}</div><div className="text-xs text-muted-foreground">{r.branch||"Restaurant"} · {r.is_active?"Active":"Inactive"}</div></div></div></Card>)}{!rows.length&&<Card className="p-8 text-center text-sm text-muted-foreground">No active registers. Create the first restaurant register above.</Card>}</div></div>
}
