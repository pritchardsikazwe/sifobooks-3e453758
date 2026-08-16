import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, Fragment } from "react";
import { ArrowLeft, LogOut, Package, Plus, AlertTriangle, ArrowUpRight, ArrowDownRight, Sliders, Trash2, Loader2, Upload, Download, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DTColumn } from "@/components/data-table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppNav } from "@/components/AppNav";
import { ZRA_HS_CODES, findHsCode } from "@/lib/zra-hs-codes";
import { toast } from "sonner";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";

export const Route = createFileRoute("/_authenticated/stock")({
  head: () => ({
    meta: [
      { title: "Stock — SifoBooks" },
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

  // Full-page record editors replace the dashboard while open.
  if (openNew) {
    return (
      <div className="p-4 sm:p-6">
        <NewItemForm onCancel={() => setOpenNew(false)} onCreated={() => { setOpenNew(false); load(); }} />
      </div>
    );
  }
  if (moveFor) {
    return (
      <div className="p-4 sm:p-6">
        <MovementForm item={moveFor} onCancel={() => setMoveFor(null)} onSaved={() => { setMoveFor(null); load(); }} />
      </div>
    );
  }

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
            <Button size="sm" className="h-9" variant="save" onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-1" /> New item</Button>
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
            <GroupedStockTable
              items={filtered}
              locationLabel={businessName || "Main Store"}
              money={money}
              onMove={setMoveFor}
              onDelete={removeItem}
              loading={loading}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function GroupedStockTable({
  items, locationLabel, money, onMove, onDelete, loading,
}: {
  items: Item[]; locationLabel: string; money: (n: number) => string;
  onMove: (i: Item) => void; onDelete: (id: string) => void;
  loading: boolean;
}) {
  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    items.forEach(i => {
      const key = (i.tax_category || "OTHER").toUpperCase();
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(i);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const columns: DTColumn<Item>[] = [
    {
      key: "name", header: "Category / Item", sticky: true,
      cell: i => (
        <div>
          <div className="font-medium">{i.name}</div>
          {i.sku && <div className="text-xs text-muted-foreground">SKU {i.sku}</div>}
        </div>
      ),
    },
    { key: "unit", header: "Order By Unit", cell: i => <span className="text-xs">{i.unit || "unit"}</span> },
    { key: "cost_price", header: "Cost", align: "right", cell: i => money(Number(i.cost_price)) },
    { key: "qty_per_unit", header: "Qty/Unit", align: "right", sortable: false, cell: i => (i.unit ? 1 : "—") },
    { key: "description", header: "Item Size", cell: i => <span className="text-xs">{i.description ?? "—"}</span> },
    { key: "cost_per_item", header: "Cost per Item", align: "right", accessor: i => Number(i.cost_price), cell: i => money(Number(i.cost_price)) },
    { key: "quantity_on_hand", header: "Stock Qty", align: "right", cell: i => <span className="font-medium">{Number(i.quantity_on_hand)}</span> },
    { key: "reorder_level", header: "Reorder Level", align: "right", cell: i => Number(i.reorder_level) || "—" },
    {
      key: "reorder_status", header: "Reorder", align: "center", sortable: false,
      cell: i => {
        const isLow = Number(i.reorder_level) > 0 && Number(i.quantity_on_hand) <= Number(i.reorder_level);
        return (
          <span className={`inline-block rounded px-3 py-1 text-xs font-bold ${isLow ? "bg-amber-500 text-primary-foreground" : "bg-sky-400 text-primary-foreground"}`}>
            {isLow ? "REORDER" : "OK"}
          </span>
        );
      },
    },
    {
      key: "reorder_qty", header: "Item Reorder Qty", align: "right", sortable: false,
      accessor: i => {
        const qty = Number(i.quantity_on_hand);
        const rl = Number(i.reorder_level);
        const isLow = rl > 0 && qty <= rl;
        return isLow ? Math.max(rl * 2 - qty, rl) : 0;
      },
      cell: i => {
        const qty = Number(i.quantity_on_hand);
        const rl = Number(i.reorder_level);
        const isLow = rl > 0 && qty <= rl;
        const reorderQty = isLow ? Math.max(rl * 2 - qty, rl) : 0;
        return <span className="font-medium">{reorderQty || 0}</span>;
      },
    },
    {
      key: "actions", header: "", sortable: false, sticky: true,
      cell: i => (
        <div className="whitespace-nowrap text-right">
          <Button size="sm" variant="ghost" onClick={() => onMove(i)}><Sliders className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" onClick={() => onDelete(i.id)} aria-label="Delete"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground">
        Location: {locationLabel}
      </div>
      <div className="space-y-4 bg-card p-4">
        {groups.length === 0 && !loading && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No stock items yet. Click "New item" to add your first product.
          </div>
        )}
        {(loading ? [["", []]] as [string, Item[]][] : groups).map(([cat, rows]) => (
          <div key={cat || "loading"}>
            {cat && (
              <div className="rounded-t-md bg-amber-100/60 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                {cat}
              </div>
            )}
            <DataTable
              tableId={`stock-items-${cat || "all"}`}
              columns={columns}
              data={rows}
              loading={loading}
              searchPlaceholder={null}
              empty="No items in this category."
              className="rounded-t-none"
              totals={rowsIn => ({
                cost_per_item: money(rowsIn.reduce((s, i) => s + Number(i.cost_price) * Number(i.quantity_on_hand), 0)),
              })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function NewItemForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
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

  const pickHs = (code: string) => {
    setHsCode(code);
    const h = findHsCode(code);
    if (h) { setVatRate(h.vatRate); setTaxCategory(h.category); }
  };

  const submit = async () => {
    if (!name.trim()) return toast.error("Name is required");
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
    onCreated();
  };

  return (
    <SifoFormPage
      module="inventory"
      icon={Package}
      title="Add stock item"
      subtitle="Tracked SKU with ZRA HS code and tax details"
      onCancel={onCancel}
      onSave={submit}
      saving={saving}
      saveLabel="Add item"
    >
      <SifoFormSection title="Item details">
        <SifoField label="Name" required wide><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Portland cement 50kg" /></SifoField>
        <SifoField label="SKU (optional)"><Input value={sku} onChange={e => setSku(e.target.value)} placeholder="CEM-50" /></SifoField>
        <SifoField label="Unit"><Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="each, kg, box…" /></SifoField>
      </SifoFormSection>

      <SifoFormSection title="ZRA HS code & tax">
        <SifoField label="Lookup mode" wide>
          <div className="text-xs">
            <button type="button" onClick={() => setHsMode("list")} className={`rounded px-2 py-0.5 ${hsMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Pick from list</button>
            <button type="button" onClick={() => setHsMode("custom")} className={`ml-1 rounded px-2 py-0.5 ${hsMode === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Custom</button>
          </div>
        </SifoField>
        {hsMode === "list" ? (
          <SifoField label="HS code" wide>
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
          </SifoField>
        ) : (
          <SifoField label="Custom HS code" wide><Input value={customHs} onChange={e => setCustomHs(e.target.value)} placeholder="e.g. 8471.30 or SVC-XXX" /></SifoField>
        )}
        <SifoField label="VAT rate (%)"><Input type="number" min={0} max={100} step="0.5" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} /></SifoField>
        <SifoField label="Tax category">
          <Select value={taxCategory} onValueChange={v => setTaxCategory(v as "standard" | "zero" | "exempt")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard-rated</SelectItem>
              <SelectItem value="zero">Zero-rated</SelectItem>
              <SelectItem value="exempt">Exempt</SelectItem>
            </SelectContent>
          </Select>
        </SifoField>
      </SifoFormSection>

      <SifoFormSection title="Pricing & stock">
        <SifoField label="Cost price"><Input type="number" min={0} step="0.01" value={cost} onChange={e => setCost(Number(e.target.value))} /></SifoField>
        <SifoField label="Sell price"><Input type="number" min={0} step="0.01" value={price} onChange={e => setPrice(Number(e.target.value))} /></SifoField>
        <SifoField label="Opening quantity"><Input type="number" min={0} step="1" value={qty} onChange={e => setQty(Number(e.target.value))} /></SifoField>
        <SifoField label="Reorder level"><Input type="number" min={0} step="1" value={reorder} onChange={e => setReorder(Number(e.target.value))} /></SifoField>
      </SifoFormSection>
    </SifoFormPage>
  );
}

function MovementForm({ item, onCancel, onSaved }: { item: Item; onCancel: () => void; onSaved: () => void }) {
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
    onSaved();
  };

  return (
    <SifoFormPage
      module="inventory"
      icon={Sliders}
      title={`Stock movement — ${item.name}`}
      subtitle={`Current on hand: ${Number(item.quantity_on_hand)} ${item.unit}`}
      onCancel={onCancel}
      onSave={submit}
      saving={saving}
      saveLabel="Save movement"
    >
      <SifoFormSection title="Movement">
        <SifoField label="Movement type" wide>
          <Select value={type} onValueChange={v => setType(v as "in" | "out" | "adjust")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in"><ArrowUpRight className="h-3 w-3" /> Receive (in)</SelectItem>
              <SelectItem value="out"><ArrowDownRight className="h-3 w-3" /> Issue (out)</SelectItem>
              <SelectItem value="adjust"><Sliders className="h-3 w-3" /> Adjust to exact quantity</SelectItem>
            </SelectContent>
          </Select>
        </SifoField>
        <SifoField label={type === "adjust" ? "New quantity" : "Quantity"}><Input type="number" min={0} step="1" value={qty} onChange={e => setQty(Number(e.target.value))} /></SifoField>
        <SifoField label="Note (optional)" wide><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason, reference, supplier…" /></SifoField>
      </SifoFormSection>
    </SifoFormPage>
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
    a.href = url; a.download = "sifobooks-stock-template.csv"; a.click();
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
      <DialogTrigger asChild><Button variant="outline" size="sm" className="h-9"><Upload className="h-4 w-4" /> Import CSV</Button></DialogTrigger>
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
          <Button variant="save" onClick={doImport} disabled={importing || validRows.length === 0}>
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {validRows.length > 0 ? `${validRows.length} item${validRows.length > 1 ? "s" : ""}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
