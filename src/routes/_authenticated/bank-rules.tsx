import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ExportMenu } from "@/lib/exports";
import { DataTable, type DTColumn } from "@/components/data-table";
import { DetailDrawer, DrawerField, DrawerSection } from "@/components/DetailDrawer";

export const Route = createFileRoute("/_authenticated/bank-rules")({
  head: () => ({ meta: [{ title: "Bank Rules — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

type Rule = {
  id: string; name: string; match_type: string; pattern: string; direction: string | null;
  suggested_account_id: string; auto_apply: boolean; priority: number; is_active: boolean;
  hits: number; last_used_at: string | null;
};

function Page() {
  const [rows, setRows] = useState<Rule[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Rule | null>(null);
  const [drawer, setDrawer] = useState<Rule | null>(null);
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
    setRows(((rs ?? []) as unknown) as Rule[]);
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
  const openEdit = (r: Rule) => {
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
    setDrawer(null); load();
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

  const columns: DTColumn<Rule>[] = useMemo(() => [
    { key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "match_type", header: "Match", cell: (r) => <Badge variant="outline">{r.match_type}</Badge> },
    { key: "pattern", header: "Pattern", cell: (r) => <span className="font-mono text-xs">{r.pattern}</span> },
    { key: "direction", header: "Direction", cell: (r) => r.direction ?? "any" },
    { key: "target", header: "Target account", cell: (r) => <span className="text-xs">{accName(r.suggested_account_id)}</span>,
      accessor: (r) => accName(r.suggested_account_id) },
    { key: "priority", header: "Priority", align: "right" },
    { key: "hits", header: "Hits", align: "right" },
    { key: "auto_apply", header: "Auto", accessor: (r) => (r.auto_apply ? "Yes" : "No"),
      cell: (r) => r.auto_apply ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Yes</Badge> : <Badge variant="outline">No</Badge> },
  ], [accounts]);

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-emerald-700" /> Bank Rules — Smart Matching</h1>
          <p className="text-sm text-muted-foreground">Teach the system: "any transaction containing ZESCO goes to Electricity Expense." New imports match automatically.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="bank-rules" title="Bank Rules" />
          <Button onClick={runAll} disabled={running} variant="outline">
            {running ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Running…</> : <><Play className="h-4 w-4 mr-1" /> Run Rules Now</>}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-emerald-700 hover:bg-emerald-800"><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
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
              <Button onClick={save} className="bg-emerald-700 hover:bg-emerald-800">{edit ? "Save" : "Create"}</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8">Loading…</div>
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          onRowClick={setDrawer}
          empty="No rules yet — create one to start auto-matching."
        />
      )}

      <DetailDrawer
        open={!!drawer}
        onOpenChange={(v) => !v && setDrawer(null)}
        title={drawer?.name ?? ""}
        subtitle={drawer ? `${drawer.match_type} "${drawer.pattern}" → ${accName(drawer.suggested_account_id)}` : ""}
        meta={drawer && (
          <>
            <Badge variant="outline">Priority {drawer.priority}</Badge>
            <Badge variant="outline">Hits: {drawer.hits}</Badge>
            {drawer.auto_apply && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Auto</Badge>}
          </>
        )}
        footer={drawer && (
          <>
            <Button variant="destructive" onClick={() => remove(drawer.id)}>Delete</Button>
            <Button onClick={() => { openEdit(drawer); setDrawer(null); }}>Edit</Button>
          </>
        )}
      >
        {drawer && (
          <div className="space-y-4">
            <DrawerSection title="Match Rule">
              <div className="grid grid-cols-2 gap-4">
                <DrawerField label="Type">{drawer.match_type}</DrawerField>
                <DrawerField label="Direction">{drawer.direction ?? "any"}</DrawerField>
                <DrawerField label="Pattern" className="col-span-2">
                  <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded">{drawer.pattern}</span>
                </DrawerField>
                <DrawerField label="Target account" className="col-span-2">{accName(drawer.suggested_account_id)}</DrawerField>
              </div>
            </DrawerSection>
            <DrawerSection title="Activity">
              <div className="grid grid-cols-2 gap-4">
                <DrawerField label="Total hits">{drawer.hits}</DrawerField>
                <DrawerField label="Last used">{drawer.last_used_at ? new Date(drawer.last_used_at).toLocaleString() : "Never"}</DrawerField>
              </div>
            </DrawerSection>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
