import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/accounting-control-centre")({
  head: () => ({ meta: [{ title: "Accounting Control Centre — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: AccountingControlCentre,
});

type Check = { check_key: string; check_name: string; severity: string; issue_count: number; description: string };

function AccountingControlCentre() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data, error }, { data: payrollData, error: payrollError }] = await Promise.all([
      supabase.rpc("accounting_control_centre" as any),
      supabase.rpc("accounting_payroll_reconciliation" as any),
    ]);
    if (error) toast.error(error.message);
    if (payrollError) toast.error(payrollError.message);
    const baseChecks = (data ?? []) as Check[];
    const payrollChecks = (payrollData ?? []) as Check[];
    setChecks([...baseChecks, ...payrollChecks]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const issues = checks.reduce((n, c) => n + Number(c.issue_count || 0), 0);
  const critical = checks.filter(c => c.severity === "critical").reduce((n, c) => n + Number(c.issue_count || 0), 0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><ShieldCheck className="h-6 w-6 text-primary" /> Accounting Control Centre</h1>
          <p className="mt-1 text-sm text-muted-foreground">Continuous health checks for journals, banking, subledgers and payroll-to-GL integrity.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Checks</div><div className="mt-1 text-2xl font-semibold">{checks.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Open issues</div><div className={`mt-1 text-2xl font-semibold ${issues ? "text-amber-600" : "text-emerald-600"}`}>{issues}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Critical</div><div className={`mt-1 text-2xl font-semibold ${critical ? "text-red-600" : "text-emerald-600"}`}>{critical}</div></CardContent></Card>
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
    </div>
  );
}
