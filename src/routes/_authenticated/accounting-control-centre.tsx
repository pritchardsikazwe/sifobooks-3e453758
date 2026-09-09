import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/accounting-control-centre")({
  head: () => ({ meta: [{ title: "Accounting Control Centre — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: AccountingControlCentre,
});

type Check = { check_key: string; check_name: string; severity: string; issue_count: number; description: string };
type Recon = { check_key: string; check_name: string; subledger_balance: number; gl_balance: number; difference: number; status: string; description: string };

function AccountingControlCentre() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [recon, setRecon] = useState<Recon[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data, error }, { data: payrollData, error: payrollError }, { data: reconData, error: reconError }] = await Promise.all([
      supabase.rpc("accounting_control_centre" as any),
      supabase.rpc("accounting_payroll_reconciliation" as any),
      supabase.rpc("subledger_gl_reconciliation" as any),
    ]);
    if (error) toast.error(error.message);
    if (payrollError) toast.error(payrollError.message);
    if (reconError) toast.error(reconError.message);
    setChecks([...(data ?? []) as Check[], ...(payrollData ?? []) as Check[]]);
    setRecon((reconData ?? []) as Recon[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const issues = checks.reduce((n, c) => n + Number(c.issue_count || 0), 0) + recon.filter(r => r.status !== "ok").length;
  const critical = checks.filter(c => c.severity === "critical").reduce((n, c) => n + Number(c.issue_count || 0), 0);
  const reconIssues = recon.filter(r => r.status !== "ok").length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><ShieldCheck className="h-6 w-6 text-primary" /> Accounting Control Centre</h1>
          <p className="mt-1 text-sm text-muted-foreground">Continuous health checks for journals, banking, subledgers and payroll-to-GL integrity.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Checks</div><div className="mt-1 text-2xl font-semibold">{checks.length + recon.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Open issues</div><div className={`mt-1 text-2xl font-semibold ${issues ? "text-amber-600" : "text-emerald-600"}`}>{issues}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Critical</div><div className={`mt-1 text-2xl font-semibold ${critical ? "text-red-600" : "text-emerald-600"}`}>{critical}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Subledger differences</div><div className={`mt-1 text-2xl font-semibold ${reconIssues ? "text-amber-600" : "text-emerald-600"}`}>{reconIssues}</div></CardContent></Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {checks.map(c => {
          const ok = Number(c.issue_count) === 0;
          return <Card key={c.check_key} className="rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="flex items-center justify-between text-base"><span className="flex items-center gap-2">{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}{c.check_name}</span><Badge variant="secondary">{c.issue_count}</Badge></CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{c.description}</p>{!ok && <Badge className="mt-3" variant="outline">{c.severity}</Badge>}</CardContent>
          </Card>;
        })}
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle>Subledger vs General Ledger</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Control</th><th className="text-right">Subledger</th><th className="text-right">GL</th><th className="text-right">Difference</th><th className="text-right">Status</th></tr></thead>
              <tbody className="divide-y">
                {recon.map(r => {
                  const ok = r.status === "ok";
                  return <tr key={r.check_key}><td className="py-3 font-medium">{r.check_name}<div className="text-xs font-normal text-muted-foreground">{r.description}</div></td><td className="text-right">{Number(r.subledger_balance || 0).toFixed(2)}</td><td className="text-right">{Number(r.gl_balance || 0).toFixed(2)}</td><td className={`text-right font-semibold ${ok ? "text-emerald-600" : "text-amber-600"}`}>{Number(r.difference || 0).toFixed(2)}</td><td className="text-right"><Badge variant={ok ? "secondary" : "destructive"}>{ok ? "OK" : "Difference"}</Badge></td></tr>;
                })}
              </tbody>
            </table>
            {!recon.length && <div className="py-6 text-center text-sm text-muted-foreground">No reconciliation results returned.</div>}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link to="/posting-failures">Review Posting Failures <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        <Button asChild variant="outline"><Link to="/reconciliation">Review Bank Reconciliation <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        <Button asChild variant="outline"><Link to="/journal-entries">Review Journals <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </div>
    </div>
  );
}
