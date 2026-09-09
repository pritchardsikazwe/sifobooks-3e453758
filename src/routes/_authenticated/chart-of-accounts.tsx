import { SifoHubTabs } from "@/components/sifo/SifoHubTabs";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import { BookOpen, Plus, Search, FileText, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";

export const Route = createFileRoute("/_authenticated/chart-of-accounts")({
  head: () => ({ meta: [{ title: "Chart of Accounts — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: ChartOfAccountsPage,
});

type Row = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
  entry_count: number;
  purpose?: string | null;
  normal_balance?: "Dr" | "Cr" | null;
};

const TYPES = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
  { value: "cogs", label: "Cost of Goods Sold" },
];

const TYPE_COLOR: Record<string, string> = {
  asset: "bg-blue-100 text-blue-700",
  liability: "bg-amber-100 text-amber-700",
  equity: "bg-purple-100 text-purple-700",
  revenue: "bg-emerald-100 text-emerald-700",
  expense: "bg-rose-100 text-rose-700",
  cogs: "bg-orange-100 text-orange-700",
};

function ChartOfAccountsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ account_code: "", account_name: "", account_type: "expense", description: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: coa }] = await Promise.all([
      (supabase as any).from("account_balances").select("*").order("account_code"),
      (supabase as any).from("chart_of_accounts").select("id, purpose, normal_balance"),
    ]);
    if (error) { toast.error(error.message); setRows([]); }
    else {
      const meta = new Map<string, { purpose?: string; normal_balance?: "Dr" | "Cr" }>(
        (coa ?? []).map((c: any) => [c.id, { purpose: c.purpose, normal_balance: c.normal_balance }]),
      );
      setRows(((data ?? []) as Row[]).map(r => ({ ...r, ...(meta.get(r.account_id) ?? {}) })));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (typeFilter !== "all" && r.account_type !== typeFilter) return false;
    if (!q) return true;
    const s = `${r.account_code} ${r.account_name} ${r.account_type}`.toLowerCase();
    return s.includes(q.toLowerCase());
  }), [rows, q, typeFilter]);

  const totals = useMemo(() => {
    const g = { asset: 0, liability: 0, equity: 0, revenue: 0, expense: 0, cogs: 0 } as Record<string, number>;
    rows.forEach(r => { g[r.account_type] = (g[r.account_type] ?? 0) + Number(r.balance || 0); });
    return g;
  }, [rows]);

  const save = async () => {
    if (!form.account_code || !form.account_name) return toast.error("Code and name required");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return toast.error("Not signed in"); }
    const { error } = await supabase.from("chart_of_accounts").insert({
      user_id: u.user.id, is_active: true, ...form,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    setOpen(false);
    setForm({ account_code: "", account_name: "", account_type: "expense", description: "" });
    load();
  };

  if (open) {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module="accounting"
          icon={BookOpen}
          title="New Account"
          subtitle="Add a ledger account to the chart of accounts."
          onCancel={() => setOpen(false)}
          onSave={save}
          saving={saving}
          saveLabel="Create account"
        >
          <SifoFormSection title="Details">
            <SifoField label="Code" required htmlFor="coa-code">
              <Input id="coa-code" className="h-11" value={form.account_code} onChange={e => setForm({ ...form, account_code: e.target.value })} placeholder="e.g. 5100" />
            </SifoField>
            <SifoField label="Type" required htmlFor="coa-type">
              <Select value={form.account_type} onValueChange={v => setForm({ ...form, account_type: v })}>
                <SelectTrigger id="coa-type" className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </SifoField>
            <SifoField label="Name" required wide htmlFor="coa-name">
              <Input id="coa-name" className="h-11" value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} />
            </SifoField>
            <SifoField label="Description" wide htmlFor="coa-desc">
              <Input id="coa-desc" className="h-11" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </SifoField>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <SifoHubTabs hub="finance" active="/chart-of-accounts" />
      <SifoModuleHeader
        module="accounting"
        icon={BookOpen}
        title="Chart of Accounts"
        description="Live balances from posted journal entries. Click an account to see its transactions."
        breadcrumbs={[{ label: "Accounting", to: "/chart-of-accounts" }, { label: "Chart of Accounts" }]}
        actions={
          <Button variant="save" size="sm" className="h-9" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Account</Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {TYPES.map(t => (
          <Card key={t.value} className="p-3">
            <div className="text-xs text-slate-500">{t.label}</div>
            <div className="text-lg font-semibold text-slate-900">{fmtMoney(totals[t.value] ?? 0)}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-slate-400" />
            <Input className="pl-8" placeholder="Search code or name…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase border-b">
              <tr>
                <th className="text-left py-2">Code</th>
                <th className="text-left">Account</th>
                <th className="text-left">Type</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Credit</th>
                <th className="text-right">Balance</th>
                <th className="text-right">Entries</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && <tr><td colSpan={8} className="py-6 text-center text-slate-400"><Loader2 className="h-4 w-4 animate-spin inline mr-1" />Loading…</td></tr>}
              {!loading && !filtered.length && <tr><td colSpan={8} className="py-6 text-center text-slate-400">No accounts.</td></tr>}
              {filtered.map(r => (
                <tr key={r.account_id} className="hover:bg-slate-50">
                  <td className="py-1.5 text-slate-500">{r.account_code}</td>
                  <td className="font-medium text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span>{r.account_name}</span>
                      {(r.purpose || r.normal_balance) && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-slate-400 hover:text-emerald-600" aria-label={`About ${r.account_name}`}>
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="right" className="w-80 text-xs">
                            <div className="font-semibold text-slate-900 mb-1">{r.account_code} · {r.account_name}</div>
                            {r.normal_balance && (
                              <div className="mb-2">
                                <Badge variant="secondary" className={r.normal_balance === "Dr" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}>
                                  Normal balance: {r.normal_balance === "Dr" ? "Debit (Dr)" : "Credit (Cr)"}
                                </Badge>
                              </div>
                            )}
                            {r.purpose && <p className="text-slate-600 leading-relaxed">{r.purpose}</p>}
                            <div className="mt-3 pt-2 border-t">
                              <Link to="/learn/accounting-basics" className="text-emerald-700 hover:underline">Learn Dr/Cr rules →</Link>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge className={TYPE_COLOR[r.account_type] ?? ""} variant="secondary">{r.account_type}</Badge>
                    {r.normal_balance && <span className="ml-1 text-[10px] text-slate-400">{r.normal_balance}</span>}
                  </td>
                  <td className="text-right">{r.total_debit > 0 ? fmtMoney(r.total_debit) : ""}</td>
                  <td className="text-right">{r.total_credit > 0 ? fmtMoney(r.total_credit) : ""}</td>
                  <td className="text-right font-semibold">{fmtMoney(r.balance)}</td>
                  <td className="text-right text-slate-500">{r.entry_count}</td>
                  <td className="text-right">
                    <Link to="/reports/account-transactions" search={{ account: r.account_id } as any} className="inline-flex items-center gap-1 text-emerald-600 hover:underline text-xs">
                      <FileText className="h-3.5 w-3.5" />View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
