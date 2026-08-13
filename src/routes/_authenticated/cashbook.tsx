import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookText, Printer, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTable, type DTColumn } from "@/components/data-table";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { ExportMenu } from "@/lib/exports";
import { DateRangeFilter, EMPTY_RANGE, inRange, type DateRange } from "@/components/DateRangeFilter";

export const Route = createFileRoute("/_authenticated/cashbook")({
  head: () => ({ meta: [{ title: "Cashbook — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: CashbookPage,
});

type Row = {
  id: string; txn_date: string; description: string | null; reference: string | null;
  amount: number; payee?: string | null; charge_code?: string | null;
  voucher_no?: string | null; receipt_no?: string | null;
  cost_centre?: string | null; project_ref?: string | null; fund_source?: string | null;
  bank_account_id: string; user_id: string; created_at: string;
};

const CASHBOOK_TYPES = [
  { value: "main", label: "Main Cashbook" },
  { value: "petty_cash", label: "Petty Cash" },
  { value: "grant", label: "Grant Cashbook" },
  { value: "project", label: "Project Cashbook" },
  { value: "payroll", label: "Payroll Cashbook" },
  { value: "fx", label: "Foreign Currency" },
];

function CashbookPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [glAccounts, setGlAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [source, setSource] = useState<"ledger"|"bank">("ledger");
  const [rows, setRows] = useState<Row[]>([]);
  const [opening, setOpening] = useState(0);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
  const [q, setQ] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [fundFilter, setFundFilter] = useState("");
  const [costCentreFilter, setCostCentreFilter] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: gl }] = await Promise.all([
        supabase.from("bank_accounts").select("*").order("name"),
        supabase.from("chart_of_accounts").select("id, account_code, account_name, account_type")
          .in("account_type", ["asset"]).order("account_code"),
      ]);
      setAccounts(a ?? []);
      setGlAccounts((gl ?? []).filter((x: any) =>
        ["1000","1001","1002","1010","1020","1030","1040","1050","1060","1070","1200"].includes(x.account_code)
        || /cash|bank|petty|mobile|momo/i.test(x.account_name)
      ));
    })();
  }, []);

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [accountId, typeFilter, source, range.from, range.to]);

  function scopedAccounts() {
    return accounts.filter(a =>
      (accountId === "all" || a.id === accountId) &&
      (typeFilter === "all" || (a.cashbook_type ?? "main") === typeFilter)
    );
  }

  async function loadFromBank() {
    const scopedAccountIds = scopedAccounts().map(a => a.id);
    let priorSum = 0;
    if (range.from && scopedAccountIds.length) {
      const { data: prior } = await supabase.from("bank_transactions")
        .select("amount, bank_account_id")
        .in("bank_account_id", scopedAccountIds)
        .lt("txn_date", range.from);
      priorSum = (prior ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    }
    const priorOpening = scopedAccounts().reduce((s, a) => s + Number(a.opening_balance ?? 0), 0);
    setOpening(priorOpening + priorSum);

    let query: any = supabase.from("bank_transactions")
      .select("id, txn_date, description, reference, amount, payee, charge_code, voucher_no, receipt_no, cost_centre, project_ref, fund_source, bank_account_id, user_id, created_at")
      .order("txn_date").order("id");
    if (scopedAccountIds.length) query = query.in("bank_account_id", scopedAccountIds);
    if (range.from) query = query.gte("txn_date", range.from);
    if (range.to) query = query.lte("txn_date", range.to);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
  }

  async function loadFromLedger() {
    // Cashbook = GL view of the linked cash/bank accounts. Automatically
    // includes receipts, expenses, bills, payroll, transfers — anything posted.
    const scoped = scopedAccounts();
    // Resolve target GL account ids from the selected bank accounts (fallback to all cash-like GL accounts).
    let glIds = scoped.map(a => a.gl_account_id).filter(Boolean) as string[];
    if (!glIds.length) glIds = glAccounts.map(g => g.id);
    if (!glIds.length) { setRows([]); setOpening(0); return; }

    // Opening balance = SUM(debit - credit) on those accounts before range.from
    let openingBal = scoped.reduce((s, a) => s + Number(a.opening_balance ?? 0), 0);
    if (range.from) {
      const { data: pre } = await supabase.from("journal_lines")
        .select("debit, credit, journal_entries!inner(entry_date, user_id)")
        .in("account_id", glIds)
        .lt("journal_entries.entry_date", range.from);
      openingBal += (pre ?? []).reduce((s: number, r: any) => s + Number(r.debit || 0) - Number(r.credit || 0), 0);
    }
    setOpening(openingBal);

    let q2: any = supabase.from("journal_lines")
      .select("id, debit, credit, description, account_id, journal_entries!inner(id, entry_date, entry_number, reference, description, user_id)")
      .in("account_id", glIds)
      .order("entry_date", { referencedTable: "journal_entries" });
    if (range.from) q2 = q2.gte("journal_entries.entry_date", range.from);
    if (range.to)   q2 = q2.lte("journal_entries.entry_date", range.to);
    const { data, error } = await q2;
    if (error) { toast.error(error.message); setRows([]); return; }

    const mapped: Row[] = (data ?? []).map((l: any) => {
      const je = l.journal_entries;
      const amt = Number(l.debit || 0) - Number(l.credit || 0);
      return {
        id: l.id,
        txn_date: je.entry_date,
        description: l.description ?? je.description,
        reference: je.reference ?? je.entry_number,
        amount: amt,
        payee: null, charge_code: null,
        voucher_no: je.entry_number, receipt_no: null,
        cost_centre: null, project_ref: null, fund_source: null,
        bank_account_id: l.account_id,
        user_id: je.user_id,
        created_at: je.entry_date,
      };
    });
    setRows(mapped);
  }

  async function load() {
    setLoading(true);
    try {
      if (source === "ledger") await loadFromLedger();
      else await loadFromBank();
    } finally { setLoading(false); }
  }

  async function updateCashbookType(id: string, type: string) {
    const { error } = await supabase.from("bank_accounts").update({ cashbook_type: type }).eq("id", id);
    if (error) return toast.error(error.message);
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, cashbook_type: type } : a));
    toast.success("Cashbook type updated");
  }

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return rows.filter(r => {
      if (s) {
        const hay = [r.description, r.reference, r.payee, r.voucher_no, r.receipt_no, r.charge_code].join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (projectFilter && (r.project_ref ?? "").toLowerCase() !== projectFilter.toLowerCase()) return false;
      if (fundFilter && (r.fund_source ?? "").toLowerCase() !== fundFilter.toLowerCase()) return false;
      if (costCentreFilter && (r.cost_centre ?? "").toLowerCase() !== costCentreFilter.toLowerCase()) return false;
      if (!inRange(r.txn_date, range)) return false;
      return true;
    });
  }, [rows, q, projectFilter, fundFilter, costCentreFilter, range]);

  const enriched = useMemo(() => {
    let bal = opening;
    return filtered.map(r => {
      const amt = Number(r.amount || 0);
      const receipts = amt > 0 ? amt : 0;
      const payments = amt < 0 ? -amt : 0;
      bal = bal + amt;
      return { ...r, receipts, payments, balance: bal };
    });
  }, [filtered, opening]);

  const totals = useMemo(() => {
    const receipts = enriched.reduce((s, r) => s + r.receipts, 0);
    const payments = enriched.reduce((s, r) => s + r.payments, 0);
    return { receipts, payments, closing: opening + receipts - payments };
  }, [enriched, opening]);

  const acctName = (id: string) => accounts.find(a => a.id === id)?.name ?? "—";

  const cashbookTypeColumns: DTColumn<any>[] = [
    { key: "name", header: "Account", cell: a => <span className="font-medium">{a.name}</span> },
    { key: "account_number", header: "Number", cell: a => <span className="text-xs">{a.account_number ?? "—"}</span> },
    { key: "currency", header: "Currency", cell: a => <span className="text-xs">{a.currency ?? "ZMW"}</span> },
    { key: "cashbook_type", header: "Cashbook type", sortable: false, cell: a => (
        <Select value={a.cashbook_type ?? "main"} onValueChange={v => updateCashbookType(a.id, v)}>
          <SelectTrigger className="h-8 w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>{CASHBOOK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      ) },
  ];

  const exportRows = enriched.map(r => ({
    Date: r.txn_date,
    "Voucher #": r.voucher_no ?? "",
    "Receipt #": r.receipt_no ?? "",
    Reference: r.reference ?? "",
    Payee: r.payee ?? "",
    Description: r.description ?? "",
    Account: acctName(r.bank_account_id),
    "Cost Centre": r.cost_centre ?? "",
    Project: r.project_ref ?? "",
    Fund: r.fund_source ?? "",
    "Charge Code": r.charge_code ?? "",
    Receipts: r.receipts,
    Payments: r.payments,
    Balance: r.balance,
    Posted: new Date(r.created_at).toLocaleString(),
  }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div className="flex items-center gap-3">
          <BookText className="h-6 w-6 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold">Cashbook</h1>
            <p className="text-sm text-muted-foreground">
              {source === "ledger"
                ? "Live GL cashbook — auto-fed by receipts, expenses, bills, payroll, transfers and imports."
                : "Bank imports only — raw statement view for reconciliation."}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex rounded-md border p-0.5 text-xs">
            {(["ledger","bank"] as const).map(s => (
              <button key={s} onClick={() => setSource(s)}
                className={`px-3 py-1.5 rounded ${source===s ? "bg-emerald-600 text-white" : "text-muted-foreground"}`}>
                {s === "ledger" ? "Ledger (all sources)" : "Bank imports"}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
          <ExportMenu rows={exportRows} filename="cashbook" title="Cashbook Report" />
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <Label>Cashbook type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {CASHBOOK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bank account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.filter(a => typeFilter === "all" || (a.cashbook_type ?? "main") === typeFilter).map(a =>
                  <SelectItem key={a.id} value={a.id}>{a.name}{a.account_number ? ` — ${a.account_number}` : ""}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Label>Date range (all time by default)</Label>
            <DateRangeFilter value={range} onChange={setRange} />
          </div>
          <div><Label>Search</Label><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Payee, voucher #, description…" /></div>
          <div><Label>Project</Label><Input value={projectFilter} onChange={e => setProjectFilter(e.target.value)} placeholder="Any" /></div>
          <div><Label>Fund source</Label><Input value={fundFilter} onChange={e => setFundFilter(e.target.value)} placeholder="Any" /></div>
          <div><Label>Cost centre</Label><Input value={costCentreFilter} onChange={e => setCostCentreFilter(e.target.value)} placeholder="Any" /></div>
        </CardContent>
      </Card>

      {/* Cashbook-type management per account */}
      <Card className="print:hidden">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Bank account cashbook types</CardTitle></CardHeader>
        <CardContent className="p-0">
          <DataTable
            tableId="cashbook-account-types"
            columns={cashbookTypeColumns}
            data={accounts}
            searchPlaceholder={null}
            empty="No bank accounts — add one under Finance → Bank accounts."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">Cashbook — {filtered.length} entries</CardTitle>
          <div className="text-xs text-muted-foreground">
            Opening: <b>{fmtMoney(opening)}</b> · Receipts: <b className="text-emerald-700">{fmtMoney(totals.receipts)}</b> · Payments: <b className="text-red-600">{fmtMoney(totals.payments)}</b> · Closing: <b>{fmtMoney(totals.closing)}</b>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Voucher #</TableHead>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Payee</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Cost centre</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Receipts</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="font-medium">
                  <TableCell>{range.from || "—"}</TableCell>
                  <TableCell colSpan={9}>BALANCE B/F</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right">{fmtMoney(opening)}</TableCell>
                </TableRow>
                {enriched.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.txn_date}</TableCell>
                    <TableCell className="text-xs font-mono">{r.voucher_no ?? ""}</TableCell>
                    <TableCell className="text-xs font-mono">{r.receipt_no ?? ""}</TableCell>
                    <TableCell className="text-xs">{r.reference ?? ""}</TableCell>
                    <TableCell>{r.payee ?? ""}</TableCell>
                    <TableCell className="max-w-[240px] truncate" title={r.description ?? ""}>{r.description ?? ""}</TableCell>
                    <TableCell className="text-xs">{acctName(r.bank_account_id)}</TableCell>
                    <TableCell className="text-xs">{r.cost_centre ?? ""}</TableCell>
                    <TableCell className="text-xs">{r.project_ref ?? ""}</TableCell>
                    <TableCell className="text-xs">{r.fund_source ?? ""}</TableCell>
                    <TableCell className="text-right text-emerald-700">{r.receipts ? fmtMoney(r.receipts) : ""}</TableCell>
                    <TableCell className="text-right text-red-600">{r.payments ? fmtMoney(r.payments) : ""}</TableCell>
                    <TableCell className="text-right font-medium">{fmtMoney(r.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={10}>TOTAL</TableCell>
                  <TableCell className="text-right">{fmtMoney(totals.receipts)}</TableCell>
                  <TableCell className="text-right">{fmtMoney(totals.payments)}</TableCell>
                  <TableCell className="text-right">{fmtMoney(totals.closing)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
