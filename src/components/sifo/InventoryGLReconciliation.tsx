import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, CheckCircle2, RefreshCw, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SifoKpiCard } from "@/components/sifo/SifoKpiCard";
import { fmtMoney } from "@/lib/format";
import { signedQty } from "@/lib/multi-location";
import { toast } from "sonner";

type Props = { from: string; to: string; locationId?: string };
type Account = { id: string; account_code: string; account_name: string; account_type: string };
type Move = { movement_type: string; quantity: number; unit_cost: number | null; location_id: string | null; reference: string | null; transaction_date: string };
type GLLine = { debit: number; credit: number; journal_entries: { entry_date: string; entry_number: string | null; status: string } | null };

export function InventoryGLReconciliation({ from, to, locationId }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [moves, setMoves] = useState<Move[]>([]);
  const [glLines, setGlLines] = useState<GLLine[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAccounts = useCallback(async () => {
    const { data, error } = await supabase.from("chart_of_accounts")
      .select("id,account_code,account_name,account_type")
      .eq("is_active", true).order("account_code");
    if (error) return toast.error(error.message);
    const list = (data ?? []) as Account[];
    setAccounts(list);
    if (!accountId) {
      const preferred = list.find(a => /inventory|stock|merchandise/i.test(a.account_name))
        ?? list.find(a => /asset|current_asset/i.test(a.account_type));
      if (preferred) setAccountId(preferred.id);
    }
  }, [accountId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from("stock_movements")
        .select("movement_type,quantity,unit_cost,location_id,reference,transaction_date")
        .gte("transaction_date", from).lte("transaction_date", to)
        .order("transaction_date", { ascending: true }).limit(5000);
      if (locationId) q = q.eq("location_id", locationId);
      const { data, error } = await q;
      if (error) throw error;
      setMoves((data ?? []) as Move[]);
      if (accountId) {
        const { data: lines, error: le } = await supabase.from("journal_lines")
          .select("debit,credit,journal_entries:entry_id(entry_date,entry_number,status)")
          .eq("account_id", accountId).limit(5000);
        if (le) throw le;
        setGlLines(((lines ?? []) as any[]).filter(l => {
          const d = l.journal_entries?.entry_date;
          return d && d >= from && d <= to && String(l.journal_entries?.status ?? "").toLowerCase() !== "voided";
        }) as GLLine[]);
      } else setGlLines([]);
    } catch (e: any) { toast.error(e?.message ?? "Could not load GL reconciliation"); }
    finally { setLoading(false); }
  }, [from, to, locationId, accountId]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { load(); }, [load]);

  const subledger = useMemo(() => moves.reduce((sum, m) => sum + signedQty(m) * Number(m.unit_cost ?? 0), 0), [moves]);
  const glActivity = useMemo(() => glLines.reduce((sum, l) => sum + Number(l.debit ?? 0) - Number(l.credit ?? 0), 0), [glLines]);
  const variance = subledger - glActivity;
  const balanced = accountId && Math.abs(variance) < 0.005;
  const movementCount = moves.length;
  const journalCount = new Set(glLines.map(l => l.journal_entries?.entry_number).filter(Boolean)).size;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4" />Inventory → GL reconciliation</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Compares inventory subledger movement value with the selected GL account's net journal activity for the same period.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xl space-y-1.5">
          <Label>Inventory GL account</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Select inventory / stock account" /></SelectTrigger>
            <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_code} — {a.account_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {locationId && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />A location is selected above. Transfers can create one-sided location movement values, so the GL comparison is most meaningful when run for all locations.</div>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SifoKpiCard label="Inventory movement" value={fmtMoney(subledger)} />
          <SifoKpiCard label="GL net activity" value={fmtMoney(glActivity)} />
          <SifoKpiCard label="Variance" value={fmtMoney(variance)} />
          <SifoKpiCard label="Status" value={balanced ? "MATCHED" : accountId ? "REVIEW" : "SELECT ACCOUNT"} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border p-4"><div className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4" />Audit coverage</div><p className="mt-2 text-xs text-muted-foreground">{movementCount.toLocaleString()} inventory movements · {journalCount.toLocaleString()} GL journals</p></div>
          <div className="rounded-xl border p-4"><div className="text-xs uppercase tracking-wider text-muted-foreground">Period</div><div className="mt-2 font-semibold">{from} → {to}</div></div>
          <div className={`rounded-xl border p-4 ${balanced ? "border-emerald-500/30" : "border-amber-500/30"}`}><div className="flex items-center gap-2 text-sm font-semibold">{balanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{balanced ? "Reconciled" : "Investigation required"}</div><p className="mt-2 text-xs text-muted-foreground">{balanced ? "Subledger movement equals GL net activity." : "Drill into stock movements and journal entries to identify timing, costing or posting differences."}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}
