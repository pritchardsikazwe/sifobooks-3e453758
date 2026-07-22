import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Loader2, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRangeFilter, EMPTY_RANGE, inRange, type DateRange } from "@/components/DateRangeFilter";
import { ExportMenu } from "@/lib/exports";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: any;
  colSpan?: 1 | 2;
};

export type Column = {
  key: string;
  header: string;
  render?: (row: any) => React.ReactNode;
  className?: string;
};

export type RowAction = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  show?: (row: any) => boolean;
  run: (row: any, reload: () => Promise<void>) => Promise<void> | void;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  className?: string;
};

type Props = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  table: string;
  columns: Column[];
  fields: Field[];
  searchKeys?: string[];
  orderBy?: { column: string; ascending?: boolean };
  headerExtra?: React.ReactNode;
  rowActions?: RowAction[];
  /** Column name to auto-build a status filter from (uses select options). */
  statusField?: string;
  /** Extra dropdown filters (name → options); filters rows client-side. */
  extraFilters?: { name: string; label: string; options: { value: string; label: string }[] }[];
  /** Column to filter with the From/To date range picker (all time by default). */
  dateField?: string;
  /** Enable CSV / Excel / PDF export of the currently filtered rows. */
  exportable?: boolean;
};

export function SimpleCrud({
  title, icon: Icon, table, columns, fields, searchKeys = ["name"], orderBy, headerExtra,
  rowActions, statusField, extraFilters = [], dateField, exportable = true,
}: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const initial = useMemo(() => Object.fromEntries(fields.map(f => [f.name, f.defaultValue ?? (f.type === "number" ? 0 : "")])), [fields]);
  const [form, setForm] = useState<Record<string, any>>(initial);
  const [statusVal, setStatusVal] = useState<string>("__all");
  const [filterVals, setFilterVals] = useState<Record<string, string>>({});
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);


  // Auto-detect status options from the field definition
  const statusOptions = useMemo(() => {
    if (!statusField) return null;
    const f = fields.find(x => x.name === statusField);
    return f?.options ?? null;
  }, [statusField, fields]);

  const load = async () => {
    setLoading(true);
    let query = supabase.from(table as any).select("*");
    if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => {
    if (q && !searchKeys.some(k => String(r[k] ?? "").toLowerCase().includes(q.toLowerCase()))) return false;
    if (statusField && statusVal !== "__all" && String(r[statusField] ?? "") !== statusVal) return false;
    for (const f of extraFilters) {
      const v = filterVals[f.name];
      if (v && v !== "__all" && String(r[f.name] ?? "") !== v) return false;
    }
    if (dateField && !inRange(r[dateField], range)) return false;
    return true;
  });

  const exportRows = useMemo(() => filtered.map(r => {
    const o: Record<string, any> = {};
    for (const c of columns) o[c.header] = r[c.key] ?? "";
    return o;
  }), [filtered, columns]);

  const openNew = () => { setEditing(null); setForm(initial); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm(Object.fromEntries(fields.map(f => [f.name, r[f.name] ?? (f.type === "number" ? 0 : "")])));
    setOpen(true);
  };

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Not signed in");
    for (const f of fields) {
      if (f.required && !form[f.name] && form[f.name] !== 0) return toast.error(`${f.label} is required`);
    }
    const payload: any = { ...form, user_id: u.user.id };
    for (const f of fields) {
      const v = payload[f.name];
      if (f.type === "number") {
        payload[f.name] = v === "" || v === null || v === undefined ? null : Number(v);
      } else if (f.type === "date") {
        if (v === "" || v === null || v === undefined) payload[f.name] = null;
      } else if (f.type === "select") {
        if (v === "" || v === undefined) payload[f.name] = null;
      } else {
        if (v === "") payload[f.name] = null;
      }
    }
    const res = editing
      ? await supabase.from(table as any).update(payload).eq("id", editing.id)
      : await supabase.from(table as any).insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Updated" : "Created");
    setOpen(false);
    load();
  };

  const remove = async (r: any) => {
    if (!confirm("Delete this record?")) return;
    const { error } = await supabase.from(table as any).delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          {exportable && <ExportMenu rows={exportRows} filename={table} title={title} />}
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-2" />New</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
            </div>
            {statusOptions && (
              <Select value={statusVal} onValueChange={setStatusVal}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All statuses</SelectItem>
                  {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {extraFilters.map(f => (
              <Select key={f.name} value={filterVals[f.name] ?? "__all"} onValueChange={v => setFilterVals(s => ({ ...s, [f.name]: v }))}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder={f.label} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All {f.label.toLowerCase()}</SelectItem>
                  {f.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ))}
            <div className="text-sm text-muted-foreground ml-auto">{filtered.length} of {rows.length}</div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icon className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <div>{rows.length === 0 ? "No records yet. Click \"New\" to add one." : "No records match your filters."}</div>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map(c => <TableHead key={c.key} className={c.className}>{c.header}</TableHead>)}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      {columns.map(c => (
                        <TableCell key={c.key} className={c.className}>
                          {c.render ? c.render(r) : String(r[c.key] ?? "-")}
                        </TableCell>
                      ))}
                      <TableCell className="text-right whitespace-nowrap">
                        {rowActions?.filter(a => !a.show || a.show(r)).map((a, i) => {
                          const Ico = a.icon;
                          return (
                            <Button key={i} size="sm" variant={a.variant ?? "outline"} className={`mr-1 ${a.className ?? ""}`}
                              onClick={async () => { await a.run(r, load); }}>
                              {Ico && <Ico className="h-3.5 w-3.5 mr-1" />}{a.label}
                            </Button>
                          );
                        })}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit ${title}` : `New ${title}`}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {fields.map(f => (
              <div key={f.name} className={f.colSpan === 2 || f.type === "textarea" ? "col-span-2" : ""}>
                <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                {f.type === "textarea" ? (
                  <Textarea value={form[f.name] ?? ""} onChange={e => setForm({ ...form, [f.name]: e.target.value })} />
                ) : f.type === "select" ? (
                  <Select value={String(form[f.name] ?? "")} onValueChange={v => setForm({ ...form, [f.name]: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {f.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={form[f.name] ?? ""}
                    onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Helper: mark a record as posted (or set any status). */
export async function updateStatus(table: string, id: string, status: string) {
  const { error } = await supabase.from(table as any).update({ status }).eq("id", id);
  if (error) { toast.error(error.message); return false; }
  toast.success(`Marked ${status}`);
  return true;
}
