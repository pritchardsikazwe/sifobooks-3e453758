import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Beef, Scale, Search, ShoppingCart, Trash2, Plus, Minus, Banknote, Smartphone, CreditCard, User, Wifi, WifiOff, CheckCircle2, PauseCircle, RotateCcw, Barcode, Printer, Delete, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { completeSale, computeTotals, currentShift, ensureRegister, loadSettings, posErrorMessage, type CartLine, type PosSettings, type SalePayment, type PriceLevel } from "@/lib/pos";
import { openWebSerialScale, parseScaleReading, type ScaleReading } from "@/lib/butchery";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export const Route = createFileRoute("/_authenticated/retail/butchery-pos")({
  head: () => ({ meta: [
    { title: "Butchery POS — SifoBooks Retail" },
    { name: "description", content: "Fast touchscreen butcher POS for weighed meat, cuts, mobile money, cash and card." },
  ] }),
  component: ButcheryPos,
});

type Product = {
  id: string; name: string; sku: string | null; barcode: string | null; category: string | null;
  sell_price: number; cost_price: number; quantity_on_hand: number;
};
type ButcheryProduct = {
  id: string; item_id: string; animal_type: string; cut_name: string | null;
  grade: string | null; price_per_kg: number; scale_enabled: boolean;
};

const animalLabels: Record<string,string> = { beef:"BEEF", chicken:"CHICKEN", goat:"GOAT", pork:"PORK", lamb:"LAMB", other:"OTHER" };

