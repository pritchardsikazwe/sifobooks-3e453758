import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, Package, Calendar, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fixed-assets")({
  head: () => ({
    meta: [
      { title: "Fixed Assets Register" },
      { name: "description", content: "Fixed assets register with monthly straight-line depreciation posting to the GL." },
    ],
  }),
  component: FixedAssetsPage,
});

type Asset = {
  id: string;
  asset_number: string;
  description: string;
  category: string | null;
  purchase_date: string;
  supplier: string | null;
  cost: number;
  salvage_value: number;
  useful_life_years: number;
  method: string;
  location: string | null;
  condition: string | null;
  status: string;
  accumulated_depreciation: number;
  book_value: number;
};

const fmt = (n: number) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function FixedAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [depOpen, setDepOpen] = useState(false);
  const [depYear, setDepYear] = useState(new Date().getFullYear());
  const [depMonth, setDepMonth] = useState(new Date().getMonth() + 1);
  const [saving, setSaving] = useState(false);

  const [f, setF] = useState({
    asset_number: "", description: "", category: "Equipment",
    purchase_date: new Date().toISOString().slice(0, 10),
    supplier: "", cost: "0", salvage_value: "0", useful_life_years: "5",
    location: "", condition: "good", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("fixed_assets").select("*").order("purchase_date", { ascending: false });
    setAssets((data as Asset[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); return; }
    if (!f.asset_number || !f.description) { toast.error("Asset # and description required"); return; }
    setSaving(true);
    const { error } = await supabase.from("fixed_assets").insert({
      user_id: u.user.id,
      asset_number: f.asset_number, description: f.description, category: f.category || null,
      purchase_date: f.purchase_date, supplier: f.supplier || null,
      cost: Number(f.cost) || 0, salvage_value: Number(f.salvage_value) || 0,
      useful_life_years: Number(f.useful_life_years) || 5,
      location: f.location || null, condition: f.condition,
      notes: f.notes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Asset added");
    setOpen(false);
    setF({ ...f, asset_number: "", description: "", supplier: "", cost: "0", notes: "" });
    load();
  };

  const runDep = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc("post_depreciation", { _year: depYear, _month: depMonth });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const res = data as { assets_posted: number; total_depreciation: number };
    toast.success(`Posted ${res.assets_posted} asset(s), total ${fmt(res.total_depreciation)}`);
    setDepOpen(false);
    load();
  };

  const totals = {
    cost: assets.reduce((s, a) => s + Number(a.cost || 0), 0),
    acc: assets.reduce((s, a) => s + Number(a.accumulated_depreciation || 0), 0),
    bv: assets.reduce((s, a) => s + Number(a.book_value || 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" /> Fixed Assets Register</h1>
          <p className="text-sm text-muted-foreground">Track assets and post monthly straight-line depreciation to the GL.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDepOpen(true)}><Calendar className="h-4 w-4 mr-1" /> Post Depreciation</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Asset</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Total Cost</div><div className="text-xl font-bold">{fmt(totals.cost)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Accumulated Depreciation</div><div className="text-xl font-bold text-rose-600">{fmt(totals.acc)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Net Book Value</div><div className="text-xl font-bold text-emerald-600">{fmt(totals.bv)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Assets ({assets.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Purchased</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Life (yrs)</TableHead>
                  <TableHead className="text-right">Acc. Dep.</TableHead>
                  <TableHead className="text-right">Book Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No assets yet.</TableCell></TableRow>}
                {assets.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.asset_number}</TableCell>
                    <TableCell>{a.description}</TableCell>
                    <TableCell>{a.category}</TableCell>
                    <TableCell>{a.purchase_date}</TableCell>
                    <TableCell>{a.location}</TableCell>
                    <TableCell className="text-right">{fmt(a.cost)}</TableCell>
                    <TableCell className="text-right">{a.useful_life_years}</TableCell>
                    <TableCell className="text-right text-rose-600">{fmt(a.accumulated_depreciation)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(a.book_value)}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Fixed Asset</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Asset # *</Label><Input value={f.asset_number} onChange={e => setF({ ...f, asset_number: e.target.value })} placeholder="FA-001" /></div>
            <div><Label>Category</Label>
              <Select value={f.category} onValueChange={v => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vehicle">Vehicle</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Furniture">Furniture & Fittings</SelectItem>
                  <SelectItem value="Computer">Computer & IT</SelectItem>
                  <SelectItem value="Building">Building</SelectItem>
                  <SelectItem value="Land">Land</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Description *</Label><Input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
            <div><Label>Purchase Date</Label><Input type="date" value={f.purchase_date} onChange={e => setF({ ...f, purchase_date: e.target.value })} /></div>
            <div><Label>Supplier</Label><Input value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} /></div>
            <div><Label>Cost</Label><Input type="number" step="0.01" value={f.cost} onChange={e => setF({ ...f, cost: e.target.value })} /></div>
            <div><Label>Salvage Value</Label><Input type="number" step="0.01" value={f.salvage_value} onChange={e => setF({ ...f, salvage_value: e.target.value })} /></div>
            <div><Label>Useful Life (years)</Label><Input type="number" step="0.5" value={f.useful_life_years} onChange={e => setF({ ...f, useful_life_years: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} /></div>
            <div><Label>Condition</Label>
              <Select value={f.condition} onValueChange={v => setF({ ...f, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={depOpen} onOpenChange={setDepOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post Monthly Depreciation</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Posts straight-line depreciation for all active assets and creates journal entries dated the last day of the selected month.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Year</Label><Input type="number" value={depYear} onChange={e => setDepYear(Number(e.target.value))} /></div>
            <div><Label>Month</Label>
              <Select value={String(depMonth)} onValueChange={v => setDepMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <SelectItem key={m} value={String(m)}>{new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepOpen(false)}>Cancel</Button>
            <Button onClick={runDep} disabled={saving}><RefreshCw className="h-4 w-4 mr-1" /> Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
