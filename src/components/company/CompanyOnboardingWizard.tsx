import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getSolution, applyIndustrySolution } from "@/lib/industry-solutions";
import { SIFOBOOKS_EDITION, SIFOBOOKS_EDITION_LABEL, SIFOBOOKS_PRODUCT_NAME } from "@/lib/edition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, CircleDollarSign, Clock3,
  Database, FileCheck2, Globe2, HardDrive, KeyRound, Landmark, LayoutGrid, MapPin,
  Printer, ReceiptText, Restaurant, ShieldCheck, Store, UserRound, UsersRound,
  Warehouse, WifiOff, Wrench, RefreshCw
} from "lucide-react";

type Form = {
  name: string; tradingName: string; businessType: string; industry: string; country: string;
  province: string; city: string; address: string; phone: string; email: string; logoUrl: string;
  pacra: string; tpin: string; vatRegistered: boolean; vatNumber: string; zra: string;
  financialYear: string; currency: string; taxInclusive: boolean;
  modules: string[]; branchName: string; branchCity: string; branchAddress: string; branchPhone: string;
  warehouseName: string; accountingBasis: "accrual" | "cash"; coa: "standard" | "import" | "manual";
  adminName: string; adminUsername: string; backupEnabled: boolean; backupFrequency: string;
  backupRetention: string; backupPath: string; receiptPrinter: string; paperSize: string;
  kitchenPrinter: string; cashDrawer: string; barcodeScanner: string; kitchenDisplay: string;
};

const moduleIcons: Record<string, any> = {
  Accounting: CircleDollarSign, Invoicing: ReceiptText, Inventory: Warehouse, Purchasing: Store,
  Sales: LayoutGrid, POS: ReceiptText, Restaurant: Restaurant, Payroll: UsersRound,
  Banking: Landmark, Expenses: FileCheck2, "Customers & Suppliers": UsersRound, Reports: FileCheck2,
};
const baseModules = ["Accounting", "Invoicing", "Inventory", "Purchasing", "Sales", "POS", "Restaurant", "Payroll", "Banking", "Expenses", "Customers & Suppliers", "Reports"];

const editionModules: Record<string, string[]> = {
  enterprise: baseModules,
  accounting: ["Accounting", "Invoicing", "Purchasing", "Sales", "Banking", "Expenses", "Customers & Suppliers", "Reports"],
  retail: ["Accounting", "Invoicing", "Inventory", "Purchasing", "Sales", "POS", "Customers & Suppliers", "Reports"],
  restaurant: ["Accounting", "Invoicing", "Inventory", "Purchasing", "Sales", "POS", "Restaurant", "Customers & Suppliers", "Reports"],
  hotel: ["Accounting", "Invoicing", "Inventory", "Purchasing", "Sales", "POS", "Hotel", "Customers & Suppliers", "Reports"],
  school: ["Accounting", "Invoicing", "Inventory", "Purchasing", "Sales", "School", "Payroll", "Customers & Suppliers", "Reports"],
  property: ["Accounting", "Invoicing", "Sales", "Property", "Customers & Suppliers", "Reports"],
};

const steps = [
  ["Welcome", "Start your SifoBooks setup"],
  ["Business Profile", "Tell us about your business"],
  ["Legal & Tax", "Business registration and tax"],
  ["Select Modules", "Choose what you want to manage"],
  ["Location & Warehouse", "Where does your business operate?"],
  ["Accounting Setup", "Set up your accounting"],
  ["Create Administrator", "Secure your SifoBooks installation"],
  ["Backup Setup", "Protect your business data"],
  ["Devices & Printing", "Set up your devices"],
  ["Finish", "Review and launch SifoBooks"],
] as const;

