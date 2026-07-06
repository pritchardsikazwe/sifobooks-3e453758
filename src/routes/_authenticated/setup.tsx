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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, MapPin, Users, Wallet, CalendarRange, Percent, BriefcaseBusiness, ShieldCheck, GitBranch, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { monthName } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({ meta: [{ title: "Company Setup — EdgeCore" }, { name: "robots", content: "noindex" }] }),
  component: SetupPage,
});

type Company = { id: string; name: string; trading_name: string | null; tpin: string | null; vat_number: string | null; vat_registered: boolean; address: string | null; city: string | null; country: string | null; phone: string | null; email: string | null; website: string | null; financial_year_start_month: number; base_currency: string; timezone: string };

function SetupPage() {
  const [userId, setUserId] = useState<string>("");
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data } = await supabase.from("companies").select("*").eq("user_id", u.user.id).maybeSingle();
      if (data) setCompany(data as Company);
      else {
        const { data: created } = await supabase.from("companies").insert({ user_id: u.user.id, name: "My Company", base_currency: "ZMW", country: "Zambia" }).select().single();
        if (created) setCompany(created as Company);
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
        <TabsList className="grid grid-cols-3 md:grid-cols-9 h-auto p-1">
          <TabsTrigger value="profile" className="gap-1"><Building2 className="h-3.5 w-3.5" /><span className="hidden md:inline">Profile</span></TabsTrigger>
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
        <TabsContent value="branches" className="mt-4"><BranchesTab userId={userId} companyId={company.id} /></TabsContent>
        <TabsContent value="departments" className="mt-4"><DepartmentsTab userId={userId} companyId={company.id} /></TabsContent>
        <TabsContent value="costs" className="mt-4"><CostCentresTab userId={userId} companyId={company.id} /></TabsContent>
        <TabsContent value="fy" className="mt-4"><FinancialYearTab company={company} onSaved={setCompany} /></TabsContent>
        <TabsContent value="tax" className="mt-4"><TaxTab userId={userId} companyId={company.id} /></TabsContent>
        <TabsContent value="positions" className="mt-4"><PositionsTab userId={userId} companyId={company.id} /></TabsContent>
        <TabsContent value="roles" className="mt-4"><RolesTab /></TabsContent>
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
    }).eq("id", c.id).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (data) { onSaved(data as Company); toast.success("Company profile saved"); }
  };
  return (
    <Card>
      <CardHeader><CardTitle>Company Profile</CardTitle><CardDescription>Your legal and contact details for invoices and compliance.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
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
        <div className="sm:col-span-2 flex justify-end">
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save profile</Button>
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
          Current FY: <b>{monthName(m)} {new Date().getFullYear()}</b> → <b>{monthName(((m - 2 + 12) % 12) + 1)} {new Date().getFullYear() + 1}</b>
        </div>
        <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">Save</Button>
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
            <Button onClick={add} size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4" /> Add</Button>
          </div>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader><TableRow>{columns.map(c => <TableHead key={c.key}>{c.label}</TableHead>)}<TableHead className="w-12" /></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={columns.length + 1} className="text-center py-6 text-slate-400">Loading…</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={columns.length + 1} className="text-center py-6 text-slate-400">None yet — add your first above.</TableCell></TableRow>
                : rows.map(r => (
                  <TableRow key={r.id}>
                    {columns.map(c => <TableCell key={c.key}>{c.render ? c.render(r[c.key], r) : String(r[c.key] ?? "—")}</TableCell>)}
                    <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-slate-400" /></Button></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
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

function RolesTab() {
  return (
    <Card>
      <CardHeader><CardTitle>Roles & Permissions</CardTitle><CardDescription>Multi-user role management.</CardDescription></CardHeader>
      <CardContent>
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          Role-based access will be enabled in the next phase alongside the HR module (employee records, invites, and permission grants).
          For now every account acts as company owner with full access.
        </div>
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
