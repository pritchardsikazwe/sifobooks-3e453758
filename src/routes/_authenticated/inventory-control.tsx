import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRightLeft, ClipboardCheck, Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route=createFileRoute("/_authenticated/inventory-control")({
  head:()=>({meta:[{title:"Inventory Control — SifoBooks"},{name:"description",content:"Warehouse transfer and physical stock reconciliation controls."}]}),
  component:InventoryControl,
});

function InventoryControl(){
  const [items,setItems]=useState<any[]>([]);
  const [locations,setLocations]=useState<any[]>([]);
  const [transfers,setTransfers]=useState<any[]>([]);
  const [counts,setCounts]=useState<any[]>([]);
  const [transfer,setTransfer]=useState({itemId:"",qty:"1",from:"",to:"",reason:""});
  const [count,setCount]=useState({itemId:"",countedQty:"0",location:"",reason:""});
  const [busy,setBusy]=useState(false);
  const load=async()=>{
    const [i,l,t,c]=await Promise.all([
      supabase.from("stock_items").select("id,name,sku,cost_price,quantity_on_hand").order("name").limit(1000),
      supabase.from("inventory_locations").select("id,name,location_type").eq("is_active",true).order("name"),
      supabase.from("inventory_transfers").select("*").order("updated_at",{ascending:false}).limit(30),
      supabase.from("stock_reconciliations").select("*").order("updated_at",{ascending:false}).limit(30),
    ]);
    setItems((i.data||[]) as any[]);setLocations((l.data||[]) as any[]);setTransfers((t.data||[]) as any[]);setCounts((c.data||[]) as any[]);
  };
  useEffect(()=>{void load();},[]);
  const doTransfer=async()=>{
    if(!transfer.itemId||!transfer.from||!transfer.to)return;
    setBusy(true);
    try{
      const {error}=await supabase.rpc("transfer_stock" as any,{items:[{itemId:transfer.itemId,quantity:Number(transfer.qty)}],fromLocationId:transfer.from,toLocationId:transfer.to,transferDate:new Date().toISOString().slice(0,10),reason:transfer.reason} as any);
      if(error)throw error; setTransfer(f=>({...f,qty:"1",reason:""})); await load();
    } finally{setBusy(false);}
  };
  const createCount=async()=>{
    if(!count.itemId||!count.location)return;
    setBusy(true);
    try{
      const {data,error}=await supabase.rpc("create_stock_reconciliation" as any,{locationId:count.location,countDate:new Date().toISOString().slice(0,10),reason:count.reason,items:[{itemId:count.itemId,countedQty:Number(count.countedQty)}]} as any);
      if(error)throw error;
      if(data?.id) await supabase.rpc("post_stock_reconciliation" as any,{reconciliationId:data.id,approvedBy:(await supabase.auth.getUser()).data.user?.id} as any);
      setCount(f=>({...f,countedQty:"0",reason:""}));await load();
    } finally{setBusy(false);}
  };
  return <div className="space-y-6 p-4 md:p-6">
    <div><h1 className="text-2xl font-bold">Inventory Control Centre</h1><p className="text-sm text-muted-foreground">Transfers and physical counts are posted through server-side stock ledger controls.</p></div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5"><div className="mb-4 flex items-center gap-2 font-semibold"><ArrowRightLeft className="h-5 w-5"/>Warehouse → Store Transfer</div><div className="grid gap-3">
        <div><Label>Item</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={transfer.itemId} onChange={e=>setTransfer({...transfer,itemId:e.target.value})}><option value="">Select item</option>{items.map(i=><option key={i.id} value={i.id}>{i.name} — stock {i.quantity_on_hand}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>From</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={transfer.from} onChange={e=>setTransfer({...transfer,from:e.target.value})}><option value="">Source</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div><div><Label>To</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={transfer.to} onChange={e=>setTransfer({...transfer,to:e.target.value})}><option value="">Destination</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div></div>
        <div><Label>Quantity</Label><Input type="number" min="0.001" value={transfer.qty} onChange={e=>setTransfer({...transfer,qty:e.target.value})}/></div><div><Label>Reason / note</Label><Input value={transfer.reason} onChange={e=>setTransfer({...transfer,reason:e.target.value})}/></div>
        <Button onClick={()=>void doTransfer()} disabled={busy}><ArrowRightLeft className="mr-2 h-4 w-4"/>Post Transfer</Button>
      </div></Card>
      <Card className="p-5"><div className="mb-4 flex items-center gap-2 font-semibold"><ClipboardCheck className="h-5 w-5"/>Physical Stock Reconciliation</div><div className="grid gap-3">
        <div><Label>Location</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={count.location} onChange={e=>setCount({...count,location:e.target.value})}><option value="">Select location</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        <div><Label>Item</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={count.itemId} onChange={e=>setCount({...count,itemId:e.target.value})}><option value="">Select item</option>{items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
        <div><Label>Physical quantity counted</Label><Input type="number" min="0" value={count.countedQty} onChange={e=>setCount({...count,countedQty:e.target.value})}/></div><div><Label>Reason</Label><Input value={count.reason} onChange={e=>setCount({...count,reason:e.target.value})}/></div>
        <Button onClick={()=>void createCount()} disabled={busy}><Save className="mr-2 h-4 w-4"/>Record & Approve Count</Button>
      </div></Card>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5"><h2 className="mb-3 font-semibold">Recent transfers</h2>{transfers.map(x=><div key={x.id} className="flex justify-between border-b py-2 text-sm"><span>{x.transfer_number}</span><Badge variant={x.status==="POSTED"?"default":"secondary"}>{x.status}</Badge></div>)}{!transfers.length&&<p className="text-sm text-muted-foreground">No transfers posted.</p>}</Card>
      <Card className="p-5"><h2 className="mb-3 font-semibold">Recent reconciliations</h2>{counts.map(x=><div key={x.id} className="flex justify-between border-b py-2 text-sm"><span>{x.count_number}</span><span>{Number(x.total_variance_value||0).toFixed(2)} ZMW <Badge variant={x.status==="POSTED"?"default":"secondary"}>{x.status}</Badge></span></div>)}{!counts.length&&<p className="text-sm text-muted-foreground">No reconciliations posted.</p>}</Card>
    </div>
  </div>;
}
