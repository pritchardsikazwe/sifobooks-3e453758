import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Building2, CheckCircle2, ChevronRight,
  CircleDollarSign, Clock3, Database, Gauge, KeyRound, Loader2, LogIn, Megaphone,
  Plus, RefreshCw, Search, Server, Settings2, ShieldAlert, Users,
  CreditCard, CalendarClock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountsAdmin } from "@/components/admin/AccountsAdmin";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkIsSuperAdmin, type FeatureFlag } from "@/lib/features";

export const Route = createFileRoute("/_authenticated/super-admin")({
  head: () => ({ meta: [{ title: "SifoBooks SaaS Super Admin" }, { name: "robots", content: "noindex" }] }),
  component: SuperAdminPage,
});

type Company = {
  id: string; email?: string | null; name: string; trading_name: string | null;
  base_currency: string | null; tpin: string | null; user_id: string;
  created_at: string; industry?: string | null;
};
type Profile = { id: string; email: string | null; full_name: string | null; created_at: string; active_company_id?: string | null };
type Plan = { id: string; code: string; name: string; price_monthly: number; currency: string; max_users: number | null; max_invoices: number | null; is_active: boolean; sort_order: number };
type AuditRow = { id: string; user_id: string | null; action: string; entity_type: string | null; entity_id: string | null; created_at: string; details: any };
type Sub = { id: string; company_id: string; plan_id: string; status: string; current_period_end: string | null; created_at?: string | null };\ntype Visitor = { visitor_id: string; first_seen: string; last_seen: string; landing_path: string | null; referrer: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; device_type: string | null };\ntype SiteEvent = { visitor_id: string; event_name: string; page_path: string | null; target: string | null; created_at: string; metadata: any };\ntype Lead = { id: string; name: string; email: string; phone: string | null; company: string | null; industry: string | null; interest: string | null; source: string | null; status: string; created_at: string };

