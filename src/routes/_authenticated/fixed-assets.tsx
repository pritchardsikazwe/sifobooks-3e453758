import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, Package, Calendar, RefreshCw, ArrowRightLeft, Trash2, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fixed-assets")({
  head: () => ({
    meta: [
      { title: "Fixed Assets Register" },
      { name: "description", content: "Fixed assets register with categories, transfers, disposals and monthly depreciation." },
    ],
  }),
  component: FixedAssetsPage,
});

type Asset = {
  id: string; asset_number: string; description: string; category: string | null;
  purchase_date: string; supplier: string | null; cost: number; salvage_value: number;
  useful_life_years: number; method: string; location: string | null; condition: string | null;
  status: string; accumulated_depreciation: number; book_value: number;
};
type Category = { id: string; code: string; name: string; useful_life_years: number; depreciation_method: string; depreciation_rate: number | null; capitalisation_threshold: number | null; is_active: boolean };
type Transfer = { id: string; asset_id: string; transfer_date: string; from_location: string | null; to_location: string | null; from_custodian: string | null; to_custodian: string | null; reason: string | null };
type Disposal = { id: string; asset_id: string; disposal_date: string; disposal_method: string; proceeds: number; buyer: string | null; reason: string | null; gain_loss: number | null; journal_entry_id: string | null };

const fmt = (n: number) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Mode = "asset" | "category" | "transfer" | "disposal" | "depreciation" | null;

function FixedAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [disposals, setDisposals] = useState<Disposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>(null);
  const [depYear, setDepYear] = useState(new Date().getFullYear());
  const [depMonth, setDepMonth] = useState(new Date().getMonth() + 1);
  const [saving, setSaving] = useState(false);

  const [f, setF] = useState({ asset_number: "", description: "", category: "Equipment", purchase_date: new Date().toISOString().slice(0, 10), supplier: "", cost: "0", salvage_value: "0", useful_life_years: "5", location: "", condition: "good", notes: "" });
  const [cf, setCf] = useState({ code: "", name: "", useful_life_years: "5", depreciation_method: "straight_line", depreciation_rate: "", capitalisation_threshold: "" });
  const [tf, setTf] = useState({ asset_id: "", transfer_date: new Date().toISOString().slice(0, 10), to_location: "", to_custodian: "", to_department: "", reason: "" });
  const [df, setDf] = useState({ asset_id: "", disposal_date: new Date().toISOString().slice(0, 10), disposal_method: "sale", proceeds: "0", buyer: "", reason: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [a, c, t, d] = await Promise.all([
      supabase.from("fixed_assets").select("*").order("purchase_date", { ascending: false }),
      supabase.from("asset_categories").select("*").order("code"),
      supabase.from("asset_transfers").select("*").order("transfer_date", { ascending: false }),
      supabase.from("asset_disposals").select("*").order("disposal_date", { ascending: false }),
    ]);
    setAssets((a.data as Asset[]) || []);
    setCats((c.data as Category[]) || []);
    setTransfers((t.data as Transfer[]) || []);
    setDisposals((d.data as Disposal[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); return; }
    if (!f.asset_number || !f.description) { toast.error("Asset # and description required"); return; }
    setSaving(true);
    const { error } = await supabase.from("fixed_assets").insert({
      user_id: u.user.id, asset_number: f.asset_number, description: f.description, category: f.category || null,
      purchase_date: f.purchase_date, supplier: f.supplier || null,
      cost: Number(f.cost) || 0, salvage_value: Number(f.salvage_value) || 0,
      useful_life_years: Number(f.useful_life_years) || 5,
      location: f.location || null, condition: f.condition, notes: f.notes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Asset added"); setMode(null);
    setF({ ...f, asset_number: "", description: "", supplier: "", cost: "0", notes: "" });
    load();
  };

  const saveCat = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (!cf.code || !cf.name) { toast.error("Code and name required"); return; }
    setSaving(true);
    const { error } = await supabase.from("asset_categories").insert({
      user_id: u.user.id, code: cf.code, name: cf.name,
      useful_life_years: Number(cf.useful_life_years) || 5,
      depreciation_method: cf.depreciation_method,
      depreciation_rate: cf.depreciation_rate ? Number(cf.depreciation_rate) : undefined,
      capitalisation_threshold: cf.capitalisation_threshold ? Number(cf.capitalisation_threshold) : undefined,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Category added"); setMode(null);
    setCf({ code: "", name: "", useful_life_years: "5", depreciation_method: "straight_line", depreciation_rate: "", capitalisation_threshold: "" });
    load();
  };

  const saveTransfer = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (!tf.asset_id) { toast.error("Pick an asset"); return; }
    const a = assets.find(x => x.id === tf.asset_id);
    setSaving(true);
    const { error } = await supabase.from("asset_transfers").insert({
      user_id: u.user.id, asset_id: tf.asset_id, transfer_date: tf.transfer_date,
      from_location: a?.location || null, to_location: tf.to_location || null,
      to_custodian: tf.to_custodian || null, to_department: tf.to_department || null, reason: tf.reason || null,
    });
    if (!error && tf.to_location) {
      await supabase.from("fixed_assets").update({ location: tf.to_location }).eq("id", tf.asset_id);
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Transfer recorded"); setMode(null);
    setTf({ asset_id: "", transfer_date: new Date().toISOString().slice(0, 10), to_location: "", to_custodian: "", to_department: "", reason: "" });
    load();
  };

  const saveDisposal = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (!df.asset_id) { toast.error("Pick an asset"); return; }
    setSaving(true);
    const { data: disp, error } = await supabase.from("asset_disposals").insert({
      user_id: u.user.id, asset_id: df.asset_id, disposal_date: df.disposal_date,
      disposal_method: df.disposal_method, proceeds: Number(df.proceeds) || 0,
      buyer: df.buyer || null, reason: df.reason || null,
    }).select().single();
    if (error) { setSaving(false); toast.error(error.message); return; }
    const { error: perr } = await supabase.rpc("post_asset_disposal", { _disposal_id: disp.id });
    setSaving(false);
    if (perr) { toast.error(perr.message); return; }
    toast.success("Disposal posted to GL"); setMode(null);
    setDf({ asset_id: "", disposal_date: new Date().toISOString().slice(0, 10), disposal_method: "sale", proceeds: "0", buyer: "", reason: "" });
    load();
  };

  const runDep = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc("post_depreciation", { _year: depYear, _month: depMonth });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const res = data as { assets_posted: number; total_depreciation: number };
    toast.success(`Posted ${res.assets_posted} asset(s), total ${fmt(res.total_depreciation)}`);
    setMode(null); load();
  };

  const totals = {
    cost: assets.reduce((s, a) => s + Number(a.cost || 0), 0),
    acc: assets.reduce((s, a) => s + Number(a.accumulated_depreciation || 0), 0),
    bv: assets.reduce((s, a) => s + Number(a.book_value || 0), 0),
  };

  // Depreciation schedule = for each active asset, annual dep = (cost - salvage) / life
  const schedule = assets.filter(a => a.status === "active").map(a => {
    const dep = a.useful_life_years > 0 ? (Number(a.cost) - Number(a.salvage_value)) / a.useful_life_years : 0;
    return { ...a, annual_dep: dep, monthly_dep: dep / 12 };
  });

  const assetName = (id: string) => assets.find(x => x.id === id)?.description || id.slice(0, 8);

  if (mode === "asset") {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage module="accounting" icon={Package} title="New Fixed Asset" subtitle="Register a new capitalised asset."
          onCancel={() => setMode(null)} onSave={save} saving={saving} saveLabel="Save asset">
          <SifoFormSection title="Details">
            <SifoField label="Asset #" required><Input value={f.asset_number} onChange={e => setF({ ...f, asset_number: e.target.value })} placeholder="FA-001" /></SifoField>
            <SifoField label="Category">
              <Select value={f.category} onValueChange={v => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cats.length > 0 ? cats.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>) : (<>
                    <SelectItem value="Vehicle">Vehicle</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Furniture">Furniture & Fittings</SelectItem>
                    <SelectItem value="Computer">Computer & IT</SelectItem>
                    <SelectItem value="Building">Building</SelectItem>
                    <SelectItem value="Land">Land</SelectItem>
                  </>)}
                </SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Description" required wide><Input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></SifoField>
            <SifoField label="Purchase Date"><Input type="date" value={f.purchase_date} onChange={e => setF({ ...f, purchase_date: e.target.value })} /></SifoField>
            <SifoField label="Supplier"><Input value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} /></SifoField>
            <SifoField label="Cost"><Input type="number" step="0.01" value={f.cost} onChange={e => setF({ ...f, cost: e.target.value })} /></SifoField>
            <SifoField label="Salvage Value"><Input type="number" step="0.01" value={f.salvage_value} onChange={e => setF({ ...f, salvage_value: e.target.value })} /></SifoField>
            <SifoField label="Useful Life (years)"><Input type="number" step="0.5" value={f.useful_life_years} onChange={e => setF({ ...f, useful_life_years: e.target.value })} /></SifoField>
            <SifoField label="Location"><Input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} /></SifoField>
            <SifoField label="Condition">
              <Select value={f.condition} onValueChange={v => setF({ ...f, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Notes" wide><Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  if (mode === "category") {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage module="accounting" icon={Layers} title="New Asset Category" subtitle="Standardise useful life and depreciation policy."
          onCancel={() => setMode(null)} onSave={saveCat} saving={saving} saveLabel="Save category">
          <SifoFormSection title="Details">
            <SifoField label="Code" required><Input value={cf.code} onChange={e => setCf({ ...cf, code: e.target.value })} placeholder="VEH" /></SifoField>
            <SifoField label="Name" required><Input value={cf.name} onChange={e => setCf({ ...cf, name: e.target.value })} placeholder="Motor Vehicles" /></SifoField>
            <SifoField label="Useful Life (yrs)"><Input type="number" value={cf.useful_life_years} onChange={e => setCf({ ...cf, useful_life_years: e.target.value })} /></SifoField>
            <SifoField label="Method">
              <Select value={cf.depreciation_method} onValueChange={v => setCf({ ...cf, depreciation_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight_line">Straight-line</SelectItem>
                  <SelectItem value="reducing_balance">Reducing balance</SelectItem>
                </SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Rate % (for reducing bal.)"><Input type="number" value={cf.depreciation_rate} onChange={e => setCf({ ...cf, depreciation_rate: e.target.value })} /></SifoField>
            <SifoField label="Capitalisation Threshold"><Input type="number" value={cf.capitalisation_threshold} onChange={e => setCf({ ...cf, capitalisation_threshold: e.target.value })} /></SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  if (mode === "transfer") {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage module="accounting" icon={ArrowRightLeft} title="Transfer Asset" subtitle="Move an asset to another location or custodian."
          onCancel={() => setMode(null)} onSave={saveTransfer} saving={saving} saveLabel="Record transfer">
          <SifoFormSection title="Details">
            <SifoField label="Asset" required wide>
              <Select value={tf.asset_id} onValueChange={v => setTf({ ...tf, asset_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick an asset" /></SelectTrigger>
                <SelectContent>
                  {assets.filter(a => a.status === "active").map(a => <SelectItem key={a.id} value={a.id}>{a.asset_number} — {a.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Date"><Input type="date" value={tf.transfer_date} onChange={e => setTf({ ...tf, transfer_date: e.target.value })} /></SifoField>
            <SifoField label="To Department"><Input value={tf.to_department} onChange={e => setTf({ ...tf, to_department: e.target.value })} /></SifoField>
            <SifoField label="To Location"><Input value={tf.to_location} onChange={e => setTf({ ...tf, to_location: e.target.value })} /></SifoField>
            <SifoField label="To Custodian"><Input value={tf.to_custodian} onChange={e => setTf({ ...tf, to_custodian: e.target.value })} /></SifoField>
            <SifoField label="Reason" wide><Textarea rows={2} value={tf.reason} onChange={e => setTf({ ...tf, reason: e.target.value })} /></SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  if (mode === "disposal") {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage module="accounting" icon={Trash2} title="Dispose Asset" subtitle="Removes cost + accumulated depreciation, records proceeds and posts gain / loss to the GL."
          onCancel={() => setMode(null)} onSave={saveDisposal} saving={saving} saveLabel="Post disposal">
          <SifoFormSection title="Details">
            <SifoField label="Asset" required wide>
              <Select value={df.asset_id} onValueChange={v => setDf({ ...df, asset_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick an asset" /></SelectTrigger>
                <SelectContent>
                  {assets.filter(a => a.status === "active").map(a => <SelectItem key={a.id} value={a.id}>{a.asset_number} — {a.description} (BV {fmt(a.book_value)})</SelectItem>)}
                </SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Date"><Input type="date" value={df.disposal_date} onChange={e => setDf({ ...df, disposal_date: e.target.value })} /></SifoField>
            <SifoField label="Method">
              <Select value={df.disposal_method} onValueChange={v => setDf({ ...df, disposal_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="scrap">Scrap</SelectItem>
                  <SelectItem value="donation">Donation</SelectItem>
                  <SelectItem value="write_off">Write-off</SelectItem>
                </SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Proceeds"><Input type="number" step="0.01" value={df.proceeds} onChange={e => setDf({ ...df, proceeds: e.target.value })} /></SifoField>
            <SifoField label="Buyer"><Input value={df.buyer} onChange={e => setDf({ ...df, buyer: e.target.value })} /></SifoField>
            <SifoField label="Reason" wide><Textarea rows={2} value={df.reason} onChange={e => setDf({ ...df, reason: e.target.value })} /></SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  if (mode === "depreciation") {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage module="accounting" icon={RefreshCw} title="Post Monthly Depreciation" subtitle="Posts straight-line depreciation for all active assets and creates journal entries dated the last day of the selected month."
          onCancel={() => setMode(null)} onSave={runDep} saving={saving} saveLabel="Post">
          <SifoFormSection title="Period">
            <SifoField label="Year"><Input type="number" value={depYear} onChange={e => setDepYear(Number(e.target.value))} /></SifoField>
            <SifoField label="Month">
              <Select value={String(depMonth)} onValueChange={v => setDepMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <SelectItem key={m} value={String(m)}>{new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" /> Fixed Assets Register</h1>
          <p className="text-sm text-muted-foreground">Categories, transfers, disposals and monthly depreciation posting.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-9" onClick={() => setMode("depreciation")}><Calendar className="h-4 w-4 mr-1" /> Post Depreciation</Button>
          <Button size="sm" className="h-9" onClick={() => setMode("asset")}><Plus className="h-4 w-4 mr-1" /> New Asset</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Total Cost</div><div className="text-xl font-bold">{fmt(totals.cost)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Accumulated Depreciation</div><div className="text-xl font-bold text-destructive">{fmt(totals.acc)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Net Book Value</div><div className="text-xl font-bold text-emerald-700">{fmt(totals.bv)}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="categories"><Layers className="h-3.5 w-3.5 mr-1" />Categories</TabsTrigger>
          <TabsTrigger value="transfers"><ArrowRightLeft className="h-3.5 w-3.5 mr-1" />Transfers</TabsTrigger>
          <TabsTrigger value="disposals"><Trash2 className="h-3.5 w-3.5 mr-1" />Disposals</TabsTrigger>
          <TabsTrigger value="schedule">Depreciation Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <Card>
            <CardHeader><CardTitle>Assets ({assets.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Asset #</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead>
                    <TableHead>Purchased</TableHead><TableHead>Location</TableHead>
                    <TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Life</TableHead>
                    <TableHead className="text-right">Acc. Dep.</TableHead><TableHead className="text-right">Book Value</TableHead>
                    <TableHead>Status</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {assets.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No assets yet.</TableCell></TableRow>}
                    {assets.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.asset_number}</TableCell>
                        <TableCell>{a.description}</TableCell><TableCell>{a.category}</TableCell>
                        <TableCell>{a.purchase_date}</TableCell><TableCell>{a.location}</TableCell>
                        <TableCell className="text-right">{fmt(a.cost)}</TableCell>
                        <TableCell className="text-right">{a.useful_life_years}y</TableCell>
                        <TableCell className="text-right text-destructive">{fmt(a.accumulated_depreciation)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(a.book_value)}</TableCell>
                        <TableCell><Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => { setTf({ ...tf, asset_id: a.id }); setMode("transfer"); }} disabled={a.status !== "active"}><ArrowRightLeft className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => { setDf({ ...df, asset_id: a.id }); setMode("disposal"); }} disabled={a.status !== "active"}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Categories ({cats.length})</CardTitle>
              <Button size="sm" className="h-9" onClick={() => setMode("category")}><Plus className="h-4 w-4 mr-1" />New Category</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>Name</TableHead>
                  <TableHead className="text-right">Life (yrs)</TableHead>
                  <TableHead>Method</TableHead><TableHead className="text-right">Rate %</TableHead>
                  <TableHead className="text-right">Cap. Threshold</TableHead><TableHead>Active</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {cats.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No categories. Add one to standardise useful life and depreciation policy.</TableCell></TableRow>}
                  {cats.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.code}</TableCell><TableCell>{c.name}</TableCell>
                      <TableCell className="text-right">{c.useful_life_years}</TableCell>
                      <TableCell>{c.depreciation_method}</TableCell>
                      <TableCell className="text-right">{c.depreciation_rate ?? "—"}</TableCell>
                      <TableCell className="text-right">{c.capitalisation_threshold ? fmt(c.capitalisation_threshold) : "—"}</TableCell>
                      <TableCell>{c.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Off</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transfers ({transfers.length})</CardTitle>
              <Button size="sm" className="h-9" onClick={() => setMode("transfer")}><Plus className="h-4 w-4 mr-1" />New Transfer</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Asset</TableHead>
                  <TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Custodian</TableHead><TableHead>Reason</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {transfers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No transfers yet.</TableCell></TableRow>}
                  {transfers.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{t.transfer_date}</TableCell>
                      <TableCell>{assetName(t.asset_id)}</TableCell>
                      <TableCell>{t.from_location || "—"}</TableCell>
                      <TableCell>{t.to_location || "—"}</TableCell>
                      <TableCell>{t.to_custodian || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.reason || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disposals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Disposals ({disposals.length})</CardTitle>
              <Button size="sm" className="h-9" onClick={() => setMode("disposal")}><Plus className="h-4 w-4 mr-1" />New Disposal</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Asset</TableHead><TableHead>Method</TableHead>
                  <TableHead>Buyer</TableHead><TableHead className="text-right">Proceeds</TableHead>
                  <TableHead className="text-right">Gain / (Loss)</TableHead><TableHead>Posted</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {disposals.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No disposals yet.</TableCell></TableRow>}
                  {disposals.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>{d.disposal_date}</TableCell>
                      <TableCell>{assetName(d.asset_id)}</TableCell>
                      <TableCell>{d.disposal_method}</TableCell>
                      <TableCell>{d.buyer || "—"}</TableCell>
                      <TableCell className="text-right">{fmt(d.proceeds)}</TableCell>
                      <TableCell className={"text-right font-semibold " + ((d.gain_loss ?? 0) >= 0 ? "text-emerald-700" : "text-destructive")}>{fmt(d.gain_loss ?? 0)}</TableCell>
                      <TableCell>{d.journal_entry_id ? <Badge>Posted</Badge> : <Badge variant="secondary">Pending</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader><CardTitle>Depreciation Schedule ({schedule.length} active)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Asset</TableHead><TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Salvage</TableHead><TableHead className="text-right">Life</TableHead>
                  <TableHead className="text-right">Annual Dep.</TableHead><TableHead className="text-right">Monthly Dep.</TableHead>
                  <TableHead className="text-right">Acc. Dep.</TableHead><TableHead className="text-right">Book Value</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {schedule.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>{a.description}</TableCell>
                      <TableCell className="text-right">{fmt(a.cost)}</TableCell>
                      <TableCell className="text-right">{fmt(a.salvage_value)}</TableCell>
                      <TableCell className="text-right">{a.useful_life_years}y</TableCell>
                      <TableCell className="text-right">{fmt(a.annual_dep)}</TableCell>
                      <TableCell className="text-right">{fmt(a.monthly_dep)}</TableCell>
                      <TableCell className="text-right text-destructive">{fmt(a.accumulated_depreciation)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">{fmt(a.book_value)}</TableCell>
                    </TableRow>
                  ))}
                  {schedule.length > 0 && (
                    <TableRow className="font-semibold bg-muted/40">
                      <TableCell>Totals</TableCell>
                      <TableCell className="text-right">{fmt(schedule.reduce((s, a) => s + a.cost, 0))}</TableCell>
                      <TableCell></TableCell><TableCell></TableCell>
                      <TableCell className="text-right">{fmt(schedule.reduce((s, a) => s + a.annual_dep, 0))}</TableCell>
                      <TableCell className="text-right">{fmt(schedule.reduce((s, a) => s + a.monthly_dep, 0))}</TableCell>
                      <TableCell className="text-right text-destructive">{fmt(schedule.reduce((s, a) => s + Number(a.accumulated_depreciation), 0))}</TableCell>
                      <TableCell className="text-right text-emerald-700">{fmt(schedule.reduce((s, a) => s + Number(a.book_value), 0))}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
