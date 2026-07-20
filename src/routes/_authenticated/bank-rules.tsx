import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ExportMenu } from "@/lib/exports";

export const Route = createFileRoute("/_authenticated/bank-rules")({
  head: () => ({ meta: [{ title: "Bank Rules — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [f, setF] = useState<any>({
    name: "", match_type: "contains", pattern: "", direction: "any",
    suggested_account_id: "", auto_apply: true, priority: 100, is_active: true,
  });

  const load = async () => {
    setLoading(true);
    const [{ data: rs }, { data: acc }] = await Promise.all([
      supabase.from("bank_rules" as any).select("*").order("priority").order("created_at", { ascending: false }),
      supabase.from("chart_of_accounts").select("id, account_code, account_name, account_type").eq("is_active", true).order("account_code"),
    ]);
    setRows((rs ?? []) as any);
    setAccounts((acc ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEdit(null);
    setF({ name: "", match_type: "contains", pattern: "", direction: "any",
      suggested_account_id: "", auto_apply: true, priority: 100, is_active: true });
    setOpen(true);
  };
  const openEdit = (r: any) => {
    setEdit(r);
    setF({
      name: r.name, match_type: r.match_type, pattern: r.pattern,
      direction: r.direction ?? "any", suggested_account_id: r.suggested_account_id ?? "",
      auto_apply: r.auto_apply, priority: r.priority, is_active: r.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!f.name.trim() || !f.pattern.trim()) return toast.error("Name and pattern required");
    if (!f.suggested_account_id) return toast.error("Pick a target account");
    const payload = { ...f, priority: Number(f.priority) };
    const { error } = edit
      ? await supabase.from("bank_rules" as any).update(payload).eq("id", edit.id)
      : await supabase.from("bank_rules" as any).insert(payload);
    if (error) return toast.error(error.message);
    toast.success(edit ? "Rule updated" : "Rule created");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    const { error } = await supabase.from("bank_rules" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const runAll = async () => {
    setRunning(true);
    const { data, error } = await supabase.rpc("apply_bank_rules" as any);
    setRunning(false);
    if (error) return toast.error(error.message);
    const n = (data as any)?.rule_matches ?? 0;
    toast.success(n > 0 ? `Auto-matched ${n} transactions` : "No new matches");
    load();
  };

  const accName = (id: string) => {
    const a = accounts.find(x => x.id === id);
    return a ? `${a.account_code} — ${a.account_name}` : "—";
  };

  const exportRows = rows.map(r => ({
    Name: r.name, MatchType: r.match_type, Pattern: r.pattern,
    Direction: r.direction ?? "any", TargetAccount: accName(r.suggested_account_id),
    AutoApply: r.auto_apply ? "Yes" : "No", Priority: r.priority, Hits: r.hits, Active: r.is_active ? "Yes" : "No",
  }));

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-emerald-600" /> Bank Rules — Smart Matching</h1>
          <p className="text-sm text-muted-foreground">Teach the system: "any transaction containing ZESCO goes to Electricity Expense." New imports match automatically.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="bank-rules" title="Bank Rules" />
          <Button onClick={runAll} disabled={running} variant="outline">
            {running ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Running…</> : <><Play className="h-4 w-4 mr-1" /> Run Rules Now</>}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{edit ? "Edit" : "New"} Rule</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Rule name *</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. ZESCO → Electricity" /></div>
                <div><Label>Match type</Label>
                  <Select value={f.match_type} onValueChange={v => setF({ ...f, match_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="regex">Regex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Direction</Label>
                  <Select value={f.direction} onValueChange={v => setF({ ...f, direction: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="inflow">Inflow (money in)</SelectItem>
                      <SelectItem value="outflow">Outflow (money out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Pattern *</Label><Input value={f.pattern} onChange={e => setF({ ...f, pattern: e.target.value })} placeholder="ZESCO" /></div>
                <div className="col-span-2"><Label>Target account *</Label>
                  <Select value={f.suggested_account_id} onValueChange={v => setF({ ...f, suggested_account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick a GL account" /></SelectTrigger>
                    <SelectContent>{accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.account_code} — {a.account_name} ({a.account_type})</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div><Label>Priority</Label><Input type="number" value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })} /></div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={f.auto_apply} onCheckedChange={v => setF({ ...f, auto_apply: v })} />
                  <Label>Auto-apply on import</Label>
                </div>
              </div>
              <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">{edit ? "Save" : "Create"}</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Match</TableHead><TableHead>Pattern</TableHead>
              <TableHead>Direction</TableHead><TableHead>Target account</TableHead>
              <TableHead className="text-right">Priority</TableHead><TableHead className="text-right">Hits</TableHead>
              <TableHead>Auto</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant="outline">{r.match_type}</Badge></TableCell>
                  <TableCell className="font-mono text-xs max-w-xs truncate">{r.pattern}</TableCell>
                  <TableCell>{r.direction ?? "any"}</TableCell>
                  <TableCell className="text-xs">{accName(r.suggested_account_id)}</TableCell>
                  <TableCell className="text-right">{r.priority}</TableCell>
                  <TableCell className="text-right">{r.hits}</TableCell>
                  <TableCell>{r.auto_apply ? <Badge className="bg-emerald-100 text-emerald-700">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No rules yet — create one to start auto-matching.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
