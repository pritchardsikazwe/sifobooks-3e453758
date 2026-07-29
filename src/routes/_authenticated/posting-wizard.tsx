import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Wand2, Plus, Trash2, ScaleIcon, CheckCircle2, ArrowRight, ArrowLeft,
  ShoppingCart, Receipt, Landmark, ArrowLeftRight, Coins, Building2, FileText,
} from "lucide-react";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/posting-wizard")({
  head: () => ({ meta: [
    { title: "Smart Posting Wizard — SifoBooks" },
    { name: "description", content: "Guided journal composer with live debit/credit balancing and T-account preview." },
    { name: "robots", content: "noindex" },
  ] }),
  component: PostingWizard,
});

type Account = { id: string; account_code: string; account_name: string; account_type: string };
type Line = { id: string; account_id: string; description: string; debit: number; credit: number };

type Scenario = {
  key: string;
  label: string;
  icon: any;
  hint: string;
  build: (amt: number, vat: number) => Array<{ code: string; desc: string; debit?: number; credit?: number }>;
};

const SCENARIOS: Scenario[] = [
  { key: "blank", label: "Blank Entry", icon: FileText, hint: "Start from scratch — manual lines.",
    build: () => [] },
  { key: "sale", label: "Cash Sale", icon: ShoppingCart, hint: "Debit Bank · Credit Sales & VAT Output.",
    build: (a, v) => [
      { code: "1000", desc: "Cash received", debit: a },
      { code: "4000", desc: "Sales revenue", credit: a - v },
      ...(v > 0 ? [{ code: "2200", desc: "VAT output", credit: v }] : []),
    ] },
  { key: "purchase", label: "Purchase on Credit", icon: Receipt, hint: "Debit Expense/Stock · Credit Payables.",
    build: (a, v) => [
      { code: "5000", desc: "Purchase / cost", debit: a - v },
      ...(v > 0 ? [{ code: "2210", desc: "VAT input", debit: v }] : []),
      { code: "2100", desc: "Trade payable", credit: a },
    ] },
  { key: "expense", label: "Operating Expense", icon: Receipt, hint: "Debit Expense · Credit Bank.",
    build: (a, v) => [
      { code: "6000", desc: "Operating expense", debit: a - v },
      ...(v > 0 ? [{ code: "2210", desc: "VAT input", debit: v }] : []),
      { code: "1000", desc: "Paid from bank", credit: a },
    ] },
  { key: "transfer", label: "Bank Transfer", icon: ArrowLeftRight, hint: "Debit destination · Credit source.",
    build: (a) => [
      { code: "1001", desc: "To secondary bank", debit: a },
      { code: "1000", desc: "From main bank", credit: a },
    ] },
  { key: "loan", label: "Loan Received", icon: Landmark, hint: "Debit Bank · Credit Loan Liability.",
    build: (a) => [
      { code: "1000", desc: "Loan proceeds", debit: a },
      { code: "2300", desc: "Loan payable", credit: a },
    ] },
  { key: "asset", label: "Buy Fixed Asset", icon: Building2, hint: "Debit Asset · Credit Bank/Payable.",
    build: (a) => [
      { code: "1500", desc: "Fixed asset", debit: a },
      { code: "1000", desc: "Paid from bank", credit: a },
    ] },
  { key: "owner", label: "Owner Contribution", icon: Coins, hint: "Debit Bank · Credit Equity.",
    build: (a) => [
      { code: "1000", desc: "Cash contribution", debit: a },
      { code: "3000", desc: "Owner's equity", credit: a },
    ] },
];

const DEFAULT_ACCOUNTS: Record<string, { name: string; type: string }> = {
  "1000": { name: "Cash & Bank", type: "asset" },
  "1001": { name: "Secondary Bank", type: "asset" },
  "1100": { name: "Accounts Receivable", type: "asset" },
  "1500": { name: "Fixed Assets", type: "asset" },
  "2100": { name: "Accounts Payable", type: "liability" },
  "2200": { name: "VAT Payable (Output)", type: "liability" },
  "2210": { name: "VAT Receivable (Input)", type: "asset" },
  "2300": { name: "Loan Payable", type: "liability" },
  "3000": { name: "Owner's Equity", type: "equity" },
  "4000": { name: "Sales Revenue", type: "revenue" },
  "5000": { name: "Cost of Sales", type: "expense" },
  "6000": { name: "Operating Expenses", type: "expense" },
};