function ButcheryPos() {
  const net = useNetworkStatus();
  const [products,setProducts]=useState<Product[]>([]);
  const [scan,setScan]=useState("");
  const [scanMode,setScanMode]=useState(false);
  const [customerName,setCustomerName]=useState("Walk-in Customer");
  const [customerDialog,setCustomerDialog]=useState(false);
  const [orderDialog,setOrderDialog]=useState(false);
  const [orderNote,setOrderNote]=useState("");
  const [desktopHardware,setDesktopHardware]=useState(false);
  const [hardwarePrinters,setHardwarePrinters]=useState<any[]>([]);
  const [scalePorts,setScalePorts]=useState<any[]>([]);
  const [scalePort,setScalePort]=useState("");
  const [scaleBaud,setScaleBaud]=useState("9600");
  const desktopScaleTimer=useRef<number|null>(null);
  const [bp,setBp]=useState<ButcheryProduct[]>([]);
  const [selectedAnimal,setSelectedAnimal]=useState("all");
  const [search,setSearch]=useState("");
  const [cart,setCart]=useState<CartLine[]>([]);
  const [scale,setScale]=useState<ScaleReading>({weight:0,stable:false,raw:"",unit:"kg"});
  const [scaleHandle,setScaleHandle]=useState<any>(null);
  const [scaleConnected,setScaleConnected]=useState(false);
  const [chosen,setChosen]=useState<Product|null>(null);
  const [manualWeight,setManualWeight]=useState("");
  const [settings,setSettings]=useState<PosSettings|null>(null);
  const [register,setRegister]=useState<any>(null);
  const [shift,setShift]=useState<any>(null);
  const [cashier,setCashier]=useState("");
  const [openingFloat,setOpeningFloat]=useState("0");
  const [shiftDialog,setShiftDialog]=useState(false);
  const [payDialog,setPayDialog]=useState(false);
  const [payMethod,setPayMethod]=useState("cash");
  const [payAmount,setPayAmount]=useState("");
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState<any>(null);
  const [autoAddStable,setAutoAddStable]=useState(true);
  const lastAutoWeight=useRef("");

  useEffect(()=>{(async()=>{try{const r=await fetch("/api/hardware/info");if(!r.ok)return;const d=await r.json();if(d?.platform==="win32"){setDesktopHardware(true);setHardwarePrinters(d.printers||[]);setScalePorts(d.serialPorts||[]);if(!scalePort&&d.serialPorts?.length===1)setScalePort(d.serialPorts[0].DeviceID);}}catch{}})();},[scalePort]);

  const load=useCallback(async()=>{
    const [items,bps,reg,st,settingsData]=await Promise.all([
      supabase.from("stock_items").select("id,name,sku,barcode,category,sell_price,cost_price,quantity_on_hand").eq("is_active",true).order("name").limit(2000),
      supabase.from("butchery_products").select("id,item_id,animal_type,cut_name,grade,price_per_kg,scale_enabled").eq("is_active",true),
      ensureRegister(),
      Promise.resolve(currentShift()),
      loadSettings().catch(()=>null),
    ]);
    setProducts((items.data??[]) as Product[]);
    setBp((bps.data??[]) as ButcheryProduct[]);
    setRegister(reg); setShift(st); setSettings(settingsData);
  },[]);
  useEffect(()=>{void load()},[load]);

  const mapped=useMemo(()=>new Map(bp.map(x=>[x.item_id,x])),[bp]);
  const meat=useMemo(()=>products.filter(p=>mapped.has(p.id)),[products,mapped]);
  const animals=useMemo(()=>["all",...Array.from(new Set(meat.map(p=>mapped.get(p.id)?.animal_type||"other")))], [meat,mapped]);
  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return meat.filter(p=>{
      const m=mapped.get(p.id);
      if(selectedAnimal!=="all" && m?.animal_type!==selectedAnimal)return false;
      return !q || [p.name,p.sku,m?.cut_name,m?.animal_type].some(v=>String(v||"").toLowerCase().includes(q));
    });
  },[meat,mapped,selectedAnimal,search]);

  const weight=Number(manualWeight||scale.weight||0);
  const totals=useMemo(()=>computeTotals(cart,0,settings||({
    tax_rate:16,tax_inclusive:true,allow_negative_stock:false,default_price_level:"normal"
  } as any)),[cart,settings]);
  const selectedMeta=chosen?mapped.get(chosen.id):null;
  const scanProduct=useMemo(()=>{const q=scan.trim(); if(!q)return null; return products.find(p=>String(p.barcode||"")===q||String(p.sku||"")===q)||null},[scan,products]);
  const selectedPrice=selectedMeta?.price_per_kg || chosen?.sell_price || 0;

  const connectScale=async()=>{
    if(desktopHardware){
      const port=scalePort || scalePorts[0]?.DeviceID;
      if(!port)return toast.error("No COM scale detected. Connect the USB/COM scale first.");
      setScaleConnected(true);
      const poll=async()=>{try{const r=await fetch("/api/hardware/scale/read",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({port,baudRate:Number(scaleBaud)})});const d=await r.json();if(d?.raw){const parts=String(d.raw).split(/[\\r\\n]+/).map(x=>x.trim()).filter(Boolean);const parsed=parts.map(x=>parseScaleReading(x)).filter(Boolean).pop() as ScaleReading|undefined;if(parsed)setScale(parsed);}}catch{}};
      await poll(); desktopScaleTimer.current=window.setInterval(poll,700); toast.success(`Windows scale connected on ${port}`); return;
    }
    try{const h=await openWebSerialScale(r=>setScale(r),9600);setScaleHandle(h);setScaleConnected(true);toast.success("Scale connected");}
    catch(e:any){toast.error(e?.message==="WEB_SERIAL_UNAVAILABLE"?"Use the SifoBooks Windows Desktop build for direct USB/COM scale access.":"Scale connection cancelled");}
  };
  const disconnectScale=async()=>{if(desktopScaleTimer.current){window.clearInterval(desktopScaleTimer.current);desktopScaleTimer.current=null;}try{await scaleHandle?.stop?.()}catch{}setScaleHandle(null);setScaleConnected(false);setScale({weight:0,stable:false,raw:"",unit:"kg"});};

  const addWeighted=()=>{
    if(!chosen)return toast.error("Tap a meat cut first");
    if(!(weight>0))return toast.error("Place meat on the scale or enter the weight");
    if(!settings) return toast.error("POS settings are still loading");
    if(!settings.allow_negative_stock && weight>Number(chosen.quantity_on_hand||0)) return toast.error("Not enough stock for this cut");
    const line:CartLine={key:`${chosen.id}-${Date.now()}`,item_id:chosen.id,name:chosen.name,sku:chosen.sku,qty:weight,unit:"kg",price:Number(selectedPrice),unit_cost:Number(chosen.cost_price||0),discount_pct:0};
    setCart(c=>[...c,line]);setChosen(null);setManualWeight("");setScale(s=>({...s,weight:0,stable:false}));toast.success(`${chosen.name} added`);
  };
  useEffect(()=>{
    if(!autoAddStable || !chosen || !scaleConnected || !scale.stable || scale.weight<=0) return;
    const signature=`${chosen.id}:${scale.weight.toFixed(3)}`;
    if(lastAutoWeight.current===signature) return;
    lastAutoWeight.current=signature;
    const timer=window.setTimeout(()=>addWeighted(),450);
    return ()=>window.clearTimeout(timer);
  },[autoAddStable,chosen,scaleConnected,scale.stable,scale.weight]);

  const scanAndAdd=()=>{
    const p=scanProduct;
    if(!p)return toast.error("Barcode or SKU not found");
    if(!mapped.has(p.id))return toast.error("This item is not configured as a butchery cut");
    setChosen(p);setManualWeight("");setScan("");setScanMode(false);toast.success(`${p.name} selected`);
  };
  const addFixed=(p:Product)=>{
    const line:CartLine={key:`${p.id}-${Date.now()}`,item_id:p.id,name:p.name,sku:p.sku,qty:1,unit:p.category||"unit",price:Number(p.sell_price||0),unit_cost:Number(p.cost_price||0),discount_pct:0};
    setCart(c=>[...c,line]);
  };
  const changeQty=(key:string,d:number)=>setCart(c=>c.map(x=>x.key===key?{...x,qty:Math.max(0.001,x.qty+d)}:x));
  const remove=(key:string)=>setCart(c=>c.filter(x=>x.key!==key));
  const clear=()=>setCart([]);

  const openTill=async()=>{
    if(!register)return toast.error("No POS register is configured");
    if(!cashier.trim())return toast.error("Enter cashier name");
    try{
      const {data,error}=await supabase.from("pos_shifts").insert({register_id:register.id,cashier_name:cashier.trim(),opening_float:Number(openingFloat||0)} as any).select("*").maybeSingle();
      if(error)throw error;
      setShift(data);setShiftDialog(false);toast.success("Butchery till opened");
    }catch(e:any){toast.error(e.message||"Could not open till")}
  };

  const keypad=(key:string)=>{ if(key==="C") return setPayAmount(""); if(key==="⌫") return setPayAmount(v=>v.slice(0,-1)); setPayAmount(v=>v==="0"?key:v+key); };
  const printLabel=async()=>{
    if(!chosen && !cart.length)return toast.error("Select a cut or add a sale first");
    const line=chosen?{name:chosen.name,price:selectedPrice,qty:weight,barcode:chosen.barcode||chosen.sku||"SIFOBOOKS"}:{name:cart[cart.length-1].name,price:cart[cart.length-1].price,qty:cart[cart.length-1].qty,barcode:cart[cart.length-1].sku||"SIFOBOOKS"};
    const total=Number(line.price)*Number(line.qty);
    if(desktopHardware && hardwarePrinters.length){
      const labelPrinter=hardwarePrinters.find(p=>/label|zebra|zdesigner|tsc|te200|te210|tx200|tx210/i.test(String(p.Name||"") + " " + String(p.DriverName||"")));
      if(!labelPrinter)return toast.error("No label printer is configured. Connect a Zebra/ZPL, TSC/TSPL, or ESC/POS label printer in Windows first.");
      const printer=labelPrinter.Name;
      const protocol=/zebra|zdesigner|zpl/i.test(String(labelPrinter.Name||"")+" "+String(labelPrinter.DriverName||""))?"zpl":/tsc|tspl|te200|te210|tx200|tx210/i.test(String(labelPrinter.Name||"")+" "+String(labelPrinter.DriverName||""))?"tspl":"escpos";
      try{const r=await fetch("/api/hardware/label/print",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({printer,protocol,name:line.name,weightKg:Number(line.qty),pricePerKg:Number(line.price),total,barcode:line.barcode,footer:"Keep refrigerated"})});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Direct label print failed");toast.success(`Label printed directly to ${printer}`);return;}catch(e:any){toast.error(e?.message||"Direct label print failed");return;}
    }
    const w=window.open("","_blank","width=520,height=420");if(!w)return toast.error("Allow pop-ups to print labels");
    w.document.write(`<html><head><title>SifoBooks Meat Label</title><style>body{font-family:Arial;margin:18px}.label{width:80mm;border:1px solid #111;padding:12px}.name{font-size:22px;font-weight:800}.price{font-size:26px;font-weight:800}.barcode{font-family:monospace;font-size:18px;letter-spacing:2px;border-top:3px solid #111;border-bottom:3px solid #111;padding:8px 0;margin-top:10px}small{color:#555}</style></head><body><div class="label"><div class="name">${line.name}</div><small>SifoBooks Butchery</small><p>Weight: <b>${Number(line.qty).toFixed(3)} kg</b></p><p>Price/kg: <b>K${Number(line.price).toFixed(2)}</b></p><div class="price">K${total.toFixed(2)}</div><div class="barcode">${line.barcode}</div><small>Keep refrigerated · Scale/price label</small></div></body></html>`);w.document.close();w.focus();w.print();w.close();
  };
  const checkout=async()=>{
    if(!cart.length)return;
    if(!shift){setShiftDialog(true);return;}
    setPayAmount(totals.total.toFixed(2));setPayMethod("cash");setPayDialog(true);
  };
  const finishPayment=async()=>{
    const amount=Number(payAmount||0);
    if(amount<totals.total)return toast.error("Payment is less than the total");
    setBusy(true);
    try{
      const completedTotal=totals.total;
      const payments:SalePayment[]=[{method:payMethod,amount}];
      const res=await completeSale({
        lines:cart,totals,customer:null,customerName:customerName.trim()||"Walk-in Customer",
        priceLevel:(settings?.default_price_level||"normal") as PriceLevel,saleDiscountPct:0,
        shiftId:shift.id,registerId:register?.id??null,locationId:register?.location_id??null,
        taxRate:settings?.tax_rate??16,taxInclusive:settings?.tax_inclusive??true,
        allowNegativeStock:settings?.allow_negative_stock??false,
      },payments,Math.max(0,amount-totals.total));
      setPayDialog(false);setDone({...res,total:completedTotal});setCart([]);setChosen(null);setManualWeight("");setScale(s=>({...s,weight:0,stable:false}));await load();
      toast.success(res.offline?"Sale saved offline":"Sale completed");
    }catch(e:any){toast.error(posErrorMessage(e?.message||String(e)))}finally{setBusy(false)}
  };

  return <div className="min-h-screen bg-slate-950 text-white">
    <div className="sticky top-0 z-20 border-b border-white/10 bg-emerald-950/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-3 px-3 md:px-5">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-amber-400 p-2 text-emerald-950"><Beef className="h-6 w-6"/></div><div><div className="text-lg font-black">SifoBooks Butchery POS</div><div className="hidden text-xs text-emerald-200 sm:block">{register?.name||"Counter"} · {shift?shift.cashier_name:"Till closed"}</div></div></div>
        <div className="flex items-center gap-2">
          <Badge className={net.state==="online"?"bg-emerald-400 text-emerald-950":"bg-amber-400 text-amber-950"}>{net.state==="online"?<Wifi className="mr-1 h-3 w-3"/>:<WifiOff className="mr-1 h-3 w-3"/>}{net.state==="online"?"ONLINE":"OFFLINE"}</Badge>
          <Button variant="secondary" size="sm" onClick={()=>shift?toast.message("Till is already open"):setShiftDialog(true)}>{shift?"Till Open":"Open Till"}</Button>
        </div>
      </div>
    </div>

    <div className="grid min-h-[calc(100vh-64px)] xl:grid-cols-[1fr_420px]">
      <section className="p-3 md:p-5">
        <div className="mb-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search meat, cut or scan barcode..." className="h-14 border-white/10 bg-white text-base text-slate-900 pl-12"/></div>
          <div className="flex gap-2"><Button variant="outline" className="h-14 border-white/15 bg-white/5 text-white" onClick={()=>setScanMode(v=>!v)}><Barcode className="mr-2 h-5 w-5"/>{scanMode?"Close Scan":"Scan Barcode"}</Button><Button variant="outline" className="h-14 border-white/15 bg-white/5 text-white" onClick={scaleConnected?disconnectScale:connectScale}><Scale className="mr-2 h-5 w-5"/>{scaleConnected?"Disconnect Scale":"Connect Scale"}</Button></div>
        </div>
        {scanMode&&<div className="mb-3 flex gap-2 rounded-2xl bg-emerald-900 p-3"><Input autoFocus value={scan} onChange={e=>setScan(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();scanAndAdd()}}} placeholder="Scan barcode / enter SKU" className="h-12 bg-white text-slate-900"/><Button className="h-12 bg-amber-400 text-emerald-950 font-black" onClick={scanAndAdd}>ADD</Button></div>}

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {animals.map(a=><button key={a} onClick={()=>setSelectedAnimal(a)} className={`min-w-[110px] rounded-2xl px-5 py-4 text-sm font-black transition ${selectedAnimal===a?"bg-amber-400 text-emerald-950":"bg-white/10 text-white hover:bg-white/15"}`}>{a==="all"?"ALL":animalLabels[a]||a.toUpperCase()}</button>)}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {visible.map(p=>{const m=mapped.get(p.id)!;return <button key={p.id} onClick={()=>{setChosen(p);setManualWeight(scale.weight?scale.weight.toFixed(3):"")}} className="min-h-[145px] rounded-2xl border border-white/10 bg-white/10 p-4 text-left shadow-lg transition active:scale-[.98] hover:border-amber-400/60 hover:bg-emerald-900">
            <div className="flex items-start justify-between gap-2"><div className="rounded-xl bg-emerald-800 p-2"><Beef className="h-5 w-5"/></div><span className="text-xs text-emerald-200">{Number(p.quantity_on_hand||0).toFixed(2)} kg</span></div>
            <div className="mt-4 text-lg font-black leading-tight">{p.name}</div><div className="mt-1 text-xs text-slate-400">{m.cut_name||"Meat cut"} · <span className="text-amber-300">K{Number(m.price_per_kg||p.sell_price).toFixed(2)}/kg</span></div>
          </button>})}
        </div>
        {!visible.length&&<div className="py-20 text-center text-slate-400">No mapped butchery cuts match this search.</div>}
      </section>

      <aside className="border-t border-white/10 bg-white text-slate-900 xl:border-l xl:border-t-0">
        <div className="flex items-center justify-between border-b px-4 py-4"><div><div className="text-lg font-black">Current Sale</div><div className="text-xs text-slate-500">{cart.length} line{cart.length===1?"":"s"} · {customerName}</div></div><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={()=>setCustomerDialog(true)}><User className="mr-1 h-4 w-4"/>Customer</Button><Button variant="ghost" size="sm" onClick={clear} disabled={!cart.length}><RotateCcw className="mr-1 h-4 w-4"/>Clear</Button></div></div>
        <div className="max-h-[48vh] overflow-y-auto p-3">
          {!cart.length?<div className="flex min-h-[260px] flex-col items-center justify-center text-center text-slate-400"><ShoppingCart className="h-12 w-12 mb-3"/><div className="font-bold">Tap a meat cut to start</div><div className="text-sm">Weigh it, confirm the weight, then add it to the sale.</div></div>:
          cart.map(l=><div key={l.key} className="mb-2 rounded-2xl border p-3"><div className="flex items-start justify-between gap-2"><div><div className="font-black">{l.name}</div><div className="text-xs text-slate-500">K{l.price.toFixed(2)}/kg · {l.qty.toFixed(3)} kg</div></div><button onClick={()=>remove(l.key)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4"/></button></div><div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-1"><Button size="icon" variant="outline" className="h-9 w-9" onClick={()=>changeQty(l.key,-0.05)}><Minus className="h-4 w-4"/></Button><span className="w-20 text-center font-bold">{l.qty.toFixed(3)} kg</span><Button size="icon" variant="outline" className="h-9 w-9" onClick={()=>changeQty(l.key,0.05)}><Plus className="h-4 w-4"/></Button></div><strong>K{(l.qty*l.price).toFixed(2)}</strong></div></div>)}
        </div>
        <div className="border-t bg-slate-50 p-4">
          {chosen&&<div className="mb-4 rounded-2xl bg-emerald-950 p-4 text-white"><div className="text-xs uppercase tracking-wider text-emerald-200">Weighing</div><div className="mt-1 text-xl font-black">{chosen.name}</div><div className="mt-3 flex items-center gap-2"><Input autoFocus type="number" min="0" step="0.001" value={manualWeight} onChange={e=>setManualWeight(e.target.value)} className="h-14 bg-white text-2xl font-black text-slate-900"/><span className="text-xl font-black">kg</span></div><div className="mt-2 flex items-center justify-between gap-2 text-xs text-emerald-200"><span>{scaleConnected?scale.stable?"Scale stable — ready":"Waiting for stable weight":"Manual weight mode"}</span>{scaleConnected&&<button type="button" onClick={()=>setAutoAddStable(v=>!v)} className={`rounded-full px-3 py-1 font-bold ${autoAddStable?"bg-amber-400 text-emerald-950":"bg-white/10 text-white"}`}>{autoAddStable?"AUTO-ADD ON":"AUTO-ADD OFF"}</button>}</div>{desktopHardware&&<div className="mt-2 grid grid-cols-2 gap-2"><select value={scalePort} onChange={e=>setScalePort(e.target.value)} className="h-9 rounded-lg bg-white/10 px-2 text-xs text-white"><option value="">Auto COM port</option>{scalePorts.map(p=><option key={p.DeviceID} value={p.DeviceID} className="text-slate-900">{p.DeviceID} · {p.Name}</option>)}</select><select value={scaleBaud} onChange={e=>setScaleBaud(e.target.value)} className="h-9 rounded-lg bg-white/10 px-2 text-xs text-white"><option value="9600">9600 baud</option><option value="4800">4800 baud</option><option value="19200">19200 baud</option><option value="38400">38400 baud</option></select></div>}<Button className="mt-3 h-12 w-full bg-amber-400 font-black text-emerald-950 hover:bg-amber-300" onClick={addWeighted}><Plus className="mr-2 h-5 w-5"/>ADD WEIGHT TO SALE</Button></div>}
          <div className="flex items-center justify-between text-sm"><span>Subtotal</span><strong>K{totals.subtotal.toFixed(2)}</strong></div>
          <div className="flex items-center justify-between text-sm"><span>VAT</span><strong>K{totals.tax.toFixed(2)}</strong></div>
          <div className="mt-3 flex items-end justify-between border-t pt-3"><span className="text-lg font-black">TOTAL</span><span className="text-4xl font-black text-emerald-800">K{totals.total.toFixed(2)}</span></div>
          <div className="mt-3 grid grid-cols-2 gap-2"><Button variant="outline" className="h-12" onClick={()=>setOrderDialog(true)}><ClipboardList className="mr-2 h-5 w-5"/>CUSTOM ORDER</Button><Button variant="outline" className="h-12" onClick={printLabel}><Printer className="mr-2 h-5 w-5"/>PRINT LABEL</Button></div><Button disabled={!cart.length} onClick={checkout} className="mt-4 h-16 w-full bg-emerald-800 text-lg font-black hover:bg-emerald-700"><Banknote className="mr-2 h-6 w-6"/>PAY NOW</Button>
        </div>
      </aside>
    </div>

    <Dialog open={shiftDialog} onOpenChange={setShiftDialog}><DialogContent><DialogHeader><DialogTitle>Open Butchery Till</DialogTitle></DialogHeader><div className="space-y-4"><div><label className="text-sm font-semibold">Cashier / Butcher</label><Input className="mt-1 h-12" value={cashier} onChange={e=>setCashier(e.target.value)} placeholder="e.g. John"/></div><div><label className="text-sm font-semibold">Opening cash (ZMW)</label><Input className="mt-1 h-12" type="number" value={openingFloat} onChange={e=>setOpeningFloat(e.target.value)}/></div></div><DialogFooter><Button variant="outline" onClick={()=>setShiftDialog(false)}>Cancel</Button><Button onClick={()=>void openTill()}>Open Till</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={payDialog} onOpenChange={setPayDialog}><DialogContent><DialogHeader><DialogTitle>Take Payment</DialogTitle></DialogHeader><div className="text-center"><div className="text-sm text-slate-500">Amount due</div><div className="text-5xl font-black text-emerald-800">K{totals.total.toFixed(2)}</div></div><div className="grid grid-cols-3 gap-2">{[
      ["cash","Cash",Banknote],["mobile money","MoMo / Airtel",Smartphone],["card","Card",CreditCard]
    ].map(([key,label,Icon]:any)=><Button key={key} variant={payMethod===key?"default":"outline"} className="h-16 font-black" onClick={()=>setPayMethod(key)}><Icon className="mr-2 h-5 w-5"/>{label}</Button>)}</div><Input autoFocus className="h-16 text-center text-3xl font-black" type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)}/><div className="grid grid-cols-3 gap-2">{["1","2","3","4","5","6","7","8","9","C","0","⌫"].map(k=><Button key={k} variant={k==="C"?"destructive":"outline"} className="h-12 text-xl font-black" onClick={()=>keypad(k)}>{k==="⌫"?<Delete className="mx-auto h-5 w-5"/>:k}</Button>)}</div><div className="grid grid-cols-4 gap-2">{[50,100,200,500].map(v=><Button key={v} variant="outline" className="h-10" onClick={()=>setPayAmount(String(v))}>K{v}</Button>)}</div><div className="rounded-xl bg-slate-100 p-3 text-center text-sm">Change: <strong>K{Math.max(0,Number(payAmount||0)-totals.total).toFixed(2)}</strong></div><DialogFooter><Button variant="outline" onClick={()=>setPayDialog(false)}>Back</Button><Button disabled={busy} className="h-14 bg-emerald-800 px-8 text-lg font-black" onClick={()=>void finishPayment()}><CheckCircle2 className="mr-2 h-5 w-5"/>{busy?"POSTING...":"COMPLETE SALE"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={customerDialog} onOpenChange={setCustomerDialog}><DialogContent><DialogHeader><DialogTitle>Customer</DialogTitle></DialogHeader><Input autoFocus value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Customer name or phone"/><DialogFooter><Button onClick={()=>setCustomerDialog(false)}>Save Customer</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={orderDialog} onOpenChange={setOrderDialog}><DialogContent><DialogHeader><DialogTitle>Custom Butchery Order</DialogTitle></DialogHeader><div className="space-y-3"><div className="rounded-xl bg-slate-100 p-3 text-sm">{cart.length} items · K{totals.total.toFixed(2)}</div><Input value={orderNote} onChange={e=>setOrderNote(e.target.value)} placeholder="Cutting instructions, pickup time, packaging, etc."/></div><DialogFooter><Button variant="outline" onClick={()=>setOrderDialog(false)}>Cancel</Button><Button onClick={()=>{setOrderDialog(false);toast.success("Custom order note saved for this sale")}}>Save Order</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={!!done} onOpenChange={()=>setDone(null)}><DialogContent><div className="py-5 text-center"><CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600"/><h2 className="mt-3 text-2xl font-black">Sale Complete</h2><p className="mt-1 text-slate-500">{done?.sale_no}</p><div className="my-5 text-4xl font-black text-emerald-800">K{Number(done?.total||0).toFixed(2)}</div><Button className="h-14 w-full bg-emerald-800 text-lg font-black" onClick={()=>setDone(null)}>NEW SALE</Button></div></DialogContent></Dialog>
  </div>;
}
