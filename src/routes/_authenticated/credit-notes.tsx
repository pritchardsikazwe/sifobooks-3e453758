import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, UserPlus, FileText, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { QuickAddCustomer } from "@/components/QuickAddCustomer";
import { EntitySelector, type EntityOption } from "@/components/selectors/EntitySelector";
import { postCreditNoteLedger } from "@/lib/posting";
import { ShareDoc } from "@/components/ShareDoc";
import { ExportMenu } from "@/lib/exports";
import { DateRangeFilter, EMPTY_RANGE, inRange, type DateRange } from "@/components/DateRangeFilter";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { SifoFormPage, SifoFormSection, SifoField } from "@/components/sifo/SifoFormPage";

export const Route = createFileRoute("/_authenticated/credit-notes")({
  head: () => ({ meta: [{ title: "Credit Notes — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: CreditNotesPage,
});

function CreditNotesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "draft" | "posted">("all");
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
  const [open, setOpen] = useState(false);

  // New credit note form state
  const today = new Date().toISOString().slice(0, 10);
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [issueDate, setIssueDate] = useState(today);
  const [reason, setReason] = useState("");
  const [subtotal, setSubtotal] = useState(0);
  const [vatRate, setVatRate] = useState(16);
  const [saving, setSaving] = useState(false);

  const vat = subtotal * (vatRate / 100);
  const total = subtotal + vat;

  const chosenInv = invoices.find(i => i.id === invoiceId);
  useEffect(() => {
    if (chosenInv) {
      setCustomerId(chosenInv.customer_id);
      setSubtotal(Number(chosenInv.total) / (1 + vatRate / 100));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const load = async () => {
    setLoading(true);
    const [{ data: cn }, { data: inv }, { data: cs }] = await Promise.all([
      supabase.from("credit_notes").select("*, customers(name), invoices(number)").order("issue_date", { ascending: false }),
      supabase.from("invoices").select("id, number, customer_id, total, currency, issue_date, status").order("issue_date", { ascending: false }),
      supabase.from("customers").select("id, name, phone, email, tpin").eq("active", true).order("name"),
    ]);
    setRows(cn ?? []); setInvoices(inv ?? []); setCustomers(cs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const [quickAddCustomer, setQuickAddCustomer] = useState(false);
  const invoiceOptions = useMemo<EntityOption[]>(() => invoices.map((i: any) => ({
    id: i.id, code: i.number, label: i.number,
    meta: [i.issue_date, i.status].filter(Boolean).join(" · ") || null,
    trailing: fmtMoney(i.total, i.currency),
  })), [invoices]);
  const customerOptions = useMemo<EntityOption[]>(() => customers.map((c: any) => ({
    id: c.id, label: c.name,
    meta: [c.phone, c.email, c.tpin ? `TPIN ${c.tpin}` : null].filter(Boolean).join(" · ") || null,
  })), [customers]);

  const stats = useMemo(() => ({
    total: rows.length,
    posted: rows.filter(r => r.status === "posted").length,
    draft: rows.filter(r => r.status === "draft").length,
    value: rows.reduce((s, r) => s + Number(r.total || 0), 0),
  }), [rows]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return rows.filter(r => {
      if (!inRange(r.issue_date, range)) return false;
      if (tab !== "all" && r.status !== tab) return false;
      if (!s) return true;
      return (r.number ?? "").toLowerCase().includes(s) || (r.customers?.name ?? "").toLowerCase().includes(s);
    });
  }, [rows, q, tab, range]);

  const remove = async (id: string) => {
    if (!confirm("Delete this credit note?")) return;
    const { error } = await supabase.from("credit_notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const resetForm = () => {
    setInvoiceId(""); setCustomerId(""); setIssueDate(today); setReason(""); setSubtotal(0); setVatRate(16);
  };

  const openNew = () => { resetForm(); setOpen(true); };

  const submit = async (post: boolean) => {
    if (!customerId && !invoiceId) return toast.error("Pick a customer or invoice");
    if (subtotal <= 0) return toast.error("Amount must be greater than zero");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { count } = await supabase.from("credit_notes").select("*", { count: "exact", head: true });
    const number = `CN${(count ?? 0) + 1}`;

    const { data: cn, error } = await supabase.from("credit_notes").insert({
      user_id: u.user.id, customer_id: customerId || null, invoice_id: invoiceId || null,
      number, issue_date: issueDate, reason,
      subtotal, vat_amount: vat, total,
      status: post ? "posted" : "draft",
    }).select().single();
    if (error || !cn) { setSaving(false); return toast.error(error?.message ?? "Failed"); }

    await supabase.from("credit_note_items").insert({
      user_id: u.user.id, credit_note_id: cn.id, description: reason || "Credit note",
      quantity: 1, unit_price: subtotal, vat_rate: vatRate, line_total: total,
    });

    if (post) {
      const custName = customers.find(c => c.id === customerId)?.name;
      await postCreditNoteLedger({
        userId: u.user.id, creditNoteId: cn.id, number, issueDate,
        subtotal, vat, total, customerName: custName,
      });
    }

    setSaving(false);
    setOpen(false);
    toast.success(post ? `Credit note ${number} posted — journal entry created` : `Draft ${number} saved`);
    resetForm();
    load();
  };

  if (open) {
    return (
      <div className="p-4 sm:p-6">
        <SifoFormPage
          module="sales"
          icon={Undo2}
          title="New Credit Note"
          subtitle="Reverse or reduce a previously issued invoice for returns, discounts or corrections."
          onCancel={() => setOpen(false)}
          onSave={() => submit(true)}
          saving={saving}
          saveLabel="Post Credit Note"
          secondary={<Button variant="outline" onClick={() => submit(false)} disabled={saving}>Save as Draft</Button>}
        >
          <SifoFormSection title="Details">
            <SifoField label="Against Invoice (optional)">
              <EntitySelector
                label=""
                options={invoiceOptions}
                value={invoiceId || null}
                onChange={v => setInvoiceId(v ?? "")}
                placeholder="Search existing invoices…"
                recentKey="credit-note-invoice"
                emptyTitle="No invoices found for this company yet."
                emptyActionLabel="Go to invoices"
                emptyActionTo="/invoices"
              />
            </SifoField>
            <SifoField label="Customer">
              <EntitySelector
                label=""
                options={customerOptions}
                value={customerId || null}
                onChange={v => setCustomerId(v ?? "")}
                disabled={!!invoiceId}
                placeholder={invoiceId ? "Taken from the linked invoice" : "Search customers…"}
                recentKey="credit-note-customer"
                emptyTitle="No customers found for this company yet."
                createLabel="New customer"
                onCreate={() => setQuickAddCustomer(true)}
              />
              <QuickAddCustomer
                open={quickAddCustomer}
                onOpenChange={setQuickAddCustomer}
                onCreated={(c: any) => { setCustomers(prev => [...prev, c]); setCustomerId(c.id); setQuickAddCustomer(false); }}
              />
            </SifoField>
            <SifoField label="Issue Date" required>
              <Input type="date" className="h-11" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
            </SifoField>
            <SifoField label="VAT %">
              <Input type="number" className="h-11" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} />
            </SifoField>
            <SifoField label="Net amount (excl VAT)" required>
              <Input type="number" step="0.01" className="h-11" value={subtotal || ""} onChange={e => setSubtotal(Number(e.target.value))} />
            </SifoField>
            <SifoField label="Reason" wide>
              <textarea value={reason} onChange={e => setReason(e.target.value)} className="w-full min-h-16 rounded-md border bg-background p-2 text-sm" placeholder="Return / correction / discount…" />
            </SifoField>
          </SifoFormSection>
          <SifoFormSection title="Posting" columns={1}>
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VAT</span><span>{fmtMoney(vat)}</span></div>
              <div className="flex justify-between font-semibold border-t border-border pt-1"><span>Total credit</span><span>{fmtMoney(total)}</span></div>
            </div>
          </SifoFormSection>
        </SifoFormPage>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search credit notes" value={q} onChange={e => setQ(e.target.value)} className="pl-9 bg-slate-50 border-slate-200" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <QuickAddCustomer trigger={<Button variant="outline" size="sm" className="h-9 gap-2"><UserPlus className="h-4 w-4" /> New Customer</Button>} onCreated={() => load()} />
          <Button onClick={openNew} size="sm" variant="save" className="h-9"><Plus className="h-4 w-4 mr-1.5" /> New Credit Note</Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        <SifoModuleHeader
          module="sales"
          icon={Undo2}
          title="Credit Notes"
          description="Reverse or reduce previously issued invoices for returns, discounts or corrections."
          breadcrumbs={[{ label: "Sales", to: "/invoices" }, { label: "Credit Notes" }]}
          actions={<>
            <DateRangeFilter value={range} onChange={setRange} compact />
            <ExportMenu filename="credit-notes" title="Credit Notes" rows={filtered.map(r => ({ Number: r.number, Customer: r.customers?.name ?? "", Invoice: r.invoices?.number ?? "", Issued: r.issue_date, Total: r.total, Status: r.status, Currency: r.currency ?? "ZMW" }))} />
          </>}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="Total" value={stats.total} />
          <KPI label="Draft" value={stats.draft} />
          <KPI label="Posted" value={stats.posted} />
          <KPI label="Value" value={fmtMoney(stats.value)} />
        </div>

        <div className="bg-white rounded-lg border">
          <div className="flex items-center border-b px-4 gap-1">
            {(["all", "draft", "posted"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`py-3 px-3 text-sm capitalize border-b-2 -mb-px ${tab === t ? "border-[#0f4c5c] text-[#0f4c5c] font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="p-4">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="py-14 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <FileText className="h-9 w-9 text-slate-400" />
                </div>
                <div className="font-semibold">No credit notes yet</div>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">Issue a credit note when you refund a customer or cancel part of an invoice.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left font-medium py-2 px-2">#</th>
                      <th className="text-left font-medium py-2 px-2">Customer</th>
                      <th className="text-left font-medium py-2 px-2">Against Invoice</th>
                      <th className="text-left font-medium py-2 px-2">Issued</th>
                      <th className="text-right font-medium py-2 px-2">Total</th>
                      <th className="text-left font-medium py-2 px-2">Status</th>
                      <th className="text-right font-medium py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 px-2 font-mono text-xs">{r.number}</td>
                        <td className="py-2 px-2">{r.customers?.name ?? "—"}</td>
                        <td className="py-2 px-2 font-mono text-xs">{r.invoices?.number ?? "—"}</td>
                        <td className="py-2 px-2 text-xs">{r.issue_date}</td>
                        <td className="py-2 px-2 text-right font-medium">{fmtMoney(r.total, r.currency)}</td>
                        <td className="py-2 px-2"><span className={`px-2 py-0.5 rounded text-xs capitalize ${r.status === "posted" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{r.status}</span></td>
                        <td className="py-2 px-2 text-right">
                         <ShareDoc kind="credit_note" id={r.id} docNumber={r.number} />
                         <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>

                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