const money = (n: number, currency = "ZMW") =>
  new Intl.NumberFormat("en-ZM", { style: "currency", currency, maximumFractionDigits: 0 }).format(n || 0);

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "trial") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "past_due" || s === "expired" || s === "cancelled") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

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
  const [roleMap, setRoleMap] = useState<Record<string, string[]>>({});\n  const [visitors, setVisitors] = useState<Visitor[]>([]);\n  const [siteEvents, setSiteEvents] = useState<SiteEvent[]>([]);\n  const [leads, setLeads] = useState<Lead[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState("dashboard");
  const [broadcast, setBroadcast] = useState({ title: "", message: "", link: "" });
  const [sending, setSending] = useState(false);

  const load = async () => {
    setChecking(true);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) setMe({ id: u.user.id, email: u.user.email ?? null });
    const ok = await checkIsSuperAdmin();
    setAllowed(ok);
    if (!ok) { setChecking(false); return; }

    const [f, c, p, pl, sb, al, ur, sv, se, ld] = await Promise.all([
      supabase.from("feature_flags").select("*").order("category").order("label"),
      supabase.from("companies").select("id,name,trading_name,base_currency,tpin,user_id,created_at,industry,email").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,email,full_name,created_at,active_company_id").order("created_at", { ascending: false }).limit(500),
      supabase.from("subscription_plans").select("*").order("sort_order"),
      supabase.from("company_subscriptions").select("id,company_id,plan_id,status,current_period_end,created_at"),
      supabase.from("audit_logs").select("id,user_id,action,entity_type,entity_id,created_at,details").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("site_visitors").select("visitor_id,first_seen,last_seen,landing_path,referrer,utm_source,utm_medium,utm_campaign,device_type").order("last_seen", { ascending: false }).limit(1000),
      supabase.from("site_events").select("visitor_id,event_name,page_path,target,created_at,metadata").order("created_at", { ascending: false }).limit(2000),
      supabase.from("sales_leads").select("id,name,email,phone,company,industry,interest,source,status,created_at").order("created_at", { ascending: false }).limit(500),
    ]);

    setFlags((f.data ?? []) as any);
    setCompanies((c.data ?? []) as any);
    setUsers((p.data ?? []) as any);
    setPlans((pl.data ?? []) as any);
    setSubs((sb.data ?? []) as any);
    setAudit((al.data ?? []) as any);
    setVisitors((sv.data ?? []) as any);
    setSiteEvents((se.data ?? []) as any);
    setLeads((ld.data ?? []) as any);
    const rm: Record<string, string[]> = {};
    (ur.data ?? []).forEach((r: any) => { (rm[r.user_id] ||= []).push(r.role); });
    setRoleMap(rm);
    setChecking(false);
  };

  useEffect(() => { void load(); }, []);

  const activeSubs = useMemo(() => subs.filter(s => s.status === "active"), [subs]);
  const activeSubMap = useMemo(() => new Map(subs.map(s => [s.company_id, s])), [subs]);
  const planMap = useMemo(() => new Map(plans.map(p => [p.id, p])), [plans]);

  const mrr = useMemo(() => activeSubs.reduce((sum, s) => sum + Number(planMap.get(s.plan_id)?.price_monthly || 0), 0), [activeSubs, planMap]);
  const trials = subs.filter(s => s.status === "trial").length;
  const unplanned = Math.max(0, companies.length - subs.length);
  const expiringSoon = subs.filter(s => {
    if (!s.current_period_end || !["active", "trial"].includes(s.status)) return false;
    const days = (new Date(s.current_period_end).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 14;
  });
  const activeRate = companies.length ? Math.round((activeSubs.length / companies.length) * 100) : 0;

  const planUsage = useMemo(() => plans.map(p => ({
    ...p,
    count: subs.filter(s => s.plan_id === p.id && s.status === "active").length,
  })).filter(p => p.count > 0).sort((a, b) => b.count - a.count), [plans, subs]);

  const recentClients = companies.slice(0, 5);
  const recentSubs = [...subs].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 5);
  const upcomingRenewals = [...subs]
    .filter(s => s.current_period_end && ["active", "trial"].includes(s.status))
    .sort((a, b) => new Date(a.current_period_end!).getTime() - new Date(b.current_period_end!).getTime())
    .slice(0, 5);

  const trafficSources = useMemo(() => {
    const counts: Record<string, number> = {};
    visitors.forEach(v => {
      let source = v.utm_source || "Direct";
      if (!v.utm_source && v.referrer) { try { source = new URL(v.referrer).hostname; } catch { source = "Referral"; } }
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,8);
  }, [visitors]);
  const productClicks = useMemo(() => {
    const counts: Record<string, number> = {};
    siteEvents.filter(e => e.event_name === "industry_click").forEach(e => { if (e.target) counts[e.target] = (counts[e.target] || 0) + 1; });
    return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,8);
  }, [siteEvents]);

  const toggle = async (key: string, next: boolean) => {
    setBusy(key);
    const { error } = await supabase.from("feature_flags").update({ enabled: next }).eq("key", key);
    setBusy(null);
    if (error) return toast.error(error.message);
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: next } : f));
    toast.success(`${next ? "Enabled" : "Disabled"} ${key}`);
  };

  const impersonateCompany = async (companyId: string) => {
    if (!me) return;
    const { error } = await supabase.from("profiles").update({ active_company_id: companyId }).eq("id", me.id);
    if (error) return toast.error(error.message);
    toast.success("Tenant workspace selected — opening client dashboard.");
    setTimeout(() => window.location.assign("/dashboard"), 400);
  };

  const savePlan = async (p: Plan) => {
    const { error } = await supabase.from("subscription_plans").update({
      name: p.name, price_monthly: p.price_monthly, max_users: p.max_users ?? undefined,
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
    await load();
  };

  const removePlan = async (id: string) => {
    if (!confirm("Delete plan?")) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  };

  const grantRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error && !`${error.message}`.includes("duplicate")) return toast.error(error.message);
    toast.success(`Granted ${role}`);
    await load();
  };

  const revokeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) return toast.error(error.message);
    toast.success(`Revoked ${role}`);
    await load();
  };

  const sendBroadcast = async () => {
    if (!broadcast.title.trim() || !broadcast.message.trim()) return toast.error("Title & message required");
    setSending(true);
    const rows = users.map(u => ({ user_id: u.id, title: broadcast.title, message: broadcast.message, type: "announcement", link: broadcast.link || null }));
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

  const filteredUsers = useMemo(() => users.filter(u => !q || `${u.email ?? ""} ${u.full_name ?? ""}`.toLowerCase().includes(q.toLowerCase())), [users, q]);
  const filteredCompanies = useMemo(() => companies.filter(c => {
    if (!q) return true;
    const owner = users.find(u => u.id === c.user_id);
    return `${c.name} ${c.trading_name ?? ""} ${c.tpin ?? ""} ${c.email ?? ""} ${owner?.email ?? ""} ${owner?.full_name ?? ""}`.toLowerCase().includes(q.toLowerCase());
  }), [companies, users, q]);

  const grouped = flags.reduce<Record<string, FeatureFlag[]>>((acc, f) => { (acc[f.category] ||= []).push(f); return acc; }, {});
  const maintenance = flags.find(f => f.key === "maintenance")?.enabled;
  const signupsOff = flags.find(f => f.key === "signups")?.enabled === false;

  if (checking) return <div className="p-6 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Verifying platform access…</div>;
  if (!allowed) return (
    <div className="p-6 max-w-lg">
      <Card className="p-6 border-amber-200 bg-amber-50">
        <div className="flex items-center gap-3 text-amber-800"><ShieldAlert className="h-6 w-6" /><div><h1 className="text-lg font-semibold">Restricted</h1><p className="text-sm">Only the platform super administrator can view this page.</p></div></div>
        <Link to="/dashboard" className="text-sm text-primary underline mt-4 inline-block">Return to dashboard</Link>
      </Card>
    </div>
  );

  const stats = [
    { label: "Total Clients", value: companies.length, icon: Building2, tone: "emerald" },
    { label: "Active Users", value: users.length, icon: Users, tone: "blue" },
    { label: "Active Subscriptions", value: activeSubs.length, icon: CreditCard, tone: "violet" },
    { label: "Monthly Recurring Revenue", value: money(mrr), icon: CircleDollarSign, tone: "gold" },
    { label: "Trial Clients", value: trials, icon: Clock3, tone: "amber" },
    { label: "Renewals ≤14 Days", value: expiringSoon.length, icon: CalendarClock, tone: "rose" },
  ];

  const toneClasses: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700", gold: "bg-amber-50 text-amber-700",
    amber: "bg-orange-50 text-orange-700", rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="min-h-full bg-[#f7faf9]">
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#0f6b57] p-3 text-white shadow-sm"><ShieldAlert className="h-6 w-6" /></div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">SifoBooks SaaS SuperAdmin</h1>
                <p className="text-sm text-slate-500">Manage clients, subscriptions, modules, support operations and the SifoBooks platform.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search clients, users, TPIN…" className="pl-9 bg-white" />
            </div>
            <Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          </div>
        </div>

        {(maintenance || signupsOff) && (
          <div className="flex flex-wrap gap-2">
            {maintenance && <Badge className="border-rose-200 bg-rose-50 text-rose-700"><AlertTriangle className="mr-1 h-3 w-3" /> Maintenance mode ON</Badge>}
            {signupsOff && <Badge className="border-amber-200 bg-amber-50 text-amber-700"><KeyRound className="mr-1 h-3 w-3" /> Public sign-ups disabled</Badge>}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {stats.map(s => {
            const Icon = s.icon;
            return <Card key={s.label} className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between"><div className={`rounded-xl p-2.5 ${toneClasses[s.tone]}`}><Icon className="h-5 w-5" /></div><Activity className="h-4 w-4 text-slate-300" /></div>
              <div className="mt-3 text-xs font-semibold text-slate-500">{s.label}</div>
              <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">{s.value}</div>
            </Card>;
          })}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="font-bold text-slate-900">Subscription Overview</h2><p className="text-xs text-slate-500">Current live subscription mix from your tenant database.</p></div>
              <Badge variant="outline" className="border-emerald-200 text-emerald-700">{activeRate}% active</Badge>
            </div>
            <div className="grid gap-5 md:grid-cols-[1fr_1.3fr]">
              <div className="flex items-center justify-center">
                <div className="relative h-44 w-44 rounded-full" style={{ background: `conic-gradient(#0f766e 0 34%, #eab308 34% 61%, #3b82f6 61% 83%, #8b5cf6 83% 100%)` }}>
                  <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
                    <div className="text-2xl font-black text-slate-900">{companies.length}</div><div className="text-xs text-slate-500">Clients</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {planUsage.length ? planUsage.map((p, i) => (
                  <div key={p.id}>
                    <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-slate-700">{p.name}</span><span className="text-slate-500">{p.count} active</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0f6b57]" style={{ width: `${Math.min(100, (p.count / Math.max(activeSubs.length, 1)) * 100)}%` }} /></div>
                  </div>
                )) : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No active plan subscriptions yet.</div>}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="rounded-xl bg-emerald-50 p-3"><div className="text-xs text-emerald-700">MRR</div><div className="font-black text-emerald-800">{money(mrr)}</div></div>
                  <div className="rounded-xl bg-amber-50 p-3"><div className="text-xs text-amber-700">Trials</div><div className="font-black text-amber-800">{trials}</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">No plan</div><div className="font-black text-slate-800">{unplanned}</div></div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Platform Health</h2><p className="text-xs text-slate-500">Operational controls and access.</p></div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Healthy</span></div>
            <div className="space-y-2">
              {[
                ["Application", "Online", Server], ["Database", "Connected", Database],
                ["Feature Flags", `${flags.filter(f => f.enabled).length}/${flags.length} enabled`, Settings2],
                ["Audit Events", `${audit.length} loaded`, Activity],
              ].map(([label, value, Icon]: any) => <div key={label} className="flex items-center justify-between rounded-xl border border-slate-100 p-3"><div className="flex items-center gap-3"><Icon className="h-4 w-4 text-[#0f6b57]" /><span className="text-sm font-medium text-slate-700">{label}</span></div><span className="text-xs font-semibold text-emerald-700">{value}</span></div>)}
            </div>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Recent Clients</h2><p className="text-xs text-slate-500">Newest tenant registrations.</p></div><button onClick={() => setTab("tenants")} className="text-xs font-semibold text-[#0f6b57]">View all</button></div>
            <div className="space-y-2">
              {recentClients.map(c => <div key={c.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#0f6b57]"><Building2 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-800">{c.trading_name || c.name}</div><div className="truncate text-xs text-slate-500">{c.industry || "General business"} · {c.base_currency || "ZMW"}</div></div><ChevronRight className="h-4 w-4 text-slate-300" /></div>)}
              {!recentClients.length && <div className="py-8 text-center text-sm text-slate-400">No clients yet.</div>}
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Recent Subscriptions</h2><p className="text-xs text-slate-500">Latest subscription activity.</p></div><button onClick={() => setTab("plans")} className="text-xs font-semibold text-[#0f6b57]">Manage plans</button></div>
            <div className="space-y-2">
              {recentSubs.map(s => { const c = companies.find(x => x.id === s.company_id); const p = planMap.get(s.plan_id); return <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><CreditCard className="h-4 w-4 text-violet-600" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{c?.trading_name || c?.name || "Unknown client"}</div><div className="text-xs text-slate-500">{p?.name || "Plan"} · {p ? money(p.price_monthly, p.currency) : "—"}</div></div><Badge variant="outline" className={statusBadge(s.status)}>{s.status}</Badge></div> })}
              {!recentSubs.length && <div className="py-8 text-center text-sm text-slate-400">No subscriptions yet.</div>}
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Upcoming Renewals</h2><p className="text-xs text-slate-500">Next billing periods that need attention.</p></div><CalendarClock className="h-5 w-5 text-amber-600" /></div>
            <div className="space-y-2">
              {upcomingRenewals.map(s => { const c = companies.find(x => x.id === s.company_id); const p = planMap.get(s.plan_id); const days = Math.ceil((new Date(s.current_period_end!).getTime() - Date.now()) / 86400000); return <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><div className={`rounded-lg p-2 ${days <= 7 ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700"}`}><Clock3 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{c?.trading_name || c?.name || "Unknown client"}</div><div className="text-xs text-slate-500">{p?.name || "Plan"} · {new Date(s.current_period_end!).toLocaleDateString()}</div></div><span className="text-xs font-bold">{days}d</span></div> })}
              {!upcomingRenewals.length && <div className="py-8 text-center text-sm text-slate-400">No upcoming renewals.</div>}
            </div>
          </Card>
        </div>

        <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">SuperAdmin Quick Actions</h2><p className="text-xs text-slate-500">Jump directly into platform operations.</p></div><Gauge className="h-5 w-5 text-[#0f6b57]" /></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Clients", "Manage tenants and enter a client workspace", Building2, "tenants"],
              ["Subscriptions", "Plans, pricing and active subscriptions", CreditCard, "plans"],
              ["Users & Roles", "Platform users and super admin access", Users, "users"],
              ["Broadcast", "Send a platform-wide announcement", Megaphone, "broadcast"],
              ["System", "Feature flags and maintenance controls", Settings2, "system"],
            ].map(([label, desc, Icon, target]: any) => <button key={label} onClick={() => setTab(target)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#0f6b57]/40 hover:shadow-sm"><div className="mb-3 flex items-center justify-between"><div className="rounded-xl bg-emerald-50 p-2.5 text-[#0f6b57]"><Icon className="h-5 w-5" /></div><ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#0f6b57]" /></div><div className="font-bold text-slate-800">{label}</div><div className="mt-1 text-xs text-slate-500">{desc}</div></button>)}
          </div>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex h-auto flex-wrap gap-1 bg-white p-1 shadow-sm">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="analytics">Marketing</TabsTrigger>
            <TabsTrigger value="tenants">Clients</TabsTrigger>
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="plans">Plans & Billing</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="pt-1">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Unique Visitors", visitors.length],
                ["Tracked Events", siteEvents.length],
                ["Leads", leads.length],
                ["New Leads", leads.filter(l => l.status === "new").length],
              ].map(([label,value]) => <Card key={String(label)} className="rounded-2xl p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></Card>)}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Card className="rounded-2xl p-5"><h2 className="mb-3 font-bold">Traffic sources</h2><div className="space-y-2">{trafficSources.map(([s,n]) => <div key={s} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{s}</span><b>{n}</b></div>)}{!trafficSources.length && <p className="text-sm text-slate-500">No traffic yet.</p>}</div></Card>
              <Card className="rounded-2xl p-5"><h2 className="mb-3 font-bold">Products / industries clicked</h2><div className="space-y-2">{productClicks.map(([s,n]) => <div key={s} className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm"><span>{s}</span><b>{n}</b></div>)}{!productClicks.length && <p className="text-sm text-slate-500">No product clicks yet.</p>}</div></Card>
              <Card className="rounded-2xl p-5"><h2 className="mb-3 font-bold">Devices</h2><div className="space-y-2">{Object.entries(visitors.reduce<Record<string,number>>((a,v)=>{const k=v.device_type||"unknown";a[k]=(a[k]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1]).map(([s,n])=><div key={s} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{s}</span><b>{n}</b></div>)}</div></Card>
            </div>
            <Card className="mt-4 rounded-2xl p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Recent leads</h2><Badge variant="outline">{leads.length} total</Badge></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Lead</th><th>Company</th><th>Industry</th><th>Interest</th><th>Source</th><th>Status</th><th>Date</th></tr></thead><tbody className="divide-y">{leads.slice(0,20).map(l=><tr key={l.id}><td className="py-2 font-semibold">{l.name}<div className="text-xs text-slate-500">{l.email}</div></td><td>{l.company||"—"}</td><td>{l.industry||"—"}</td><td>{l.interest||"—"}</td><td>{l.source||"Direct"}</td><td><Badge variant="outline">{l.status}</Badge></td><td className="text-xs text-slate-500">{new Date(l.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></Card>
            <Card className="mt-4 rounded-2xl p-5"><h2 className="mb-3 font-bold">Recent visitors</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Last seen</th><th>Landing page</th><th>Source</th><th>Campaign</th><th>Device</th></tr></thead><tbody className="divide-y">{visitors.slice(0,20).map(v=><tr key={v.visitor_id}><td className="py-2 text-xs">{new Date(v.last_seen).toLocaleString()}</td><td>{v.landing_path||"/"}</td><td>{v.utm_source||v.referrer||"Direct"}</td><td>{v.utm_campaign||"—"}</td><td>{v.device_type||"—"}</td></tr>)}</tbody></table></div></Card>
          </TabsContent>

          <TabsContent value="dashboard" className="pt-1">
            <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-4">
                <div><div className="text-xs text-slate-500">Client activation</div><div className="mt-1 text-xl font-black">{activeRate}%</div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#0f6b57]" style={{ width: `${activeRate}%` }} /></div></div>
                <div><div className="text-xs text-slate-500">Trial pipeline</div><div className="mt-1 text-xl font-black">{trials}</div><div className="text-xs text-slate-500">clients currently trialling</div></div>
                <div><div className="text-xs text-slate-500">Renewal watch</div><div className="mt-1 text-xl font-black">{expiringSoon.length}</div><div className="text-xs text-slate-500">within 14 days</div></div>
                <div><div className="text-xs text-slate-500">Unsubscribed tenants</div><div className="mt-1 text-xl font-black">{unplanned}</div><div className="text-xs text-slate-500">need plan attention</div></div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tenants" className="pt-1"><Card className="rounded-2xl p-5"><div className="mb-3 flex items-center justify-between gap-3 flex-wrap"><h2 className="text-lg font-bold">Clients ({filteredCompanies.length})</h2><div className="relative w-72"><Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Search tenant / TPIN" value={q} onChange={e => setQ(e.target.value)} className="pl-8" /></div></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Company</th><th>Owner</th><th>Industry</th><th>Plan</th><th>Status</th><th>Created</th><th /></tr></thead><tbody className="divide-y">{filteredCompanies.map(c => { const owner=users.find(u=>u.id===c.user_id); const s=activeSubMap.get(c.id); const p=s?planMap.get(s.plan_id):undefined; return <tr key={c.id} className="hover:bg-slate-50"><td className="py-3 font-semibold">{c.trading_name || c.name}</td><td className="text-slate-600">{owner?.email || c.email || "—"}</td><td className="text-slate-500">{c.industry || "—"}</td><td>{p?.name || "No plan"}</td><td>{s?<Badge variant="outline" className={statusBadge(s.status)}>{s.status}</Badge>:<Badge variant="outline">none</Badge>}</td><td className="text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td><td className="text-right"><Button size="sm" variant="outline" onClick={() => impersonateCompany(c.id)}><LogIn className="mr-1 h-3 w-3" /> Enter</Button></td></tr> })}</tbody></table></div></Card></TabsContent>

          <TabsContent value="users" className="pt-1"><Card className="rounded-2xl p-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Platform Users ({filteredUsers.length})</h2><span className="text-xs text-slate-500">Use role controls carefully.</span></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-2">User</th><th>Email</th><th>Roles</th><th>Joined</th><th className="text-right">Grant</th></tr></thead><tbody className="divide-y">{filteredUsers.map(u => { const rs=roleMap[u.id]||[]; return <tr key={u.id}><td className="py-3 font-semibold">{u.full_name||"—"}</td><td>{u.email}</td><td><div className="flex flex-wrap gap-1">{rs.map(r=><Badge key={r} variant="outline">{r}<button className="ml-1 text-rose-500" onClick={()=>void revokeRole(u.id,r)}>×</button></Badge>)}</div></td><td className="text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td><td><div className="flex flex-wrap justify-end gap-1">{["admin","manager","accountant","hr","sales","purchaser","viewer","super_admin"].map(r=><Button key={r} size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={()=>void grantRole(u.id,r)}>+ {r}</Button>)}</div></td></tr>})}</tbody></table></div></Card></TabsContent>

          <TabsContent value="accounts" className="pt-1"><AccountsAdmin roleMap={roleMap} onRolesChanged={() => { void load(); }} /></TabsContent>

          <TabsContent value="plans" className="pt-1"><Card className="rounded-2xl p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Subscription Plans</h2><Button size="sm" onClick={()=>void addPlan()}><Plus className="mr-1 h-4 w-4" /> New plan</Button></div><div className="space-y-3">{plans.map(p=><div key={p.id} className="grid gap-2 rounded-xl border p-3 md:grid-cols-6 md:items-end"><div><Label className="text-xs">Code</Label><div className="font-mono text-sm text-slate-600">{p.code}</div></div><div><Label className="text-xs">Name</Label><Input value={p.name} onChange={e=>setPlans(x=>x.map(r=>r.id===p.id?{...r,name:e.target.value}:r))}/></div><div><Label className="text-xs">Price / mo ({p.currency})</Label><Input type="number" value={p.price_monthly} onChange={e=>setPlans(x=>x.map(r=>r.id===p.id?{...r,price_monthly:Number(e.target.value)}:r))}/></div><div><Label className="text-xs">Max users</Label><Input type="number" value={p.max_users??""} onChange={e=>setPlans(x=>x.map(r=>r.id===p.id?{...r,max_users:e.target.value?Number(e.target.value):null}:r))}/></div><div><Label className="text-xs">Max invoices</Label><Input type="number" value={p.max_invoices??""} onChange={e=>setPlans(x=>x.map(r=>r.id===p.id?{...r,max_invoices:e.target.value?Number(e.target.value):null}:r))}/></div><div className="flex items-center justify-end gap-2"><Switch checked={p.is_active} onCheckedChange={v=>setPlans(x=>x.map(r=>r.id===p.id?{...r,is_active:v}:r))}/><Button size="sm" onClick={()=>void savePlan(p)}>Save</Button></div></div>)}</div></Card></TabsContent>

          <TabsContent value="features" className="pt-1"><Card className="rounded-2xl p-5"><h2 className="mb-4 text-lg font-bold">Platform Features</h2><div className="grid gap-3 md:grid-cols-2">{flags.map(f=><div key={f.key} className="flex items-start justify-between rounded-xl border p-4"><div className="pr-3"><div className="font-semibold">{f.label}</div><div className="text-xs text-slate-500">{f.description}</div></div><Switch checked={f.enabled} onCheckedChange={v=>void toggle(f.key,v)} disabled={busy===f.key}/></div>)}</div></Card></TabsContent>

          <TabsContent value="broadcast" className="pt-1"><Card className="max-w-2xl rounded-2xl p-5"><div className="mb-4 flex items-center gap-2"><Megaphone className="h-5 w-5 text-[#0f6b57]"/><h2 className="text-lg font-bold">Platform Broadcast</h2></div><div className="space-y-3"><Label>Title</Label><Input value={broadcast.title} onChange={e=>setBroadcast({...broadcast,title:e.target.value})}/><Label>Message</Label><Textarea rows={4} value={broadcast.message} onChange={e=>setBroadcast({...broadcast,message:e.target.value})}/><Label>Link (optional)</Label><Input value={broadcast.link} onChange={e=>setBroadcast({...broadcast,link:e.target.value})}/><Button onClick={()=>void sendBroadcast()} disabled={sending}>{sending&&<Loader2 className="mr-1 h-4 w-4 animate-spin"/>}Send to {users.length} users</Button></div></Card></TabsContent>

          <TabsContent value="audit" className="pt-1"><Card className="rounded-2xl p-5"><h2 className="mb-3 text-lg font-bold">Recent Audit Trail</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-2">When</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody className="divide-y">{audit.map(a=><tr key={a.id}><td className="py-2 text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</td><td className="text-xs">{users.find(u=>u.id===a.user_id)?.email||"system"}</td><td><Badge variant="outline">{a.action}</Badge></td><td className="text-xs text-slate-500">{a.entity_type||"—"}</td><td className="max-w-sm truncate text-xs text-slate-500">{a.details?JSON.stringify(a.details):"—"}</td></tr>)}{!audit.length&&<tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">No audit entries.</td></tr>}</tbody></table></div></Card></TabsContent>

          <TabsContent value="system" className="pt-1"><div className="grid gap-4 md:grid-cols-2"><Card className="rounded-2xl p-5"><h3 className="mb-2 font-bold">Maintenance Mode</h3><p className="mb-3 text-sm text-slate-500">Blocks non-admin users from using the platform.</p><Switch checked={!!maintenance} onCheckedChange={v=>void toggle("maintenance",v)}/></Card><Card className="rounded-2xl p-5"><h3 className="mb-2 font-bold">Public Sign-ups</h3><p className="mb-3 text-sm text-slate-500">Allow new users to register accounts.</p><Switch checked={!signupsOff} onCheckedChange={v=>void toggle("signups",v)}/></Card><Card className="rounded-2xl p-5"><h3 className="mb-2 font-bold">Rebuild All Ledgers</h3><p className="mb-3 text-sm text-slate-500">Re-post source documents to the general ledger for all tenants.</p><Button variant="outline" onClick={()=>void rebuildLedgers()} disabled={busy==="rebuild"}>{busy==="rebuild"&&<Loader2 className="mr-1 h-4 w-4 animate-spin"/>}Rebuild ledgers</Button></Card><Card className="rounded-2xl p-5"><h3 className="mb-2 font-bold">Platform Owner</h3><p className="text-sm text-slate-500">{me?.email}</p><div className="mt-3 flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4"/>SuperAdmin access verified</div></Card></div></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
