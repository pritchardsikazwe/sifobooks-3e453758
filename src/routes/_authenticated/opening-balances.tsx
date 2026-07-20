import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Wand2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/opening-balances")({
  head: () => ({ meta: [{ title: "Opening Balances Wizard" }] }),
  component: OpeningBalancesPage,
});

type Line = { account_code: string; account_name: string; account_type: string; debit: number; credit: number };

const DEFAULTS: Line[] = [
  { account_code: "1010", account_name: "Bank — Operating", account_type: "asset", debit: 0, credit: 0 },
  { account_code: "1020", account_name: "Petty Cash", account_type: "asset", debit: 0, credit: 0 },
  { account_code: "1100", account_name: "Accounts Receivable", account_type: "asset", debit: 0, credit: 0 },
  { account_code: "1500", account_name: "Fixed Assets", account_type: "asset", debit: 0, credit: 0 },
  { account_code: "1590", account_name: "Accumulated Depreciation", account_type: "asset", debit: 0, credit: 0 },
  { account_code: "2100", account_name: "Accounts Payable", account_type: "liability", debit: 0, credit: 0 },
  { account_code: "3000", account_name: "Accumulated Fund", account_type: "equity", debit: 0, credit: 0 },
];

const fmt = (n: number) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function OpeningBalancesPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("OB-" + new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const diff = totalDebit - totalCredit;
  const balanced = Math.abs(diff) < 0.01 && totalDebit > 0;

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };
  const addLine = () => setLines(prev => [...prev, { account_code: "", account_name: "", account_type: "asset", debit: 0, credit: 0 }]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const autoBalance = () => {
    const idx = lines.findIndex(l => l.account_code === "3000");
    if (idx < 0) return;
    const rest = lines.filter((_, i) => i !== idx);
    const debSum = rest.reduce((s, l) => s + Number(l.debit || 0), 0);
    const credSum = rest.reduce((s, l) => s + Number(l.credit || 0), 0);
    const net = debSum - credSum;
    updateLine(idx, net >= 0 ? { credit: net, debit: 0 } : { credit: 0, debit: -net });
  };

  const post = async () => {
    if (!balanced) { toast.error("Debits must equal credits and be greater than zero"); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in required"); return; }
    setSaving(true);

    // Ensure accounts exist and collect ids
    const accountIds: Record<number, string> = {};
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.account_code || !l.account_name) continue;
      if (!Number(l.debit) && !Number(l.credit)) continue;
      const { data: id, error } = await supabase.rpc("ensure_account", {
        _uid: u.user.id, _code: l.account_code, _name: l.account_name, _type: l.account_type,
      });
      if (error) { toast.error(`${l.account_code}: ${error.message}`); setSaving(false); return; }
      accountIds[i] = id as string;
    }

    const { data: je, error: jerr } = await supabase.from("journal_entries").insert({
      user_id: u.user.id,
      entry_number: reference,
      entry_date: date,
      reference,
      description: "Opening balances",
      status: "posted",
      total_debit: totalDebit,
      total_credit: totalCredit,
    }).select("id").single();
    if (jerr) { toast.error(jerr.message); setSaving(false); return; }

    const jlRows = lines
      .map((l, i) => ({
        user_id: u.user!.id,
        entry_id: je!.id,
        account_id: accountIds[i],
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: "Opening balance",
      }))
      .filter(r => r.account_id && (r.debit > 0 || r.credit > 0));

    const { error: lerr } = await supabase.from("journal_lines").insert(jlRows);
    setSaving(false);
    if (lerr) { toast.error(lerr.message); return; }
    toast.success("Opening balances posted");
    navigate({ to: "/journal-entries" });
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wand2 className="h-6 w-6" /> Opening Balances Wizard</h1>
        <p className="text-sm text-muted-foreground">Post your starting trial balance as a single journal entry. Any missing accounts are created automatically.</p>
      </div>

      <Card>
        <CardContent className="pt-4 grid grid-cols-2 gap-3">
          <div><Label>As-of Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><Label>Reference</Label><Input value={reference} onChange={e => setReference(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Balances</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={autoBalance}>Auto-balance to Accumulated Fund</Button>
            <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-4 w-4 mr-1" /> Add Line</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l, i) => (
                <TableRow key={i}>
                  <TableCell><Input value={l.account_code} onChange={e => updateLine(i, { account_code: e.target.value })} className="w-24" /></TableCell>
                  <TableCell><Input value={l.account_name} onChange={e => updateLine(i, { account_name: e.target.value })} /></TableCell>
                  <TableCell>
                    <select className="border rounded px-2 py-1 text-sm bg-background" value={l.account_type} onChange={e => updateLine(i, { account_type: e.target.value })}>
                      <option value="asset">Asset</option>
                      <option value="liability">Liability</option>
                      <option value="equity">Equity</option>
                      <option value="revenue">Revenue</option>
                      <option value="expense">Expense</option>
                    </select>
                  </TableCell>
                  <TableCell><Input type="number" step="0.01" className="text-right" value={l.debit || ""} onChange={e => updateLine(i, { debit: Number(e.target.value) || 0 })} /></TableCell>
                  <TableCell><Input type="number" step="0.01" className="text-right" value={l.credit || ""} onChange={e => updateLine(i, { credit: Number(e.target.value) || 0 })} /></TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted/40">
                <TableCell colSpan={3} className="text-right">Totals</TableCell>
                <TableCell className="text-right">{fmt(totalDebit)}</TableCell>
                <TableCell className="text-right">{fmt(totalCredit)}</TableCell>
                <TableCell />
              </TableRow>
              <TableRow className={balanced ? "text-emerald-600" : "text-amber-600"}>
                <TableCell colSpan={3} className="text-right">Difference</TableCell>
                <TableCell colSpan={2} className="text-right">{fmt(diff)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
          <div className="flex justify-end mt-4">
            <Button onClick={post} disabled={!balanced || saving}>{saving ? "Posting…" : "Post Opening Balances"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
