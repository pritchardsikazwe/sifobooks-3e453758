import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PackageCheck, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SifoWorkspaceShell } from "@/components/sifo/SifoWorkspaceShell";

export const Route = createFileRoute("/_authenticated/inventory/receive-stock")({
  head: () => ({ meta: [{ title: "Receive Stock — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: ReceiveStockPage,
});

type Item = { id: string; name: string; sku?: string | null; unit?: string | null; cost_price?: number | null; vat_rate?: number | null; tax_category?: string | null };
type Location = { id: string; name: string };
type Supplier = { id: string; name: string };

type Line = { itemId: string; quantity: number; unitCost: number; taxRate: number };

function ReceiveStockPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locationId, setLocationId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierInvoice, setSupplierInvoice] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [taxRate, setTaxRate] = useState(16);
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const [{ data: its }, { data: locs }, { data: sups }] = await Promise.all([
        supabase.from("stock_items").select("id,name,sku,unit,cost_price,vat_rate,tax_category").order("name"),
        supabase.from("inventory_locations").select("id,name").eq("is_active", true).order("is_default", { ascending: false }).order("name"),
        supabase.from("suppliers").select("id,name").order("name"),
      ]);
      setItems((its ?? []) as Item[]);
      setLocations((locs ?? []) as Location[]);
      setSuppliers((sups ?? []) as Supplier[]);
      if (locs?.[0]?.id) setLocationId(locs[0].id);
    })();
  }, []);

  const selectedItem = useMemo(() => items.find(i => i.id === itemId), [items, itemId]);

  const addLine = () => {
    if (!itemId || quantity <= 0 || unitCost < 0) return toast.error("Select an item and enter a valid quantity and cost");
    setLines(prev => [...prev, { itemId, quantity, unitCost, taxRate }]);
    setItemId("");
    setQuantity(1);
    setUnitCost(0);
    setTaxRate(16);
  };

  const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  const submit = async () => {
    if (!locationId) return toast.error("Select the stock location");
    if (!lines.length) return toast.error("Add at least one item");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Not signed in");
    setSaving(true);
    if (import.meta.env.VITE_SIFOBOOKS_BACKEND !== "local") {
      // Online: record one purchase movement per line in a single insert; the
      // database updates on-hand stock and location balances from these.
      const reference = supplierInvoice.trim() || `RCV-${receiptDate}`;
      const { error } = await supabase.from("stock_movements").insert(lines.map(l => ({
        user_id: u.user!.id, item_id: l.itemId, movement_type: "purchase", quantity: l.quantity,
        unit_cost: l.unitCost, total_cost: l.quantity * l.unitCost, reference,
        note: "Stock received", location_id: locationId, transaction_date: receiptDate,
        source_type: "stock_receipt", source_id: supplierId || null, created_by: u.user!.id,
      })) as any);
      setSaving(false);
      if (error) return toast.error(`Stock was not received: ${error.message}`);
      toast.success(`Stock received — ${reference}`);
      setLines([]);
      setSupplierInvoice("");
      return;
    }
    const { data, error } = await supabase.rpc("receive_purchase" as any, {
      _uid: u.user.id,
      _supplier_id: supplierId || null,
      _po_id: null,
      _branch_id: null,
      _warehouse_id: null,
      _location_id: locationId,
      _receipt_date: receiptDate,
      _supplier_invoice_number: supplierInvoice.trim() || null,
      _items: lines,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Stock received — ${data?.receiptNumber ?? data?.receipt_number ?? "receipt posted"}`);
    setLines([]);
    setSupplierInvoice("");
  };

  return (
    <SifoWorkspaceShell
      title="Receive Stock"
      purpose="Add stock received from a supplier or other approved source. Every receipt updates on-hand stock, location balances, costing and the inventory history."
      icon={PackageCheck}
      breadcrumbs={[{ label: "Inventory" }, { label: "Receive Stock" }]}
      actions={<Button variant="save" onClick={submit} disabled={saving}>{saving ? "Posting…" : "Post Receipt"}</Button>}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Receipt details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Stock location *</Label><Select value={locationId} onValueChange={setLocationId}><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger><SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Supplier</Label><Select value={supplierId || "none"} onValueChange={v => setSupplierId(v === "none" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional supplier" /></SelectTrigger><SelectContent><SelectItem value="none">No supplier</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Receipt date</Label><Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Supplier invoice / delivery note</Label><Input value={supplierInvoice} onChange={e => setSupplierInvoice(e.target.value)} placeholder="Optional reference" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Receipt total</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">ZMW {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><p className="mt-1 text-sm text-muted-foreground">{lines.length} line(s)</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Add items</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] items-end">
            <div className="space-y-2"><Label>Item</Label><Select value={itemId} onValueChange={v => { setItemId(v); const i=items.find(x=>x.id===v); if(i){setUnitCost(Number(i.cost_price||0));setTaxRate(Number(i.vat_rate||0));} }}><SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger><SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}{i.sku ? ` · ${i.sku}` : ""}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="0.0001" step="0.0001" value={quantity} onChange={e => setQuantity(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Unit cost</Label><Input type="number" min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>VAT %</Label><Input type="number" min="0" step="0.01" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} /></div>
            <Button type="button" onClick={addLine} disabled={!selectedItem}><Plus className="mr-1 h-4 w-4" />Add</Button>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-left">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Cost</th><th className="p-3 text-right">Total</th><th className="p-3" /></tr></thead>
            <tbody>{lines.map((l, idx) => { const i=items.find(x=>x.id===l.itemId); return <tr key={idx} className="border-t"><td className="p-3">{i?.name ?? l.itemId}</td><td className="p-3 text-right">{l.quantity}</td><td className="p-3 text-right">ZMW {l.unitCost.toFixed(2)}</td><td className="p-3 text-right">ZMW {(l.quantity*l.unitCost).toFixed(2)}</td><td className="p-3 text-right"><Button variant="ghost" size="icon" onClick={()=>setLines(prev=>prev.filter((_,n)=>n!==idx))}><Trash2 className="h-4 w-4" /></Button></td></tr>; })}</tbody></table>
            {!lines.length && <div className="p-8 text-center text-sm text-muted-foreground">No items added yet.</div>}
          </div>
        </CardContent>
      </Card>
    </SifoWorkspaceShell>
  );
}
