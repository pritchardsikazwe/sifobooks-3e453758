import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, Landmark, Scale, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtMoney, monthName } from "@/lib/format";
import { findPayrollJournal } from "@/lib/payroll-posting";

export const Route = createFileRoute("/_authenticated/payroll-payments")({
  head: () => ({
    meta: [
      { title: "Payroll Payments — SifoBooks" },
      { name: "description", content: "Pay an approved payroll run from an existing bank or cash account and reconcile the batch against the run and its ledger journal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayrollPayments,
});

const db = supabase as any;
const METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
];

type Run = {
  id: string; run_number: string; period_year: number; period_month: number;
  status: string; pay_date: string | null; total_net: number | null; employees_paid: number | null;
};
type Account = { id: string; name: string; bank_name: string | null; account_number: string | null; currency: string | null; cashbook_type: string | null };
type Batch = {
  id: string; payroll_run_id: string; bank_account_id: string | null; payment_method: string;
  pay_date: string; total_amount: number; employees_count: number; status: string;
  reference: string | null; paid_at: string | null;
};

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function PayrollPayments() {
  const [userId, setUserId] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [runId, setRunId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [slipTotal, setSlipTotal] = useState(0);
  const [slipCount, setSlipCount] = useState(0);
  const [journalId, setJournalId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const run = runs.find((r) => r.id === runId) ?? null;

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const [{ data: rs }, { data: acc }] = await Promise.all([
        db.from("payroll_runs")
          .select("id,run_number,period_year,period_month,status,pay_date,total_net,employees_paid")
          .eq("user_id", u.user.id)
          .order("period_year", { ascending: false }).order("period_month", { ascending: false }).limit(36),
        db.from("bank_accounts").select("id,name,bank_name,account_number,currency,cashbook_type")
          .eq("user_id", u.user.id).eq("is_active", true).order("name"),
      ]);
      const list = (rs ?? []) as Run[];
      setRuns(list);
      setAccounts((acc ?? []) as Account[]);
      const payable = list.find((r) => ["approved", "posted", "paid"].includes(r.status)) ?? list[0];
      if (payable) setRunId(payable.id);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!runId || !run || !userId) return;
    const [{ data: slips }, { data: bs }] = await Promise.all([
      db.from("payslips").select("net_pay").eq("payroll_run_id", runId),
      db.from("payroll_payment_batches").select("*").eq("payroll_run_id", runId).order("created_at", { ascending: false }),
    ]);
    const rows = (slips ?? []) as { net_pay: number | null }[];
    setSlipTotal(Math.round(rows.reduce((t, s) => t + n(s.net_pay), 0) * 100) / 100);
    setSlipCount(rows.length);
    setBatches((bs ?? []) as Batch[]);
    setJournalId(await findPayrollJournal(userId, run.run_number));
  }, [runId, run, userId]);

  useEffect(() => { void load(); }, [load]);

  const paidSoFar = useMemo(
    () => Math.round(batches.filter((b) => b.status !== "cancelled").reduce((t, b) => t + n(b.total_amount), 0) * 100) / 100,
    [batches],
  );
  const outstanding = Math.round((slipTotal - paidSoFar) * 100) / 100;
  const runNetDiff = Math.round((slipTotal - n(run?.total_net)) * 100) / 100;
  const payable = !!run && ["approved", "posted"].includes(run.status);

  const createBatch = async () => {
    if (!run || !userId) return;
    if (outstanding <= 0) return toast.error("This run is already fully covered by a payment batch.");
    if (!accountId && method !== "cash") return toast.error("Choose the bank account this payroll is paid from.");
    setBusy(true);
    const { data, error } = await db.from("payroll_payment_batches").insert({
      user_id: userId,
      payroll_run_id: run.id,
      bank_account_id: accountId || null,
      payment_method: method,
      pay_date: run.pay_date ?? new Date().toISOString().slice(0, 10),
      total_amount: outstanding,
      employees_count: slipCount,
      status: "draft",
      reference: reference.trim() || null,
      created_by: userId,
    }).select("id").maybeSingle();
    setBusy(false);
    if (error) return toast.error(error.message);
    await db.from("audit_logs").insert({
      user_id: userId, action: "payroll.payment_batch.created", entity_type: "payroll_payment_batches",
      entity_id: data?.id ?? run.id,
      details: { run: run.run_number, amount: outstanding, employees: slipCount, method },
    });
    setReference("");
    toast.success("Payment batch prepared. Mark it paid once the money has left the account.");
    void load();
  };

  const setBatchStatus = async (batch: Batch, status: "approved" | "paid" | "cancelled") => {
    if (!userId) return;
    setBusy(true);
    const patch: Record<string, unknown> = { status };
    if (status === "paid") { patch['paid_by'] = userId; patch['paid_at'] = new Date().toISOString(); }
    const { error } = await db.from("payroll_payment_batches").update(patch).eq("id", batch.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await db.from("audit_logs").insert({
      user_id: userId, action: `payroll.payment_batch.${status}`, entity_type: "payroll_payment_batches",
      entity_id: batch.id, details: { run: run?.run_number, amount: batch.total_amount },
    });
    void load();
  };

  const accountLabel = (id: string | null) => {
    const a = accounts.find((x) => x.id === id);
    if (!a) return "Cash";
    return `${a.name}${a.account_number ? ` · ${a.account_number}` : ""}`;
  };

  return (
    <div className="max-w-6xl space-y-5 px-6 py-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Wallet className="h-6 w-6 text-emerald-600" /> Payroll payments
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pay an approved run from an account you already have, then check the batch against the payslips and the ledger journal.
          </p>
        </div>
        <div className="w-72">
          <Label className="text-xs">Payroll run</Label>
          <Select value={runId} onValueChange={setRunId}>
            <SelectTrigger><SelectValue placeholder="Choose a payroll run…" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.run_number} · {monthName(r.period_month)} {r.period_year} · {r.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!run ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No payroll run yet.</CardContent></Card>
      ) : (
        <>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4" /> Reconciliation</CardTitle>
              <CardDescription>Payslips, run totals, payment batches and the ledger journal must agree before the period is closed.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Figure label={`Payslips (${slipCount})`} value={fmtMoney(slipTotal)} />
              <Figure label="Run net total" value={fmtMoney(n(run.total_net))} tone={Math.abs(runNetDiff) < 0.01 ? undefined : "bad"} note={Math.abs(runNetDiff) < 0.01 ? "agrees with payslips" : `differs by ${fmtMoney(runNetDiff)}`} />
              <Figure label="Paid in batches" value={fmtMoney(paidSoFar)} />
              <Figure label="Still to pay" value={fmtMoney(outstanding)} tone={outstanding > 0 ? "warn" : undefined} note={outstanding <= 0 ? "fully covered" : undefined} />
              <div className="md:col-span-4 text-sm text-muted-foreground">
                {journalId
                  ? <span className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> A payroll journal is posted for this run.</span>
                  : <span className="flex items-center gap-2"><Landmark className="h-4 w-4" /> No ledger journal yet for this run — post it from <Link className="underline" to="/payroll">Run Payroll</Link> so the payment reconciles to the accounts.</span>}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Prepare a payment batch</CardTitle>
              <CardDescription>
                {payable ? "Uses the outstanding net pay on this run — nothing is posted until you mark the batch paid."
                  : `This run is ${run.status}. Only approved or posted runs can be paid.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div>
                <Label className="text-xs">Pay from</Label>
                <Select value={accountId} onValueChange={setAccountId} disabled={!payable}>
                  <SelectTrigger><SelectValue placeholder="Choose an existing account…" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}{a.bank_name ? ` — ${a.bank_name}` : ""}{a.account_number ? ` · ${a.account_number}` : ""}
                      </SelectItem>
                    ))}
                    {accounts.length === 0 && <SelectItem value="none" disabled>No active bank or cash account</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Method</Label>
                <Select value={method} onValueChange={setMethod} disabled={!payable}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Reference</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank batch or transfer reference" disabled={!payable} />
              </div>
              <div className="flex items-end">
                <Button className="w-full" disabled={!payable || busy || outstanding <= 0} onClick={() => void createBatch()}>
                  <Banknote className="mr-1 h-4 w-4" /> Prepare {fmtMoney(outstanding)}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-base">Batches on this run</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pay date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.pay_date}</TableCell>
                      <TableCell>{accountLabel(b.bank_account_id)}</TableCell>
                      <TableCell className="capitalize">{b.payment_method.replace("_", " ")}</TableCell>
                      <TableCell>{b.reference ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(n(b.total_amount))} <span className="text-xs text-muted-foreground">/ {b.employees_count}</span></TableCell>
                      <TableCell><Badge variant={b.status === "paid" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}>{b.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {b.status === "draft" && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => void setBatchStatus(b, "paid")}>Mark paid</Button>
                            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void setBatchStatus(b, "cancelled")}>Cancel</Button>
                          </div>
                        )}
                        {b.status === "paid" && b.paid_at && <span className="text-xs text-muted-foreground">{new Date(b.paid_at).toLocaleDateString()}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {batches.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No payment batch prepared for this run yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Figure({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "warn" | "bad" }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${tone === "bad" ? "text-rose-700" : tone === "warn" ? "text-amber-700" : ""}`}>{value}</div>
      {note && <div className="text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}
