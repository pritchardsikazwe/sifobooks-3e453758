import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldAlert, Loader2, Users, Building2, Power, RefreshCw, Search,
  Activity, Package, Megaphone, ScrollText, Settings2, KeyRound, Trash2, Plus,
  LogIn, DollarSign, Database,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkIsSuperAdmin, type FeatureFlag } from "@/lib/features";

export const Route = createFileRoute("/_authenticated/super-admin")({
  head: () => ({ meta: [{ title: "Super Admin — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: SuperAdminPage,
});

type Company = { id: string; name: string; trading_name: string | null; base_currency: string | null; tpin: string | null; user_id: string; created_at: string; industry?: string | null };
type Profile = { id: string; email: string | null; full_name: string | null; created_at: string; active_company_id?: string | null };
type Plan = { id: string; code: string; name: string; price_monthly: number; currency: string; max_users: number | null; max_invoices: number | null; is_active: boolean; sort_order: number };
type AuditRow = { id: string; user_id: string | null; action: string; entity: string | null; entity_id: string | null; created_at: string; metadata: any };
type Sub = { id: string; company_id: string; plan_id: string; status: string; current_period_end: string | null };

function SuperAdminPage() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [me, setMe] = useState<{ id: string; email: string | null } | null>(null);

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, string[]>>({});

  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [broadcast, setBroadcast] = useState({ title: "", message: "", link: "" });
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) setMe({ id: u.user.id, email: u.user.email ?? null });
    const ok = await checkIsSuperAdmin();
    setAllowed(ok);
    setChecking(false);
    if (!ok) return;
    const [f, c, p, pl, sb, al, ur] = await Promise.all([
      supabase.from("feature_flags").select("*").order("category").order("label"),
      supabase.from("companies").select("id,name,trading_name,base_currency,tpin,user_id,created_at,industry").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,email,full_name,created_at,active_company_id").order("created_at", { ascending: false }).limit(500),
      supabase.from("subscription_plans").select("*").order("sort_order"),
      supabase.from("company_subscriptions").select("id,company_id,plan_id,status,current_period_end"),
      supabase.from("audit_logs").select("id,user_id,action,entity,entity_id,created_at,metadata").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    setFlags((f.data ?? []) as any);
    setCompanies((c.data ?? []) as any);
    setUsers((p.data ?? []) as any);
    setPlans((pl.data ?? []) as any);
    setSubs((sb.data ?? []) as any);
    setAudit((al.data ?? []) as any);
    const rm: Record<string, string[]> = {};
    (ur.data ?? []).forEach((r: any) => { (rm[r.user_id] ||= []).push(r.role); });
    setRoleMap(rm);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (key: string, next: boolean) => {
    setBusy(key);
    const { error } = await supabase.from("feature_flags").update({ enabled: next }).eq("key", key);
    setBusy(null);
    if (error) return toast.error(error.message);
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: next } : f)));
    toast.success(`${next ? "Enabled" : "Disabled"} ${key}`);
  };

  const grantRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error && !`${error.message}`.includes("duplicate")) return toast.error(error.message);
    toast.success(`Granted ${role}`);
    load();
  };
  const revokeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) return toast.error(error.message);
    toast.success(`Revoked ${role}`);
    load();
  };

  const impersonateCompany = async (companyId: string) => {
    if (!me) return;
    const { error } = await supabase.from("profiles").update({ active_company_id: companyId }).eq("id", me.id);
    if (error) return toast.error(error.message);
    toast.success("Active tenant switched — reloading…");
    setTimeout(() => window.location.assign("/dashboard"), 500);
  };

  const deleteCompany = async (id: string, name: string) => {
    if (!confirm(`Permanently delete tenant "${name}" and all related rows? This cannot be undone.`)) return;
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tenant deleted");
    load();
  };

  const savePlan = async (p: Plan) => {
    const { error } = await supabase.from("subscription_plans").update({
      name: p.name, price_monthly: p.price_monthly, max_users: p.max_users,
      max_invoices: p.max_invoices ?? undefined, is_active: p.is_active, sort_order: p.sort_order,
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Plan saved");
  };
  const addPlan = async () => {
    const code = prompt("Plan code (e.g. pro)"); if (!code) return;
    const name = prompt("Plan name"); if (!name) return;
    const { error } = await supabase.from("subscription_plans").insert({
      code, name, price_monthly: 0, currency: "ZMW", is_active: true, sort_order: plans.length,
    });
    if (error) return toast.error(error.message);
    load();
  };
  const removePlan = async (id: string) => {
    if (!confirm("Delete plan?")) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const sendBroadcast = async () => {
    if (!broadcast.title.trim() || !broadcast.message.trim()) return toast.error("Title & message required");
    setSending(true);
    const rows = users.map((u) => ({
      user_id: u.id, title: broadcast.title, message: broadcast.message,
      type: "announcement", link: broadcast.link || null,
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Broadcast sent to ${rows.length} users`);
    setBroadcast({ title: "", message: "", link: "" });
  };

  const rebuildLedgers = async () => {
    if (!confirm("Rebuild ledgers for ALL tenants? This may take a while.")) return;
    setBusy("rebuild");
    const { error } = await supabase.rpc("rebuild_ledgers");
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Ledgers rebuilt");
  };

  const filteredUsers = useMemo(() =>
    users.filter((u) => !q || `${u.email ?? ""} ${u.full_name ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [users, q]);
  const filteredCompanies = useMemo(() =>
    companies.filter((c) => !q || `${c.name} ${c.trading_name ?? ""} ${c.tpin ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [companies, q]);
  const grouped = flags.reduce<Record<string, FeatureFlag[]>>((acc, f) => { (acc[f.category] ||= []).push(f); return acc; }, {});
  const maintenance = flags.find((f) => f.key === "maintenance")?.enabled;
  const signupsOff = flags.find((f) => f.key === "signups")?.enabled === false;

  if (checking) return <div className="p-6 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</div>;
  if (!allowed) {
    return (
      <div className="p-6 max-w-lg">
        <Card className="p-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3 text-amber-800">
            <ShieldAlert className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-semibold">Restricted</h1>
              <p className="text-sm">Only the platform super administrator can view this page.</p>
            </div>
          </div>
          <Link to="/dashboard" className="text-sm text-[#0f4c5c] underline mt-4 inline-block">Return to dashboard</Link>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: "Tenants", value: companies.length, icon: Building2, color: "text-indigo-600 bg-indigo-50" },
    { label: "Users", value: users.length, icon: Users, color: "text-emerald-600 bg-emerald-50" },
    { label: "Active Subscriptions", value: subs.filter((s) => s.status === "active").length, icon: DollarSign, color: "text-amber-600 bg-amber-50" },
    { label: "Features Enabled", value: `${flags.filter((f) => f.enabled).length}/${flags.length}`, icon: Package, color: "text-sky-600 bg-sky-50" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-7 w-7 text-rose-600" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Super Admin Console</h1>
            <p className="text-sm text-slate-500">Platform-wide controls, tenants, users, billing and system settings.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
      </div>

      {maintenance && (
        <Card className="p-4 border-rose-200 bg-rose-50 text-rose-800 flex items-center gap-2">
          <Power className="h-4 w-4" /> Maintenance mode is <b>ON</b> — non-admin users are blocked.
        </Card>
      )}
      {signupsOff && (
        <Card className="p-4 border-amber-200 bg-amber-50 text-amber-800 flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> New sign-ups are currently <b>disabled</b>.
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${s.color}`}><s.icon className="h-5 w-5" /></div>
            <div>
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="text-xl font-semibold text-slate-900">{s.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="tenants">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="tenants"><Building2 className="h-4 w-4 mr-1" /> Tenants</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Users & Roles</TabsTrigger>
          <TabsTrigger value="features"><Settings2 className="h-4 w-4 mr-1" /> Features</TabsTrigger>
          <TabsTrigger value="plans"><DollarSign className="h-4 w-4 mr-1" /> Plans</TabsTrigger>
          <TabsTrigger value="broadcast"><Megaphone className="h-4 w-4 mr-1" /> Broadcast</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="h-4 w-4 mr-1" /> Audit</TabsTrigger>
          <TabsTrigger value="system"><Activity className="h-4 w-4 mr-1" /> System</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-slate-900">Tenants ({filteredCompanies.length})</h2>
              <div className="relative w-72">
                <Search className="h-4 w-4 absolute left-2 top-2.5 text-slate-400" />
                <Input placeholder="Search tenant / TPIN" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 uppercase">
                  <tr><th className="py-2">Name</th><th>Owner</th><th>Industry</th><th>Currency</th><th>TPIN</th><th>Plan</th><th>Created</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCompanies.map((c) => {
                    const owner = users.find((u) => u.id === c.user_id);
                    const sub = subs.find((s) => s.company_id === c.id);
                    const plan = plans.find((p) => p.id === sub?.plan_id);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2 font-medium text-slate-900">{c.trading_name || c.name}</td>
                        <td className="text-slate-600">{owner?.email || "—"}</td>
                        <td className="text-slate-500">{c.industry || "—"}</td>
                        <td>{c.base_currency || "—"}</td>
                        <td className="text-slate-500">{c.tpin || "—"}</td>
                        <td>{plan ? <Badge variant="outline">{plan.name}</Badge> : <span className="text-slate-400 text-xs">Free</span>}</td>
                        <td className="text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs mr-1" onClick={() => impersonateCompany(c.id)}>
                            <LogIn className="h-3 w-3 mr-1" /> Enter
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-600" onClick={() => deleteCompany(c.id, c.trading_name || c.name)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredCompanies.length && <tr><td className="py-4 text-slate-500" colSpan={8}>No tenants.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-slate-900">Users ({filteredUsers.length})</h2>
              <div className="relative w-72">
                <Search className="h-4 w-4 absolute left-2 top-2.5 text-slate-400" />
                <Input placeholder="Search email or name" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 uppercase">
                  <tr><th className="py-2">User</th><th>Email</th><th>Roles</th><th>Joined</th><th className="text-right">Grant / Revoke</th></tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((u) => {
                    const rs = roleMap[u.id] || [];
                    const isSuper = rs.includes("super_admin");
                    return (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-2 font-medium text-slate-900">
                          {u.full_name || "—"}
                          {isSuper && <Badge className="ml-2 bg-rose-100 text-rose-700 border-rose-200">super</Badge>}
                        </td>
                        <td className="text-slate-600">{u.email}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {rs.length ? rs.map((r) => (
                              <Badge key={r} variant="outline" className="text-[10px]">
                                {r}
                                <button className="ml-1 text-rose-500" onClick={() => revokeRole(u.id, r)}>×</button>
                              </Badge>
                            )) : <span className="text-slate-400 text-xs">—</span>}
                          </div>
                        </td>
                        <td className="text-slate-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {["admin", "manager", "accountant", "hr", "sales", "purchaser", "viewer", "super_admin"].map((r) => (
                              <Button key={r} size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => grantRole(u.id, r)}>+ {r}</Button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredUsers.length && <tr><td className="py-4 text-slate-500" colSpan={5}>No users match.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">System Features</h2>
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, list]) => (
                <div key={cat}>
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{cat}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {list.map((f) => (
                      <div key={f.key} className="flex items-start justify-between border rounded-lg p-3 bg-white">
                        <div className="pr-3">
                          <div className="font-medium text-slate-900">{f.label}</div>
                          {f.description && <div className="text-xs text-slate-500 mt-0.5">{f.description}</div>}
                          <div className="text-[10px] text-slate-400 mt-1">key: {f.key}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {busy === f.key && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                          <Switch checked={f.enabled} onCheckedChange={(v) => toggle(f.key, v)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Subscription Plans</h2>
              <Button size="sm" onClick={addPlan}><Plus className="h-4 w-4 mr-1" /> New plan</Button>
            </div>
            <div className="space-y-3">
              {plans.map((p) => (
                <div key={p.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end border rounded-lg p-3">
                  <div>
                    <Label className="text-xs">Code</Label>
                    <div className="text-sm font-mono text-slate-600">{p.code}</div>
                  </div>
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={p.name} onChange={(e) => setPlans((x) => x.map((r) => r.id === p.id ? { ...r, name: e.target.value } : r))} />
                  </div>
                  <div>
                    <Label className="text-xs">Price / mo ({p.currency})</Label>
                    <Input type="number" value={p.price_monthly} onChange={(e) => setPlans((x) => x.map((r) => r.id === p.id ? { ...r, price_monthly: Number(e.target.value) } : r))} />
                  </div>
                  <div>
                    <Label className="text-xs">Max users</Label>
                    <Input type="number" value={p.max_users ?? ""} onChange={(e) => setPlans((x) => x.map((r) => r.id === p.id ? { ...r, max_users: e.target.value ? Number(e.target.value) : null } : r))} />
                  </div>
                  <div>
                    <Label className="text-xs">Max invoices/mo</Label>
                    <Input type="number" value={p.max_invoices ?? ""} onChange={(e) => setPlans((x) => x.map((r) => r.id === p.id ? { ...r, max_invoices: e.target.value ? Number(e.target.value) : null } : r))} />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <div className="flex items-center gap-1">
                      <Switch checked={p.is_active} onCheckedChange={(v) => setPlans((x) => x.map((r) => r.id === p.id ? { ...r, is_active: v } : r))} />
                      <span className="text-xs text-slate-500">Active</span>
                    </div>
                    <Button size="sm" onClick={() => savePlan(p)}>Save</Button>
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => removePlan(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
              {!plans.length && <div className="text-sm text-slate-500 py-6 text-center">No plans yet.</div>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast">
          <Card className="p-5 max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">System Broadcast</h2>
            <p className="text-sm text-slate-500 mb-4">Send an in-app notification to every user on the platform.</p>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={broadcast.title} onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })} placeholder="e.g. Scheduled maintenance tonight" />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea rows={4} value={broadcast.message} onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })} />
              </div>
              <div>
                <Label>Link (optional)</Label>
                <Input value={broadcast.link} onChange={(e) => setBroadcast({ ...broadcast, link: e.target.value })} placeholder="/dashboard" />
              </div>
              <Button onClick={sendBroadcast} disabled={sending}>
                {sending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Send to {users.length} users
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent Audit Trail</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 uppercase">
                  <tr><th className="py-2">When</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr>
                </thead>
                <tbody className="divide-y">
                  {audit.map((a) => {
                    const user = users.find((u) => u.id === a.user_id);
                    return (
                      <tr key={a.id}>
                        <td className="py-2 text-slate-500 text-xs whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                        <td className="text-slate-600 text-xs">{user?.email || a.user_id?.slice(0, 8) || "system"}</td>
                        <td><Badge variant="outline" className="text-[10px]">{a.action}</Badge></td>
                        <td className="text-slate-500 text-xs">{a.entity || "—"} {a.entity_id ? `· ${a.entity_id.slice(0, 8)}` : ""}</td>
                        <td className="text-slate-500 text-xs max-w-xs truncate">{a.metadata ? JSON.stringify(a.metadata) : "—"}</td>
                      </tr>
                    );
                  })}
                  {!audit.length && <tr><td className="py-4 text-slate-500" colSpan={5}>No audit entries.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2"><Power className="h-4 w-4" /> Maintenance Mode</h3>
              <p className="text-sm text-slate-500 mb-3">Blocks non-admin users from using the app.</p>
              <Switch checked={!!maintenance} onCheckedChange={(v) => toggle("maintenance", v)} />
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2"><KeyRound className="h-4 w-4" /> Public Sign-ups</h3>
              <p className="text-sm text-slate-500 mb-3">Allow new users to register accounts.</p>
              <Switch checked={!signupsOff} onCheckedChange={(v) => toggle("signups", v)} />
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2"><Database className="h-4 w-4" /> Rebuild All Ledgers</h3>
              <p className="text-sm text-slate-500 mb-3">Re-posts every source document to the general ledger for all tenants. Use after schema fixes.</p>
              <Button variant="outline" onClick={rebuildLedgers} disabled={busy === "rebuild"}>
                {busy === "rebuild" && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Rebuild ledgers
              </Button>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Platform Info</h3>
              <dl className="text-sm space-y-1 text-slate-600">
                <div className="flex justify-between"><dt>Super admin</dt><dd>{me?.email}</dd></div>
                <div className="flex justify-between"><dt>Tenants</dt><dd>{companies.length}</dd></div>
                <div className="flex justify-between"><dt>Users</dt><dd>{users.length}</dd></div>
                <div className="flex justify-between"><dt>Plans</dt><dd>{plans.length}</dd></div>
                <div className="flex justify-between"><dt>Feature flags</dt><dd>{flags.length}</dd></div>
              </dl>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