function newLine(): Line {
  return { id: crypto.randomUUID(), account_id: "", description: "", debit: 0, credit: 0 };
}

function PostingWizard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [scenario, setScenario] = useState<string>("blank");
  const [amount, setAmount] = useState<number>(0);
  const [vat, setVat] = useState<number>(0);
  const [entryDate, setEntryDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [lines, setLines] = useState<Line[]>([newLine(), newLine()]);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data: acc } = await supabase.from("chart_of_accounts")
        .select("id, account_code, account_name, account_type")
        .eq("user_id", u.user.id).eq("is_active", true).order("account_code");
      setAccounts(acc ?? []);
    })();
  }, []);

  async function ensureAccounts(codes: string[]): Promise<Account[]> {
    if (!userId) return accounts;
    const have = new Set(accounts.map(a => a.account_code));
    const missing = codes.filter(c => !have.has(c) && DEFAULT_ACCOUNTS[c]);
    if (missing.length) {
      await supabase.from("chart_of_accounts").insert(missing.map(c => ({
        user_id: userId, account_code: c,
        account_name: DEFAULT_ACCOUNTS[c].name, account_type: DEFAULT_ACCOUNTS[c].type, is_active: true,
      })));
      const { data: acc } = await supabase.from("chart_of_accounts")
        .select("id, account_code, account_name, account_type")
        .eq("user_id", userId).eq("is_active", true).order("account_code");
      setAccounts(acc ?? []);
      return acc ?? [];
    }
    return accounts;
  }

  async function applyScenario() {
    const sc = SCENARIOS.find(s => s.key === scenario)!;
    const template = sc.build(amount, vat);
    if (!template.length) { setLines([newLine(), newLine()]); setStep(2); return; }
    const acc = await ensureAccounts(template.map(t => t.code));
    const built = template.map(t => {
      const a = acc.find(x => x.account_code === t.code);
      return { id: crypto.randomUUID(), account_id: a?.id ?? "", description: t.desc,
        debit: +(t.debit ?? 0).toFixed(2), credit: +(t.credit ?? 0).toFixed(2) };
    });
    setLines(built);
    if (!description) setDescription(sc.label);
    setStep(2);
  }

  const totalDebit = useMemo(() => lines.reduce((s, l) => s + (+l.debit || 0), 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((s, l) => s + (+l.credit || 0), 0), [lines]);
  const diff = +(totalDebit - totalCredit).toFixed(2);
  const balanced = Math.abs(diff) < 0.005 && totalDebit > 0;

  const tAccounts = useMemo(() => {
    const map = new Map<string, { name: string; debits: number; credits: number }>();
    for (const l of lines) {
      const a = accounts.find(x => x.id === l.account_id);
      if (!a) continue;
      const cur = map.get(a.id) ?? { name: `${a.account_code} ${a.account_name}`, debits: 0, credits: 0 };
      cur.debits += +l.debit || 0;
      cur.credits += +l.credit || 0;
      map.set(a.id, cur);
    }
    return [...map.values()];
  }, [lines, accounts]);

  async function post() {
    if (!userId) return;
    if (!balanced) { toast.error("Debits must equal credits before posting."); return; }
    if (lines.some(l => !l.account_id)) { toast.error("Every line needs an account."); return; }
    setPosting(true);
    try {
      const number = `JE-${Date.now().toString().slice(-8)}`;
      const { data: je, error } = await supabase.from("journal_entries").insert({
        user_id: userId, entry_number: number, entry_date: entryDate,
        reference: reference || null, description: description || "Manual journal",
        status: "posted", total_debit: totalDebit, total_credit: totalCredit,
      }).select().single();
      if (error || !je) throw error;
      const { error: le } = await supabase.from("journal_lines").insert(
        lines.map(l => ({
          user_id: userId, entry_id: je.id, account_id: l.account_id,
          description: l.description || null, debit: +l.debit || 0, credit: +l.credit || 0,
        })),
      );
      if (le) throw le;
      toast.success(`Posted ${number}`);
      navigate({ to: "/journal-entries" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to post");
    } finally { setPosting(false); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wand2 className="h-4 w-4" /> Accounting Workbench
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Smart Posting Wizard</h1>
          <p className="text-sm text-muted-foreground">Pick a scenario, review the auto-suggested lines, and post a balanced journal.</p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(n => (
            <div key={n} className={`h-2 w-10 rounded-full ${step >= n ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>1 · Choose a scenario</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {SCENARIOS.map(s => {
                const Icon = s.icon;
                const active = scenario === s.key;
                return (
                  <button key={s.key} type="button" onClick={() => setScenario(s.key)}
                    className={`rounded-xl border p-3 text-left transition ${active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/40 hover:bg-muted/40"}`}>
                    <Icon className="h-5 w-5 text-primary" />
                    <div className="mt-2 text-sm font-semibold">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.hint}</div>
                  </button>
                );
              })}
            </div>
            {scenario !== "blank" && (
              <div className="grid gap-3 md:grid-cols-4">
                <div><Label>Total amount</Label><Input type="number" step="0.01" value={amount || ""} onChange={e => setAmount(+e.target.value || 0)} /></div>
                <div><Label>Of which VAT</Label><Input type="number" step="0.01" value={vat || ""} onChange={e => setVat(+e.target.value || 0)} /></div>
                <div><Label>Entry date</Label><Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} /></div>
                <div><Label>Reference</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional" /></div>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={applyScenario} disabled={scenario !== "blank" && amount <= 0}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>2 · Review & balance</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Debit {fmtMoney(totalDebit)}</Badge>
              <Badge variant="outline">Credit {fmtMoney(totalCredit)}</Badge>
              <Badge className={balanced ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                <ScaleIcon className="mr-1 h-3 w-3" />
                {balanced ? "Balanced" : `Off by ${fmtMoney(Math.abs(diff))}`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label>Entry date</Label><Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} /></div>
              <div><Label>Reference</Label><Input value={reference} onChange={e => setReference(e.target.value)} /></div>
              <div><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Account</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right">Debit</th>
                    <th className="p-2 text-right">Credit</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.id} className="border-t">
                      <td className="p-2 min-w-[240px]">
                        <Select value={l.account_id} onValueChange={v => setLines(ls => ls.map((x, j) => j === i ? { ...x, account_id: v } : x))}>
                          <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                          <SelectContent>
                            {accounts.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.account_code} · {a.account_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2"><Input value={l.description} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} /></td>
                      <td className="p-2"><Input type="number" step="0.01" className="text-right" value={l.debit || ""} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, debit: +e.target.value || 0, credit: 0 } : x))} /></td>
                      <td className="p-2"><Input type="number" step="0.01" className="text-right" value={l.credit || ""} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, credit: +e.target.value || 0, debit: 0 } : x))} /></td>
                      <td className="p-2 text-right">
                        <Button size="icon" variant="ghost" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td className="p-2" colSpan={2}>Totals</td>
                    <td className="p-2 text-right">{fmtMoney(totalDebit)}</td>
                    <td className="p-2 text-right">{fmtMoney(totalCredit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setLines(ls => [...ls, newLine()])}><Plus className="mr-2 h-4 w-4" />Add line</Button>
              {!balanced && diff !== 0 && (
                <Button variant="outline" onClick={() => setLines(ls => [...ls, { ...newLine(),
                  description: "Balancing entry",
                  debit: diff < 0 ? Math.abs(diff) : 0, credit: diff > 0 ? diff : 0 }])}>
                  <ScaleIcon className="mr-2 h-4 w-4" />Auto-balance ({fmtMoney(Math.abs(diff))})
                </Button>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
              <Button onClick={() => setStep(3)} disabled={!balanced || lines.some(l => !l.account_id)}>
                Preview <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>3 · Preview & post</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div><span className="text-muted-foreground">Date:</span> <b>{entryDate}</b></div>
              <div><span className="text-muted-foreground">Reference:</span> <b>{reference || "—"}</b></div>
              <div><span className="text-muted-foreground">Description:</span> <b>{description || "—"}</b></div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">T-accounts</div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {tAccounts.map((t, i) => (
                  <div key={i} className="rounded-lg border">
                    <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-semibold">{t.name}</div>
                    <div className="grid grid-cols-2 text-sm">
                      <div className="border-r p-2">
                        <div className="text-[10px] uppercase text-muted-foreground">Debit</div>
                        <div className="font-semibold text-emerald-700">{fmtMoney(t.debits)}</div>
                      </div>
                      <div className="p-2">
                        <div className="text-[10px] uppercase text-muted-foreground">Credit</div>
                        <div className="font-semibold text-red-700">{fmtMoney(t.credits)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
              <Button onClick={post} disabled={posting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="mr-2 h-4 w-4" />{posting ? "Posting…" : "Post journal"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
