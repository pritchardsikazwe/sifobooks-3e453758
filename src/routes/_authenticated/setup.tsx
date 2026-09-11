import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DTColumn } from "@/components/data-table";
import { Building2, MapPin, Users, Wallet, CalendarRange, Percent, BriefcaseBusiness, ShieldCheck, GitBranch, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { monthName } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({ meta: [{ title: "Company Setup — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: SetupPage,
});

type Company = { id: string; user_id: string; name: string; trading_name: string | null; tpin: string | null; vat_number: string | null; vat_registered: boolean; address: string | null; city: string | null; country: string | null; phone: string | null; email: string | null; website: string | null; logo_url: string | null; financial_year_start_month: number; base_currency: string; timezone: string; payslip_header: string | null; payslip_footer: string | null };

function SetupPage() {
  const [userId, setUserId] = useState<string>("");
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data: prof } = await supabase.from("profiles").select("active_company_id").eq("id", u.user.id).maybeSingle();
      let data: any = null;
      if (prof?.active_company_id) {
        const { data: c } = await supabase.from("companies").select("*").eq("id", prof.active_company_id).maybeSingle();
        data = c;
      }
      if (!data) {
        const { data: any1 } = await supabase.from("companies").select("*").eq("user_id", u.user.id).order("created_at").limit(1).maybeSingle();
        data = any1;
      }
      if (data) {
        setCompany(data as Company);
        if (prof && prof.active_company_id !== data.id) {
          await supabase.from("profiles").update({ active_company_id: data.id }).eq("id", u.user.id);
        }
      } else {
        const { data: created } = await supabase.from("companies").insert({ user_id: u.user.id, name: "My Company", base_currency: "ZMW", country: "Zambia" }).select().single();
        if (created) {
          setCompany(created as Company);
          await supabase.from("profiles").update({ active_company_id: created.id }).eq("id", u.user.id);
        }
      }
      setLoading(false);
    })();
  }, []);

  if (loading || !company) {
    return <div className="p-8 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading setup…</div>;
  }

  return (
    <div className="px-6 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Setup</h1>
        <p className="text-sm text-slate-500 mt-1">Configure everything your business needs before running daily operations.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-10 h-auto p-1">
          <TabsTrigger value="profile" className="gap-1"><Building2 className="h-3.5 w-3.5" /><span className="hidden md:inline">Profile</span></TabsTrigger>
          <TabsTrigger value="companies" className="gap-1"><Building2 className="h-3.5 w-3.5" /><span className="hidden md:inline">Companies</span></TabsTrigger>
          <TabsTrigger value="branches" className="gap-1"><MapPin className="h-3.5 w-3.5" /><span className="hidden md:inline">Branches</span></TabsTrigger>
          <TabsTrigger value="departments" className="gap-1"><Users className="h-3.5 w-3.5" /><span className="hidden md:inline">Departments</span></TabsTrigger>
          <TabsTrigger value="costs" className="gap-1"><Wallet className="h-3.5 w-3.5" /><span className="hidden md:inline">Cost Centres</span></TabsTrigger>
          <TabsTrigger value="fy" className="gap-1"><CalendarRange className="h-3.5 w-3.5" /><span className="hidden md:inline">Financial Year</span></TabsTrigger>
          <TabsTrigger value="tax" className="gap-1"><Percent className="h-3.5 w-3.5" /><span className="hidden md:inline">Tax</span></TabsTrigger>
          <TabsTrigger value="positions" className="gap-1"><BriefcaseBusiness className="h-3.5 w-3.5" /><span className="hidden md:inline">Positions</span></TabsTrigger>
          <TabsTrigger value="roles" className="gap-1"><ShieldCheck className="h-3.5 w-3.5" /><span className="hidden md:inline">Roles</span></TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1"><GitBranch className="h-3.5 w-3.5" /><span className="hidden md:inline">Approvals</span></TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4"><ProfileTab company={company} onSaved={setCompany} /></TabsContent>
        <TabsContent value="companies" className="mt-4"><CompaniesTab userId={userId} activeId={company.id} /></TabsContent>
        <TabsContent value="branches" className="mt-4"><BranchesTab userId={userId} companyId={company.id} /></TabsContent>
        <TabsContent value="departments" className="mt-4"><DepartmentsTab userId={userId} companyId={company.id} /></TabsContent>
        <TabsContent value="costs" className="mt-4"><CostCentresTab userId={userId} companyId={company.id} /></TabsContent>
        <TabsContent value="fy" className="mt-4"><FinancialYearTab company={company} onSaved={setCompany} /></TabsContent>
        <TabsContent value="tax" className="mt-4"><TaxTab userId={userId} companyId={company.id} /></TabsContent>
        <TabsContent value="positions" className="mt-4"><PositionsTab userId={userId} companyId={company.id} /></TabsContent>
        <TabsContent value="roles" className="mt-4"><RolesTab userId={userId} companyId={company.id} /></TabsContent>
        <TabsContent value="approvals" className="mt-4"><ApprovalsTab userId={userId} companyId={company.id} /></TabsContent>

      </Tabs>
    </div>
  );
}

