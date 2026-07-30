import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Banknote, CalendarRange, Coins, Landmark, Repeat, ListOrdered } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimpleCrud } from "@/components/SimpleCrud";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { RequireModule } from "@/components/RequireModule";
import {
  LOAN_TYPE_OPTIONS, INTEREST_METHOD_OPTIONS, LOAN_STATUS_OPTIONS,
  buildSchedule, scheduleTotals, postLoanDisbursement, postLoanRepayment, refreshLoanBalance,
} from "@/lib/loans";

export const Route = createFileRoute("/_authenticated/loans")({
  head: () => ({
    meta: [
      { title: "Loans — SifoBooks" },
      { name: "description", content: "Staff loans, bank loans payable and loans receivable with amortisation schedules, repayments and automatic GL posting." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <RequireModule moduleKey="loans"><LoansPage /></RequireModule>,
});

function LoansPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [employees, setEmployees] = useState<{ value: string; label: string }[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [scheduleLoan, setScheduleLoan] = useState<any | null>(null);
  const [repayFor, setRepayFor] = useState<any | null>(null);
  const [repay, setRepay] = useState<any>({ payment_date: new Date().toISOString().slice(0, 10), amount: 0, principal_portion: 0, interest_portion: 0, method: "bank", reference: "" });

  const loadLoans = async () => {
    const { data } = await supabase.from("loans").select("*").order("created_at", { ascending: false });
    setLoans(data ?? []);
  };
  useEffect(() => {
    loadLoans();
    (async () => {
      const { data } = await supabase.from("employees").select("id, employee_code, first_name, last_name").order("first_name");
      setEmployees((data ?? []).map((e: any) => ({ value: e.id, label: `${e.employee_code ? e.employee_code + " - " : ""}${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() })));
    })();
  }, []);

  const kpis = useMemo(() => {
    const sum = (f: (l: any) => boolean) => loans.filter(f).reduce((s, l) => s + (Number(l.outstanding_balance) || 0), 0);
    return {
      staff: sum(l => l.loan_type === "staff"),
      payable: sum(l => l.loan_type === "payable"),
      receivable: sum(l => l.loan_type === "receivable"),
      active: loans.filter(l => l.status === "active").length,
    };
  }, [loans]);

  const openSchedule = async (loan: any) => {
    setScheduleLoan(loan);
    const { data } = await supabase.from("loan_schedule").select("*").eq("loan_id", loan.id).order("period_no");
    setSchedule(data ?? []);
  };

  const generateSchedule = async (loan: any, reload: () => Promise<void>) => {
    const rows = buildSchedule({
      principal: Number(loan.principal) || 0,
      interest_rate: Number(loan.interest_rate) || 0,
      interest_method: loan.interest_method ?? "straight_line",
      term_months: Number(loan.term_months) || 12,
      start_date: loan.start_date,
      first_due_date: loan.first_due_date,
    });
    const totals = scheduleTotals(rows);
    await supabase.from("loan_schedule").delete().eq("loan_id", loan.id);
    const { error } = await supabase.from("loan_schedule").insert(
      rows.map(r => ({ ...r, loan_id: loan.id, user_id: loan.user_id })) as any,
    );
    if (error) return toast.error(error.message);
    await supabase.from("loans").update({
      instalment_amount: totals.instalment,
      total_interest: totals.interest,
      total_repayable: totals.total,
      outstanding_balance: Math.max((Number(loan.principal) || 0) - (Number(loan.amount_repaid) || 0), 0),
      status: loan.status === "draft" ? "active" : loan.status,
    } as any).eq("id", loan.id);
    try { await postLoanDisbursement(loan); } catch (e: any) { toast.error(`Schedule saved, posting failed: ${e.message}`); }
    toast.success(`${rows.length}-month schedule generated and posted to the ledger`);
    await reload(); await loadLoans(); await openSchedule(loan);
  };

  const saveRepayment = async () => {
    const loan = repayFor;
    if (!loan) return;
    const amount = Number(repay.amount) || 0;
    if (amount <= 0) return toast.error("Enter an amount");
    const interest = Number(repay.interest_portion) || 0;
    const principal = Number(repay.principal_portion) || Math.max(amount - interest, 0);
    const { data, error } = await supabase.from("loan_repayments").insert({
      user_id: loan.user_id, loan_id: loan.id, payment_date: repay.payment_date,
      amount, principal_portion: principal, interest_portion: interest,
      method: repay.method, reference: repay.reference || null,
    } as any).select("*").single();
    if (error) return toast.error(error.message);
    try {
      const entryId = await postLoanRepayment(loan, data);
      if (entryId) await supabase.from("loan_repayments").update({ journal_entry_id: entryId } as any).eq("id", (data as any).id);
    } catch (e: any) { toast.error(`Saved, posting failed: ${e.message}`); }
    await refreshLoanBalance(loan.id);
    toast.success("Repayment recorded and posted");
    setRepayFor(null);
    setRepay({ payment_date: new Date().toISOString().slice(0, 10), amount: 0, principal_portion: 0, interest_portion: 0, method: "bank", reference: "" });
    loadLoans();
  };

  const writeOff = async (loan: any, reload: () => Promise<void>) => {
    if (!confirm(`Write off the outstanding balance on ${loan.loan_number}?`)) return;
    await supabase.from("loans").update({ status: "written_off", outstanding_balance: 0 } as any).eq("id", loan.id);
    toast.success("Loan written off");
    await reload(); loadLoans();
  };

  const loanLabel = (id: string) => loans.find(l => l.id === id)?.loan_number ?? "—";

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Banknote className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Loans</h1>
          <p className="text-sm text-muted-foreground">Staff loans, bank loans payable and loans receivable — schedules, repayments and GL posting.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Staff loans outstanding", value: kpis.staff },
          { label: "Loans payable", value: kpis.payable },
          { label: "Loans receivable", value: kpis.receivable },
        ].map(k => (
          <Card key={k.label} className="p-4">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="text-xl font-semibold tabular-nums">{fmtMoney(k.value)}</div>
          </Card>
        ))}
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Active loans</div>
          <div className="text-xl font-semibold tabular-nums">{kpis.active}</div>
        </Card>
      </div>

      <Tabs defaultValue="register">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="register"><Landmark className="h-4 w-4 mr-1.5" />Loan Register</TabsTrigger>
          <TabsTrigger value="schedule"><ListOrdered className="h-4 w-4 mr-1.5" />Amortisation Schedule</TabsTrigger>
          <TabsTrigger value="repayments"><Repeat className="h-4 w-4 mr-1.5" />Repayments</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-2">
          <SimpleCrud
            title="Loan" icon={Banknote} table="loans" orderBy={{ column: "created_at", ascending: false }}
            searchKeys={["loan_number", "counterparty"]} statusField="status" dateField="start_date"
            extraFilters={[{ name: "loan_type", label: "Type", options: LOAN_TYPE_OPTIONS }]}
            columns={[
              { key: "loan_number", header: "Loan #" },
              { key: "loan_type", header: "Type", render: (r: any) => <Badge variant="outline">{LOAN_TYPE_OPTIONS.find(o => o.value === r.loan_type)?.label ?? r.loan_type}</Badge> },
              { key: "counterparty", header: "Counterparty" },
              { key: "principal", header: "Principal", align: "right", render: (r: any) => fmtMoney(Number(r.principal ?? 0)) },
              { key: "interest_rate", header: "Rate %", align: "right" },
              { key: "term_months", header: "Months", align: "right" },
              { key: "instalment_amount", header: "Instalment", align: "right", render: (r: any) => fmtMoney(Number(r.instalment_amount ?? 0)) },
              { key: "amount_repaid", header: "Repaid", align: "right", render: (r: any) => fmtMoney(Number(r.amount_repaid ?? 0)) },
              { key: "outstanding_balance", header: "Outstanding", align: "right", render: (r: any) => <span className="font-semibold tabular-nums">{fmtMoney(Number(r.outstanding_balance ?? 0))}</span> },
              { key: "status", header: "Status", render: (r: any) => <Badge>{r.status}</Badge> },
            ]}
            rowActions={[
              { label: "Generate schedule", icon: CalendarRange, run: (r, reload) => generateSchedule(r, reload) },
              { label: "View schedule", icon: ListOrdered, run: async (r) => { await openSchedule(r); } },
              { label: "Repay", icon: Coins, variant: "outline", show: (r) => r.status === "active" || r.status === "draft", run: (r) => setRepayFor(r) },
              { label: "Write off", variant: "ghost", className: "text-destructive", show: (r) => r.status === "active", run: (r, reload) => writeOff(r, reload) },
            ]}
            fields={[
              { name: "loan_number", label: "Loan #", required: true, defaultValue: `LN-${Date.now().toString().slice(-6)}` },
              { name: "loan_type", label: "Loan type", type: "select", options: LOAN_TYPE_OPTIONS, defaultValue: "staff", required: true },
              { name: "counterparty", label: "Borrower / lender", colSpan: 2 },
              { name: "employee_id", label: "Employee (staff loans)", type: "select", options: employees },
              { name: "principal", label: "Principal (K)", type: "number", required: true },
              { name: "interest_rate", label: "Annual interest rate %", type: "number" },
              { name: "interest_method", label: "Interest method", type: "select", options: INTEREST_METHOD_OPTIONS, defaultValue: "straight_line" },
              { name: "term_months", label: "Term (months)", type: "number", defaultValue: 12 },
              { name: "start_date", label: "Start date", type: "date", defaultValue: new Date().toISOString().slice(0, 10) },
              { name: "first_due_date", label: "First instalment due", type: "date" },
              { name: "deduct_from_payroll", label: "Deduct from payroll", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }], defaultValue: "false" },
              { name: "status", label: "Status", type: "select", options: LOAN_STATUS_OPTIONS, defaultValue: "active" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </TabsContent>

        <TabsContent value="schedule" className="mt-2">
          <Card className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{scheduleLoan ? `Schedule — ${scheduleLoan.loan_number}` : "Amortisation schedule"}</div>
                <div className="text-xs text-muted-foreground">{scheduleLoan ? `${scheduleLoan.counterparty ?? ""} · ${fmtMoney(Number(scheduleLoan.principal ?? 0))} over ${scheduleLoan.term_months} months` : "Pick a loan from the register and choose “View schedule”."}</div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={scheduleLoan?.id ?? ""} onValueChange={(v) => openSchedule(loans.find(l => l.id === v))}>
                  <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Select loan" /></SelectTrigger>
                  <SelectContent>{loans.map(l => <SelectItem key={l.id} value={l.id}>{l.loan_number} — {l.counterparty ?? ""}</SelectItem>)}</SelectContent>
                </Select>
                <ExportMenu
                  rows={schedule.map(s => ({ Period: s.period_no, Due: s.due_date, Opening: s.opening_balance, Principal: s.principal_due, Interest: s.interest_due, Total: s.total_due, Closing: s.closing_balance, Status: s.status }))}
                  filename={`loan-schedule-${scheduleLoan?.loan_number ?? ""}`} title="Loan Amortisation Schedule"
                />
              </div>
            </div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>#</TableHead><TableHead>Due date</TableHead>
                <TableHead className="text-right">Opening</TableHead><TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Interest</TableHead><TableHead className="text-right">Instalment</TableHead>
                <TableHead className="text-right">Closing</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {schedule.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{s.period_no}</TableCell>
                    <TableCell>{s.due_date}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(Number(s.opening_balance))}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(Number(s.principal_due))}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(Number(s.interest_due))}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmtMoney(Number(s.total_due))}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(Number(s.closing_balance))}</TableCell>
                    <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {!schedule.length && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No schedule yet — generate one from the register.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="repayments" className="mt-2">
          <SimpleCrud
            title="Repayment" icon={Repeat} table="loan_repayments" orderBy={{ column: "payment_date", ascending: false }}
            searchKeys={["reference"]} dateField="payment_date"
            columns={[
              { key: "loan_id", header: "Loan", render: (r: any) => loanLabel(r.loan_id) },
              { key: "payment_date", header: "Date" },
              { key: "amount", header: "Amount", align: "right", render: (r: any) => fmtMoney(Number(r.amount ?? 0)) },
              { key: "principal_portion", header: "Principal", align: "right", render: (r: any) => fmtMoney(Number(r.principal_portion ?? 0)) },
              { key: "interest_portion", header: "Interest", align: "right", render: (r: any) => fmtMoney(Number(r.interest_portion ?? 0)) },
              { key: "method", header: "Method" },
              { key: "reference", header: "Reference" },
            ]}
            fields={[
              { name: "loan_id", label: "Loan", type: "select", required: true, options: loans.map(l => ({ value: l.id, label: `${l.loan_number} — ${l.counterparty ?? ""}` })) },
              { name: "payment_date", label: "Payment date", type: "date", defaultValue: new Date().toISOString().slice(0, 10) },
              { name: "amount", label: "Amount (K)", type: "number", required: true },
              { name: "principal_portion", label: "Principal portion", type: "number" },
              { name: "interest_portion", label: "Interest portion", type: "number" },
              { name: "method", label: "Method", type: "select", options: [{ value: "bank", label: "Bank" }, { value: "cash", label: "Cash" }, { value: "payroll", label: "Payroll deduction" }, { value: "mobile", label: "Mobile money" }], defaultValue: "bank" },
              { name: "reference", label: "Reference" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!repayFor} onOpenChange={() => setRepayFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record repayment — {repayFor?.loan_number}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={repay.payment_date} onChange={e => setRepay({ ...repay, payment_date: e.target.value })} /></div>
            <div><Label>Amount (K)</Label><Input type="number" value={repay.amount} onChange={e => setRepay({ ...repay, amount: e.target.value })} /></div>
            <div><Label>Interest portion</Label><Input type="number" value={repay.interest_portion} onChange={e => setRepay({ ...repay, interest_portion: e.target.value })} /></div>
            <div><Label>Principal portion</Label><Input type="number" value={repay.principal_portion} onChange={e => setRepay({ ...repay, principal_portion: e.target.value })} placeholder="auto" /></div>
            <div><Label>Method</Label>
              <Select value={repay.method} onValueChange={v => setRepay({ ...repay, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem><SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="payroll">Payroll deduction</SelectItem><SelectItem value="mobile">Mobile money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference</Label><Input value={repay.reference} onChange={e => setRepay({ ...repay, reference: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepayFor(null)}>Cancel</Button>
            <Button onClick={saveRepayment}>Save & post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
