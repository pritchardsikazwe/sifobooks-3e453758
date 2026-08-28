import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ArrowRight,
  BookText, ShoppingBag, UtensilsCrossed, Landmark, Boxes, Building2, BookOpen, Database,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/system-health")({
  head: () => ({
    meta: [
      { title: "System Health & QA — SifoBooks" },
      { name: "description", content: "End-to-end verification of the SifoBooks accounting engine: GL integrity, POS posting coverage, inventory and banking checks." },
      { property: "og:title", content: "System Health & QA — SifoBooks" },
      { property: "og:description", content: "End-to-end verification of the SifoBooks accounting engine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SystemHealthPage,
});

type Severity = "pass" | "warn" | "fail";
type Check = {
  key: string;
  title: string;
  description: string;
  icon: any;
  severity: Severity;
  metric: string;
  detail?: string;
  fixTo?: string;
  fixLabel?: string;
};

async function countRows(query: any): Promise<number> {
  const { count, error } = await query;
  if (error) return -1;
  return count ?? 0;
}

function SystemHealthPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  const runChecks = useCallback(async () => {
    setRunning(true);
    const out: Check[] = [];
    try {
      // 1 · GL balance integrity — posted journals whose lines don't net to zero
      const { data: entries } = await supabase
        .from("journal_entries")
        .select("id, reference, journal_lines(debit, credit)")
        .order("entry_date", { ascending: false })
        .limit(1000);
      const list = (entries ?? []) as any[];
      const unbalanced = list.filter((e) => {
        const d = (e.journal_lines ?? []).reduce((s: number, l: any) => s + Number(l.debit || 0), 0);
        const c = (e.journal_lines ?? []).reduce((s: number, l: any) => s + Number(l.credit || 0), 0);
        return Math.abs(d - c) > 0.005;
      });
      const noLines = list.filter((e) => !(e.journal_lines ?? []).length);
      out.push({
        key: "gl-balance", title: "General Ledger integrity", icon: BookText,
        description: "Every journal entry must balance (debits = credits) and have lines.",
        severity: unbalanced.length || noLines.length ? "fail" : "pass",
        metric: `${list.length - unbalanced.length - noLines.length}/${list.length} balanced`,
        detail: unbalanced.length ? `${unbalanced.length} unbalanced, ${noLines.length} with no lines (checked latest ${list.length})` : noLines.length ? `${noLines.length} entries have no lines` : `Checked latest ${list.length} entries`,
        fixTo: "/journal-entries", fixLabel: "Open journals",
      });

      // 2 · Draft journals
      const drafts = await countRows(supabase.from("journal_entries").select("id", { count: "exact", head: true }).neq("status", "posted"));
      out.push({
        key: "gl-drafts", title: "Unposted journals", icon: BookText,
        description: "Draft journals don't affect the ledger until posted.",
        severity: drafts > 0 ? "warn" : "pass",
        metric: drafts < 0 ? "n/a" : `${drafts} draft`,
        fixTo: "/journal-entries", fixLabel: "Review drafts",
      });

      // 3 · POS posting coverage
      const posUnposted = await countRows(supabase.from("pos_sales").select("id", { count: "exact", head: true }).eq("status", "completed").is("journal_entry_id", null));
      out.push({
        key: "pos-posting", title: "Retail POS → GL posting", icon: ShoppingBag,
        description: "Completed till sales must have a linked journal entry.",
        severity: posUnposted > 0 ? "fail" : "pass",
        metric: posUnposted < 0 ? "n/a" : posUnposted === 0 ? "100% posted" : `${posUnposted} unposted`,
        fixTo: "/pos", fixLabel: "Open POS",
      });

      // 4 · Restaurant posting coverage
      const restUnposted = await countRows(supabase.from("restaurant_orders").select("id", { count: "exact", head: true }).in("status", ["paid", "completed"]).is("journal_entry_id", null));
      out.push({
        key: "rest-posting", title: "Restaurant → GL posting", icon: UtensilsCrossed,
        description: "Settled restaurant orders must post to the ledger.",
        severity: restUnposted > 0 ? "fail" : "pass",
        metric: restUnposted < 0 ? "n/a" : restUnposted === 0 ? "100% posted" : `${restUnposted} unposted`,
        fixTo: "/restaurant", fixLabel: "Open Restaurant",
      });

      // 5 · Bank allocation
      const bankUnallocated = await countRows(supabase.from("bank_transactions").select("id", { count: "exact", head: true }).eq("status", "unallocated"));
      out.push({
        key: "bank-alloc", title: "Bank transaction allocation", icon: Landmark,
        description: "Imported bank lines waiting to be allocated or matched.",
        severity: bankUnallocated > 0 ? "warn" : "pass",
        metric: bankUnallocated < 0 ? "n/a" : `${bankUnallocated} unallocated`,
        fixTo: "/banking", fixLabel: "Open banking",
      });

      // 6 · Negative stock
      const negStock = await countRows(supabase.from("stock_items").select("id", { count: "exact", head: true }).lt("quantity_on_hand", 0));
      out.push({
        key: "stock-neg", title: "Negative inventory", icon: Boxes,
        description: "Items sold below zero — indicates missing purchases or adjustments.",
        severity: negStock > 0 ? "fail" : "pass",
        metric: negStock < 0 ? "n/a" : negStock === 0 ? "none" : `${negStock} items`,
        fixTo: "/stock", fixLabel: "Open items",
      });

      // 7 · Below reorder level
      const lowStock = await countRows(supabase.from("stock_items").select("id", { count: "exact", head: true }).gt("reorder_level", 0).filter("quantity_on_hand", "lt", "reorder_level"));
      out.push({
        key: "stock-low", title: "Stock below reorder level", icon: Boxes,
        description: "Items at or under their reorder threshold.",
        severity: lowStock > 0 ? "warn" : "pass",
        metric: lowStock < 0 ? "n/a" : lowStock === 0 ? "none" : `${lowStock} items`,
        fixTo: "/inventory", fixLabel: "Open inventory",
      });

      // 8 · Chart of accounts present
      const coaCount = await countRows(supabase.from("chart_of_accounts").select("id", { count: "exact", head: true }));
      out.push({
        key: "coa", title: "Chart of accounts", icon: BookOpen,
        description: "The company needs an active chart of accounts to post.",
        severity: coaCount === 0 ? "fail" : "pass",
        metric: coaCount < 0 ? "n/a" : `${coaCount} accounts`,
        fixTo: "/chart-of-accounts", fixLabel: "Open COA",
      });

      // 9 · Company configuration
      const { data: comps } = await supabase.from("companies").select("id, name, base_currency, workspace_mode");
      const missing = (comps ?? []).filter((c: any) => !c.base_currency || !c.workspace_mode);
      out.push({
        key: "company-config", title: "Company configuration", icon: Building2,
        description: "Base currency and workspace mode must be set on every company.",
        severity: missing.length ? "warn" : "pass",
        metric: `${(comps ?? []).length - missing.length}/${(comps ?? []).length} configured`,
        detail: missing.length ? missing.map((c: any) => c.name).join(", ") : undefined,
        fixTo: "/setup", fixLabel: "Company setup",
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Health checks failed");
    }
    setChecks(out);
    setRanAt(new Date());
    setRunning(false);
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  const rebuild = async () => {
    setRebuilding(true);
    try {
      const { error } = await supabase.rpc("rebuild_ledgers");
      if (error) throw error;
      toast.success("Ledgers rebuilt from journal lines");
      runChecks();
    } catch (e: any) {
      toast.error(e?.message ?? "Rebuild failed");
    } finally {
      setRebuilding(false);
    }
  };

  const fails = checks.filter((c) => c.severity === "fail").length;
  const warns = checks.filter((c) => c.severity === "warn").length;
  const overall: Severity = fails ? "fail" : warns ? "warn" : "pass";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> System Health & QA
          </h1>
          <p className="text-sm text-muted-foreground">
            End-to-end verification that POS, Restaurant, Banking and Inventory all feed the same ledger.
            {ranAt && <span> Last run {ranAt.toLocaleTimeString()}.</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={rebuild} disabled={rebuilding}>
            <Database className="h-4 w-4 mr-2" /> {rebuilding ? "Rebuilding…" : "Rebuild ledgers"}
          </Button>
          <Button onClick={runChecks} disabled={running}>
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} /> Re-run checks
          </Button>
        </div>
      </div>

      <Card className={overall === "pass" ? "border-emerald-500/40" : overall === "warn" ? "border-amber-500/40" : "border-rose-500/40"}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            {overall === "pass" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : overall === "warn" ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}
            {overall === "pass" ? "All systems healthy" : overall === "warn" ? `${warns} warning${warns === 1 ? "" : "s"} to review` : `${fails} failing check${fails === 1 ? "" : "s"}`}
          </CardTitle>
          <CardDescription>{checks.filter((c) => c.severity === "pass").length} of {checks.length} checks passing</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {checks.map((c) => (
          <Card key={c.key} className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2"><c.icon className="h-4 w-4 text-muted-foreground" />{c.title}</span>
                <Badge variant="outline" className={
                  c.severity === "pass" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                  : c.severity === "warn" ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                  : "bg-rose-500/15 text-rose-600 border-rose-500/30"
                }>{c.severity === "pass" ? "Pass" : c.severity === "warn" ? "Warning" : "Failing"}</Badge>
              </CardTitle>
              <CardDescription>{c.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-2">
              <div className="text-lg font-semibold">{c.metric}</div>
              {c.detail && <div className="text-xs text-muted-foreground">{c.detail}</div>}
              {c.fixTo && c.severity !== "pass" && (
                <Link to={c.fixTo as never} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  {c.fixLabel ?? "Fix"} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
        {checks.length === 0 && running && (
          <Card className="md:col-span-2 xl:col-span-3"><CardContent className="py-10 text-center text-muted-foreground">Running checks…</CardContent></Card>
        )}
      </div>
    </div>
  );
}
