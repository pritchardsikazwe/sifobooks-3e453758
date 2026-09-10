import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Board, EmptyState, MetricTile, Tile, TileGrid, type TileStatus } from "@/components/industry/IndustryKit";
import { DEFAULT_TAX_PROFILE, currentUserId, type TaxProfile } from "@/lib/hospitality";
import { cn } from "@/lib/utils";
import { AlertTriangle, FileCheck2, Plus, ShieldCheck, Receipt } from "lucide-react";

const db: any = supabase;

/** Licence and permit categories relevant to Zambian hospitality and education businesses. */
export const DOC_CATEGORIES = [
  { key: "zta_licence", label: "Tourism enterprise licence (ZTA)", body: "Zambia Tourism Agency" },
  { key: "accommodation_licence", label: "Accommodation / lodge licence", body: "Zambia Tourism Agency" },
  { key: "liquor_licence", label: "Liquor licence", body: "Local authority" },
  { key: "council_permit", label: "Council trading permit", body: "Local authority" },
  { key: "public_health", label: "Public health / food handling certificate", body: "Public health office" },
  { key: "fire_certificate", label: "Fire safety certificate", body: "Fire services" },
  { key: "environmental", label: "Environmental approval", body: "ZEMA" },
  { key: "pacra", label: "PACRA company registration", body: "PACRA" },
  { key: "tpin", label: "TPIN / VAT registration", body: "ZRA" },
  { key: "education_registration", label: "School registration", body: "Ministry of Education" },
  { key: "other", label: "Other permit or approval", body: "" },
] as const;

const catLabel = (k: string) => DOC_CATEGORIES.find((c) => c.key === k)?.label ?? k;

const daysTo = (d?: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null);

const docTone = (d: any): TileStatus => {
  if (d.status === "not_applicable") return "muted";
  const left = daysTo(d.expiry_date);
  if (left === null) return "info";
  if (left < 0) return "bad";
  if (left <= 60) return "warn";
  return "good";
};

