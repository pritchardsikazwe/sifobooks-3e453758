import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Edit2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";
import { cn } from "@/lib/utils";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRangeFilter, EMPTY_RANGE, inRange, type DateRange } from "@/components/DateRangeFilter";
import { ExportMenu } from "@/lib/exports";
import { DataTable, type DTColumn } from "@/components/data-table";
import { offlineInsert } from "@/lib/offline-queue";
import { AccountSelector, type CoaAccount } from "@/components/selectors/AccountSelector";
import { EntitySelector, type EntityOption } from "@/components/selectors/EntitySelector";
import { PostingPreview, isBalanced, type PreviewLine } from "@/components/PostingPreview";
import { useCoaAccounts } from "@/hooks/useCoaAccounts";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoStatusBadge } from "@/components/sifo/SifoStatusBadge";
import { SifoModuleAI } from "@/components/sifo/SifoModuleAI";
import { MODULE_THEMES, type ModuleKey } from "@/lib/module-theme";
import { type FlowKind } from "@/components/accounting/PostingFlow";
import { LedgerImpactSheet, type LedgerTarget } from "@/components/accounting/LedgerImpactSheet";


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


/**
 * Pick an EXISTING tenant record (customer, supplier, item, warehouse, branch…).
 * Selecting an existing record is always the default path; creating is secondary.
 */
export type LookupSpec = {
  /** Table to read the current tenant's records from (RLS scoped). */
  table: string;
  /** Column shown as the option label. */
  labelColumn: string;
  /** Optional short code shown before the label (e.g. SKU, account code). */
  codeColumn?: string;
  /** Extra columns joined into the searchable secondary line. */
  metaColumns?: string[];
  orderBy?: string;
  /** Route for the secondary "create new" action. */
  createTo?: string;
  createLabel?: string;
  emptyTitle?: string;
};

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "lookup";
  options?: { value: string; label: string }[];
  /** Required when type === "lookup". */
  lookup?: LookupSpec;
  required?: boolean;
  defaultValue?: any;
  colSpan?: 1 | 2;
  /** Group fields into tabs inside the create/edit dialog. */
  group?: string;
};


export type Column = {
  key: string;
  header: string;
  render?: (row: any) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  /** Hidden by default; users can re-enable it from the column picker. */
  defaultHidden?: boolean;
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
  /** Module identity — renders the colour-coded module header + tab strip. */
  module?: ModuleKey;
  /** Sub-title shown under the module title. */
  description?: string;
  /** Adds a per-row "Ledger" action showing the posting flow and real GL effect. */
  posting?: {
    kind: FlowKind;
    /** Journal reference for the row, e.g. r => `INV:${r.invoice_number}`. */
    reference: (row: any) => string | null;
    /** Known journal entry id column, when the table stores one. */
    entryId?: (row: any) => string | null;
    label?: (row: any) => string;
  };
  /** Replace the built-in "New" dialog with a dedicated page (e.g. a full document editor). */
  onNew?: () => void;
  /** Replace the built-in row edit dialog with a dedicated detail page. */
  onOpenRow?: (row: any) => void;
};

