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
import { DetailDrawer, DrawerField, DrawerSection } from "@/components/DetailDrawer";

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
  const [drawer, setDrawer] = useState<Row | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Account drill-down: the posted journal lines that make up this balance.
  useEffect(() => {
    if (!drawer) { setEntries([]); return; }
    let cancelled = false;
    (async () => {
      setEntriesLoading(true);
      const { data, error } = await supabase.from("journal_lines")
        .select("id, debit, credit, description, journal_entries!inner(id, entry_number, entry_date, reference, description, status)")
        .eq("account_id", drawer.account_id)
        .order("entry_date", { referencedTable: "journal_entries", ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) toast.error(error.message);
      setEntries(data ?? []);
      setEntriesLoading(false);
    })();
    return () => { cancelled = true; };
  }, [drawer]);


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
            <div className="text-xs text-muted-foreground">{t.label}</div>
            <div className="text-lg font-semibold text-foreground">{fmtMoney(totals[t.value] ?? 0)}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
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
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs text-muted-foreground uppercase border-b">
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
              {loading && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-1" />Loading…</td></tr>}
              {!loading && !filtered.length && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No accounts.</td></tr>}
              {filtered.map(r => (
                <tr key={r.account_id} className="hover:bg-muted/40 cursor-pointer" onClick={() => setDrawer(r)}>
                  <td className="py-1.5 text-muted-foreground">{r.account_code}</td>
                  <td className="font-medium text-foreground">
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <span className="cursor-pointer" onClick={() => setDrawer(r)}>{r.account_name}</span>
                      {(r.purpose || r.normal_balance) && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-muted-foreground hover:text-primary" aria-label={`About ${r.account_name}`}>
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="right" className="w-80 text-xs">
                            <div className="font-semibold text-foreground mb-1">{r.account_code} · {r.account_name}</div>
                            {r.normal_balance && (
                              <div className="mb-2">
                                <Badge variant="secondary">
                                  Normal balance: {r.normal_balance === "Dr" ? "Debit (Dr)" : "Credit (Cr)"}
                                </Badge>
                              </div>
                            )}
                            {r.purpose && <p className="text-muted-foreground leading-relaxed">{r.purpose}</p>}
                            <div className="mt-3 pt-2 border-t">
                              <Link to="/learn/accounting-basics" className="text-primary hover:underline">Learn Dr/Cr rules →</Link>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge className={TYPE_COLOR[r.account_type] ?? ""} variant="secondary">{r.account_type}</Badge>
                    {r.normal_balance && <span className="ml-1 text-[10px] text-muted-foreground">{r.normal_balance}</span>}
                  </td>
                  <td className="text-right tabular-nums">{r.total_debit > 0 ? fmtMoney(r.total_debit) : ""}</td>
                  <td className="text-right tabular-nums">{r.total_credit > 0 ? fmtMoney(r.total_credit) : ""}</td>
                  <td className="text-right font-semibold tabular-nums">{fmtMoney(r.balance)}</td>
                  <td className="text-right text-muted-foreground">{r.entry_count}</td>
                  <td className="text-right">
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={e => { e.stopPropagation(); setDrawer(r); }}>
                      <FileText className="h-3.5 w-3.5 mr-1" />View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <DetailDrawer
        open={!!drawer}
        onOpenChange={v => !v && setDrawer(null)}
        title={drawer ? `${drawer.account_code} · ${drawer.account_name}` : ""}
        subtitle={drawer ? `${drawer.account_type}${drawer.normal_balance ? ` · normal balance ${drawer.normal_balance}` : ""}` : ""}
        meta={drawer && <Badge variant="secondary" className={TYPE_COLOR[drawer.account_type] ?? ""}>{drawer.account_type}</Badge>}
        footer={drawer && (
          <Link to="/reports/account-transactions" search={{ account: drawer.account_id } as any}>
            <Button size="sm" variant="outline"><FileText className="h-3.5 w-3.5 mr-1.5" />Full account report</Button>
          </Link>
        )}
      >
        {drawer && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3"><div className="text-xs text-muted-foreground">Debits</div><div className="font-semibold tabular-nums">{fmtMoney(drawer.total_debit)}</div></Card>
              <Card className="p-3"><div className="text-xs text-muted-foreground">Credits</div><div className="font-semibold tabular-nums">{fmtMoney(drawer.total_credit)}</div></Card>
              <Card className="p-3"><div className="text-xs text-muted-foreground">Balance</div><div className="font-semibold tabular-nums">{fmtMoney(drawer.balance)}</div></Card>
            </div>
            {drawer.purpose && (
              <DrawerSection title="What this account is for">
                <DrawerField label="Purpose">{drawer.purpose}</DrawerField>
              </DrawerSection>
            )}
            <DrawerSection title="Recent journal entries">
              {entriesLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : entries.length === 0 ? (
                <div className="text-xs text-muted-foreground">No posted entries on this account yet.</div>
              ) : (
                <div className="space-y-1">
                  {entries.map(l => {
                    const je = l.journal_entries;
                    return (
                      <Link key={l.id} to="/journal-entry/$id" params={{ id: je.id }} onClick={() => setDrawer(null)}
                        className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 text-xs last:border-0 hover:bg-muted/40">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{l.description ?? je.description ?? "—"}</span>
                          <span className="text-muted-foreground">{je.entry_date} · {je.entry_number}{je.reference ? ` · ${je.reference}` : ""} · {je.status}</span>
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {Number(l.debit || 0) > 0 ? `Dr ${fmtMoney(l.debit)}` : `Cr ${fmtMoney(l.credit)}`}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </DrawerSection>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