export function HospitalityCompliance({
  scope = "hospitality",
}: { scope?: "hospitality" | "restaurant" | "school" }) {
  const [uid, setUid] = useState<string | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [tax, setTax] = useState<TaxProfile & { id?: string }>({ ...DEFAULT_TAX_PROFILE });
  const [zra, setZra] = useState<any>({ mode: "not_configured", enabled: false, tpin: "", branch_code: "", device_serial: "", vsdc_endpoint: "", taxpayer_name: "" });
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const blank = { category: "zta_licence", title: "", reference: "", issuing_body: "", responsible_person: "", issue_date: "", expiry_date: "", status: "active", document_url: "", notes: "" };
  const [form, setForm] = useState({ ...blank });

  const load = useCallback(async () => {
    const u = await currentUserId();
    setUid(u);
    if (!u) { setLoading(false); return; }
    const [d, t, z, q] = await Promise.all([
      db.from("compliance_documents").select("*").eq("user_id", u).order("expiry_date", { ascending: true }),
      db.from("hospitality_tax_profiles").select("*").eq("user_id", u).eq("active", true).order("created_at").limit(1).maybeSingle(),
      db.from("zra_smart_invoice_config").select("*").eq("user_id", u).order("created_at").limit(1).maybeSingle(),
      db.from("zra_invoice_queue").select("*").eq("user_id", u).order("created_at", { ascending: false }).limit(50),
    ]);
    setDocs(d.data ?? []);
    if (t.data) setTax(t.data);
    if (z.data) setZra(z.data);
    setQueue(q.data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveDoc = async () => {
    if (!uid || !form.title.trim()) return toast.error("Give the document a title");
    const { error } = await db.from("compliance_documents").insert({
      user_id: uid, ...form,
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
      issuing_body: form.issuing_body || DOC_CATEGORIES.find((c) => c.key === form.category)?.body || null,
    });
    if (error) return toast.error(error.message);
    setForm({ ...blank });
    setOpen(false);
    toast.success("Compliance record saved");
    load();
  };

  const saveTax = async () => {
    if (!uid) return;
    const payload = { ...tax, user_id: uid, active: true } as any;
    const { error } = tax.id
      ? await db.from("hospitality_tax_profiles").update(payload).eq("id", tax.id)
      : await db.from("hospitality_tax_profiles").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Tax profile saved");
    load();
  };

  const saveZra = async () => {
    if (!uid) return;
    const payload = { ...zra, user_id: uid } as any;
    const { error } = zra.id
      ? await db.from("zra_smart_invoice_config").update(payload).eq("id", zra.id)
      : await db.from("zra_smart_invoice_config").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Smart Invoice settings saved");
    load();
  };

  const alerts = useMemo(() => docs.filter((d) => {
    const left = daysTo(d.expiry_date);
    return left !== null && left <= 60;
  }), [docs]);

  if (loading) return <div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;

  const expired = docs.filter((d) => (daysTo(d.expiry_date) ?? 1) < 0).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Compliance records" value={String(docs.length)} icon={FileCheck2} />
        <MetricTile label="Expiring in 60 days" value={String(alerts.length - expired)} icon={AlertTriangle} tone={alerts.length > expired ? "warn" : "good"} />
        <MetricTile label="Expired" value={String(expired)} icon={AlertTriangle} tone={expired ? "bad" : "good"} />
        <MetricTile label="Smart Invoice" value={zra.enabled ? "Connected" : "Not connected"} icon={Receipt} tone={zra.enabled ? "good" : "warn"} />
      </div>

      {alerts.length > 0 ? (
        <Card className="rounded-2xl border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="text-sm">
              <div className="font-semibold">{alerts.length} licence{alerts.length > 1 ? "s" : ""} need attention</div>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {alerts.slice(0, 5).map((d) => {
                  const left = daysTo(d.expiry_date)!;
                  return <li key={d.id}>{d.title} — {left < 0 ? `expired ${Math.abs(left)} days ago` : `expires in ${left} days`} ({d.expiry_date})</li>;
                })}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}

      <Board
        title="Licences, permits and approvals"
        hint="Your own compliance records. SifoBooks tracks and reminds — it does not issue or verify licences."
        right={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> New record</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add a compliance record</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, title: form.title || catLabel(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DOC_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div><Label>Reference / number</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
                  <div><Label>Issuing body</Label><Input value={form.issuing_body} onChange={(e) => setForm({ ...form, issuing_body: e.target.value })} placeholder={DOC_CATEGORIES.find((c) => c.key === form.category)?.body} /></div>
                  <div><Label>Responsible person</Label><Input value={form.responsible_person} onChange={(e) => setForm({ ...form, responsible_person: e.target.value })} /></div>
                  <div><Label>Issued</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
                  <div><Label>Expires</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["active", "pending", "expired", "not_applicable"].map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Document link</Label><Input value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} placeholder="https://…" /></div>
                </div>
                <Textarea placeholder="Notes — inspection outcome, conditions, follow-up" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <DialogFooter><Button onClick={saveDoc}>Save record</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        {docs.length === 0 ? (
          <EmptyState title="No compliance records yet" message="Add your tourism licence, council permit, fire certificate, health certificate and registration documents to get renewal reminders. Nothing is created for you." />
        ) : (
          <TileGrid>
            {docs.map((d) => {
              const left = daysTo(d.expiry_date);
              return (
                <Tile key={d.id} title={d.title} subtitle={catLabel(d.category)} status={docTone(d)}
                  badge={<span className="rounded-full border px-2 py-0.5 text-[10px] uppercase">{d.status.replace(/_/g, " ")}</span>}
                  meta={
                    <span className="block">
                      <span className="block text-sm">{d.reference || "No reference"}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {d.expiry_date ? (left! < 0 ? `Expired ${d.expiry_date}` : `Expires ${d.expiry_date} · ${left} days`) : "No expiry recorded"}
                        {d.responsible_person ? ` · ${d.responsible_person}` : ""}
                      </span>
                    </span>
                  }
                  onClick={() => d.document_url && window.open(d.document_url, "_blank", "noopener")} />
              );
            })}
          </TileGrid>
        )}
      </Board>

      <div className="grid gap-4 lg:grid-cols-2">
        <Board title="Tax configuration" hint="VAT, tourism levy and service charge are modelled separately — the levy is never applied blindly.">
          <div className="grid gap-3 p-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div><Label>VAT %</Label><Input type="number" value={tax.vat_rate} onChange={(e) => setTax({ ...tax, vat_rate: Number(e.target.value) })} /></div>
              <div><Label>Tourism levy %</Label><Input type="number" value={tax.tourism_levy_rate} onChange={(e) => setTax({ ...tax, tourism_levy_rate: Number(e.target.value) })} /></div>
              <div><Label>Service charge %</Label><Input type="number" value={tax.service_charge_rate} onChange={(e) => setTax({ ...tax, service_charge_rate: Number(e.target.value) })} /></div>
            </div>
            {[
              ["levy_on_accommodation", "Tourism levy on accommodation"],
              ["levy_on_conference_package", "Tourism levy on conference packages / hire for 25+ delegates"],
              ["levy_on_food_beverage", "Tourism levy on ordinary food & beverage (normally off)"],
              ["prices_tax_inclusive", "Menu and room prices already include tax"],
            ].map(([key, text]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                <span>{text}</span>
                <Switch checked={Boolean((tax as any)[key])} onCheckedChange={(v) => setTax({ ...tax, [key]: v } as any)} />
              </label>
            ))}
            <p className="text-xs text-muted-foreground">
              Charges are taxed as: net value → service charge → tourism levy where it applies → VAT on that base. Service charge is reported on its own line and is never treated as tax.
            </p>
            <Button onClick={saveTax}>Save tax profile</Button>
          </div>
        </Board>

        <Board title="ZRA Smart Invoice (VSDC)" hint="Connection settings for electronic invoicing.">
          <div className="grid gap-3 p-4">
            <div className={cn("rounded-xl border p-3 text-sm", zra.enabled ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10")}>
              <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> {zra.enabled ? "Smart Invoice submission is switched on" : "Smart Invoice is not connected"}</div>
              <p className="mt-1 text-muted-foreground">
                VAT-registered taxpayers must issue invoices electronically through ZRA Smart Invoice. SifoBooks stores your details and queues every invoice, but live transmission requires a certified VSDC connection issued to your business by ZRA. Turning this on does not make SifoBooks certified on your behalf.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><Label>Taxpayer name</Label><Input value={zra.taxpayer_name ?? ""} onChange={(e) => setZra({ ...zra, taxpayer_name: e.target.value })} /></div>
              <div><Label>TPIN</Label><Input value={zra.tpin ?? ""} onChange={(e) => setZra({ ...zra, tpin: e.target.value })} /></div>
              <div><Label>Branch code</Label><Input value={zra.branch_code ?? ""} onChange={(e) => setZra({ ...zra, branch_code: e.target.value })} /></div>
              <div><Label>Device serial</Label><Input value={zra.device_serial ?? ""} onChange={(e) => setZra({ ...zra, device_serial: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>VSDC endpoint</Label><Input value={zra.vsdc_endpoint ?? ""} onChange={(e) => setZra({ ...zra, vsdc_endpoint: e.target.value })} placeholder="Supplied with your VSDC installation" /></div>
              <div>
                <Label>Mode</Label>
                <Select value={zra.mode} onValueChange={(v) => setZra({ ...zra, mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["not_configured", "vsdc_sandbox", "vsdc_production"].map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <label className="flex items-center justify-between gap-3 self-end rounded-xl border p-3 text-sm">
                <span>Queue invoices for submission</span>
                <Switch checked={Boolean(zra.enabled)} onCheckedChange={(v) => setZra({ ...zra, enabled: v })} />
              </label>
            </div>
            <Button onClick={saveZra}>Save Smart Invoice settings</Button>
          </div>
        </Board>
      </div>

      <Board title="Smart Invoice queue" hint="Every invoice recorded for electronic submission, with its ZRA response.">
        {queue.length === 0 ? (
          <EmptyState title="Nothing queued yet" message="Invoices appear here once Smart Invoice queuing is switched on and you issue an invoice." />
        ) : (
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-muted-foreground">{["Invoice", "Total", "VAT", "Levy", "Status", "Response"].map((h) => <th key={h} className="pb-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {queue.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2">{r.invoice_number ?? "—"}</td>
                    <td className="tabular-nums">{Number(r.total).toFixed(2)}</td>
                    <td className="tabular-nums">{Number(r.vat_amount).toFixed(2)}</td>
                    <td className="tabular-nums">{Number(r.levy_amount).toFixed(2)}</td>
                    <td>{r.status}</td>
                    <td className="text-muted-foreground">{r.response_message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Board>

      <p className="text-xs text-muted-foreground">
        {scope === "school"
          ? "School compliance records use the same register: registration, public health, fire safety and council approvals with renewal reminders."
          : "Tourism Enterprise Quarterly Returns and licence renewals can be tracked as records above; statutory filing itself still happens on the relevant authority's own portal."}
      </p>
    </div>
  );
}
