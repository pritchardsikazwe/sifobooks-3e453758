import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Report = Record<string, number | string>;

/** Read-only health check. It reports older records with missing detail; it never changes them. */
const CHECKS: { key: string; title: string; note: string }[] = [
  { key: "sales_missing_shift", title: "Sales with no shift", note: "Older tills sales recorded before shifts were required" },
  { key: "sales_missing_location", title: "Sales with no store", note: "Sale not tied to a selling location" },
  { key: "sales_missing_journal", title: "Sales not in the books", note: "Completed sale without an accounting entry" },
  { key: "sales_missing_cashier", title: "Sales with no cashier", note: "Sale not linked to the person who rang it" },
  { key: "movements_missing_cost", title: "Stock moves without cost", note: "Stock value cannot be worked out for these" },
  { key: "movements_cost_mismatch", title: "Stock moves with odd totals", note: "Total value does not match quantity times cost" },
  { key: "items_without_cost", title: "Items without a cost price", note: "These cannot be sold until a cost is set" },
  { key: "unbalanced_pos_journals", title: "Unbalanced till entries", note: "Money in and money out do not agree" },
  { key: "duplicate_client_refs", title: "Duplicate offline sales", note: "The same offline sale saved twice" },
];

export function PosIntegrityCheck() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("pos_integrity_report" as any);
      if (error) throw error;
      setReport((data ?? {}) as Report);
    } catch (e: any) {
      toast.error(e?.message === "NOT_ALLOWED" ? "You do not have access to this check." : e?.message ?? "Could not run the check");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const clean = report ? CHECKS.every((c) => Number(report[c.key] ?? 0) === 0) : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Till & Stock Health Check</h1>
          <p className="text-sm text-muted-foreground">Reports older records that are missing detail. Nothing here changes your data.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {clean ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ShieldCheck className="h-4 w-4" />}
            {clean ? "Everything checks out" : "Items to review"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKS.map((c) => {
            const count = Number(report?.[c.key] ?? 0);
            return (
              <div key={c.key} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold text-sm">{c.title}</div>
                  <Badge variant={count > 0 ? "destructive" : "secondary"}>{loading ? "…" : count}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">{c.note}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {!clean && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
          <p>These are older records kept exactly as they were entered. New sales cannot be created with these gaps. Correcting history needs a decision from you first.</p>
        </div>
      )}
    </div>
  );
}
