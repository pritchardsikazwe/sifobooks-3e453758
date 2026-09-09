import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { runTransactionIntegrityAudit, type TransactionAudit } from "@/lib/transaction-audit";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/transaction-audit")({
  head: () => ({ meta: [{ title: "Transaction Integrity Audit — SifoBooks" }] }),
  component: TransactionAuditPage,
});

function TransactionAuditPage() {
  const [audit, setAudit] = useState<TransactionAudit | null>(null);
  const [running, setRunning] = useState(false);

  const runAudit = async () => {
    setRunning(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("You must be signed in to run an audit.");
      const result = await runTransactionIntegrityAudit(data.user.id);
      setAudit(result);
      toast.success(`Audit complete — ${result.counts.critical} critical, ${result.counts.warning} warnings`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Audit failed");
    } finally {
      setRunning(false);
    }
  };

  const severityIcon = (severity: string) => {
    if (severity === "critical") return <AlertTriangle className="h-4 w-4" />;
    if (severity === "warning") return <AlertTriangle className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" />
              <h1 className="text-2xl font-semibold">Transaction Integrity Audit</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Read-only checks across invoices, journals, invoice lines and stock movements.</p>
          </div>
          <Button onClick={runAudit} disabled={running} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Running Audit…" : "Run Audit"}
          </Button>
        </div>

        {!audit ? (
          <Card>
            <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
              <ShieldCheck className="mb-3 h-10 w-10 text-muted-foreground" />
              <h2 className="font-medium">No audit has been run yet</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Run the audit to identify transaction-integrity issues. The audit does not change or delete accounting data.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Metric title="Critical" value={audit.counts.critical ?? 0} danger />
              <Metric title="Warnings" value={audit.counts.warning ?? 0} />
              <Metric title="Invoices" value={audit.counts.invoices ?? 0} />
              <Metric title="Journals" value={audit.counts.journalEntries ?? 0} />
              <Metric title="Stock Movements" value={audit.counts.stockMovements ?? 0} />
            </div>

            {(audit.counts.critical ?? 0) === 0 && (audit.counts.warning ?? 0) === 0 && (
              <Card>
                <CardContent className="flex items-center gap-3 py-5">
                  <CheckCircle2 className="h-6 w-6" />
                  <div><p className="font-medium">No integrity exceptions found</p><p className="text-sm text-muted-foreground">The audited transaction chains passed the available read-only checks.</p></div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Findings</CardTitle></CardHeader>
              <CardContent>
                {!audit.findings.length ? (
                  <p className="text-sm text-muted-foreground">No findings.</p>
                ) : (
                  <div className="space-y-3">
                    {audit.findings.map((finding, index) => (
                      <div key={`${finding.code}-${finding.entityId ?? index}`} className="rounded-lg border bg-white p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {severityIcon(finding.severity)}
                          <span className="font-medium">{finding.title}</span>
                          <Badge variant={finding.severity === "critical" ? "destructive" : "secondary"}>{finding.severity}</Badge>
                          {finding.reference && <Badge variant="outline">{finding.reference}</Badge>}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{finding.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">Last run: {new Date(audit.generatedAt).toLocaleString()}</p>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ title, value, danger = false }: { title: string; value: number; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={`mt-1 text-2xl font-semibold ${danger && value > 0 ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
