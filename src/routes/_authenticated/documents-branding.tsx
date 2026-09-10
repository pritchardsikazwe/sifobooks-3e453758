import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Palette, Plus, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import {
  DEFAULT_BRANDING, DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, THEMES, THEME_KEYS,
  brandDisplayName, clearBrandingCache, loadBranding, saveBranding,
  type BankDetail, type DocumentBranding, type DocumentTypeKey, type ThemeKey,
} from "@/lib/branding";
import { previewBrandedDoc, type DocSpec } from "@/lib/doc-engine";
import { getActiveCompanyId } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/documents-branding")({
  head: () => ({ meta: [{ title: "Documents & Branding — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: BrandingPage,
});

/** Sample figures used ONLY for the preview page — never saved, never posted. */
const previewSpec = (docType: DocumentTypeKey): DocSpec => ({
  docType,
  title: DOCUMENT_TYPE_LABELS[docType],
  number: "PREVIEW-0001",
  status: "Preview",
  subtitle: "Layout preview — figures below are illustrative only.",
  parties: [
    { label: "Billed to", lines: ["Sample Customer Ltd", "Plot 1, Great East Road", "Lusaka, Zambia", "TPIN 1000000000"] },
    { label: "Details", lines: ["Date: 01 Jan 2025", "Due: 31 Jan 2025", "Reference: PREVIEW"] },
  ],
  sections: [{
    columns: ["#", "Description", "Qty", "Unit", "Rate", "VAT", "Amount"],
    rows: [
      ["1", "Professional services", "10", "hrs", "1,500.00", "16%", "15,000.00"],
      ["2", "Site inspection and report", "1", "ea", "4,200.00", "16%", "4,200.00"],
      ["3", "Materials supplied", "3", "sets", "900.00", "16%", "2,700.00"],
    ],
  }],
  totals: [
    { label: "Subtotal", value: "21,900.00" },
    { label: "VAT 16%", value: "3,504.00" },
    { label: "Total due", value: "ZMW 25,404.00", emphasis: true },
  ],
  amountInWords: "Twenty five thousand four hundred and four kwacha",
  signature: true,
  filename: "branding-preview.pdf",
});

function BrandingPage() {
  const [b, setB] = useState<DocumentBranding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewType, setPreviewType] = useState<DocumentTypeKey>("invoice");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const lastUrl = useRef<string>("");

  const set = <K extends keyof DocumentBranding>(key: K, value: DocumentBranding[K]) =>
    setB((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    (async () => {
      const [branding, id] = await Promise.all([loadBranding({ force: true }), getActiveCompanyId()]);
      setB(branding);
      setCompanyId(id ?? null);
      setLoading(false);
    })();
  }, []);

  const refreshPreview = useCallback(async () => {
    try {
      const url = await previewBrandedDoc(previewSpec(previewType), b);
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
      lastUrl.current = url;
      setPreviewUrl(url);
    } catch {
      /* preview only — never blocks saving */
    }
  }, [b, previewType]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => void refreshPreview(), 350);
    return () => clearTimeout(t);
  }, [loading, refreshPreview]);

  const upload = async (field: "logoUrl" | "secondaryLogoUrl" | "signatureUrl" | "stampUrl", file?: File | null) => {
    if (!file || !companyId) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Maximum file size is 2 MB");
    setUploading(field);
    const { data: u } = await supabase.auth.getUser();
    const ext = file.name.split(".").pop() || "png";
    const path = `${u.user?.id}/${companyId}-${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("company-logos").upload(path, file, { upsert: true });
    setUploading(null);
    if (error) return toast.error(error.message);
    set(field, path);
    toast.success("Uploaded — remember to save");
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveBranding({
        legal_name: b.legalName, trading_name: b.tradingName, tagline: b.tagline,
        address: b.address, city: b.city, country: b.country,
        phone: b.phone, email: b.email, website: b.website,
        tpin: b.tpin, vat_number: b.vatNumber, registration_number: b.registrationNumber,
        currency: b.currency, locale: b.locale,
        logo_url: b.logoUrl, secondary_logo_url: b.secondaryLogoUrl,
        signature_url: b.signatureUrl, stamp_url: b.stampUrl,
        theme: b.theme, primary_color: b.primaryColor, secondary_color: b.secondaryColor,
        accent_color: b.accentColor, font_family: b.fontFamily,
        header_note: b.headerNote, footer_note: b.footerNote,
        payment_instructions: b.paymentInstructions, default_notes: b.defaultNotes,
        terms_library: b.termsLibrary, signatory_name: b.signatoryName, signatory_title: b.signatoryTitle,
        bank_details: b.bankDetails, payment_methods: b.paymentMethods,
        social_links: b.socialLinks, document_prefixes: b.documentPrefixes,
        templates: b.templates, show_provider_credit: b.showProviderCredit,
      });
      clearBrandingCache();
      toast.success("Branding saved. New documents use it immediately.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save branding");
    } finally {
      setSaving(false);
    }
  };

  const bank = b.bankDetails;
  const setBank = (rows: BankDetail[]) => set("bankDetails", rows);

  const templateOptions = useMemo(() => THEME_KEYS.map((k) => ({ k, label: THEMES[k].label })), []);

  if (loading) {
    return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Palette className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Documents &amp; Branding</h1>
              <p className="text-sm text-muted-foreground">
                Everything {brandDisplayName(b)} prints — invoices, receipts, statements, payslips and reports — uses these settings.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void refreshPreview()}><RefreshCw className="mr-2 h-4 w-4" /> Refresh preview</Button>
            <Button size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save branding
            </Button>
          </div>
        </div>

        <p className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Branding is applied when a document is rendered. Saved transactions, document numbers, dates and amounts are never changed.
        </p>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
          <Tabs defaultValue="identity">
            <TabsList className="flex-wrap">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="assets">Logos &amp; signatures</TabsTrigger>
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="content">Wording</TabsTrigger>
              <TabsTrigger value="payment">Payment details</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="mt-4 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Company identity</CardTitle>
                  <CardDescription>Shown as the issuer on every document. This is your company, never SifoBooks.</CardDescription></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Field label="Legal name"><Input value={b.legalName} onChange={(e) => set("legalName", e.target.value)} /></Field>
                  <Field label="Trading name"><Input value={b.tradingName} onChange={(e) => set("tradingName", e.target.value)} placeholder="Optional" /></Field>
                  <Field label="Tagline" className="sm:col-span-2"><Input value={b.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="e.g. Engineering & project services" /></Field>
                  <Field label="Address" className="sm:col-span-2"><Textarea rows={2} value={b.address} onChange={(e) => set("address", e.target.value)} /></Field>
                  <Field label="City"><Input value={b.city} onChange={(e) => set("city", e.target.value)} /></Field>
                  <Field label="Country"><Input value={b.country} onChange={(e) => set("country", e.target.value)} /></Field>
                  <Field label="Phone"><Input value={b.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
                  <Field label="Email"><Input value={b.email} onChange={(e) => set("email", e.target.value)} /></Field>
                  <Field label="Website"><Input value={b.website} onChange={(e) => set("website", e.target.value)} /></Field>
                  <Field label="TPIN"><Input value={b.tpin} onChange={(e) => set("tpin", e.target.value)} /></Field>
                  <Field label="VAT number"><Input value={b.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} /></Field>
                  <Field label="Registration number"><Input value={b.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} /></Field>
                  <Field label="Currency"><Input value={b.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} /></Field>
                  <Field label="Locale"><Input value={b.locale} onChange={(e) => set("locale", e.target.value)} placeholder="en-ZM" /></Field>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assets" className="mt-4 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Logos, signature and stamp</CardTitle>
                  <CardDescription>PNG or JPG up to 2 MB. Stored privately against your company.</CardDescription></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {([
                    ["logoUrl", "Primary logo"],
                    ["secondaryLogoUrl", "Secondary / accreditation logo"],
                    ["signatureUrl", "Authorised signature"],
                    ["stampUrl", "Company stamp"],
                  ] as const).map(([field, label]) => (
                    <div key={field} className="rounded-lg border border-dashed p-3">
                      <div className="text-sm font-medium">{label}</div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{b[field] ? String(b[field]).split("/").pop() : "Not set"}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="inline-flex">
                          <input type="file" accept="image/*" className="hidden"
                            onChange={(e) => void upload(field, e.target.files?.[0])} />
                          <Button asChild variant="outline" size="sm">
                            <span>{uploading === field ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Upload</span>
                          </Button>
                        </label>
                        {b[field] && <Button variant="ghost" size="sm" onClick={() => set(field, null)}><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    </div>
                  ))}
                  <Field label="Signatory name"><Input value={b.signatoryName} onChange={(e) => set("signatoryName", e.target.value)} /></Field>
                  <Field label="Signatory title"><Input value={b.signatoryTitle} onChange={(e) => set("signatoryTitle", e.target.value)} /></Field>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="design" className="mt-4 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Default template</CardTitle>
                  <CardDescription>Applies to every document unless a specific type overrides it.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {THEME_KEYS.map((k) => (
                      <button key={k} type="button" onClick={() => set("theme", k)}
                        className={`rounded-lg border p-3 text-left transition ${b.theme === k ? "border-primary ring-2 ring-primary/20" : "hover:bg-muted/40"}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{THEMES[k].label}</span>
                          {b.theme === k && <Badge variant="secondary">Selected</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{THEMES[k].description}</p>
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <ColorField label="Primary" value={b.primaryColor} onChange={(v) => set("primaryColor", v)} />
                    <ColorField label="Secondary" value={b.secondaryColor} onChange={(v) => set("secondaryColor", v)} />
                    <ColorField label="Accent" value={b.accentColor} onChange={(v) => set("accentColor", v)} />
                  </div>
                  <Field label="Font">
                    <Select value={b.fontFamily} onValueChange={(v) => set("fontFamily", v as DocumentBranding["fontFamily"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="helvetica">Helvetica (sans serif)</SelectItem>
                        <SelectItem value="times">Times (serif)</SelectItem>
                        <SelectItem value="courier">Courier (monospace)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="text-sm font-medium">Show "Prepared with SifoBooks"</div>
                      <p className="text-xs text-muted-foreground">Small provider credit in the footer. Off by default.</p>
                    </div>
                    <Switch checked={b.showProviderCredit} onCheckedChange={(v) => set("showProviderCredit", v)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="mt-4 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Standard wording</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Field label="Header note"><Input value={b.headerNote} onChange={(e) => set("headerNote", e.target.value)} /></Field>
                  <Field label="Footer note"><Input value={b.footerNote} onChange={(e) => set("footerNote", e.target.value)} placeholder="e.g. Registered in Zambia" /></Field>
                  <Field label="Default notes"><Textarea rows={3} value={b.defaultNotes} onChange={(e) => set("defaultNotes", e.target.value)} /></Field>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label>Terms library</Label>
                      <Button variant="outline" size="sm" onClick={() => set("termsLibrary", [...b.termsLibrary, { key: `terms_${b.termsLibrary.length + 1}`, label: "New terms", body: "" }])}>
                        <Plus className="mr-1 h-4 w-4" /> Add
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {b.termsLibrary.map((t, i) => (
                        <div key={i} className="rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Input value={t.label} placeholder="Label"
                              onChange={(e) => set("termsLibrary", b.termsLibrary.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                            <Button variant="ghost" size="sm" onClick={() => set("termsLibrary", b.termsLibrary.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                          <Textarea className="mt-2" rows={2} value={t.body} placeholder="Terms text"
                            onChange={(e) => set("termsLibrary", b.termsLibrary.map((x, j) => j === i ? { ...x, body: e.target.value } : x))} />
                        </div>
                      ))}
                      {!b.termsLibrary.length && <p className="text-xs text-muted-foreground">No saved terms yet.</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="mt-4 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">How customers pay you</CardTitle>
                  <CardDescription>Printed on invoices, statements and receipts.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <Field label="Payment instructions"><Textarea rows={3} value={b.paymentInstructions} onChange={(e) => set("paymentInstructions", e.target.value)} /></Field>
                  <Field label="Accepted methods (comma separated)">
                    <Input value={b.paymentMethods.join(", ")} onChange={(e) => set("paymentMethods", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="Bank transfer, Mobile money, Cash" />
                  </Field>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label>Bank accounts</Label>
                      <Button variant="outline" size="sm" onClick={() => setBank([...bank, {}])}><Plus className="mr-1 h-4 w-4" /> Add account</Button>
                    </div>
                    <div className="space-y-3">
                      {bank.map((d, i) => (
                        <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                          {(["bank", "branch", "account_name", "account_number", "swift", "sort_code"] as const).map((k) => (
                            <Input key={k} value={d[k] ?? ""} placeholder={k.replace("_", " ")}
                              onChange={(e) => setBank(bank.map((x, j) => j === i ? { ...x, [k]: e.target.value } : x))} />
                          ))}
                          <div className="sm:col-span-2 flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setBank(bank.filter((_, j) => j !== i))}><Trash2 className="mr-1 h-4 w-4" /> Remove</Button>
                          </div>
                        </div>
                      ))}
                      {!bank.length && <p className="text-xs text-muted-foreground">No bank details added.</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="mt-4 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Template per document type</CardTitle>
                  <CardDescription>Optional prefixes are used where the module supports custom numbering.</CardDescription></CardHeader>
                <CardContent className="space-y-2">
                  {DOCUMENT_TYPES.map((t) => (
                    <div key={t} className="grid items-center gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_170px_120px]">
                      <div className="text-sm">{DOCUMENT_TYPE_LABELS[t]}</div>
                      <Select value={b.templates[t] ?? "__default"}
                        onValueChange={(v) => set("templates", v === "__default"
                          ? Object.fromEntries(Object.entries(b.templates).filter(([k]) => k !== t)) as Record<string, ThemeKey>
                          : { ...b.templates, [t]: v as ThemeKey })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default">Use default ({THEMES[b.theme].label})</SelectItem>
                          {templateOptions.map((o) => <SelectItem key={o.k} value={o.k}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input className="h-9" placeholder="Prefix" value={b.documentPrefixes[t] ?? ""}
                        onChange={(e) => set("documentPrefixes", { ...b.documentPrefixes, [t]: e.target.value })} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="h-fit xl:sticky xl:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Live preview</CardTitle>
              <CardDescription>Illustrative figures — nothing here is a real transaction.</CardDescription>
              <Select value={previewType} onValueChange={(v) => setPreviewType(v as DocumentTypeKey)}>
                <SelectTrigger className="mt-2 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {previewUrl
                ? <iframe title="Document preview" src={previewUrl} className="h-[720px] w-full rounded-md border bg-white" />
                : <div className="grid h-[720px] place-items-center rounded-md border text-sm text-muted-foreground">Building preview…</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className ?? ""}`}><Label className="text-xs">{label}</Label>{children}</div>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border bg-transparent" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </div>
  );
}
