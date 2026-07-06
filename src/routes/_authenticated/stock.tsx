import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LogOut, Package, Plus, AlertTriangle, ArrowUpRight, ArrowDownRight, Sliders, Trash2, Loader2, Upload, Download, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppNav } from "@/components/AppNav";
import { ZRA_HS_CODES, findHsCode } from "@/lib/zra-hs-codes";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stock")({
  head: () => ({
    meta: [
      { title: "Stock — Kopelacode" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StockPage,
});

type Item = {
  id: string; name: string; sku: string | null; description: string | null;
  hs_code: string | null; tax_category: string; vat_rate: number;
  unit: string; cost_price: number; sell_price: number;
  quantity_on_hand: number; reorder_level: number;
};

function StockPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("USD");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [moveFor, setMoveFor] = useState<Item | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("stock_items").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data } = await supabase.from("profiles").select("currency, business_name").eq("id", u.user.id).maybeSingle();
      if (data?.currency) setCurrency(data.currency);
      if (data?.business_name) setBusinessName(data.business_name);
      await load();
    })();
  }, []);

  const money = (n: number) => `${currency} ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const filtered = items.filter(i => !q || i.name.toLowerCase().includes(q.toLowerCase()) || (i.sku ?? "").toLowerCase().includes(q.toLowerCase()));
  const low = items.filter(i => i.reorder_level > 0 && Number(i.quantity_on_hand) <= Number(i.reorder_level));
  const stockValue = useMemo(() => items.reduce((s, i) => s + Number(i.cost_price) * Number(i.quantity_on_hand), 0), [items]);

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("stock_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success("Item deleted");
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                {businessName || "Stock"}
              </h1>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AppNav />
            <NewItemDialog open={openNew} setOpen={setOpenNew} onCreated={load} />
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="p-5">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Items</span><Package className="h-4 w-4 text-primary" /></div>
            <div className="mt-3 text-2xl font-semibold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{items.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">Tracked SKUs</div>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Stock value (at cost)</span><ArrowUpRight className="h-4 w-4 text-emerald-600" /></div>
            <div className="mt-3 text-2xl font-semibold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{money(stockValue)}</div>
            <div className="mt-1 text-xs text-muted-foreground">On-hand × cost price</div>
          </CardContent></Card>
          <Card className={low.length ? "border-amber-300 bg-amber-50/40" : ""}><CardContent className="p-5">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Low stock</span><AlertTriangle className={`h-4 w-4 ${low.length ? "text-amber-700" : "text-muted-foreground"}`} /></div>
            <div className="mt-3 text-2xl font-semibold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{low.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">{low.length ? low.slice(0, 3).map(i => i.name).join(", ") + (low.length > 3 ? "…" : "") : "All items above reorder level"}</div>
          </CardContent></Card>
        </div>

        <Card className="mt-8">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4" /> Items</CardTitle>
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or SKU…" className="sm:w-72" />
          </CardHeader>
          <CardContent className="px-0">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No stock items yet. Click "New item" to add your first product.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Item</TableHead>
                    <TableHead>HS code</TableHead>
                    <TableHead>VAT</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="w-40"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(i => {
                    const isLow = i.reorder_level > 0 && Number(i.quantity_on_hand) <= Number(i.reorder_level);
                    return (
                      <TableRow key={i.id} className={isLow ? "bg-amber-50/40" : ""}>
                        <TableCell className="pl-6">
                          <div className="font-medium">{i.name}</div>
                          <div className="text-xs text-muted-foreground">{i.sku ? `SKU ${i.sku} · ` : ""}{i.unit}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {i.hs_code ? (<><div className="font-mono">{i.hs_code}</div><div className="text-muted-foreground">{findHsCode(i.hs_code)?.label ?? "custom"}</div></>) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{i.vat_rate}% {i.tax_category}</Badge></TableCell>
                        <TableCell className="text-right">{money(Number(i.cost_price))}</TableCell>
                        <TableCell className="text-right">{money(Number(i.sell_price))}</TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">{Number(i.quantity_on_hand)}</div>
                          {isLow && <div className="text-xs text-amber-700">≤ reorder {Number(i.reorder_level)}</div>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setMoveFor(i)}><Sliders className="h-3 w-3" /> Move</Button>
                          <Button size="icon" variant="ghost" onClick={() => removeItem(i.id)} aria-label="Delete"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {moveFor && <MovementDialog item={moveFor} onClose={() => setMoveFor(null)} onSaved={load} />}
    </div>
  );
}

function NewItemDialog({ open, setOpen, onCreated }: { open: boolean; setOpen: (v: boolean) => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [hsMode, setHsMode] = useState<"list" | "custom">("list");
  const [hsCode, setHsCode] = useState<string>("");
  const [customHs, setCustomHs] = useState<string>("");
  const [vatRate, setVatRate] = useState<number>(16);
  const [taxCategory, setTaxCategory] = useState<"standard" | "zero" | "exempt">("standard");
  const [unit, setUnit] = useState("each");
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [qty, setQty] = useState(0);
  const [reorder, setReorder] = useState(0);
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(""); setSku(""); setHsMode("list"); setHsCode(""); setCustomHs(""); setVatRate(16); setTaxCategory("standard"); setUnit("each"); setCost(0); setPrice(0); setQty(0); setReorder(0); };

  const pickHs = (code: string) => {
    setHsCode(code);
    const h = findHsCode(code);
    if (h) { setVatRate(h.vatRate); setTaxCategory(h.category); }
  };

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return toast.error("Not signed in"); }
    const finalHs = hsMode === "list" ? (hsCode || null) : (customHs.trim() || null);
    const { error } = await supabase.from("stock_items").insert({
      user_id: u.user.id, name: name.trim(), sku: sku.trim() || null,
      hs_code: finalHs, tax_category: taxCategory, vat_rate: vatRate,
      unit, cost_price: cost, sell_price: price, quantity_on_hand: qty, reorder_level: reorder,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Item added");
    reset(); setOpen(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New item</Button></DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add stock item</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Portland cement 50kg" /></div>
          <div className="space-y-2"><Label>SKU (optional)</Label><Input value={sku} onChange={e => setSku(e.target.value)} placeholder="CEM-50" /></div>
          <div className="space-y-2"><Label>Unit</Label><Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="each, kg, box…" /></div>

          <div className="space-y-2 sm:col-span-2 rounded-lg border bg-emerald-50/40 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">ZRA HS code & tax</Label>
              <div className="text-xs">
                <button type="button" onClick={() => setHsMode("list")} className={`rounded px-2 py-0.5 ${hsMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Pick from list</button>
                <button type="button" onClick={() => setHsMode("custom")} className={`ml-1 rounded px-2 py-0.5 ${hsMode === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Custom</button>
              </div>
            </div>
            {hsMode === "list" ? (
              <Select value={hsCode} onValueChange={pickHs}>
                <SelectTrigger><SelectValue placeholder="Select an HS code…" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {ZRA_HS_CODES.map(h => (
                    <SelectItem key={h.code} value={h.code}>
                      <span className="font-mono text-xs">{h.code}</span> — {h.label} <span className="text-muted-foreground">({h.vatRate}%)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={customHs} onChange={e => setCustomHs(e.target.value)} placeholder="e.g. 8471.30 or SVC-XXX" />
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1"><Label className="text-xs">VAT rate (%)</Label><Input type="number" min={0} max={100} step="0.5" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} /></div>
              <div className="space-y-1"><Label className="text-xs">Tax category</Label>
                <Select value={taxCategory} onValueChange={v => setTaxCategory(v as "standard" | "zero" | "exempt")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard-rated</SelectItem>
                    <SelectItem value="zero">Zero-rated</SelectItem>
                    <SelectItem value="exempt">Exempt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2"><Label>Cost price</Label><Input type="number" min={0} step="0.01" value={cost} onChange={e => setCost(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Sell price</Label><Input type="number" min={0} step="0.01" value={price} onChange={e => setPrice(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Opening quantity</Label><Input type="number" min={0} step="1" value={qty} onChange={e => setQty(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Reorder level</Label><Input type="number" min={0} step="1" value={reorder} onChange={e => setReorder(Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !name.trim()}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Add item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({ item, onClose, onSaved }: { item: Item; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<"in" | "out" | "adjust">("in");
  const [qty, setQty] = useState<number>(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (qty < 0) return toast.error("Quantity must be ≥ 0");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return toast.error("Not signed in"); }
    const { error } = await supabase.from("stock_movements").insert({
      user_id: u.user.id, item_id: item.id, movement_type: type, quantity: qty, note: note || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(type === "adjust" ? "Stock adjusted" : type === "in" ? "Stock added" : "Stock removed");
    onSaved(); onClose();
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Stock movement — {item.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">Current on hand: <span className="font-semibold text-foreground">{Number(item.quantity_on_hand)} {item.unit}</span></div>
          <div className="space-y-2">
            <Label>Movement type</Label>
            <Select value={type} onValueChange={v => setType(v as "in" | "out" | "adjust")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in"><ArrowUpRight className="h-3 w-3" /> Receive (in)</SelectItem>
                <SelectItem value="out"><ArrowDownRight className="h-3 w-3" /> Issue (out)</SelectItem>
                <SelectItem value="adjust"><Sliders className="h-3 w-3" /> Adjust to exact quantity</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>{type === "adjust" ? "New quantity" : "Quantity"}</Label><Input type="number" min={0} step="1" value={qty} onChange={e => setQty(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Note (optional)</Label><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason, reference, supplier…" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save movement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
