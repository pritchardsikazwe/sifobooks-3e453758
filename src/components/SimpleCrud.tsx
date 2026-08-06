import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRangeFilter, EMPTY_RANGE, inRange, type DateRange } from "@/components/DateRangeFilter";
import { ExportMenu } from "@/lib/exports";
import { DataTable, type DTColumn } from "@/components/data-table";
import { offlineInsert } from "@/lib/offline-queue";
import { AccountSelector, type CoaAccount } from "@/components/selectors/AccountSelector";
import { PostingPreview, isBalanced, type PreviewLine } from "@/components/PostingPreview";
import { useCoaAccounts } from "@/hooks/useCoaAccounts";

/** Ledger account picker shown inside the create/edit dialog. */
export type AccountField = {
  key: string;
  label: string;
  help?: string;
  types?: string[];
  cashBankOnly?: boolean;
  /** Chart-of-accounts code pre-selected when available. */
  defaultCode?: string;
  /** Persist the chosen account id into this database column. */
  persistTo?: string;
};


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
  align?: "left" | "right" | "center";
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
  statusField?: string;
  extraFilters?: { name: string; label: string; options: { value: string; label: string }[] }[];
  dateField?: string;
  exportable?: boolean;
  /** Ledger account pickers rendered in the dialog. */
  accountFields?: AccountField[];
  /** Build the double-entry preview from the form and the picked accounts. */
  previewLines?: (form: Record<string, any>, account: (key: string) => CoaAccount | null) => PreviewLine[];
  /** Block saving while the preview does not balance. */
  requireBalanced?: boolean;
};