const defaultForm = (): Form => {
  const mods = editionModules[SIFOBOOKS_EDITION] ?? baseModules;
  return {
    name: "", tradingName: "", businessType: "Limited Company", industry: SIFOBOOKS_EDITION === "restaurant" ? "Restaurant" : SIFOBOOKS_EDITION_LABEL[SIFOBOOKS_EDITION],
    country: "Zambia", province: "Copperbelt", city: "", address: "", phone: "", email: "", logoUrl: "",
    pacra: "", tpin: "", vatRegistered: false, vatNumber: "", zra: "not_configured", financialYear: "January – December",
    currency: "ZMW", taxInclusive: false, modules: mods, branchName: "Main Branch", branchCity: "", branchAddress: "", branchPhone: "",
    warehouseName: "Main Warehouse", accountingBasis: "accrual", coa: "standard", adminName: "", adminUsername: "admin",
    backupEnabled: true, backupFrequency: "Daily", backupRetention: "30 backups", backupPath: "C:\\SifoBooks\\backups",
    receiptPrinter: "", paperSize: "80mm (Recommended)", kitchenPrinter: "", cashDrawer: "Connected (Auto Open)",
    barcodeScanner: "Connected", kitchenDisplay: "Not configured yet",
  };
};

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className}`}><Label className="text-xs font-semibold text-slate-600">{label}</Label>{children}</div>;
}

function IconTile({ icon: Icon, label, checked, onClick }: { icon: any; label: string; checked: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`relative rounded-xl border p-3 text-left transition-all ${checked ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white hover:border-emerald-300"}`}>
      <div className="flex items-start justify-between"><Icon className={`h-6 w-6 ${checked ? "text-emerald-700" : "text-slate-500"}`} />{checked ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <CircleDollarSign className="h-4 w-4 text-transparent" />}</div>
      <div className="mt-2 text-xs font-semibold text-slate-800">{label}</div>
    </button>
  );
}

