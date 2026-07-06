import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tags, Plus, Trash2, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/expense-rules")({
  head: () => ({
    meta: [
      { title: "Custom Expense Categories" },
      { name: "description", content: "Create rules so future bills post to the right accounts automatically." },
    ],
  }),
  component: ExpenseRules,
});

type Rule = {
  id: string;
  name: string;
  match_type: "supplier" | "keyword";
  match_value: string;
  account_id: string;
  priority: number;
  is_active: boolean;
};

type Account = { id: string; account_code: string; account_name: string; account_type: string };
type Supplier = { id: string; name: string };

function ExpenseRules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Rule>>({
    name: "", match_type: "keyword", match_value: "", account_id: "", priority: 100, is_active: true,
  });

  const load = async () => {
    setLoading(true);
    const [rRes, aRes, sRes] = await Promise.all([
      supabase.from("expense_category_rules").select("*").order("priority", { ascending: true }),
      supabase.from("chart_of_accounts").select("id, account_code, account_name, account_type").eq("account_type", "expense").eq("is_active", true).order("account_code"),
      supabase.from("suppliers").select("id, name").order("name"),
    ]);
    setRules((rRes.data as Rule[]) ?? []);
    setAccounts((aRes.data as Account[]) ?? []);
    setSuppliers((sRes.data as Supplier[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.match_value || !form.account_id) return toast.error("Fill name, value, and account");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) { setSaving(false); return toast.error("Not signed in"); }
    const payload = {
      user_id: uid,
      name: form.name!,
      match_type: form.match_type as "supplier" | "keyword",
      match_value: form.match_value!,
      account_id: form.account_id!,
      priority: form.priority ?? 100,
      is_active: form.is_active ?? true,
    };
    const { error } = await supabase.from("expense_category_rules").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Rule created");
    setOpen(false);
    setForm({ name: "", match_type: "keyword", match_value: "", account_id: "", priority: 100, is_active: true });
    load();
  };

  const toggle = async (r: Rule) => {
    const { error } = await supabase.from("expense_category_rules").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (r: Rule) => {
    if (!confirm(`Delete rule "${r.name}"?`)) return;
    const { error } = await supabase.from("expense_category_rules").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Rule deleted");
    load();
  };

  const accountLabel = (id: string) => {
    const a = accounts.find(x => x.id === id);
    return a ? `${a.account_code} — ${a.account_name}` : "—";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tags className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Custom Expense Categories</h1>
            <p className="text-sm text-muted-foreground">Rules that map future bills to the right expense accounts automatically.</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New rule</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Rules</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No rules yet. Create one to auto-post future bills.</TableCell></TableRow>
                ) : rules.map(r => (
                  <TableRow key={r.id} className={!r.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-mono">{r.priority}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="outline">{r.match_type}</Badge></TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {r.match_type === "supplier" ? (suppliers.find(s => s.id === r.match_value)?.name ?? r.match_value) : `"${r.match_value}"`}
                    </TableCell>
                    <TableCell className="text-xs">{accountLabel(r.account_id)}</TableCell>
                    <TableCell>{r.is_active ? <Badge className="bg-emerald-600 hover:bg-emerald-700">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => toggle(r)}>
                        {r.is_active ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-3 w-3 text-red-600" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">How rules work</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><b>Supplier</b> rules match every bill from a chosen supplier.</p>
          <p><b>Keyword</b> rules match when the bill's description or bill-number contains the given text (case-insensitive).</p>
          <p>Lower <b>priority</b> wins first. When a rule matches, its account is suggested as the default expense account for new bill line items.</p>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New expense rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Rule name</Label>
              <Input placeholder="e.g. Fuel expenses" value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Match type</Label>
                <Select value={form.match_type} onValueChange={v => setForm({ ...form, match_type: v as any, match_value: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Description keyword</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Input type="number" value={form.priority ?? 100} onChange={e => setForm({ ...form, priority: Number(e.target.value) || 100 })} />
              </div>
            </div>
            <div>
              <Label>{form.match_type === "supplier" ? "Supplier" : "Keyword"}</Label>
              {form.match_type === "supplier" ? (
                <Select value={form.match_value ?? ""} onValueChange={v => setForm({ ...form, match_value: v })}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="e.g. fuel" value={form.match_value ?? ""} onChange={e => setForm({ ...form, match_value: e.target.value })} />
              )}
            </div>
            <div>
              <Label>Post to account</Label>
              <Select value={form.account_id ?? ""} onValueChange={v => setForm({ ...form, account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select expense account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_code} — {a.account_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
