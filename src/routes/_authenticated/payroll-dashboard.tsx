import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Banknote, Users, Wallet, Receipt, TrendingUp, ShieldCheck, Calendar,
  ClipboardCheck, Activity, FileText, ArrowRight, Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/format";
import {
  calcPaye, calcNapsa, calcNhima, calcWcf, calcSdl,
} from "@/lib/payroll";

export const Route = createFileRoute("/_authenticated/payroll-dashboard")({
  head: () => ({ meta: [{ title: "Payroll Dashboard — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: PayrollDashboard,
});

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Run = {
  id: string; run_number: string; period_year: number; period_month: number;
  pay_date: string | null; status: string;
  total_gross: number; total_paye: number; total_napsa: number; total_nhima: number;
  total_wcf: number | null; total_sdl: number | null; total_net: number;
  total_overtime: number | null; total_bonus: number | null;
  total_allowances: number | null; total_employer_cost: number | null;
  employees_paid: number | null;
};
type Emp = {
  id: string; first_name: string; last_name: string;
  basic_salary: number | null; status: string | null;
  department_id: string | null; employment_type: string | null;
  tpin?: string | null; national_id?: string | null;
  napsa_number?: string | null; nhima_number?: string | null;
};

const DEPT_COLORS = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"];

function PayrollDashboard() {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<Run[]>([]);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [departments, setDepartments] = useState<Record<string, string>>({});
  const [approvals, setApprovals] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const [rr, ee, dd, ap, al] = await Promise.all([
        supabase.from("payroll_runs")
          .select("id,run_number,period_year,period_month,pay_date,status,total_gross,total_paye,total_napsa,total_nhima,total_wcf,total_sdl,total_net,total_overtime,total_bonus,total_allowances,total_employer_cost,employees_paid")
          .order("period_year", { ascending: false }).order("period_month", { ascending: false }).limit(24),
        supabase.from("employees").select("id,first_name,last_name,basic_salary,status,department_id,employment_type,tpin,national_id,napsa_number,nhima_number"),
        supabase.from("departments").select("id,name"),
        supabase.from("approval_requests")
          .select("id,module,reference_number,amount,status,current_level,max_level,description,created_at")
          .eq("module", "payment").order("created_at", { ascending: false }).limit(6),
        supabase.from("audit_logs").select("id,action,entity_type,entity_id,created_at,details")
          .in("entity_type", ["payroll_runs","payslips"] as any)
          .order("created_at", { ascending: false }).limit(10),
      ]);
      setRuns((rr.data ?? []) as any);
      setEmployees((ee.data ?? []) as any);
      const dmap: Record<string, string> = {};
      (dd.data ?? []).forEach((d: any) => { dmap[d.id] = d.name; });
      setDepartments(dmap);
      setApprovals(ap.data ?? []);
      setAuditLog(al.data ?? []);
      setLoading(false);
    })();
  }, []);

  const latest = runs[0];
  const totals = useMemo(() => runs.slice(0, 12).reduce((a, r) => ({
    gross: a.gross + num(r.total_gross),
    net: a.net + num(r.total_net),
    paye: a.paye + num(r.total_paye),
    napsa: a.napsa + num(r.total_napsa),
    nhima: a.nhima + num(r.total_nhima),
    wcf: a.wcf + num(r.total_wcf),
    sdl: a.sdl + num(r.total_sdl),
    overtime: a.overtime + num(r.total_overtime),
    bonus: a.bonus + num(r.total_bonus),
  }), { gross: 0, net: 0, paye: 0, napsa: 0, nhima: 0, wcf: 0, sdl: 0, overtime: 0, bonus: 0 }), [runs]);

  // Est. current period if no run yet
  const estimated = useMemo(() => {
    const active = employees.filter(e => (e.status ?? "active") === "active");
    let gross = 0, paye = 0, napsa = 0, nhima = 0, wcf = 0, sdl = 0;
    active.forEach(e => {
      const b = num(e.basic_salary);
      gross += b; paye += calcPaye(b); napsa += calcNapsa(b);
      nhima += calcNhima(b); wcf += calcWcf(b); sdl += calcSdl(b);
    });
    const net = gross - paye - napsa - nhima;
    return { headcount: active.length, gross, net, paye, napsa, nhima, wcf, sdl };
  }, [employees]);

  const kpiSrc = latest ? {
    headcount: latest.employees_paid ?? estimated.headcount,
    gross: num(latest.total_gross),
    net: num(latest.total_net),
    paye: num(latest.total_paye),
    napsa: num(latest.total_napsa),
    nhima: num(latest.total_nhima),
    wcf: num(latest.total_wcf),
    sdl: num(latest.total_sdl),
  } : estimated;

  const trend = useMemo(() => runs.slice(0, 12).reverse().map(r => ({
    label: `${MONTHS[r.period_month - 1]} ${String(r.period_year).slice(2)}`,
    Gross: num(r.total_gross), Net: num(r.total_net),
    PAYE: num(r.total_paye), NAPSA: num(r.total_napsa), NHIMA: num(r.total_nhima),
  })), [runs]);

  const deptCost = useMemo(() => {
    const map = new Map<string, number>();
    employees.filter(e => (e.status ?? "active") === "active").forEach(e => {
      const key = e.department_id ? (departments[e.department_id] ?? "Unassigned") : "Unassigned";
      map.set(key, (map.get(key) ?? 0) + num(e.basic_salary));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [employees, departments]);

  // Payroll calendar — next 6 pay dates
  const calendar = useMemo(() => {
    const items: { label: string; date: string; status: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 25); // typical Zambian pay day
      const y = d.getFullYear(), m = d.getMonth() + 1;
      const existing = runs.find(r => r.period_year === y && r.period_month === m);
      items.push({
        label: `${MONTHS[m - 1]} ${y}`,
        date: d.toISOString().slice(0, 10),
        status: existing?.status ?? (i === 0 ? "pending" : "upcoming"),
      });
    }
    return items;
  }, [runs]);

  // What needs attention right now — built only from live runs and employee records.
  const attention = useMemo(() => {
    const items: { text: string; to: string; tone: "amber" | "rose" | "slate" }[] = [];
    const drafts = runs.filter(r => r.status === "draft");
    const approved = runs.filter(r => r.status === "approved");
    const posted = runs.filter(r => r.status === "posted");
    if (drafts.length) items.push({ text: `${drafts.length} payroll run(s) still in draft — calculate and send for approval.`, to: "/payroll", tone: "amber" });
    if (approved.length) items.push({ text: `${approved.length} approved run(s) not yet paid or posted to the ledger.`, to: "/payroll", tone: "amber" });
    if (posted.length) items.push({ text: `${posted.length} posted run(s) awaiting statutory filing and reconciliation.`, to: "/payroll-statutory", tone: "slate" });
    const active = employees.filter(e => (e.status ?? "active") === "active");
    const missing = active.filter(e => !e.tpin?.trim() || !e.napsa_number?.trim() || !e.nhima_number?.trim() || !e.national_id?.trim());
    if (missing.length) items.push({ text: `${missing.length} active employee(s) are missing a TPIN, NRC, NAPSA or NHIMA number — statutory files will reject them.`, to: "/employees", tone: "rose" });
    const next = calendar.find(c => c.status === "pending" || c.status === "upcoming");
    if (next) items.push({ text: `Next pay date ${next.date} (${next.label}).`, to: "/payroll", tone: "slate" });
    return items;
  }, [runs, employees, calendar]);

  // Month-on-month movement on the two most recent runs.
  const movement = useMemo(() => {
    const [cur, prev] = runs;
    if (!cur || !prev) return null;
    const d = (a: number, b: number) => ({ diff: a - b, pct: b === 0 ? null : ((a - b) / Math.abs(b)) * 100 });
    return {
      label: `${MONTHS[cur.period_month - 1]} ${cur.period_year} vs ${MONTHS[prev.period_month - 1]} ${prev.period_year}`,
      gross: d(num(cur.total_gross), num(prev.total_gross)),
      net: d(num(cur.total_net), num(prev.total_net)),
      paye: d(num(cur.total_paye), num(prev.total_paye)),
      heads: d(num(cur.employees_paid), num(prev.employees_paid)),
    };
  }, [runs]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-700 font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> HR & Payroll
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">Payroll Dashboard</h1>
            <p className="text-sm text-slate-500">
              {latest
                ? <>Current period: <b>{MONTHS[latest.period_month - 1]} {latest.period_year}</b> · Status <span className="uppercase text-emerald-700">{latest.status}</span></>
                : <>No run yet — showing live estimate from {estimated.headcount} active employees.</>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/employees">Employees</Link></Button>
            <Button asChild variant="outline"><Link to="/attendance">Attendance</Link></Button>
            <Button variant="save" asChild ><Link to="/payroll">Run Payroll <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
        </div>
      </motion.div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi icon={Users} tone="emerald" label="Employees Paid" value={String(kpiSrc.headcount)} sub="Active headcount" />
        <Kpi icon={Wallet} tone="blue" label="Gross Salaries" value={fmtMoney(kpiSrc.gross)} sub="This period" />
        <Kpi icon={Banknote} tone="green" label="Net Salaries" value={fmtMoney(kpiSrc.net)} sub="Take-home" />
        <Kpi icon={Receipt} tone="amber" label="PAYE" value={fmtMoney(kpiSrc.paye)} sub="ZRA" />
        <Kpi icon={ShieldCheck} tone="violet" label="NAPSA" value={fmtMoney(kpiSrc.napsa)} sub="Pension 5%" />
        <Kpi icon={ShieldCheck} tone="rose" label="NHIMA" value={fmtMoney(kpiSrc.nhima)} sub="Health 1%" />
      </div>

      {/* Employer statutory strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip label="Overtime (12m)" value={fmtMoney(totals.overtime)} />
        <StatChip label="Bonuses (12m)" value={fmtMoney(totals.bonus)} />
        <StatChip label="WCF 1.5% (period)" value={fmtMoney(kpiSrc.wcf)} tone="emerald" />
        <StatChip label="SDL 0.5% (period)" value={fmtMoney(kpiSrc.sdl)} tone="emerald" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 border-slate-200/70 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase text-slate-500 tracking-wide">Payroll Trend</div>
              <div className="text-base font-semibold text-slate-800">Gross vs Net · Last 12 runs</div>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
              <Legend />
              <Bar dataKey="Gross" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Net" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border-slate-200/70 shadow-sm">
          <div className="mb-3">
            <div className="text-xs uppercase text-slate-500 tracking-wide">Payroll Cost</div>
            <div className="text-base font-semibold text-slate-800">By Department</div>
          </div>
          {deptCost.length === 0 ? (
            <div className="text-sm text-slate-400 py-10 text-center">No employees yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={deptCost} dataKey="value" nameKey="name" outerRadius={95} innerRadius={55} paddingAngle={2}>
                  {deptCost.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Statutory trend line */}
      <Card className="p-5 border-slate-200/70 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase text-slate-500 tracking-wide">Statutory Contributions</div>
            <div className="text-base font-semibold text-slate-800">PAYE · NAPSA · NHIMA over time</div>
          </div>
          <ShieldCheck className="h-5 w-5 text-violet-600" />
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
            <Legend />
            <Line type="monotone" dataKey="PAYE" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="NAPSA" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="NHIMA" stroke="#ec4899" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Bottom: Calendar + Approvals + Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 border-slate-200/70 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <div className="text-sm font-semibold text-slate-800">Payroll Calendar</div>
          </div>
          <ul className="space-y-2 text-sm">
            {calendar.map((c) => (
              <li key={c.date} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 bg-white">
                <div>
                  <div className="font-medium text-slate-800">{c.label}</div>
                  <div className="text-xs text-slate-500">Pay date {c.date}</div>
                </div>
                <StatusPill status={c.status} />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 border-slate-200/70 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="h-4 w-4 text-blue-600" />
            <div className="text-sm font-semibold text-slate-800">Approval Workflow</div>
            <Link to="/approvals" className="ml-auto text-xs text-emerald-700 hover:underline">Open →</Link>
          </div>
          {approvals.length === 0 ? (
            <div className="text-sm text-slate-400 py-6 text-center">No payroll approvals pending.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {approvals.map((a: any) => (
                <li key={a.id} className="rounded-lg border border-slate-200 px-3 py-2 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-800">{a.reference_number ?? a.description ?? "Payment"}</div>
                    <StatusPill status={a.status} />
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {fmtMoney(num(a.amount))} · Level {a.current_level}/{a.max_level}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 border-slate-200/70 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-rose-600" />
            <div className="text-sm font-semibold text-slate-800">Audit Log</div>
            <Link to="/audit-logs" className="ml-auto text-xs text-emerald-700 hover:underline">Open →</Link>
          </div>
          {auditLog.length === 0 ? (
            <div className="text-sm text-slate-400 py-6 text-center">No payroll activity recorded.</div>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {auditLog.map((l: any) => (
                <li key={l.id} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                  <div>
                    <span className="font-medium text-slate-700 capitalize">{l.action}</span>{" "}
                    <span className="text-slate-500">on {l.entity_type}</span>
                  </div>
                  <span className="text-slate-400 whitespace-nowrap">
                    {new Date(l.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {loading && <div className="text-center text-xs text-slate-400">Loading live payroll data…</div>}
    </div>
  );
}

function num(n: any) { const x = Number(n); return Number.isFinite(x) ? x : 0; }

const TONE = {
  emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-700 border-emerald-200",
  blue: "from-blue-500/10 to-blue-500/5 text-blue-700 border-blue-200",
  green: "from-green-500/10 to-green-500/5 text-green-700 border-green-200",
  amber: "from-amber-500/10 to-amber-500/5 text-amber-700 border-amber-200",
  violet: "from-violet-500/10 to-violet-500/5 text-violet-700 border-violet-200",
  rose: "from-rose-500/10 to-rose-500/5 text-rose-700 border-rose-200",
} as const;

function Kpi({ icon: Icon, label, value, sub, tone }: {
  icon: any; label: string; value: string; sub?: string; tone: keyof typeof TONE;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`p-4 border bg-gradient-to-br ${TONE[tone]} shadow-sm`}>
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80">{label}</div>
          <Icon className="h-4 w-4 opacity-70" />
        </div>
        <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
        {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
      </Card>
    </motion.div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone?: "emerald" }) {
  return (
    <div className={`rounded-lg border px-3 py-2 bg-white ${tone === "emerald" ? "border-emerald-200" : "border-slate-200"}`}>
      <div className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-semibold ${tone === "emerald" ? "text-emerald-700" : "text-slate-800"}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    upcoming: "bg-slate-50 text-slate-600 border-slate-200",
    draft: "bg-slate-50 text-slate-600 border-slate-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] rounded-full border capitalize ${map[s] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {status || "—"}
    </span>
  );
}