export function SimpleCrud({
  title, icon: Icon, table, columns, fields, searchKeys = ["name"], orderBy, headerExtra,
  rowActions, statusField, extraFilters = [], dateField, exportable = true,
  accountFields, previewLines, requireBalanced, module, description, posting,
  onNew, onOpenRow,
}: Props) {
  const [ledger, setLedger] = useState<LedgerTarget | null>(null);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const initial = useMemo(() => Object.fromEntries(fields.map(f => [f.name, f.defaultValue ?? (f.type === "number" ? 0 : "")])), [fields]);
  const [form, setForm] = useState<Record<string, any>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const setField = (name: string, value: any) => {
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => (prev[name] ? { ...prev, [name]: "" } : prev));
  };

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


  // Existing tenant records for every "lookup" field, so users pick real records
  // instead of being pushed into a creation form.
  const lookupFields = useMemo(() => fields.filter(f => f.type === "lookup" && f.lookup), [fields]);
  const [lookupOptions, setLookupOptions] = useState<Record<string, EntityOption[]>>({});
  useEffect(() => {
    if (lookupFields.length === 0) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, EntityOption[]> = {};
      for (const f of lookupFields) {
        const spec = f.lookup!;
        const cols = ["id", spec.labelColumn, spec.codeColumn, ...(spec.metaColumns ?? [])]
          .filter(Boolean).join(",");
        let q = supabase.from(spec.table as any).select(cols);
        q = q.order(spec.orderBy ?? spec.labelColumn, { ascending: true });
        const { data, error } = await q;
        if (error) { toast.error(`${f.label}: ${error.message}`); continue; }
        next[f.name] = ((data ?? []) as any[]).map(r => ({
          id: String(r.id),
          code: spec.codeColumn ? (r[spec.codeColumn] ?? null) : null,
          label: String(r[spec.labelColumn] ?? "—"),
          meta: (spec.metaColumns ?? []).map(c => r[c]).filter(Boolean).join(" · ") || null,
        }));
      }
      if (!cancelled) setLookupOptions(next);
    })();
    return () => { cancelled = true; };
  }, [lookupFields]);

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

  const openNew = () => {
    if (onNew) return onNew();
    setEditing(null); setForm(initial); setErrors({}); setOpen(true);
  };
  const openEdit = (r: any) => {
    if (onOpenRow) return onOpenRow(r);
    setEditing(r);
    setErrors({});
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
    const nextErrors: Record<string, string> = {};
    for (const f of fields) {
      if (f.required && !form[f.name] && form[f.name] !== 0) nextErrors[f.name] = `${f.label} is required`;
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return toast.error("Please fix the highlighted fields");
    }
    setErrors({});
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
    setSaving(true);
    const res = editing
      ? await supabase.from(table as any).update(payload).eq("id", editing.id)
      : await offlineInsert(table, payload);
    setSaving(false);
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
      defaultHidden: c.defaultHidden,
      accessor: (r) => {
        const v = r[c.key];
        return typeof v === "object" && v !== null ? "" : v;
      },
      cell: c.render
        ? (r) => c.render!(r)
        : (statusField && c.key === statusField)
          ? (r) => <SifoStatusBadge status={r[c.key]} />
          : undefined,
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
          {posting && (
            <Button
              size="sm" variant="ghost" className="h-7 px-2 text-xs"
              title="Accounting impact"
              onClick={() => setLedger({
                kind: posting.kind,
                reference: posting.reference(r),
                entryId: posting.entryId?.(r) ?? null,
                title: posting.label?.(r) ?? `${title} — accounting impact`,
              })}
            >
              <Scale className="h-3.5 w-3.5 mr-1" />Ledger
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)} title="Edit"><Edit2 className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(r)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    });
    return cols;
  }, [columns, rowActions, statusField, posting]);

  const DEFAULT_GROUP = "Details";
  const groupNames = useMemo(() => {
    const seen: string[] = [];
    for (const f of fields) {
      const g = f.group ?? DEFAULT_GROUP;
      if (!seen.includes(g)) seen.push(g);
    }
    return seen;
  }, [fields]);

  const renderField = (f: Field) => {
    const id = `${table}-${f.name}`;
    const err = errors[f.name];
    const invalid = Boolean(err);
    return (
      <SifoField
        key={f.name}
        htmlFor={id}
        label={f.label}
        required={f.required}
        error={err}
        wide={f.colSpan === 2 || f.type === "textarea"}
      >
        {f.type === "lookup" && f.lookup ? (
          <EntitySelector
            label=""
            options={lookupOptions[f.name] ?? []}
            value={form[f.name] ? String(form[f.name]) : null}
            onChange={v => setField(f.name, v)}
            placeholder={`Search existing ${f.label.toLowerCase()}…`}
            recentKey={`${table}-${f.name}`}
            emptyTitle={f.lookup.emptyTitle}
            emptyActionTo={f.lookup.createTo}
            emptyActionLabel={f.lookup.createLabel}
            createLabel={f.lookup.createLabel}
          />
        ) : f.type === "textarea" ? (
          <Textarea
            id={id}
            aria-invalid={invalid}
            className={invalid ? "border-destructive" : undefined}
            rows={3}
            value={form[f.name] ?? ""}
            onChange={e => setField(f.name, e.target.value)}
          />
        ) : f.type === "select" ? (
          <Select value={String(form[f.name] ?? "")} onValueChange={v => setField(f.name, v)}>
            <SelectTrigger id={id} aria-invalid={invalid} className={cn("h-11", invalid && "border-destructive")}>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {f.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={id}
            aria-invalid={invalid}
            className={cn("h-11", invalid && "border-destructive")}
            type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
            value={form[f.name] ?? ""}
            onChange={e => setField(f.name, e.target.value)}
          />
        )}
      </SifoField>
    );
  };

  const extras = (
    <>
      {accountFields?.map(af => (
        <div key={af.key}>
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
        <div className="space-y-1 sm:col-span-2">
          <PostingPreview lines={preview} title="Journal that will be posted" />
          {!previewOk && (
            <p className="text-xs text-destructive">Pick the ledger accounts and an amount so debits equal credits before saving.</p>
          )}
        </div>
      )}
    </>
  );


  const toolbar = (
    <>
      {headerExtra}
      {module && <SifoModuleAI module={module} />}
      {exportable && <ExportMenu rows={exportRows} filename={table} title={title} />}
      <Button onClick={openNew} size="sm" className="h-9"><Plus className="h-4 w-4 mr-1.5" />New</Button>
    </>
  );

  // Full-page record editor replaces the list while open.
  if (open) {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module={module}
          icon={Icon}
          title={editing ? `Edit ${title}` : `New ${title}`}
          subtitle={description}
          onCancel={() => setOpen(false)}
          onSave={save}
          saving={saving}
          saveDisabled={!previewOk}
          saveLabel={editing ? "Save changes" : `Create ${title.toLowerCase()}`}
        >
          {groupNames.map((g, gi) => (
            <SifoFormSection key={g} title={g}>
              {fields.filter(f => (f.group ?? DEFAULT_GROUP) === g).map(renderField)}
              {gi === groupNames.length - 1 && extras}
            </SifoFormSection>
          ))}
        </SifoFormPage>
      </div>
    );
  }

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

      <DataTable
        tableId={`crud-${table}`}
        data={filtered}
        columns={dtColumns}
        loading={loading}
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

      <LedgerImpactSheet target={ledger} onOpenChange={o => { if (!o) setLedger(null); }} />
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
