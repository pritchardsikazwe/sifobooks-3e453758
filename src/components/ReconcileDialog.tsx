import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Upload, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";

type Txn = {
  id: string; txn_date: string; description: string | null;
  amount: number; reference: string | null; reconciled?: boolean;
};

export function ReconcileDialog({
  open,
  onOpenChange,
  defaultBankAccountId,
  onLocked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultBankAccountId?: string;
  onLocked?: () => void;
}) {
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankAccountId, setBankAccountId] = useState(defaultBankAccountId ?? "");
  const [stmtDate, setStmtDate] = useState(new Date().toISOString().slice(0, 10));
  const [lastReconciledDate, setLastReconciledDate] = useState<string>("");
  const [stmtBalance, setStmtBalance] = useState<string>("");
  const [txns, setTxns] = useState<Txn[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: ba } = await supabase.from("bank_accounts" as any).select("*").eq("is_active", true).order("name");
      setBankAccounts((ba ?? []) as any);
      if (!bankAccountId && ba && ba.length) setBankAccountId((ba as any)[0].id);
    })();
    // eslint-disable-next-line
  }, [open]);

  useEffect(() => {
    if (!open || !bankAccountId) return;
    (async () => {
      setLoading(true);
      const [{ data: t }, { data: lastSession }] = await Promise.all([
        supabase.from("bank_transactions")
          .select("id, txn_date, description, amount, reference, reconciled")
          .eq("bank_account_id", bankAccountId)
          .eq("reconciled", false)
          .lte("txn_date", stmtDate)
          .order("txn_date"),
        supabase.from("reconciliation_sessions" as any)
          .select("statement_date")
          .eq("bank_account_id", bankAccountId)
          .eq("status", "locked")
          .order("statement_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setTxns((t as Txn[]) ?? []);
      setLastReconciledDate((lastSession as any)?.statement_date ?? "");
      setLoading(false);
    })();
  }, [open, bankAccountId, stmtDate]);

  const clearedTotal = useMemo(
    () => txns.filter(t => checked.has(t.id)).reduce((s, t) => s + Number(t.amount || 0), 0),
    [txns, checked],
  );
  const openingBalance = useMemo(() => {
    const acc = bankAccounts.find(a => a.id === bankAccountId);
    return Number(acc?.opening_balance ?? 0);
  }, [bankAccounts, bankAccountId]);

  const calculated = openingBalance + clearedTotal;
  const stmt = Number(stmtBalance) || 0;
  const outOfBalance = stmt - calculated;
  const balanced = stmt !== 0 && Math.abs(outOfBalance) < 0.01;

  const toggle = (id: string) => {
    const next = new Set(checked);
    next.has(id) ? next.delete(id) : next.add(id);
    setChecked(next);
  };
  const toggleAll = () => {
    if (checked.size === txns.length) setChecked(new Set());
    else setChecked(new Set(txns.map(t => t.id)));
  };

  async function lock() {
    if (!balanced) return toast.error("Statement balance must match calculated balance");
    setLocking(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLocking(false); return; }
    const { data: session, error: sErr } = await supabase.from("reconciliation_sessions" as any).insert({
      user_id: u.user.id,
      bank_account_id: bankAccountId,
      statement_date: stmtDate,
      statement_balance: stmt,
      book_balance: calculated,
      status: "draft",
    }).select("id").single();
    if (sErr || !session) { setLocking(false); return toast.error(sErr?.message ?? "Failed"); }
    const { error: rpcErr } = await supabase.rpc("lock_reconciliation" as any, {
      _session_id: (session as any).id,
      _txn_ids: Array.from(checked),
    });
    setLocking(false);
    if (rpcErr) return toast.error(rpcErr.message);
    toast.success("Reconciliation locked");
    setChecked(new Set());
    onOpenChange(false);
    onLocked?.();
  }

  async function loadStatementFile(file: File) {
    toast.info(`Loaded ${file.name} — match rows below and tick reconciled entries`);
    // Statement file parsing already available via /banking Import; keep this modal focused on ticking cleared items.
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-white/10 bg-slate-900/95 text-slate-100 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Reconcile Account</DialogTitle>
          <DialogDescription className="text-slate-400">
            Match your bank account to recorded transactions. Tick each entry that appears on the statement.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <Label className="text-slate-300">Account</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger className="border-white/10 bg-slate-800/60"><SelectValue /></SelectTrigger>
              <SelectContent>{bankAccounts.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-300">Last Reconciled Date</Label>
            <Input value={lastReconciledDate || "—"} readOnly className="border-white/10 bg-slate-800/40 text-slate-400" />
          </div>
          <div>
            <Label className="text-slate-300">Bank Statement Date</Label>
            <Input type="date" value={stmtDate} onChange={e => setStmtDate(e.target.value)} className="border-white/10 bg-slate-800/60" />
          </div>
          <div>
            <Label className="text-slate-300">New Statement Balance</Label>
            <Input type="number" step="0.01" value={stmtBalance} onChange={e => setStmtBalance(e.target.value)} placeholder="0.00" className="border-white/10 bg-slate-800/60 font-semibold" />
          </div>
          <div>
            <Label className="text-slate-300">Calculated Balance</Label>
            <Input value={fmtMoney(calculated)} readOnly className="border-white/10 bg-slate-800/40 text-slate-200" />
          </div>
          <div>
            <Label className="text-slate-300">Out of Balance</Label>
            <Input
              value={fmtMoney(outOfBalance)} readOnly
              className={`border-white/10 bg-slate-800/40 font-semibold ${balanced ? "text-emerald-400" : "text-red-400"}`}
            />
          </div>
        </div>

        <div className="max-h-[360px] overflow-auto rounded-xl border border-white/10">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : txns.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No unreconciled transactions on or before the statement date.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="w-10"><Checkbox checked={checked.size === txns.length && txns.length > 0} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead className="text-slate-300">Date</TableHead>
                  <TableHead className="text-slate-300">Ledger Transaction</TableHead>
                  <TableHead className="text-right text-slate-300">Deposits</TableHead>
                  <TableHead className="text-right text-slate-300">Payments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map(t => {
                  const amt = Number(t.amount || 0);
                  return (
                    <TableRow key={t.id} className="border-white/5 hover:bg-white/5">
                      <TableCell><Checkbox checked={checked.has(t.id)} onCheckedChange={() => toggle(t.id)} /></TableCell>
                      <TableCell className="text-sm">{t.txn_date}</TableCell>
                      <TableCell className="text-sm">
                        <div>{t.description ?? "—"}</div>
                        {t.reference && <div className="text-xs text-slate-500">{t.reference}</div>}
                      </TableCell>
                      <TableCell className="text-right text-emerald-400">{amt > 0 ? fmtMoney(amt) : ""}</TableCell>
                      <TableCell className="text-right text-red-400">{amt < 0 ? fmtMoney(-amt) : ""}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Label htmlFor="stmt-file" className="cursor-pointer">
              <input id="stmt-file" type="file" className="hidden" accept=".csv,.pdf,.png,.jpg" onChange={e => e.target.files?.[0] && loadStatementFile(e.target.files[0])} />
              <span className="inline-flex items-center rounded-md border border-white/10 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60">
                <Upload className="mr-2 h-4 w-4" /> Load Bank Statement
              </span>
            </Label>
            <div className="text-xs text-slate-400 self-center">
              Cleared: <b className="text-slate-200">{fmtMoney(clearedTotal)}</b> · Ticked: <b className="text-slate-200">{checked.size}</b>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-300">Cancel</Button>
            <Button variant="update" onClick={lock} disabled={!balanced || locking} >
              {locking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              Reconcile & Lock
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
