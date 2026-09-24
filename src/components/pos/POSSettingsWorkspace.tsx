import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { POSFullscreenButton } from "@/components/pos/POSFullscreenButton";
import { ExternalLink, Search, UserRound, Package, Monitor, Printer, Store, ChevronDown, CheckCircle2, UserPlus } from "lucide-react";
import { toast } from "sonner";

type Cashier = { id:string; full_name:string|null; display_name?:string|null; email?:string|null; pos_role?:string|null; is_active:boolean };
type Item = { id:string; name:string; sku:string|null; barcode:string|null; category:string|null; sell_price:number; cost_price:number; quantity_on_hand:number; is_active:boolean };

export function POSSettingsWorkspace({ edition = "SifoBooks POS", restaurant }: { edition?: string; restaurant?: boolean }) {
  const [restaurantMode,setRestaurantMode]=useState(Boolean(restaurant));
  const [cashiers,setCashiers]=useState<Cashier[]>([]);
  const [items,setItems]=useState<Item[]>([]);
  const [restaurantMenu,setRestaurantMenu]=useState<any[]>([]);
  const [orderTypes,setOrderTypes]=useState<any[]>([]);
  const [registers,setRegisters]=useState<any[]>([]);
  const [cashierSearch,setCashierSearch]=useState("");
  const [itemSearch,setItemSearch]=useState("");
  const [openCashier,setOpenCashier]=useState<string|null>(null);
  const [openItem,setOpenItem]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);

  const load=async()=>{
    setLoading(true);
    const u=await supabase.auth.getUser();
    if(!u.data.user){setLoading(false);return;}
    const uid=u.data.user.id;
    const [c,i,rm,ot,rg]=await Promise.all([
      supabase.from("employee_pos_permissions").select("id,full_name,display_name,email,pos_role,is_active").eq("user_id",uid).order("full_name"),
      supabase.from("stock_items").select("id,name,sku,barcode,category,sell_price,cost_price,quantity_on_hand,is_active").eq("is_active",true).order("name").limit(2000),
      supabase.from("restaurant_menu_items").select("id,name,category,station,price,active,is_86").eq("user_id",uid).order("category").order("name"),
      supabase.from("restaurant_order_types").select("id,key,label,active,requires_table,requires_customer,requires_address,packaging_fee,service_charge_pct,default_gratuity_pct,sort_order").eq("user_id",uid).order("sort_order"),
      supabase.from("pos_registers").select("*").eq("user_id",uid).order("name"),
    ]);
    if(c.error) toast.error(c.error.message); else setCashiers((c.data??[]) as Cashier[]);
    if(i.error) toast.error(i.error.message); else setItems((i.data??[]) as Item[]);
    if(rm.error) toast.error(`Restaurant menu: ${rm.error.message}`); else setRestaurantMenu(rm.data??[]);
    if(ot.error) toast.error(`Order types: ${ot.error.message}`); else setOrderTypes(ot.data??[]);
    if(rg.error) toast.error(`Registers: ${rg.error.message}`); else setRegisters(rg.data??[]);
    setLoading(false);
  };
  useEffect(()=>{
    if (restaurant !== undefined) { setRestaurantMode(Boolean(restaurant)); return; }
    (async()=>{
      const {data:u}=await supabase.auth.getUser();
      if(!u.user) return;
      const {data:p}=await supabase.from("profiles").select("active_company_id").eq("id",u.user.id).maybeSingle();
      if(!p?.active_company_id) return;
      const {data:co}=await supabase.from("companies").select("industry,workspace_mode").eq("id",p.active_company_id).maybeSingle();
      setRestaurantMode(String(co?.industry||co?.workspace_mode||"").toLowerCase()==="restaurant");
    })();
  },[restaurant]);
  useEffect(()=>{void load()},[]);

  const cashiersFiltered=useMemo(()=>cashiers.filter(c=>(c.display_name||c.full_name||c.email||"").toLowerCase().includes(cashierSearch.toLowerCase())),[cashiers,cashierSearch]);
  const itemsFiltered=useMemo(()=>items.filter(i=>[i.name,i.sku,i.barcode,i.category].some(v=>String(v||"").toLowerCase().includes(itemSearch.toLowerCase()))),[items,itemSearch]);

  const toggleCashier=async(c:Cashier)=>{
    const {error}=await supabase.from("employee_pos_permissions").update({is_active:!c.is_active}).eq("id",c.id);
    if(error) return toast.error(error.message);
    setCashiers(xs=>xs.map(x=>x.id===c.id?{...x,is_active:!c.is_active}:x));
    toast.success(c.is_active?"Cashier disabled":"Cashier enabled");
  };

  const menuFiltered=useMemo(()=>restaurantMenu.filter(i=>[i.name,i.category,i.station].some(v=>String(v||"").toLowerCase().includes(itemSearch.toLowerCase()))),[restaurantMenu,itemSearch]);

  return <div className="min-h-screen bg-[#F7FBF9] p-4 md:p-6">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="rounded-3xl border border-[#DDEBE6] bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="text-xs font-bold uppercase tracking-[.18em] text-emerald-200">{edition} · Settings</div><h1 className="mt-1 text-2xl font-black md:text-3xl">POS Control Centre</h1><p className="mt-1 text-sm text-emerald-100/80">Cashiers, item catalogue, tills, printing and touchscreen behaviour in one interactive workspace.</p></div>
          <div className="flex gap-2"><POSFullscreenButton label="Full screen POS" /><Button variant="secondary" onClick={()=>void load()} className="rounded-xl">Refresh</Button></div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-[#DDEBE6]"><CardContent className="p-4"><UserRound className="h-5 w-5 text-emerald-700"/><div className="mt-2 text-2xl font-black">{cashiers.length}</div><div className="text-xs text-muted-foreground">POS cashiers</div></CardContent></Card>
        <Card className="rounded-2xl border-[#DDEBE6]"><CardContent className="p-4"><Package className="h-5 w-5 text-emerald-700"/><div className="mt-2 text-2xl font-black">{items.length}</div><div className="text-xs text-muted-foreground">Active sellable items</div></CardContent></Card>
        <Card className="rounded-2xl border-[#DDEBE6]"><CardContent className="p-4"><Monitor className="h-5 w-5 text-emerald-700"/><div className="mt-2 text-2xl font-black">Touch</div><div className="text-xs text-muted-foreground">POS interaction mode</div></CardContent></Card>
        <Card className="rounded-2xl border-[#DDEBE6]"><CardContent className="p-4"><Printer className="h-5 w-5 text-emerald-700"/><div className="mt-2 text-2xl font-black">Ready</div><div className="text-xs text-muted-foreground">Printing & hardware</div></CardContent></Card>
      </div>

      <Tabs defaultValue="cashiers" className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-sm">
          <TabsTrigger value="cashiers" className="rounded-xl">Cashiers</TabsTrigger>
          <TabsTrigger value="items" className="rounded-xl">{restaurantMode?"Menu":"Items"}</TabsTrigger>
          {restaurant&&<TabsTrigger value="restaurant" className="rounded-xl">Restaurant Operations</TabsTrigger>}
          <TabsTrigger value="registers" className="rounded-xl">Registers</TabsTrigger>
          <TabsTrigger value="hardware" className="rounded-xl">Hardware & Printing</TabsTrigger>
          <TabsTrigger value="display" className="rounded-xl">Display & POS</TabsTrigger>
        </TabsList>

        <TabsContent value="cashiers">
          <Card className="rounded-2xl border-[#DDEBE6] shadow-sm"><CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between"><CardTitle>Cashier list</CardTitle><div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input value={cashierSearch} onChange={e=>setCashierSearch(e.target.value)} placeholder="Search cashiers…" className="h-10 w-64 rounded-xl pl-9"/></div><Button asChild className="rounded-xl"><a href="/manager/cashiers"><UserPlus className="mr-2 h-4 w-4"/>Manage cashiers</a></Button></div></CardHeader>
            <CardContent className="space-y-2 p-3">{loading?<div className="p-6 text-sm text-muted-foreground">Loading cashiers…</div>:cashiersFiltered.map(c=>{
              const open=openCashier===c.id; return <div key={c.id} className="overflow-hidden rounded-2xl border border-[#DDEBE6] bg-white transition-all hover:shadow-sm">
                <button type="button" onClick={()=>setOpenCashier(open?null:c.id)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left"><div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UserRound className="h-4 w-4"/></div><div className="min-w-0 flex-1"><div className="truncate font-bold">{c.display_name||c.full_name||"Unnamed cashier"}</div><div className="text-xs text-muted-foreground">{c.email||"No email"} · {c.pos_role||"cashier"}</div></div><Badge variant={c.is_active?"default":"secondary"}>{c.is_active?"ACTIVE":"DISABLED"}</Badge><ChevronDown className={`h-4 w-4 transition-transform ${open?"rotate-180":""}`}/></button>
                {open&&<div className="grid gap-3 border-t bg-[#F7FBF9] p-4 sm:grid-cols-3"><div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">POS role</div><div className="font-semibold">{c.pos_role||"cashier"}</div></div><div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Access</div><div className="font-semibold">{c.is_active?"Can sign into POS":"Blocked from POS"}</div></div><div className="flex justify-end sm:col-span-1"><Button variant="outline" onClick={()=>void toggleCashier(c)} className="rounded-xl">{c.is_active?"Disable cashier":"Enable cashier"}</Button></div></div>}
              </div>
            })}{!loading&&!cashiersFiltered.length&&<div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No cashiers match the search.</div>}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items">
          <Card className="rounded-2xl border-[#DDEBE6] shadow-sm"><CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between"><CardTitle>{restaurantMode?"Restaurant menu catalogue":"POS item catalogue"}</CardTitle><div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input value={itemSearch} onChange={e=>setItemSearch(e.target.value)} placeholder="Search name, SKU or barcode…" className="h-10 w-72 rounded-xl pl-9"/></div><Button asChild variant="outline" className="rounded-xl"><a href="/stock">Open item master</a></Button></div></CardHeader>
            <CardContent className="grid gap-2 p-3">{restaurantMode ? menuFiltered.map((i:any)=><div key={i.id} className="flex items-center gap-3 rounded-2xl border border-[#DDEBE6] bg-white p-4"><div className="flex-1"><div className="font-bold">{i.name}</div><div className="text-xs text-muted-foreground">{i.category||"General"} · {i.station||"Kitchen"}</div></div><Badge variant={i.active&&!i.is_86?"default":"secondary"}>{i.is_86?"86":i.active?"ACTIVE":"DISABLED"}</Badge><div className="font-black">K{Number(i.price||0).toFixed(2)}</div></div>) : itemsFiltered.map(i=>{
              const open=openItem===i.id; return <div key={i.id} className="overflow-hidden rounded-2xl border border-[#DDEBE6] bg-white transition-all hover:shadow-sm">
                <button type="button" onClick={()=>setOpenItem(open?null:i.id)} className="flex min-h-16 w-full items-center gap-3 px-4 text-left"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Package className="h-5 w-5"/></div><div className="min-w-0 flex-1"><div className="truncate font-bold">{i.name}</div><div className="text-xs text-muted-foreground">{i.sku||"No SKU"} · {i.category||"General"}</div></div><div className="hidden text-right sm:block"><div className="font-black">K{Number(i.sell_price||0).toFixed(2)}</div><div className="text-xs text-muted-foreground">{Number(i.quantity_on_hand||0)} in stock</div></div><ChevronDown className={`h-4 w-4 transition-transform ${open?"rotate-180":""}`}/></button>
                {open&&<div className="grid gap-3 border-t bg-[#F7FBF9] p-4 sm:grid-cols-4"><div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">SKU / Barcode</div><div className="font-semibold">{i.sku||"—"} / {i.barcode||"—"}</div></div><div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Selling price</div><div className="font-semibold">K{Number(i.sell_price||0).toFixed(2)}</div></div><div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Stock</div><div className="font-semibold">{Number(i.quantity_on_hand||0)} units</div></div><div className="flex items-end justify-end"><Button asChild variant="outline" className="rounded-xl"><a href={`/stock?item=${encodeURIComponent(i.id)}`}>Open item</a></Button></div></div>}
              </div>
            })}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="restaurant"><Card className="rounded-2xl border-[#DDEBE6]"><CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Button asChild variant="outline" className="h-20 rounded-2xl"><a href="/restaurant/settings">Restaurant settings</a></Button>
          <Button asChild variant="outline" className="h-20 rounded-2xl"><a href="/restaurant/registers">Registers & tills</a></Button>
          <Button asChild variant="outline" className="h-20 rounded-2xl"><a href="/restaurant/tables">Tables & floor plan</a></Button>
          <Button asChild variant="outline" className="h-20 rounded-2xl"><a href="/restaurant/kitchen">Kitchen / KDS</a></Button>
          <Button asChild variant="outline" className="h-20 rounded-2xl"><a href="/restaurant/menu">Menu & modifiers</a></Button>
          <Button asChild variant="outline" className="h-20 rounded-2xl"><a href="/manager/shifts">Cash shifts & drawers</a></Button>
          <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border bg-[#F7FBF9] p-4"><div className="mb-3 font-bold">Order types</div><div className="grid gap-2 md:grid-cols-2">{orderTypes.map((x:any)=><div key={x.id} className="flex items-center justify-between rounded-xl bg-white p-3 border"><span className="font-semibold">{x.label||x.key}</span><Badge variant={x.active?"default":"secondary"}>{x.active?"ACTIVE":"DISABLED"}</Badge></div>)}</div></div>
        </CardContent></Card></TabsContent>

        <TabsContent value="registers"><Card className="rounded-2xl border-[#DDEBE6]"><CardContent className="grid gap-3 p-5 sm:grid-cols-3"><Button asChild variant="outline" className="h-20 rounded-2xl"><a href="/restaurant/registers"><Store className="mr-2 h-5 w-5"/>Restaurant registers</a></Button><Button asChild variant="outline" className="h-20 rounded-2xl"><a href="/retail-control-center">Retail control centre</a></Button><Button asChild variant="outline" className="h-20 rounded-2xl"><a href="/manager/shifts">Cash shifts & drawers</a></Button></CardContent></Card></TabsContent>
        <TabsContent value="hardware"><Card className="rounded-2xl border-[#DDEBE6]"><CardContent className="grid gap-3 p-5 sm:grid-cols-2"><Button asChild variant="outline" className="h-20 rounded-2xl"><a href="/printing-settings"><Printer className="mr-2 h-5 w-5"/>Printer routing</a></Button><Button asChild variant="outline" className="h-20 rounded-2xl"><a href="/network-setup"><Monitor className="mr-2 h-5 w-5"/>Network / terminals</a></Button></CardContent></Card></TabsContent>
        <TabsContent value="display"><Card className="rounded-2xl border-[#DDEBE6]"><CardContent className="space-y-3 p-5"><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-600"/>Touch-first controls enabled</div><p className="text-sm text-muted-foreground">Use the Full screen control in the POS header for a clean cashier-only terminal. Product cards support tap, long-press and right-click quantity selection.</p><Button asChild className="rounded-xl"><a href={restaurantMode?"/restaurant/pos":"/pos"}>Open {restaurantMode?"Restaurant":"Retail"} POS</a></Button></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  </div>;
}
