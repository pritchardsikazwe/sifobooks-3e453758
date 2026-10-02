import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SifoWorkspaceShell } from "@/components/sifo/SifoWorkspaceShell";

export const Route = createFileRoute("/_authenticated/inventory/opening-stock")({
  head: () => ({ meta: [{ title: "Opening Stock — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: OpeningStockPage,
});

type Item = { id: string; name: string; unit?: string | null; cost_price?: number | null };
type Location = { id: string; name: string };

function OpeningStockPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const [{ data: its }, { data: locs }] = await Promise.all([
        supabase.from("stock_items").select("id,name,unit,cost_price").order("name"),
        supabase.from("inventory_locations").select("id,name").eq("is_active", true).order("is_default", { ascending: false }).order("name"),
      ]);
      setItems((its ?? []) as Item[]);
      setLocations((locs ?? []) as Location[]);
      if (locs?.[0]?.id) setLocationId(locs[0].id);
    })();
  }, []);

  const submit = async () => {
    if (!itemId || !locationId || quantity <= 0 || unitCost < 0) return toast.error("Select an item, location, quantity and valid cost");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Not signed in");
    setSaving(true);
    const payload = {
      _uid: u.user.id, _company_id: null, _branch_id: null, _location_id: locationId,
      _warehouse_id: null, _opening_date: openingDate, _reference: reference.trim() || null,
      _items: [{ itemId, quantity, unitCost }],
    };
    const { data, error } = await supabase.rpc("post_opening_stock" as any, payload as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Opening stock posted — ${data?.reference ?? reference || "posted"}`);
    setQuantity(0);
    setReference("");
  };

  return (
    <SifoWorkspaceShell
      title="Opening Stock"
      purpose="Enter the stock already on hand when a company, warehouse or store starts using SifoBooks. This is an inventory opening transaction, not a sale or purchase."
      icon={ClipboardPlus}
      breadcrumbs={[{ label: "Inventory" }, { label: "Opening Stock" }]}
      actions={<Button variant="save" onClick={submit} disabled={saving}>{saving ? "Posting…" : "Post Opening Stock"}</Button>}
    >
      <Card className="max-w-3xl">
        <CardHeader><CardTitle>Opening quantity</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Item *</Label><Select value={itemId} onValueChange={v => { setItemId(v); const i=items.find(x=>x.id===v); if(i) setUnitCost(Number(i.cost_price||0)); }}><SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger><SelectContent>{items.map(i=><SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Stock location *</Label><Select value={locationId} onValueChange={setLocationId}><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger><SelectContent>{locations.map(l=><SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Quantity *</Label><Input type="number" min="0" step="0.0001" value={quantity} onChange={e=>setQuantity(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Unit cost *</Label><Input type="number" min="0" step="0.01" value={unitCost} onChange={e=>setUnitCost(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Opening date</Label><Input type="date" value={openingDate} onChange={e=>setOpeningDate(e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Reference / note</Label><Input value={reference} onChange={e=>setReference(e.target.value)} placeholder="e.g. Initial stock count" /></div>
          <div className="sm:col-span-2 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            Use <strong>Receive Stock</strong> for new deliveries. Use <strong>Opening Stock</strong> only for stock that already existed before the opening date.
          </div>
        </CardContent>
      </Card>
    </SifoWorkspaceShell>
  );
}