function ProfileTab({ company, onSaved }: { company: Company; onSaved: (c: Company) => void }) {
  const [c, setC] = useState(company);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.from("companies").update({
      name: c.name, trading_name: c.trading_name, tpin: c.tpin, vat_number: c.vat_number, vat_registered: c.vat_registered,
      address: c.address, city: c.city, country: c.country, phone: c.phone, email: c.email, website: c.website,
      base_currency: c.base_currency, timezone: c.timezone,
      payslip_header: c.payslip_header, payslip_footer: c.payslip_footer,
    }).eq("id", c.id).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (data) { onSaved(data as Company); toast.success("Company profile saved"); }
  };
  return (
    <div className="space-y-4">
    <AdministratorEmailCard companyId={c.id} companyName={c.name} />
    <Card>
      <CardHeader><CardTitle>Company Profile</CardTitle><CardDescription>Your legal, contact and branding details for invoices and compliance.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><LogoUploader company={c} onChange={(url: string | null) => { const next = { ...c, logo_url: url }; setC(next); onSaved(next); }} /></div>
        <Field label="Legal name"><Input value={c.name} onChange={e => setC({ ...c, name: e.target.value })} /></Field>
        <Field label="Trading name"><Input value={c.trading_name ?? ""} onChange={e => setC({ ...c, trading_name: e.target.value })} /></Field>
        <Field label="TPIN"><Input value={c.tpin ?? ""} onChange={e => setC({ ...c, tpin: e.target.value })} placeholder="10-digit TPIN" /></Field>
        <Field label="VAT number"><Input value={c.vat_number ?? ""} onChange={e => setC({ ...c, vat_number: e.target.value })} /></Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Switch id="vatreg" checked={c.vat_registered} onCheckedChange={v => setC({ ...c, vat_registered: v })} />
          <Label htmlFor="vatreg">VAT-registered business</Label>
        </div>
        <Field label="Email"><Input type="email" value={c.email ?? ""} onChange={e => setC({ ...c, email: e.target.value })} /></Field>
        <Field label="Phone"><Input value={c.phone ?? ""} onChange={e => setC({ ...c, phone: e.target.value })} /></Field>
        <Field label="Website"><Input value={c.website ?? ""} onChange={e => setC({ ...c, website: e.target.value })} /></Field>
        <Field label="Country"><Input value={c.country ?? ""} onChange={e => setC({ ...c, country: e.target.value })} /></Field>
        <Field label="City"><Input value={c.city ?? ""} onChange={e => setC({ ...c, city: e.target.value })} /></Field>
        <Field label="Base currency">
          <Select value={c.base_currency} onValueChange={v => setC({ ...c, base_currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["ZMW","USD","EUR","GBP","ZAR","KES","TZS","MWK"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Address" className="sm:col-span-2"><Textarea rows={2} value={c.address ?? ""} onChange={e => setC({ ...c, address: e.target.value })} /></Field>

        <div className="sm:col-span-2 mt-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold text-emerald-900">Payslip branding</div>
            <p className="text-xs text-slate-600">Appears at the top and bottom of every payslip PDF for this company. Logo above is reused.</p>
          </div>
          <Field label="Payslip header text">
            <Input value={c.payslip_header ?? ""} onChange={e => setC({ ...c, payslip_header: e.target.value })}
              placeholder="e.g. Confidential — Human Resources Department" maxLength={160} />
          </Field>
          <Field label="Payslip footer text">
            <Textarea rows={2} value={c.payslip_footer ?? ""} onChange={e => setC({ ...c, payslip_footer: e.target.value })}
              placeholder="e.g. Queries: hr@company.co.zm · +260 971 234 567. This payslip is system-generated." maxLength={280} />
          </Field>
        </div>

        <div className="sm:col-span-2 flex justify-end">
          <Button variant="save" onClick={save} disabled={saving} >{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save profile</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FinancialYearTab({ company, onSaved }: { company: Company; onSaved: (c: Company) => void }) {
  const [m, setM] = useState(company.financial_year_start_month);
  const save = async () => {
    const { data, error } = await supabase.from("companies").update({ financial_year_start_month: m }).eq("id", company.id).select().single();
    if (error) toast.error(error.message);
    else if (data) { onSaved(data as Company); toast.success("Financial year updated"); }
  };
  return (
    <Card>
      <CardHeader><CardTitle>Financial Year</CardTitle><CardDescription>Sets when your books open and close.</CardDescription></CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <Field label="Year starts">
          <Select value={String(m)} onValueChange={v => setM(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(i => <SelectItem key={i} value={String(i)}>{monthName(i)}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <div className="rounded-md bg-slate-50 border p-3 text-sm text-slate-600">
          {(() => {
            const today = new Date();
            const startYear = today.getMonth() + 1 >= m ? today.getFullYear() : today.getFullYear() - 1;
            const endMonth = ((m - 2 + 12) % 12) + 1;
            const endYear = m === 1 ? startYear : startYear + 1;
            return <>Current FY: <b>{monthName(m)} {startYear}</b> → <b>{monthName(endMonth)} {endYear}</b></>;
          })()}
        </div>

        <Button variant="save" onClick={save} >Save</Button>
      </CardContent>
    </Card>
  );
}

/* ---------- Generic list-with-add pattern ---------- */

type Row = Record<string, any> & { id: string };

function ListTab<T extends Row>({ title, description, table, userId, companyId, columns, fields, defaults, transform }: {
  title: string; description: string; table: "branches" | "departments" | "cost_centres" | "tax_settings" | "positions" | "approval_hierarchies";
  userId: string; companyId: string;
  columns: { key: keyof T & string; label: string; render?: (v: any, row: T) => React.ReactNode }[];
  fields: { key: keyof T & string; label: string; type?: "text" | "number" | "select" | "switch" | "textarea"; options?: string[]; placeholder?: string }[];
  defaults: Partial<T>;
  transform?: (v: any, key: string) => any;
}) {
  const [rows, setRows] = useState<T[]>([]);
  const [draft, setDraft] = useState<any>({ ...defaults });
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from(table).select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as T[]);
    setLoading(false);
  };
  useEffect(() => { if (companyId) load(); }, [companyId]);

  const add = async () => {
    const payload: any = { user_id: userId, company_id: companyId };
    for (const f of fields) {
      const v = draft[f.key];
      payload[f.key] = transform ? transform(v, f.key) : v;
    }
    const { error } = await supabase.from(table).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(`${title.slice(0, -1)} added`);
    setDraft({ ...defaults });
    load();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const dtColumns: DTColumn<any>[] = [
    ...columns.map(c => ({
      key: c.key as string,
      header: c.label,
      cell: (r: any) => c.render ? c.render(r[c.key], r) : String(r[c.key] ?? "—"),
    })),
    { key: "actions", header: "", sortable: false, cell: (r: any) => <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-slate-400" /></Button> },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(f => (
              <Field key={f.key} label={f.label}>
                {f.type === "switch" ? (
                  <div className="flex items-center h-9"><Switch checked={!!draft[f.key]} onCheckedChange={v => setDraft({ ...draft, [f.key]: v })} /></div>
                ) : f.type === "textarea" ? (
                  <Textarea rows={2} value={draft[f.key] ?? ""} onChange={e => setDraft({ ...draft, [f.key]: e.target.value })} />
                ) : f.type === "select" && f.options ? (
                  <Select value={String(draft[f.key] ?? "")} onValueChange={v => setDraft({ ...draft, [f.key]: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{f.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input type={f.type === "number" ? "number" : "text"} value={draft[f.key] ?? ""} placeholder={f.placeholder} onChange={e => setDraft({ ...draft, [f.key]: e.target.value })} />
                )}
              </Field>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="save" onClick={add} size="sm" ><Plus className="h-4 w-4" /> Add</Button>
          </div>
        </div>

        <DataTable
          tableId={`setup-${table}`}
          columns={dtColumns}
          data={rows}
          loading={loading}
          searchPlaceholder={null}
          empty="None yet — add your first above."
        />
      </CardContent>
    </Card>
  );
}

function BranchesTab({ userId, companyId }: { userId: string; companyId: string }) {
  return <ListTab title="Branches" description="Add every physical location where you do business."
    table="branches" userId={userId} companyId={companyId}
    columns={[{ key: "name", label: "Name" }, { key: "code", label: "Code" }, { key: "city", label: "City" }, { key: "manager_name", label: "Manager" }, { key: "phone", label: "Phone" }]}
    fields={[{ key: "name", label: "Name", placeholder: "Lusaka HQ" }, { key: "code", label: "Code", placeholder: "LSK" }, { key: "city", label: "City" }, { key: "manager_name", label: "Manager" }, { key: "phone", label: "Phone" }, { key: "address", label: "Address", type: "textarea" }]}
    defaults={{ name: "", code: "", city: "", manager_name: "", phone: "", address: "" }} />;
}
function DepartmentsTab({ userId, companyId }: { userId: string; companyId: string }) {
  return <ListTab title="Departments" description="Group employees and expenses by department."
    table="departments" userId={userId} companyId={companyId}
    columns={[{ key: "name", label: "Name" }, { key: "code", label: "Code" }, { key: "manager_name", label: "Manager" }]}
    fields={[{ key: "name", label: "Name", placeholder: "Finance" }, { key: "code", label: "Code" }, { key: "manager_name", label: "Manager" }, { key: "description", label: "Description", type: "textarea" }]}
    defaults={{ name: "", code: "", manager_name: "", description: "" }} />;
}
function CostCentresTab({ userId, companyId }: { userId: string; companyId: string }) {
  return <ListTab title="Cost Centres" description="Track costs against specific business units or projects."
    table="cost_centres" userId={userId} companyId={companyId}
    columns={[{ key: "name", label: "Name" }, { key: "code", label: "Code" }, { key: "annual_budget", label: "Annual Budget", render: v => Number(v || 0).toLocaleString("en-ZM", { minimumFractionDigits: 2 }) }]}
    fields={[{ key: "name", label: "Name" }, { key: "code", label: "Code" }, { key: "annual_budget", label: "Annual Budget (ZMW)", type: "number" }, { key: "description", label: "Description", type: "textarea" }]}
    defaults={{ name: "", code: "", annual_budget: 0, description: "" }}
    transform={(v, k) => k === "annual_budget" ? Number(v || 0) : v} />;
}
function TaxTab({ userId, companyId }: { userId: string; companyId: string }) {
  return <ListTab title="Tax Settings" description="VAT, withholding tax, turnover tax and any other tax types you apply."
    table="tax_settings" userId={userId} companyId={companyId}
    columns={[{ key: "tax_name", label: "Name" }, { key: "rate", label: "Rate %" }, { key: "applies_to", label: "Applies to" }, { key: "is_default", label: "Default", render: v => v ? "Yes" : "—" }]}
    fields={[{ key: "tax_name", label: "Name", placeholder: "VAT Standard" }, { key: "rate", label: "Rate (%)", type: "number", placeholder: "16" }, { key: "applies_to", label: "Applies to", type: "select", options: ["sales","purchases","payroll","both"] }, { key: "is_default", label: "Default", type: "switch" }]}
    defaults={{ tax_name: "", rate: 0, applies_to: "sales", is_default: false }}
    transform={(v, k) => k === "rate" ? Number(v || 0) : k === "is_default" ? !!v : v} />;
}
function PositionsTab({ userId, companyId }: { userId: string; companyId: string }) {
  return <ListTab title="Employee Positions" description="Job titles used across departments."
    table="positions" userId={userId} companyId={companyId}
    columns={[{ key: "title", label: "Title" }, { key: "level", label: "Level" }]}
    fields={[{ key: "title", label: "Title", placeholder: "Accountant" }, { key: "level", label: "Level", type: "select", options: ["Junior","Mid","Senior","Manager","Director","Executive"] }, { key: "description", label: "Description", type: "textarea" }]}
    defaults={{ title: "", level: "", description: "" }} />;
}
function ApprovalsTab({ userId, companyId }: { userId: string; companyId: string }) {
  return <ListTab title="Approval Hierarchy" description="Route transactions through the right approvers based on amount."
    table="approval_hierarchies" userId={userId} companyId={companyId}
    columns={[{ key: "module", label: "Module" }, { key: "min_amount", label: "Min" }, { key: "max_amount", label: "Max" }, { key: "approver_role", label: "Approver" }, { key: "level", label: "Level" }]}
    fields={[
      { key: "module", label: "Module", type: "select", options: ["purchase","expense","leave","payment","sales_discount","budget"] },
      { key: "min_amount", label: "Min amount", type: "number" },
      { key: "max_amount", label: "Max amount", type: "number" },
      { key: "approver_role", label: "Approver role", placeholder: "Manager / Director" },
      { key: "level", label: "Level", type: "number", placeholder: "1" },
    ]}
    defaults={{ module: "purchase", min_amount: 0, max_amount: 0, approver_role: "", level: 1 }}
    transform={(v, k) => ["min_amount","max_amount","level"].includes(k) ? Number(v || 0) : v} />;
}

const MEMBER_ROLES = ["owner", "admin", "manager", "staff", "viewer"] as const;

function RolesTab({ userId, companyId }: { userId: string; companyId: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    // company_members.user_id points at auth.users, not public.profiles, so an
    // embedded profiles:user_id(...) select cannot be resolved — the names and
    // emails are fetched separately and joined here.
    const fetchMembers = async () => {
      const { data } = await supabase.from("company_members")
        .select("*").eq("company_id", companyId).order("created_at");
      return data ?? [];
    };
    let rows = await fetchMembers();
    if (userId && !rows.some((r: any) => r.user_id === userId)) {
      await supabase.from("company_members").insert({ company_id: companyId, user_id: userId, role: "owner", created_by: userId });
      rows = await fetchMembers();
    }
    const ids = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
    let byId = new Map<string, any>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", ids as string[]);
      byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    }
    setMembers(rows.map((r: any) => ({ ...r, profiles: byId.get(r.user_id) ?? null })));
    setLoading(false);
  };
  useEffect(() => { if (companyId) load(); /* eslint-disable-next-line */ }, [companyId, userId]);

  const add = async () => {
    if (!email.trim()) return toast.error("Email required");
    setBusy(true);
    const { data: prof } = await supabase.from("profiles").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
    if (!prof) { setBusy(false); return toast.error("No user with that email — ask them to sign up first, then add them."); }
    const { error } = await supabase.from("company_members").insert({
      company_id: companyId, user_id: prof.id, role: role as any, created_by: userId, invited_email: email.trim().toLowerCase(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Added ${email} as ${role}`);
    setEmail(""); load();
  };

  const updateRole = async (id: string, newRole: string) => {
    const { error } = await supabase.from("company_members").update({ role: newRole as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Role updated"); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this member?")) return;
    const { error } = await supabase.from("company_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <Card>
      <CardHeader><CardTitle>Roles & Permissions</CardTitle><CardDescription>Multi-user role management for this company.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px_auto] gap-2 items-end">
          <Field label="Add teammate by email"><Input value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@company.com" /></Field>
          <Field label="Role">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MEMBER_ROLES.filter(r => r !== "owner").map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Button variant="save" onClick={add} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add</Button>
        </div>

        {loading ? (
          <div className="py-6 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading members…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 border-b">
                <tr><th className="text-left font-medium py-2">Name</th><th className="text-left font-medium py-2">Email</th><th className="text-left font-medium py-2">Role</th><th className="text-right font-medium py-2">Actions</th></tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-center text-slate-500">No members yet.</td></tr>
                ) : members.map(m => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2">{m.profiles?.full_name ?? "—"}</td>
                    <td className="py-2 text-slate-500">{m.profiles?.email ?? m.invited_email ?? "—"}</td>
                    <td className="py-2">
                      <Select value={m.role} onValueChange={v => updateRole(m.id, v)} disabled={m.role === "owner"}>
                        <SelectTrigger className="h-8 w-32 text-xs capitalize"><SelectValue /></SelectTrigger>
                        <SelectContent>{MEMBER_ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => remove(m.id)} disabled={m.role === "owner"}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompaniesTab({ userId, activeId }: { userId: string; activeId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("Zambia");
  const [currency, setCurrency] = useState("ZMW");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("companies").select("id,name,country,base_currency,created_at").eq("user_id", userId).order("created_at");
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { if (userId) load(); /* eslint-disable-next-line */ }, [userId]);

  const create = async () => {
    if (!name.trim()) return toast.error("Company name required");
    setBusy(true);
    const { data, error } = await supabase.from("companies")
      .insert({ user_id: userId, name: name.trim(), country, base_currency: currency })
      .select().single();
    if (error) { setBusy(false); return toast.error(error.message); }
    await supabase.from("profiles").update({ active_company_id: data.id }).eq("id", userId);
    await supabase.from("company_members").insert({ company_id: data.id, user_id: userId, role: "owner", created_by: userId });
    setBusy(false); setName("");
    toast.success(`${data.name} created — switching…`);
    setTimeout(() => window.location.reload(), 400);
  };

  const switchTo = async (id: string) => {
    await supabase.from("profiles").update({ active_company_id: id }).eq("id", userId);
    toast.success("Switched company");
    setTimeout(() => window.location.reload(), 300);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Companies</CardTitle>
        <CardDescription>
          Run several businesses from one account — each keeps its own books.{" "}
          <a href="/companies" className="underline underline-offset-2">Company management (archive, restore, delete)</a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px_120px_auto] gap-2 items-end">
          <Field label="New company name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sifo Trading Ltd" /></Field>
          <Field label="Country"><Input value={country} onChange={e => setCountry(e.target.value)} /></Field>
          <Field label="Currency"><Input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} maxLength={3} /></Field>
          <Button variant="save" onClick={create} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create</Button>
        </div>

        {loading ? (
          <div className="py-6 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading companies…</div>
        ) : (
          <div className="divide-y rounded-md border">
            {rows.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3">
                <Building2 className="h-4 w-4 text-slate-500" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.country ?? "—"} · {c.base_currency ?? "ZMW"}</div>
                </div>
                {c.id === activeId
                  ? <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Active</span>
                  : <Button size="sm" variant="outline" onClick={() => switchTo(c.id)}>Switch</Button>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {children}
    </div>
  );
}

function LogoUploader({ company, onChange }: { company: Company; onChange: (url: string | null) => void }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!company.logo_url) { setPreview(null); return; }
      const { data } = await supabase.storage.from("company-logos").createSignedUrl(company.logo_url, 3600);
      if (!cancelled) setPreview(data?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [company.logo_url]);

  const upload = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Max 2 MB");
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${company.user_id}/${company.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("company-logos").upload(path, file, { upsert: true });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    if (company.logo_url) await supabase.storage.from("company-logos").remove([company.logo_url]);
    const { error: dbErr } = await supabase.from("companies").update({ logo_url: path }).eq("id", company.id);
    setUploading(false);
    if (dbErr) return toast.error(dbErr.message);
    onChange(path);
    toast.success("Logo updated");
  };

  const remove = async () => {
    if (!company.logo_url) return;
    await supabase.storage.from("company-logos").remove([company.logo_url]);
    await supabase.from("companies").update({ logo_url: null }).eq("id", company.id);
    onChange(null);
    toast.success("Logo removed");
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-dashed border-slate-300 bg-slate-50">
      <div className="h-20 w-20 rounded-lg bg-white border flex items-center justify-center overflow-hidden shrink-0">
        {preview ? <img src={preview} alt="Company logo" className="h-full w-full object-contain" /> : <Building2 className="h-8 w-8 text-slate-300" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">Company Logo</div>
        <div className="text-xs text-muted-foreground">PNG, JPG or SVG. Max 2 MB. Appears on invoices, quotes and PDFs.</div>
        <div className="flex items-center gap-2 mt-2">
          <label className="inline-flex">
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${uploading ? "bg-slate-200 text-slate-500" : "bg-[#0f4c5c] text-white hover:bg-[#0c3f4c]"}`}>
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              {company.logo_url ? "Replace logo" : "Upload logo"}
            </span>
          </label>
          {company.logo_url && <Button size="sm" variant="ghost" onClick={remove} className="h-7 text-xs text-red-600">Remove</Button>}
        </div>
      </div>
    </div>
  );
}