export function SimpleCrud({
  title, icon: Icon, table, columns, fields, searchKeys = ["name"], orderBy, headerExtra,
  rowActions, statusField, extraFilters = [], dateField, exportable = true,
  accountFields, previewLines, requireBalanced,
}: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const initial = useMemo(() => Object.fromEntries(fields.map(f => [f.name, f.defaultValue ?? (f.type === "number" ? 0 : "")])), [fields]);
  const [form, setForm] = useState<Record<string, any>>(initial);
  const [statusVal, setStatusVal] = useState<string>("__all");
  const [filterVals, setFilterVals] = useState<Record<string, string>>({});
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);

  const { accounts, defaultFor } = useCoaAccounts();
  const [acctSel, setAcctSel] = useState<Record<string, string | null>>({});

  // Seed the pickers with sensible defaults once the chart of accounts is loaded.
  useEffect(() => {
    if (!accountFields?.length || accounts.length === 0) return;
    setAcctSel(prev => {
      const next = { ...prev };
      for (const af of accountFields) {
        if (!next[af.key] && af.defaultCode) next[af.key] = defaultFor(af.defaultCode)?.id ?? null;
      }
      return next;
    });
    }, [accountFields, accounts]);

  const preview = useMemo(
    () => (previewLines ? previewLines(form, k => accounts.find(a => a.id === acctSel[k]) ?? null) : []),
    [previewLines, form, acctSel, accounts],
  );
  const previewOk = !requireBalanced || isBalanced(preview);


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
    setForm(Object.fromEntries(fields.map(f => {
      const v = r[f.name];
      if (typeof v === "boolean") return [f.name, String(v)];
      return [f.name, v ?? (f.type === "number" ? 0 : "")];
    })));
    setOpen(true);
  };

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Not signed in");
    for (const f of fields) {
      if (f.required && !form[f.name] && form[f.name] !== 0) return toast.error(`${f.label} is required`);
    }
    if (!previewOk) return toast.error("Posting blocked — debits and credits do not balance.");
    for (const af of accountFields ?? []) {
      if (!acctSel[af.key]) return toast.error(`${af.label} is required`);
    }
    const payload: any = { ...form, user_id: u.user.id };
    for (const af of accountFields ?? []) {
      if (af.persistTo) payload[af.persistTo] = acctSel[af.key] ?? null;
    }
    for (const f of fields) {
      const v = payload[f.name];
      if (f.type === "number") payload[f.name] = v === "" || v == null ? null : Number(v);
      else if (f.type === "date") { if (v === "" || v == null) payload[f.name] = null; }
      else if (f.type === "select") {
        if (v === "" || v == null) payload[f.name] = null;
        else if (v === "true") payload[f.name] = true;
        else if (v === "false") payload[f.name] = false;
      }
      else if (v === "") payload[f.name] = null;
    }
    const res = editing
      ? await supabase.from(table as any).update(payload).eq("id", editing.id)
      : await offlineInsert(table, payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(
      editing
        ? "Updated"
        : (res as any).queued
          ? "Saved offline — will sync when back online"
          : "Created",
    );
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

  const dtColumns: DTColumn<any>[] = useMemo(() => {
    const cols: DTColumn<any>[] = columns.map(c => ({
      key: c.key,
      header: c.header,
      align: c.align,
      className: c.className,
      accessor: (r) => {
        const v = r[c.key];
        return typeof v === "object" && v !== null ? "" : v;
      },
      cell: c.render ? (r) => c.render!(r) : undefined,
    }));
    cols.push({
      key: "__actions",
      header: "Actions",
      sortable: false,
      align: "right",
      cell: (r) => (
        <div className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {rowActions?.filter(a => !a.show || a.show(r)).map((a, i) => {
            const Ico = a.icon;
            return (
              <Button key={i} size="sm" variant={a.variant ?? "ghost"} className={`h-7 px-2 text-xs ${a.className ?? ""}`}
                onClick={async () => { await a.run(r, load); }}>
                {Ico && <Ico className="h-3.5 w-3.5 mr-1" />}{a.label}
              </Button>
            );
          })}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)} title="Edit"><Edit2 className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(r)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    });
    return cols;
  }, [columns, rowActions]);

  const toolbar = (
    <>
      {headerExtra}
      {exportable && <ExportMenu rows={exportRows} filename={table} title={title} />}
      <Button onClick={openNew} size="sm" className="h-9"><Plus className="h-4 w-4 mr-1.5" />New</Button>
    </>
  );

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {module ? (
        <SifoModuleHeader
          module={module}
          title={title}
          description={description}
          icon={Icon}
          breadcrumbs={[{ label: MODULE_THEMES[module].label, to: MODULE_THEMES[module].to }, { label: title }]}
          actions={toolbar}
        />
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">{toolbar}</div>
        </div>
      )}


      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <DataTable
          data={filtered}
          columns={dtColumns}
          searchPlaceholder={`Search ${title.toLowerCase()}…`}
          onRowClick={openEdit}
          empty={
            <div className="py-6">
              <Icon className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <div>{rows.length === 0 ? `No ${title.toLowerCase()} yet. Click "New" to add one.` : "No records match your filters."}</div>
            </div>
          }
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-2">
              {statusOptions && (
                <Select value={statusVal} onValueChange={setStatusVal}>
                  <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All statuses</SelectItem>
                    {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {extraFilters.map(f => (
                <Select key={f.name} value={filterVals[f.name] ?? "__all"} onValueChange={v => setFilterVals(s => ({ ...s, [f.name]: v }))}>
                  <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder={f.label} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All {f.label.toLowerCase()}</SelectItem>
                    {f.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ))}
              {dateField && <DateRangeFilter value={range} onChange={setRange} compact />}
            </div>
          }
        />
      )}

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
            {accountFields?.map(af => (
              <div key={af.key} className="col-span-2 sm:col-span-1">
                <AccountSelector
                  label={af.label}
                  help={af.help}
                  required
                  recentKey={`${table}-${af.key}`}
                  accounts={accounts}
                  types={af.types}
                  cashBankOnly={af.cashBankOnly}
                  value={acctSel[af.key] ?? null}
                  onChange={v => setAcctSel(s => ({ ...s, [af.key]: v }))}
                />
              </div>
            ))}
            {previewLines && (
              <div className="col-span-2 space-y-1">
                <PostingPreview lines={preview} title="Journal that will be posted" />
                {!previewOk && (
                  <p className="text-xs text-destructive">Pick the ledger accounts and an amount so debits equal credits before saving.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!previewOk}>{editing ? "Save" : "Create"}</Button>
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
