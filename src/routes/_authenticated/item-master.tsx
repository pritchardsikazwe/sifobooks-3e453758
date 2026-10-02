import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, Save, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SifoModuleHeader, SifoPage, SifoSection, SifoStatusBadge } from "@/components/sifo";

export const Route=createFileRoute("/_authenticated/item-master")({
  head:()=>({meta:[{title:"Item Master — SifoBooks"},{name:"description",content:"Structured SifoBooks inventory item master."},{property:"og:title",content:"Item Master — SifoBooks"},{property:"og:description",content:"Structured SifoBooks inventory item master."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"},{name:"robots",content:"noindex"}]}),
  component:ItemMaster,
});

const tabs=["GENERAL","PRICING","INVENTORY","UNITS","TAX","ZRA","ACCOUNTING","AUDIT"] as const;

function ItemMaster(){
  const [items,setItems]=useState<any[]>([]);
  const [selected,setSelected]=useState<any|null>(null);
  const [tab,setTab]=useState<typeof tabs[number]>("GENERAL");
  const [search,setSearch]=useState("");
  const [form,setForm]=useState<any>({});
  const [conversions,setConversions]=useState<any[]>([]);
  const [conversion,setConversion]=useState({fromUnit:"",toUnit:"",multiplier:""});
  const load=async()=>{
    const {data}=await supabase.from("stock_items").select("*").order("name").limit(1000);
    setItems((data||[]) as any[]);
  };
  useEffect(()=>{void load();},[]);
  const filtered=useMemo(()=>items.filter(x=>[x.name,x.sku,x.brand].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())),[items,search]);
  const choose=async(item:any)=>{setSelected(item);setForm({...item});setTab("GENERAL");const r=await supabase.rpc("list_unit_conversions" as any,{itemId:item.id} as any);setConversions((r.data||[]) as any[]);};
  const save=async()=>{
    if(!selected)return;
    const allowed={name:form.name,sku:form.sku??null,description:form.description??null,brand:form.brand??null,unit:form.unit??"each",warehouse_id:form.warehouse_id??null,branch_id:form.branch_id??null,base_unit:form.base_unit??form.unit??"unit",sales_unit:form.sales_unit??form.base_unit??form.unit??"unit",purchase_unit:form.purchase_unit??form.base_unit??form.unit??"unit",decimal_qty_allowed:form.decimal_qty_allowed?1:0,cost_price:Number(form.cost_price||0),sell_price:Number(form.sell_price||0),reorder_level:Number(form.reorder_level||0),tax_category:form.tax_category??"standard",vat_rate:Number(form.vat_rate||0)};
    const {data,error}=await supabase.from("stock_items").update(allowed as any).eq("id",selected.id).select("*").maybeSingle();
    if(error)throw error;
    if(data){setSelected(data);setForm({...data});setItems(old=>old.map(x=>x.id===data.id?data:x));}
  };
  return <SifoPage>
    <SifoModuleHeader module="inventory" icon={Package} title="Item Master" description="Structured inventory catalogue" breadcrumbs={[{label:"Inventory",to:"/inventory"},{label:"Item Master"}]} />
    <div className="grid gap-5 md:grid-cols-[320px_minmax(0,1fr)]">
    <Card className="overflow-hidden"><div className="border-b p-4"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Search SKU, item or brand" value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="max-h-[70vh] overflow-y-auto">{filtered.map(item=><Button variant="ghost" key={item.id} onClick={()=>choose(item)} className={"h-auto w-full justify-start rounded-none border-b p-3 text-left "+(selected?.id===item.id?"bg-muted":"")}><span><span className="block font-medium">{item.name}</span><span className="block text-xs text-muted-foreground">{item.sku||"No SKU"} · Stock {Number(item.quantity_on_hand||0)}</span></span></Button>)}{!filtered.length&&<p className="p-4 text-sm text-muted-foreground">No items found.</p>}</div></Card>
    <Card className="p-4 sm:p-5">
      {!selected?<div className="flex min-h-[420px] items-center justify-center text-center text-muted-foreground"><div><Package className="mx-auto mb-3 h-10 w-10"/><p>Select an inventory item to edit its master record.</p></div></div>:
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{form.name}</h2><div className="text-xs text-muted-foreground">{form.sku||"No SKU"} · {form.id}</div></div><Button onClick={()=>void save()}><Save className="mr-2 h-4 w-4"/>Save item</Button></div>
         <div className="flex gap-1 overflow-x-auto border-b">{tabs.map(t=><Button variant="ghost" size="sm" key={t} onClick={()=>setTab(t)} className={"whitespace-nowrap rounded-b-none border-b-2 px-3 "+(tab===t?"border-primary text-primary":"border-transparent text-muted-foreground")}>{t}</Button>)}</div>
        {tab==="GENERAL"&&<div className="grid gap-4 md:grid-cols-2"><div><Label>Item name</Label><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></div><div><Label>SKU / Item code</Label><Input value={form.sku||""} onChange={e=>setForm({...form,sku:e.target.value})}/></div><div><Label>Brand</Label><Input value={form.brand||""} onChange={e=>setForm({...form,brand:e.target.value})}/></div><div><Label>Base unit</Label><Input value={form.unit||""} onChange={e=>setForm({...form,unit:e.target.value})}/></div><div className="md:col-span-2"><Label>Description</Label><Input value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})}/></div></div>}
        {tab==="PRICING"&&<div className="grid gap-4 md:grid-cols-3"><div><Label>Cost price / moving average</Label><Input type="number" value={form.cost_price??0} onChange={e=>setForm({...form,cost_price:e.target.value})}/></div><div><Label>Retail price</Label><Input type="number" value={form.sell_price??0} onChange={e=>setForm({...form,sell_price:e.target.value})}/></div><div><Label>Reorder level</Label><Input type="number" value={form.reorder_level??0} onChange={e=>setForm({...form,reorder_level:e.target.value})}/></div></div>}
         {tab==="INVENTORY"&&<div className="grid gap-4 md:grid-cols-3"><div><Label>Current stock</Label><Input readOnly value={form.quantity_on_hand??0}/></div><div><Label>Warehouse</Label><Input value={form.warehouse_id||""} onChange={e=>setForm({...form,warehouse_id:e.target.value})}/></div><div><Label>Branch</Label><Input value={form.branch_id||""} onChange={e=>setForm({...form,branch_id:e.target.value})}/></div><SifoSection title="Stock discipline" className="md:col-span-3"><p className="text-sm text-muted-foreground">Quantity changes come from purchases, transfers, sales and approved reconciliations—not arbitrary edits.</p></SifoSection></div>}
        {tab==="UNITS"&&<div className="space-y-4">
          <div className="rounded-lg border p-4 text-sm"><strong>Unit discipline:</strong> all stock is stored in the configured base unit. Purchases and sales may use carton, box, pack or other transaction units only when an explicit conversion exists.</div>
          <div className="grid gap-3 md:grid-cols-3">
            <div><Label>Base unit</Label><Input value={form.base_unit||form.unit||""} onChange={e=>setForm({...form,base_unit:e.target.value})}/></div>
            <div><Label>Purchase unit</Label><Input value={form.purchase_unit||""} onChange={e=>setForm({...form,purchase_unit:e.target.value})}/></div>
            <div><Label>Sales unit</Label><Input value={form.sales_unit||""} onChange={e=>setForm({...form,sales_unit:e.target.value})}/></div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="mb-3 font-semibold">Add conversion</div>
            <div className="grid gap-3 md:grid-cols-4">
              <Input placeholder="From e.g. carton" value={conversion.fromUnit} onChange={e=>setConversion({...conversion,fromUnit:e.target.value})}/>
              <Input placeholder="To e.g. piece" value={conversion.toUnit} onChange={e=>setConversion({...conversion,toUnit:e.target.value})}/>
              <Input type="number" min="0.000001" placeholder="Multiplier e.g. 24" value={conversion.multiplier} onChange={e=>setConversion({...conversion,multiplier:e.target.value})}/>
              <Button onClick={async()=>{if(!selected)return;const r=await supabase.rpc("save_unit_conversion" as any,{itemId:selected.id,fromUnit:conversion.fromUnit,toUnit:conversion.toUnit,multiplier:Number(conversion.multiplier)} as any);if(r.error)throw r.error;setConversions([...(conversions.filter(x=>!(x.from_unit===r.data.fromUnit&&x.to_unit===r.data.toUnit))),r.data]);setConversion({fromUnit:"",toUnit:"",multiplier:""});}}>Save conversion</Button>
            </div>
          </div>
          <div className="space-y-2">{conversions.map(x=><div key={x.id} className="flex items-center justify-between rounded border p-3 text-sm"><span>{x.from_unit} → {x.to_unit}</span><Badge>× {Number(x.multiplier)}</Badge></div>)}{!conversions.length&&<p className="text-sm text-muted-foreground">No unit conversions configured.</p>}</div>
        </div>}
        {tab==="TAX"&&<div className="grid gap-4 md:grid-cols-2"><div><Label>Tax category</Label><Input value={form.tax_category||""} onChange={e=>setForm({...form,tax_category:e.target.value})}/></div><div><Label>Fallback tax rate %</Label><Input type="number" value={form.vat_rate??0} onChange={e=>setForm({...form,vat_rate:e.target.value})}/></div><div className="md:col-span-2 rounded-lg border p-4 text-sm">Transaction tax is resolved through the centralized Tax Engine and the applied rate is snapshotted on the transaction.</div></div>}
         {tab==="ZRA"&&<div className="space-y-4"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5"/><strong>ZRA mapping</strong><SifoStatusBadge status={form.zra_sync_status||"unmapped"}/></div><div className="grid gap-3 md:grid-cols-2 text-sm"><div>ZRA Item Code: <strong>{form.zra_item_code||"—"}</strong></div><div>Classification: <strong>{form.zra_item_class_code||"—"}</strong></div><div>Item Type: <strong>{form.zra_item_type_code||"—"}</strong></div><div>Package Unit: <strong>{form.zra_pkg_unit_code||"—"}</strong></div><div>Quantity Unit: <strong>{form.zra_qty_unit_code||"—"}</strong></div><div>VAT Category: <strong>{form.zra_vat_category_code||"—"}</strong></div></div><Button asChild variant="outline"><Link to="/zra-smart-invoice">Open ZRA mapping centre</Link></Button></div>}
        {tab==="ACCOUNTING"&&<div className="rounded-lg border p-4 text-sm">Inventory asset, cost of sales, revenue and tax posting accounts are configured centrally through accounting posting rules. This item screen does not bypass those controls.</div>}
        {tab==="AUDIT"&&<div className="rounded-lg border p-4 text-sm">Item changes are subject to the authenticated database layer and compliance audit controls. Use the audit/compliance centre to review activity.</div>}
      </div>}
    </Card>
    </div>
  </SifoPage>;
}
