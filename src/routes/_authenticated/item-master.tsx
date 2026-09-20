import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, Save, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route=createFileRoute("/_authenticated/item-master")({
  head:()=>({meta:[{title:"Item Master — SifoBooks"},{name:"description",content:"Structured SifoBooks inventory item master."}]}),
  component:ItemMaster,
});

const tabs=["GENERAL","PRICING","INVENTORY","TAX","ZRA","ACCOUNTING","AUDIT"] as const;

function ItemMaster(){
  const [items,setItems]=useState<any[]>([]);
  const [selected,setSelected]=useState<any|null>(null);
  const [tab,setTab]=useState<typeof tabs[number]>("GENERAL");
  const [search,setSearch]=useState("");
  const [form,setForm]=useState<any>({});
  const load=async()=>{
    const {data}=await supabase.from("stock_items").select("*").order("name").limit(1000);
    setItems((data||[]) as any[]);
  };
  useEffect(()=>{void load();},[]);
  const filtered=useMemo(()=>items.filter(x=>[x.name,x.sku,x.brand].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())),[items,search]);
  const choose=(item:any)=>{setSelected(item);setForm({...item});setTab("GENERAL");};
  const save=async()=>{
    if(!selected)return;
    const allowed={name:form.name,sku:form.sku??null,description:form.description??null,brand:form.brand??null,unit:form.unit??"each",warehouse_id:form.warehouse_id??null,branch_id:form.branch_id??null,cost_price:Number(form.cost_price||0),sell_price:Number(form.sell_price||0),reorder_level:Number(form.reorder_level||0),tax_category:form.tax_category??"standard",vat_rate:Number(form.vat_rate||0)};
    const {data,error}=await supabase.from("stock_items").update(allowed as any).eq("id",selected.id).select("*").maybeSingle();
    if(error)throw error;
    if(data){setSelected(data);setForm({...data});setItems(old=>old.map(x=>x.id===data.id?data:x));}
  };
  return <div className="grid gap-5 p-4 md:grid-cols-[320px_1fr] md:p-6">
    <Card className="overflow-hidden"><div className="border-b p-4"><h1 className="font-bold">Item Master</h1><p className="text-xs text-muted-foreground">Structured inventory catalogue</p><div className="relative mt-3"><Search className="absolute left-3 top-2.5 h-4 w-4"/><Input className="pl-9" placeholder="Search SKU, item or brand" value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="max-h-[70vh] overflow-y-auto">{filtered.map(item=><button key={item.id} onClick={()=>choose(item)} className={"w-full border-b p-3 text-left hover:bg-muted "+(selected?.id===item.id?"bg-muted":"")}><div className="font-medium">{item.name}</div><div className="text-xs text-muted-foreground">{item.sku||"No SKU"} · Stock {Number(item.quantity_on_hand||0)}</div></button>)}{!filtered.length&&<p className="p-4 text-sm text-muted-foreground">No items found.</p>}</div></Card>
    <Card className="p-5">
      {!selected?<div className="flex min-h-[420px] items-center justify-center text-center text-muted-foreground"><div><Package className="mx-auto mb-3 h-10 w-10"/><p>Select an inventory item to edit its master record.</p></div></div>:
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{form.name}</h2><div className="text-xs text-muted-foreground">{form.sku||"No SKU"} · {form.id}</div></div><Button onClick={()=>void save()}><Save className="mr-2 h-4 w-4"/>Save item</Button></div>
        <div className="flex gap-1 overflow-x-auto border-b">{tabs.map(t=><button key={t} onClick={()=>setTab(t)} className={"whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold "+(tab===t?"border-primary":"border-transparent text-muted-foreground")}>{t}</button>)}</div>
        {tab==="GENERAL"&&<div className="grid gap-4 md:grid-cols-2"><div><Label>Item name</Label><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></div><div><Label>SKU / Item code</Label><Input value={form.sku||""} onChange={e=>setForm({...form,sku:e.target.value})}/></div><div><Label>Brand</Label><Input value={form.brand||""} onChange={e=>setForm({...form,brand:e.target.value})}/></div><div><Label>Base unit</Label><Input value={form.unit||""} onChange={e=>setForm({...form,unit:e.target.value})}/></div><div className="md:col-span-2"><Label>Description</Label><Input value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})}/></div></div>}
        {tab==="PRICING"&&<div className="grid gap-4 md:grid-cols-3"><div><Label>Cost price / moving average</Label><Input type="number" value={form.cost_price??0} onChange={e=>setForm({...form,cost_price:e.target.value})}/></div><div><Label>Retail price</Label><Input type="number" value={form.sell_price??0} onChange={e=>setForm({...form,sell_price:e.target.value})}/></div><div><Label>Reorder level</Label><Input type="number" value={form.reorder_level??0} onChange={e=>setForm({...form,reorder_level:e.target.value})}/></div></div>}
        {tab==="INVENTORY"&&<div className="grid gap-4 md:grid-cols-3"><div><Label>Current stock</Label><Input readOnly value={form.quantity_on_hand??0}/></div><div><Label>Warehouse</Label><Input value={form.warehouse_id||""} onChange={e=>setForm({...form,warehouse_id:e.target.value})}/></div><div><Label>Branch</Label><Input value={form.branch_id||""} onChange={e=>setForm({...form,branch_id:e.target.value})}/></div><div className="md:col-span-3 rounded-lg border p-4 text-sm"><strong>Stock discipline:</strong> quantity changes from purchases, transfers, sales and approved reconciliations—not arbitrary UI edits.</div></div>}
        {tab==="TAX"&&<div className="grid gap-4 md:grid-cols-2"><div><Label>Tax category</Label><Input value={form.tax_category||""} onChange={e=>setForm({...form,tax_category:e.target.value})}/></div><div><Label>Fallback tax rate %</Label><Input type="number" value={form.vat_rate??0} onChange={e=>setForm({...form,vat_rate:e.target.value})}/></div><div className="md:col-span-2 rounded-lg border p-4 text-sm">Transaction tax is resolved through the centralized Tax Engine and the applied rate is snapshotted on the transaction.</div></div>}
        {tab==="ZRA"&&<div className="space-y-4"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5"/><strong>ZRA mapping</strong><Badge variant={form.zra_sync_status==="registered"?"default":"secondary"}>{form.zra_sync_status||"unmapped"}</Badge></div><div className="grid gap-3 md:grid-cols-2 text-sm"><div>ZRA Item Code: <strong>{form.zra_item_code||"—"}</strong></div><div>Classification: <strong>{form.zra_item_class_code||"—"}</strong></div><div>Item Type: <strong>{form.zra_item_type_code||"—"}</strong></div><div>Package Unit: <strong>{form.zra_pkg_unit_code||"—"}</strong></div><div>Quantity Unit: <strong>{form.zra_qty_unit_code||"—"}</strong></div><div>VAT Category: <strong>{form.zra_vat_category_code||"—"}</strong></div></div><a href="/zra-smart-invoice" className="inline-flex rounded-md border px-3 py-2 text-sm">Open ZRA mapping centre</a></div>}
        {tab==="ACCOUNTING"&&<div className="rounded-lg border p-4 text-sm">Inventory asset, cost of sales, revenue and tax posting accounts are configured centrally through accounting posting rules. This item screen does not bypass those controls.</div>}
        {tab==="AUDIT"&&<div className="rounded-lg border p-4 text-sm">Item changes are subject to the authenticated database layer and compliance audit controls. Use the audit/compliance centre to review activity.</div>}
      </div>}
    </Card>
  </div>;
}
