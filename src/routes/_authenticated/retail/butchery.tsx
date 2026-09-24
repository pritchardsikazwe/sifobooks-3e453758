import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Beef, Scale, PackageCheck, Printer, RefreshCw, Wifi, WifiOff, Scissors, TrendingUp, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateYield, openWebSerialScale, parseScaleReading, type ScaleReading } from "@/lib/butchery";

export const Route = createFileRoute("/_authenticated/retail/butchery")({
  head: () => ({ meta: [
    { title: "Butchery — SifoBooks Retail" },
    { name: "description", content: "Butchery sales, weighing scale, meat stock and yield control for SifoBooks Retail." },
  ] }),
  component: ButcheryPage,
});

type Product = { id: string; name: string; sku: string | null; category: string | null; sell_price: number; cost_price: number; quantity_on_hand: number };
type ButcheryProduct = { id: string; item_id: string; animal_type: string; cut_name: string | null; grade: string | null; price_per_kg: number; scale_enabled: boolean; label_enabled: boolean };

function ButcheryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [butcheryProducts, setButcheryProducts] = useState<ButcheryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState<ScaleReading>({ weight: 0, stable: false, raw: "", unit: "kg" });
  const [scaleConnected, setScaleConnected] = useState(false);
  const [scaleHandle, setScaleHandle] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState("");
  const [yieldInput, setYieldInput] = useState("100");
  const [yieldSaleable, setYieldSaleable] = useState("90");
  const [yieldWaste, setYieldWaste] = useState("5");
  const [inputCost, setInputCost] = useState("5800");
  const [savingScale, setSavingScale] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: items, error: ie }, { data: bp, error: be }] = await Promise.all([
      supabase.from("stock_items").select("id,name,sku,category,sell_price,cost_price,quantity_on_hand").order("name").limit(1000),
      supabase.from("butchery_products").select("id,item_id,animal_type,cut_name,grade,price_per_kg,scale_enabled,label_enabled").eq("is_active", true),
    ]);
    if (ie) toast.error(ie.message);
    if (be) toast.error(be.message);
    setProducts((items ?? []) as Product[]);
    setButcheryProducts((bp ?? []) as ButcheryProduct[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const mapped = useMemo(() => new Map(butcheryProducts.map(p => [p.item_id, p])), [butcheryProducts]);
  const meatProducts = useMemo(() => products.filter(p => mapped.has(p.id)), [products, mapped]);
  const y = calculateYield(Number(yieldInput), Number(yieldSaleable), Number(yieldWaste));
  const selected = products.find(p => p.id === selectedItem);
  const selectedMeta = selected ? mapped.get(selected.id) : null;
  const price = selectedMeta?.price_per_kg || selected?.sell_price || 0;
  const saleTotal = scale.weight * price;

  const connectScale = async () => {
    try {
      const handle = await openWebSerialScale(reading => setScale(reading), 9600);
      setScaleHandle(handle);
      setScaleConnected(true);
      toast.success("Weighing scale connected");
    } catch (e: any) {
      if (e?.message === "WEB_SERIAL_UNAVAILABLE") toast.error("This Windows browser does not expose Web Serial. Manual weight remains available.");
      else toast.error(e?.message || "Scale connection cancelled");
    }
  };

  const disconnectScale = async () => {
    try { await scaleHandle?.stop?.(); } catch {}
    setScaleHandle(null);
    setScaleConnected(false);
    setScale({ weight: 0, stable: false, raw: "", unit: "kg" });
  };

  const addScaleDevice = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    setSavingScale(true);
    const { error } = await supabase.from("butchery_scale_devices").insert({
      user_id: user.user.id,
      name: "Butchery Counter Scale 01",
      manufacturer: "Generic",
      connection_type: "web_serial",
      baud_rate: 9600,
      unit: "kg",
      decimal_places: 3,
      is_active: true,
    } as any);
    setSavingScale(false);
    if (error) toast.error(error.message); else toast.success("Scale profile saved");
  };

  const mapProduct = async (product: Product) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("butchery_products").upsert({
      user_id: user.user.id,
      item_id: product.id,
      animal_type: /chicken|poultry/i.test(product.name) ? "chicken" : /goat/i.test(product.name) ? "goat" : /pork/i.test(product.name) ? "pork" : "beef",
      cut_name: product.name,
      price_per_kg: Number(product.sell_price || 0),
      min_price_per_kg: 0,
      scale_enabled: true,
      label_enabled: true,
      is_active: true,
    } as any, { onConflict: "user_id,item_id" });
    if (error) toast.error(error.message); else { toast.success(product.name + " added to Butchery"); await load(); }
  };

  const postProcessingBatch = async () => {
    if (!selectedItem) return toast.error("Select the source carcass/primal item");
    if (y.balanceKg < -0.001) return toast.error("Outputs plus waste cannot exceed input weight");
    const outputItemId = meatProducts.find(p => p.id !== selectedItem)?.id;
    if (!outputItemId) return toast.error("Map at least one output cut before posting a batch");
    const outputName = meatProducts.find(p => p.id === outputItemId)?.name || "Processed cut";
    const { data, error } = await supabase.rpc("post_butchery_processing", {
      _source_item_id: selectedItem,
      _input_qty: Number(yieldInput),
      _input_unit: "kg",
      _input_cost: Number(inputCost),
      _waste_qty: Number(yieldWaste),
      _reference: "BUT-" + Date.now(),
      _outputs: [{ item_id: outputItemId, qty: Number(yieldSaleable), unit: "kg", note: outputName }],
    } as any);
    if (error) return toast.error(error.message);
    toast.success(`Processing batch ${data?.reference || ""} posted to inventory`);
    await load();
  };

  const printLabel = () => {
    if (!selected || !scale.weight) return toast.error("Select meat and capture a weight first");
    const label = window.open("", "_blank", "width=420,height=600");
    if (!label) return toast.error("Allow pop-ups to print labels");
    label.document.write(`<html><head><title>SifoBooks Meat Label</title><style>body{font-family:Arial;padding:20px}.box{border:2px solid #111;padding:18px;width:300px}.big{font-size:28px;font-weight:700}.muted{color:#666}</style></head><body><div class="box"><div class="muted">SIFObooks RETAIL</div><h2>${selected.name}</h2><div class="big">${scale.weight.toFixed(3)} KG</div><p>Price/kg: K${price.toFixed(2)}</p><p class="big">K${saleTotal.toFixed(2)}</p><p class="muted">SKU: ${selected.sku || "N/A"}</p><p class="muted">Packed: ${new Date().toLocaleDateString("en-ZM")}</p></div><script>window.print();</script></body></html>`);
    label.document.close();
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/60 p-4 md:p-6">
      <header className="rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 p-5 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-sm font-semibold"><Beef className="h-5 w-5" /> SifoBooks Retail · Butchery</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-black">Butchery Operations Centre</h1>
            <p className="mt-1 max-w-3xl text-sm text-emerald-100/80">Weighted meat sales, cold-room stock, processing yield and barcode-label workflow on the existing SifoBooks Retail engine.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={scaleConnected ? "bg-emerald-400 text-emerald-950" : "bg-white/10 text-white"}>{scaleConnected ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />} {scaleConnected ? "Scale connected" : "Scale offline"}</Badge>
            <Button variant="secondary" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Beef} label="Butchery items" value={String(meatProducts.length)} />
        <Metric icon={Scale} label="Live weight" value={`${scale.weight.toFixed(3)} kg`} />
        <Metric icon={PackageCheck} label="Saleable yield" value={`${y.saleablePercent.toFixed(1)}%`} />
        <Metric icon={TrendingUp} label="Waste" value={`${y.wastePercent.toFixed(1)}%`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-white"><CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-emerald-700" />Weighted Butchery POS</CardTitle></CardHeader>
          <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4">
              <div><Label>Meat product</Label><Select value={selectedItem} onValueChange={setSelectedItem}><SelectTrigger className="mt-1"><SelectValue placeholder="Select cut" /></SelectTrigger><SelectContent>{meatProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name} · K{(mapped.get(p.id)?.price_per_kg || p.sell_price).toFixed(2)}/kg</SelectItem>)}</SelectContent></Select></div>
              <div className="rounded-2xl bg-slate-950 p-6 text-white">
                <div className="text-xs uppercase tracking-widest text-slate-400">Net weight</div>
                <div className="mt-2 text-5xl font-black tabular-nums">{scale.weight.toFixed(3)} <span className="text-2xl text-slate-400">kg</span></div>
                <div className="mt-2 text-xs">{scale.stable ? <span className="text-emerald-300">● Stable reading</span> : <span className="text-amber-300">● Waiting for stable weight</span>}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => void connectScale()} disabled={scaleConnected}><Scale className="mr-2 h-4 w-4" />Connect Scale</Button>
                <Button variant="outline" onClick={() => void disconnectScale()} disabled={!scaleConnected}>Disconnect</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min="0" step="0.001" value={scale.weight || ""} onChange={e => setScale(v => ({ ...v, weight: Number(e.target.value), stable: true, raw: "MANUAL" }))} placeholder="Manual kg" />
                <Button variant="outline" onClick={printLabel}><Printer className="mr-2 h-4 w-4" />Print Label</Button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border bg-emerald-50 p-5"><div className="text-sm text-emerald-900/70">Selected cut</div><div className="mt-1 text-xl font-black text-emerald-950">{selected?.name || "Select meat"}</div><div className="mt-3 text-sm">Price / kg <strong>K{price.toFixed(2)}</strong></div><div className="mt-4 border-t border-emerald-200 pt-4"><div className="text-xs text-emerald-900/70">Line total</div><div className="text-3xl font-black text-emerald-950">K{saleTotal.toFixed(2)}</div></div></div>
              <div className="rounded-2xl border bg-white p-5"><div className="font-semibold">Scale profile</div><div className="mt-3 text-sm text-muted-foreground">Generic USB/COM Web Serial · 9600 baud · KG · 3 decimals</div><Button className="mt-4 w-full" variant="outline" onClick={() => void addScaleDevice()} disabled={savingScale}>Save scale profile</Button></div>
              <div className="rounded-2xl border bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mb-1 h-4 w-4" />The first release supports generic serial readings and manual fallback. Manufacturer-specific protocols should be added only after the physical scale model is tested.</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Scissors className="h-5 w-5 text-emerald-700" />Carcass / Processing Yield</CardTitle></CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-3 gap-2"><Field label="Input kg" value={yieldInput} set={setYieldInput} /><Field label="Saleable kg" value={yieldSaleable} set={setYieldSaleable} /><Field label="Waste kg" value={yieldWaste} set={setYieldWaste} /></div>
            <div className="rounded-xl bg-slate-900 p-4 text-white"><div className="text-xs uppercase text-slate-400">Yield</div><div className="mt-2 text-3xl font-black">{y.saleablePercent.toFixed(1)}%</div><div className="mt-1 text-sm text-slate-300">Balance: {y.balanceKg.toFixed(2)} kg</div></div>
            <div><Label>Purchase / processing cost (ZMW)</Label><Input className="mt-1" value={inputCost} onChange={e => setInputCost(e.target.value)} type="number" min="0" /></div>
            <div className="rounded-xl border p-4"><div className="text-sm text-muted-foreground">Saleable cost / kg</div><div className="text-2xl font-black">K{(Number(inputCost || 0) / Math.max(Number(yieldSaleable || 0), 0.001)).toFixed(2)}</div></div>
            <Button className="w-full" variant="outline" disabled={y.balanceKg < -0.001 || !selectedItem} onClick={() => void postProcessingBatch()}><PackageCheck className="mr-2 h-4 w-4" />Post processing batch</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Butchery Product Master</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> :
          <div className="space-y-4">
            {meatProducts.length === 0 && <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">No butchery products mapped yet. Use <strong>Add to Butchery</strong> below to reuse existing Retail stock items — no second inventory is created.</div>}
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="py-3 text-left">Product</th><th className="text-left">Animal</th><th className="text-left">Cut</th><th className="text-right">Price/kg</th><th className="text-right">Stock</th><th className="text-center">Scale</th><th className="text-center">Label</th></tr></thead><tbody className="divide-y">{meatProducts.map(p => { const m = mapped.get(p.id)!; return <tr key={p.id}><td className="py-3 font-medium">{p.name}</td><td>{m.animal_type}</td><td>{m.cut_name || "—"}</td><td className="text-right">K{(m.price_per_kg || p.sell_price).toFixed(2)}</td><td className="text-right tabular-nums">{Number(p.quantity_on_hand || 0).toFixed(3)} kg</td><td className="text-center">{m.scale_enabled ? "✓" : "—"}</td><td className="text-center">{m.label_enabled ? "✓" : "—"}</td></tr>; })}</tbody></table></div>
            <div className="border-t pt-4">
              <div className="mb-3 text-sm font-semibold">Retail stock items available to add</div>
              <div className="grid gap-2 md:grid-cols-2">{products.filter(p => !mapped.has(p.id)).slice(0, 12).map(p => <div key={p.id} className="flex items-center justify-between rounded-xl border p-3"><div><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">Stock {Number(p.quantity_on_hand || 0).toFixed(3)} · K{Number(p.sell_price || 0).toFixed(2)}</div></div><Button size="sm" variant="outline" onClick={() => void mapProduct(p)}><Plus className="mr-1 h-3 w-3" />Add to Butchery</Button></div>)}</div>
            </div>
          </div>}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-emerald-100 p-3 text-emerald-800"><Icon className="h-5 w-5" /></div><div><div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div></CardContent></Card>;
}
function Field({ label, value, set }: { label: string; value: string; set: (v: string) => void }) {
  return <div><Label className="text-xs">{label}</Label><Input className="mt-1" type="number" min="0" step="0.001" value={value} onChange={e => set(e.target.value)} /></div>;
}