export function CompanyOnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(() => {
    try { const saved = localStorage.getItem("sifobooks-onboarding-draft"); return saved ? { ...defaultForm(), ...JSON.parse(saved) } : defaultForm(); } catch { return defaultForm(); }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [desktopMode, setDesktopMode] = useState(false);
  const [desktopPort, setDesktopPort] = useState<number | null>(null);

  useEffect(() => {
    try { localStorage.setItem("sifobooks-onboarding-draft", JSON.stringify(form)); } catch {}
  }, [form]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/network/info");
        if (r.ok) {
          const d = await r.json();
          setDesktopMode(d.mode === "standalone" || d.mode === "server" || d.mode === "pos");
          setDesktopPort(d.port ?? null);
        }
      } catch {}
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (p?.onboarded) navigate({ to: "/dashboard" });
      if (p) setForm(prev => ({ ...prev, adminName: prev.adminName || p.full_name || "", email: prev.email || p.email || "", name: prev.name || p.business_name || "", tpin: prev.tpin || p.tpin || "" }));
    })();
  }, [navigate]);

  const update = <K extends keyof Form>(key: K, value: Form[K]) => setForm(prev => ({ ...prev, [key]: value }));
  const selectedModules = useMemo(() => form.modules, [form.modules]);
  const productLabel = desktopMode ? `${SIFOBOOKS_PRODUCT_NAME} Desktop` : `${SIFOBOOKS_PRODUCT_NAME} Cloud`;

  const canContinue = [
    true,
    !!form.name.trim() && !!form.country,
    !!form.currency,
    form.modules.length > 0,
    !!form.branchName.trim() && !!form.warehouseName.trim(),
    !!form.currency,
    !!form.adminName.trim(),
    true,
    true,
    true,
  ][step];

  const toggleModule = (module: string) => {
    setForm(prev => ({ ...prev, modules: prev.modules.includes(module) ? prev.modules.filter(x => x !== module) : [...prev.modules, module] }));
  };

  const saveDesktopDevices = async () => {
    if (!desktopMode) return;
    try {
      await fetch("/api/network/config", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "offline", server: { host: "127.0.0.1", port: desktopPort || 3000, display_name: `${form.name || "SifoBooks"} Server` } })
      });
    } catch {}
    try { localStorage.setItem("sifobooks-device-settings", JSON.stringify({ receiptPrinter: form.receiptPrinter, paperSize: form.paperSize, kitchenPrinter: form.kitchenPrinter, cashDrawer: form.cashDrawer, barcodeScanner: form.barcodeScanner, kitchenDisplay: form.kitchenDisplay })); } catch {}
  };

  const finish = async () => {
    setError(null); setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Your registration session has expired. Please sign in again.");
      let company: any = null;
      const { data: profile } = await supabase.from("profiles").select("active_company_id").eq("id", u.user.id).maybeSingle();
      if (profile?.active_company_id) {
        const { data } = await supabase.from("companies").select("*").eq("id", profile.active_company_id).maybeSingle(); company = data;
      }
      if (!company) {
        const { data } = await supabase.from("companies").select("*").eq("user_id", u.user.id).order("created_at").limit(1).maybeSingle(); company = data;
      }
      const companyPayload = {
        name: form.name.trim(), trading_name: form.tradingName.trim() || null, tpin: form.tpin.trim() || null,
        vat_number: form.vatNumber.trim() || null, vat_registered: form.vatRegistered,
        address: form.address.trim() || null, city: form.city.trim() || null, country: form.country,
        phone: form.phone.trim() || null, email: form.email.trim() || null, logo_url: form.logoUrl.trim() || null,
        financial_year_start_month: 1, base_currency: form.currency, timezone: "Africa/Lusaka", industry: form.industry,
        workspace_mode: SIFOBOOKS_EDITION, status: "active",
      };
      if (company) {
        const { data, error } = await supabase.from("companies").update(companyPayload).eq("id", company.id).select().single();
        if (error) throw error; company = data;
      } else {
        const { data, error } = await supabase.from("companies").insert({ id: crypto.randomUUID(), user_id: u.user.id, ...companyPayload }).select().single();
        if (error) throw error; company = data;
      }
      await supabase.from("profiles").update({
        business_name: form.name.trim(), country: form.country, currency: form.currency, tax_id: form.tpin.trim() || null,
        phone: form.phone.trim() || null, team_size: "1", industry: form.industry, tpin: form.tpin.trim() || null,
        vat_registered: form.vatRegistered, active_company_id: company.id, onboarded: true,
      }).eq("id", u.user.id);

      const { data: existingMembers } = await supabase.from("company_members").select("id").eq("company_id", company.id).eq("user_id", u.user.id).limit(1);
      if (!existingMembers?.length) await supabase.from("company_members").insert({ id: crypto.randomUUID(), company_id: company.id, user_id: u.user.id, role: "owner" });

      const { data: existingModules } = await supabase.from("company_modules").select("module_key").eq("company_id", company.id);
      const existingKeys = new Set((existingModules ?? []).map((x: any) => x.module_key));
      for (const module of form.modules) {
        if (!existingKeys.has(module.toLowerCase().replace(/[^a-z0-9]+/g, "_"))) {
          await supabase.from("company_modules").insert({ id: crypto.randomUUID(), user_id: u.user.id, company_id: company.id, module_key: module.toLowerCase().replace(/[^a-z0-9]+/g, "_"), config: JSON.stringify({ enabled: true, source: "onboarding" }) });
        }
      }

      const { data: existingBranches } = await supabase.from("branches").select("id").eq("company_id", company.id).limit(1);
      let branchId = existingBranches?.[0]?.id;
      if (!branchId) {
        const { data: branch, error: branchError } = await supabase.from("branches").insert({
          id: crypto.randomUUID(), user_id: u.user.id, company_id: company.id, name: form.branchName.trim(),
          code: "MAIN", city: form.branchCity.trim() || form.city.trim() || null, address: form.branchAddress.trim() || form.address.trim() || null,
          phone: form.branchPhone.trim() || form.phone.trim() || null, active: 1,
        }).select().single();
        if (branchError) throw branchError;
        branchId = branch?.id;
      }
      const { data: warehouses } = await supabase.from("warehouses").select("id").eq("company_id", company.id).limit(1);
      if (!warehouses?.length) {
        await supabase.from("warehouses").insert({
          id: crypto.randomUUID(), user_id: u.user.id, company_id: company.id, branch_id: branchId || null,
          name: form.warehouseName.trim(), code: "MAIN", location: form.branchCity.trim() || form.city.trim() || null, is_active: 1,
        });
      }

      try {
        const sol = getSolution(form.industry.toLowerCase());
        if (sol) await applyIndustrySolution({ userId: u.user.id, companyId: company.id, solutionId: sol.id });
      } catch {}

      await saveDesktopDevices();
      try { localStorage.removeItem("sifobooks-onboarding-draft"); } catch {}
      setSaving(false);
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      setSaving(false); setError(e?.message || "Could not finish SifoBooks setup.");
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="grid gap-6 md:grid-cols-[1.1fr_.9fr] items-center">
          <div>
            <div className="flex items-center gap-3 mb-5"><img src="/sifobooks-logo.svg" className="h-12 w-12" /><div><div className="text-3xl font-black text-slate-900">SifoBooks</div><div className="text-xs text-slate-500">Business Made Simple</div></div></div>
            <h2 className="text-3xl font-black text-slate-900">Welcome to SifoBooks {desktopMode ? "Desktop" : "Cloud"}</h2>
            <p className="mt-2 text-slate-600">Your {desktopMode ? "offline-first Windows business management system" : "connected business management system"}.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                [WifiOff, desktopMode ? "Local Windows installation" : "Secure cloud workspace"],
                [Database, desktopMode ? "No internet required for normal operation" : "Access your business from anywhere"],
                [HardDrive, desktopMode ? "Local SQLite business data" : "Cloud data with secure access"],
                [ShieldCheck, "Designed for Zambia businesses"],
              ].map(([I, text]) => <div key={text as string} className="flex items-center gap-2 text-sm text-slate-700"><I className="h-4 w-4 text-emerald-700" /><span>{text as string}</span></div>)}
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-4 w-4" /> Estimated setup time: 5–10 minutes</div>
          </div>
          <div className="hidden md:flex min-h-[300px] rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-700 items-end justify-center p-8 overflow-hidden">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center text-white backdrop-blur"><Building2 className="mx-auto h-16 w-16 text-amber-300" /><div className="mt-4 text-xl font-bold">{SIFOBOOKS_PRODUCT_NAME}</div><div className="text-sm text-emerald-100">{desktopMode ? "Standalone Windows Edition" : "Cloud Edition"}</div></div>
          </div>
        </div>
      );
      case 1: return (
        <div className="space-y-5">
          <div><h2 className="text-2xl font-black text-slate-900">Tell us about your business</h2><p className="text-sm text-slate-500">This information will appear on invoices, receipts and reports.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company Name *"><Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Sunrise Restaurant Ltd" /></Field>
            <Field label="Trading Name"><Input value={form.tradingName} onChange={e => update("tradingName", e.target.value)} placeholder="Sunrise Restaurant" /></Field>
            <Field label="Business Type"><Select value={form.businessType} onValueChange={v => update("businessType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Limited Company","Sole Trader","Partnership","NGO / Association","School","Church / Organisation","Government / Public Service"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Industry"><Select value={form.industry} onValueChange={v => update("industry", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Accounting","Retail","Restaurant","Hotel","School","Property","General","Lending"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Country"><Input value={form.country} onChange={e => update("country", e.target.value)} /></Field>
            <Field label="Province"><Input value={form.province} onChange={e => update("province", e.target.value)} placeholder="Copperbelt" /></Field>
            <Field label="City / Town"><Input value={form.city} onChange={e => update("city", e.target.value)} placeholder="Ndola" /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+260 97 123456" /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="info@company.co.zm" /></Field>
            <Field label="Company Logo URL (optional)"><Input value={form.logoUrl} onChange={e => update("logoUrl", e.target.value)} placeholder="/company-logo.png" /></Field>
            <Field label="Address" className="sm:col-span-2"><Input value={form.address} onChange={e => update("address", e.target.value)} placeholder="Plot 123, Main Street" /></Field>
          </div>
        </div>
      );
      case 2: return (
        <div className="space-y-5">
          <div><h2 className="text-2xl font-black text-slate-900">Business Registration & Tax</h2><p className="text-sm text-slate-500">You can complete ZRA/VSDC device configuration later if it is not ready.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="PACRA Registration No."><Input value={form.pacra} onChange={e => update("pacra", e.target.value)} placeholder="120230012345" /></Field>
            <Field label="TPIN"><Input value={form.tpin} onChange={e => update("tpin", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit TPIN" /></Field>
            <div className="flex items-center gap-3 sm:col-span-2 rounded-xl border p-3"><Switch checked={form.vatRegistered} onCheckedChange={v => update("vatRegistered", v)} /><Label>VAT Registered?</Label></div>
            <Field label="VAT Number"><Input value={form.vatNumber} onChange={e => update("vatNumber", e.target.value)} placeholder="VAT number" /></Field>
            <Field label="ZRA Smart Invoice (VSDC)"><Select value={form.zra} onValueChange={v => update("zra", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_configured">Not configured yet</SelectItem><SelectItem value="configured">Configured</SelectItem><SelectItem value="testing">Testing / UAT</SelectItem></SelectContent></Select></Field>
            <Field label="Accounting Year Start"><Select value={form.financialYear} onValueChange={v => update("financialYear", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="January – December">January – December</SelectItem><SelectItem value="July – June">July – June</SelectItem><SelectItem value="April – March">April – March</SelectItem></SelectContent></Select></Field>
            <Field label="Default Currency"><Select value={form.currency} onValueChange={v => update("currency", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["ZMW","USD","EUR","GBP","ZAR","KES","MWK"].map(x => <SelectItem key={x} value={x}>{x} – {x === "ZMW" ? "Zambian Kwacha" : x}</SelectItem>)}</SelectContent></Select></Field>
            <div className="flex items-center gap-3 sm:col-span-2 rounded-xl border p-3"><Switch checked={form.taxInclusive} onCheckedChange={v => update("taxInclusive", v)} /><Label>Tax inclusive pricing?</Label></div>
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-5">
          <div><h2 className="text-2xl font-black text-slate-900">What do you want to manage?</h2><p className="text-sm text-slate-500">Select the modules you want to use. You can change them later.</p></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{baseModules.map(m => <IconTile key={m} icon={moduleIcons[m] || Wrench} label={m} checked={selectedModules.includes(m)} onClick={() => toggleModule(m)} />)}</div>
          {form.industry === "Restaurant" && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="font-semibold text-emerald-900">Restaurant module includes</div><div className="mt-2 grid grid-cols-2 gap-2 text-xs text-emerald-800"><span>✓ Restaurant POS</span><span>✓ Stock Integration</span><span>✓ Tables Management</span><span>✓ Cash Integration & End of Day</span><span>✓ Kitchen Display (KDS)</span><span>✓ Restaurant Reports</span></div></div>}
        </div>
      );
      case 4: return (
        <div className="space-y-5">
          <div><h2 className="text-2xl font-black text-slate-900">Where does your business operate?</h2><p className="text-sm text-slate-500">Create your first branch and stock location.</p></div>
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-5 space-y-4 border-emerald-200"><div className="flex gap-2 font-bold"><MapPin className="h-5 w-5 text-emerald-700" /> Main Branch</div><Field label="Branch Name"><Input value={form.branchName} onChange={e => update("branchName", e.target.value)} /></Field><Field label="City / Town"><Input value={form.branchCity} onChange={e => update("branchCity", e.target.value)} placeholder={form.city || "Ndola"} /></Field><Field label="Address"><Input value={form.branchAddress} onChange={e => update("branchAddress", e.target.value)} placeholder={form.address || "Branch address"} /></Field><Field label="Phone"><Input value={form.branchPhone} onChange={e => update("branchPhone", e.target.value)} placeholder={form.phone || "+260"} /></Field></Card>
            <Card className="p-5 space-y-4 border-amber-200"><div className="flex gap-2 font-bold"><Warehouse className="h-5 w-5 text-amber-600" /> Main Warehouse</div><Field label="Warehouse Name"><Input value={form.warehouseName} onChange={e => update("warehouseName", e.target.value)} /></Field><div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">This becomes the default inventory location for your first branch. Additional warehouses can be added from Setup Centre.</div><Button type="button" variant="outline" className="w-full" onClick={() => update("warehouseName", form.warehouseName || "Main Warehouse")}><PlusIcon /> Add Another Warehouse Later</Button></Card>
          </div>
        </div>
      );
      case 5: return (
        <div className="space-y-5">
          <div><h2 className="text-2xl font-black text-slate-900">Set up your accounting</h2><p className="text-sm text-slate-500">Start with a disciplined Zambia-first accounting structure.</p></div>
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-5"><div className="font-semibold mb-3">Accounting Basis</div><div className="grid grid-cols-2 gap-3">{(["accrual","cash"] as const).map(v => <button type="button" key={v} onClick={() => update("accountingBasis", v)} className={`rounded-xl border p-4 text-left ${form.accountingBasis === v ? "border-emerald-500 bg-emerald-50" : ""}`}><div className="font-semibold capitalize">{v}</div><div className="text-xs text-slate-500">{v === "accrual" ? "Recommended for formal businesses" : "Simple cash basis"}</div></button>)}</div></Card>
            <Card className="p-5"><div className="font-semibold mb-3">Chart of Accounts</div><div className="space-y-2">{[["standard","Use SifoBooks Zambia Chart of Accounts"],["import","Import my existing Chart of Accounts"],["manual","Set up manually"]].map(([v,l]) => <button type="button" key={v} onClick={() => update("coa", v as any)} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm ${form.coa === v ? "border-emerald-500 bg-emerald-50" : ""}`}><span className={`h-4 w-4 rounded-full border-2 ${form.coa === v ? "border-emerald-600 bg-emerald-600" : "border-slate-300"}`} />{l}</button>)}</div></Card>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="inline h-4 w-4 mr-2" />SifoBooks will prepare the accounting workspace using your selected currency, financial year and tax settings.</div>
        </div>
      );
      case 6: return (
        <div className="space-y-5">
          <div><h2 className="text-2xl font-black text-slate-900">Create your SifoBooks Administrator</h2><p className="text-sm text-slate-500">This administrator controls this SifoBooks installation.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl"><Field label="Full Name"><Input value={form.adminName} onChange={e => update("adminName", e.target.value)} placeholder="Pritchard Sikazwe" /></Field><Field label="Username"><Input value={form.adminUsername} onChange={e => update("adminUsername", e.target.value)} /></Field><div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><KeyRound className="inline h-4 w-4 mr-2" />Your sign-in password was created during registration. This step links that account to the company owner role.</div><div className="sm:col-span-2 flex items-center gap-3 rounded-xl border p-4"><ShieldCheck className="h-5 w-5 text-emerald-700" /><div><div className="font-semibold">Administrator permissions</div><div className="text-xs text-slate-500">Full company, accounting, inventory, POS and setup permissions.</div></div></div></div>
        </div>
      );
      case 7: return (
        <div className="space-y-5">
          <div><h2 className="text-2xl font-black text-slate-900">Protect Your Business Data</h2><p className="text-sm text-slate-500">Standalone Windows installations use local backups. Cloud installations use cloud data protection.</p></div>
          <Card className="max-w-3xl p-5 space-y-5"><div className="flex items-center gap-3"><Switch checked={form.backupEnabled} onCheckedChange={v => update("backupEnabled", v)} /><div><div className="font-semibold">Enable automatic backups</div><div className="text-xs text-slate-500">Recommended</div></div></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Backup Frequency"><Select value={form.backupFrequency} onValueChange={v => update("backupFrequency", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Daily">Daily</SelectItem><SelectItem value="Every 6 hours">Every 6 hours</SelectItem><SelectItem value="Weekly">Weekly</SelectItem></SelectContent></Select></Field><Field label="Keep Last"><Select value={form.backupRetention} onValueChange={v => update("backupRetention", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7 backups">7 backups</SelectItem><SelectItem value="30 backups">30 backups</SelectItem><SelectItem value="90 backups">90 backups</SelectItem></SelectContent></Select></Field><Field label="Backup Location" className="sm:col-span-2"><Input value={form.backupPath} onChange={e => update("backupPath", e.target.value)} /></Field></div><div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900"><Database className="inline h-5 w-5 mr-2" />Your accounting data is stored locally on this computer. Make regular backups to another drive or external storage.</div></Card>
        </div>
      );
      case 8: return (
        <div className="space-y-5">
          <div><h2 className="text-2xl font-black text-slate-900">Set up your devices</h2><p className="text-sm text-slate-500">{desktopMode ? "These settings are saved for your Windows installation." : "You can configure cloud-connected devices after setup."}</p></div>
          <div className="grid gap-4 md:grid-cols-2">{[
            ["Receipt Printer", form.receiptPrinter, "receiptPrinter", "EPSON TM-T20III Receipt"],
            ["Paper Size", form.paperSize, "paperSize", "80mm (Recommended)"],
            ["Kitchen Printer", form.kitchenPrinter, "kitchenPrinter", "EPSON TM-T20III Kitchen"],
            ["Cash Drawer", form.cashDrawer, "cashDrawer", "Connected (Auto Open)"],
            ["Barcode Scanner", form.barcodeScanner, "barcodeScanner", "Connected"],
            ["Kitchen Display (Optional)", form.kitchenDisplay, "kitchenDisplay", "Not configured yet"],
          ].map(([label,value,key,placeholder]) => <Field key={key as string} label={label as string}><div className="flex gap-2"><Input value={value as string} onChange={e => update(key as keyof Form, e.target.value as never)} placeholder={placeholder as string} /><Button type="button" variant="outline" size="icon"><Printer className="h-4 w-4" /></Button></div></Field>)}</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"><Printer className="inline h-4 w-4 mr-2" />Use Windows printer names here. You can test and change printers later from Printing Settings.</div>
        </div>
      );
      case 9: return (
        <div className="space-y-5">
          <div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"><Check className="h-9 w-9 text-emerald-700" /></div><h2 className="mt-4 text-2xl font-black text-slate-900">Your SifoBooks installation is ready!</h2><p className="text-sm text-slate-500">Your business is set up and ready to use.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
            ["Business", form.name || "—"], ["Edition", SIFOBOOKS_EDITION_LABEL[SIFOBOOKS_EDITION]], ["Location", form.branchName || "—"], ["Currency", form.currency], ["Accounting Year", form.financialYear], ["VAT Registered", form.vatRegistered ? "Yes" : "No"], ["Modules", form.modules.length + " enabled"], ["Database", desktopMode ? "Local SQLite" : "Cloud"], ["Backup", form.backupEnabled ? `${form.backupFrequency} (${form.backupRetention})` : "Disabled"], ["Administrator", form.adminName || "—"],
          ].map(([k,v]) => <div key={k} className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">{k}</div><div className="mt-1 font-semibold text-slate-900">{v}</div></div>)}</div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-3 py-5 md:px-6 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><img src="/sifobooks-logo.svg" className="h-9 w-9" /><div><div className="font-black text-slate-900">SifoBooks</div><div className="text-[10px] text-slate-500">{productLabel}</div></div></div><div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">{desktopMode ? "OFFLINE-FIRST WINDOWS" : "CLOUD"}</div></div>
        <div className="grid overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-2xl lg:grid-cols-[235px_1fr]">
          <aside className="bg-gradient-to-b from-emerald-950 to-emerald-800 p-4 text-white">
            <div className="mb-5 text-xs font-semibold uppercase tracking-widest text-emerald-200">Setup</div>
            <div className="space-y-1">{steps.map(([title], i) => <button key={title} type="button" onClick={() => i <= step && setStep(i)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${i === step ? "bg-amber-500 text-emerald-950 font-bold" : i < step ? "text-white" : "text-emerald-200"}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${i < step ? "border-white bg-white text-emerald-900" : "border-current"}`}>{i < step ? "✓" : i + 1}</span>{title}</button>)}</div>
          </aside>
          <main className="min-w-0 p-5 md:p-8">
            <div className="mb-6 flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-widest text-amber-600">Step {step + 1} of {steps.length}</div><div className="mt-1 text-sm font-medium text-slate-500">{steps[step][1]}</div></div><div className="flex gap-1">{steps.map((_,i)=><div key={i} className={`h-1.5 w-5 rounded-full ${i <= step ? "bg-emerald-700" : "bg-slate-200"}`} />)}</div></div>
            {renderStep()}
            {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="mt-8 flex items-center justify-between border-t pt-5"><Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>{step < steps.length - 1 ? <Button onClick={() => setStep(s => s + 1)} disabled={!canContinue} className="bg-emerald-800 hover:bg-emerald-900">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button onClick={finish} disabled={saving || !canContinue} className="bg-amber-500 text-emerald-950 hover:bg-amber-400">{saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Open SifoBooks <ArrowRight className="ml-2 h-4 w-4" /></Button>}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function PlusIcon() { return <span className="mr-2 text-lg">+</span>; }
