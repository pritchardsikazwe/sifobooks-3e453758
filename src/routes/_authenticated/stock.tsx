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
  const [openImport, setOpenImport] = useState(false);
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
            <ImportCsvDialog open={openImport} setOpen={setOpenImport} onImported={load} />
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

// ---------- CSV bulk import ----------
type ParsedRow = {
  name: string; sku: string | null; hs_code: string | null;
  tax_category: "standard" | "zero" | "exempt"; vat_rate: number;
  unit: string; cost_price: number; sell_price: number;
  quantity_on_hand: number; reorder_level: number;
  _errors: string[];
};

const CSV_HEADERS = ["name","sku","hs_code","tax_category","vat_rate","unit","cost_price","sell_price","quantity_on_hand","reorder_level"];
const SAMPLE_CSV = `${CSV_HEADERS.join(",")}
Portland cement 50kg,CEM-50,2523.29,standard,16,bag,180,225,120,20
Mealie meal 25kg,MM-25,1101.00,zero,0,bag,140,175,80,15
Laptop - Dell Latitude,LAP-DL,8471.30,standard,16,each,14500,17900,6,2
Consulting hours,SVC-PRO,SVC-PRO,standard,16,hour,0,850,0,0`;

function parseCsv(text: string): ParsedRow[] {
  const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const splitLine = (l: string): string[] => {
    const out: string[] = []; let cur = ""; let inQ = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"') { if (inQ && l[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
      else if (c === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };
  const header = splitLine(lines[0]).map(h => h.toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const errs: string[] = [];
    const get = (k: string) => (idx(k) >= 0 ? cols[idx(k)] ?? "" : "");
    const num = (k: string, def = 0) => {
      const v = get(k);
      if (v === "" || v == null) return def;
      const n = Number(v);
      if (Number.isNaN(n)) { errs.push(`${k} not a number`); return def; }
      return n;
    };
    const name = get("name");
    if (!name) errs.push("name required");
    const taxRaw = (get("tax_category") || "standard").toLowerCase();
    const tax = (["standard","zero","exempt"] as const).includes(taxRaw as any) ? (taxRaw as "standard"|"zero"|"exempt") : "standard";
    if (get("tax_category") && tax !== taxRaw) errs.push("tax_category must be standard|zero|exempt");
    rows.push({
      name, sku: get("sku") || null, hs_code: get("hs_code") || null,
      tax_category: tax, vat_rate: num("vat_rate", 16),
      unit: get("unit") || "each",
      cost_price: num("cost_price"), sell_price: num("sell_price"),
      quantity_on_hand: num("quantity_on_hand"), reorder_level: num("reorder_level"),
      _errors: errs,
    });
  }
  return rows;
}

function ImportCsvDialog({ open, setOpen, onImported }: { open: boolean; setOpen: (v: boolean) => void; onImported: () => void }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);

  const reset = () => { setRows([]); setFileName(""); };

  const onFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    if (parsed.length === 0) toast.error("No rows found in the CSV.");
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "kopelacode-stock-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = rows.filter(r => r._errors.length === 0);
  const invalidRows = rows.length - validRows.length;

  const doImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setImporting(false); return toast.error("Not signed in"); }
    const payload = validRows.map(r => ({
      user_id: u.user!.id,
      name: r.name, sku: r.sku, hs_code: r.hs_code,
      tax_category: r.tax_category, vat_rate: r.vat_rate, unit: r.unit,
      cost_price: r.cost_price, sell_price: r.sell_price,
      quantity_on_hand: r.quantity_on_hand, reorder_level: r.reorder_level,
    }));
    const { error } = await supabase.from("stock_items").insert(payload);
    setImporting(false);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${validRows.length} item${validRows.length > 1 ? "s" : ""}`);
    reset(); setOpen(false); onImported();
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild><Button variant="outline"><Upload className="h-4 w-4" /> Import CSV</Button></DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Bulk import stock items</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="font-medium">Expected columns</div>
            <div className="mt-1 font-mono text-xs text-muted-foreground break-all">{CSV_HEADERS.join(", ")}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span><b>tax_category</b>: standard · zero · exempt</span>
              <span>·</span>
              <span><b>vat_rate</b>: 0–100 (percent)</span>
              <span>·</span>
              <span><b>hs_code</b>: e.g. 2523.29 or SVC-PRO</span>
            </div>
            <Button variant="link" size="sm" className="mt-1 h-auto p-0" onClick={downloadTemplate}>
              <Download className="h-3 w-3" /> Download CSV template
            </Button>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:bg-muted/40">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="text-sm font-medium">{fileName || "Click to choose a .csv file"}</div>
            <div className="text-xs text-muted-foreground">First row must be the header</div>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          </label>

          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div>
                  Parsed <b>{rows.length}</b> row{rows.length > 1 ? "s" : ""} — <span className="text-emerald-700">{validRows.length} ready</span>
                  {invalidRows > 0 && <span className="text-destructive"> · {invalidRows} with errors</span>}
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Name</TableHead>
                      <TableHead>HS</TableHead>
                      <TableHead>VAT</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i} className={r._errors.length ? "bg-red-50/50" : ""}>
                        <TableCell className="pl-4">
                          <div className="font-medium">{r.name || <em className="text-muted-foreground">—</em>}</div>
                          <div className="text-xs text-muted-foreground">{r.sku ?? ""}{r.sku ? " · " : ""}{r.unit}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.hs_code ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.vat_rate}% {r.tax_category}</TableCell>
                        <TableCell className="text-right text-xs">{r.sell_price}</TableCell>
                        <TableCell className="text-right text-xs">{r.quantity_on_hand}</TableCell>
                        <TableCell>
                          {r._errors.length === 0
                            ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">Ready</Badge>
                            : <span className="text-xs text-destructive">{r._errors.join(", ")}</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={doImport} disabled={importing || validRows.length === 0}>
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {validRows.length > 0 ? `${validRows.length} item${validRows.length > 1 ? "s" : ""}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
