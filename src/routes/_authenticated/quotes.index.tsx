import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, UserPlus, Calendar, FileText, ArrowRightCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { QuickAddCustomer } from "@/components/QuickAddCustomer";
import { postInvoiceLedger } from "@/lib/posting";
import { ShareDoc } from "@/components/ShareDoc";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";

export const Route = createFileRoute("/_authenticated/quotes/")({
  head: () => ({ meta: [{ title: "Quote Manager — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: QuotesPage,
});

function QuotesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "draft" | "sent" | "accepted" | "converted">("all");
  const [sort, setSort] = useState<"new" | "old">("new");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("quotes").select("*, customers(name)").order("issue_date", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: rows.length,
    accepted: rows.filter(r => r.status === "accepted").length,
    converted: rows.filter(r => r.status === "converted").length,
    pending: rows.filter(r => ["draft", "sent"].includes(r.status)).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    let list = rows.filter(r => {
      if (tab !== "all" && r.status !== tab) return false;
      if (!s) return true;
      return (r.number ?? "").toLowerCase().includes(s) || (r.customers?.name ?? "").toLowerCase().includes(s);
    });
    list = [...list].sort((a, b) => sort === "new" ? (b.issue_date > a.issue_date ? 1 : -1) : (a.issue_date > b.issue_date ? 1 : -1));
    return list;
  }, [rows, q, tab, sort]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this quote?")) return;
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const convert = async (quote: any) => {
    if (quote.status === "converted") return toast.info("Already converted");
    if (quote.status !== "accepted") return toast.error("Only accepted quotes can be converted to an invoice");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: items } = await supabase.from("quote_items").select("*").eq("quote_id", quote.id);
    const { count } = await supabase.from("invoices").select("*", { count: "exact", head: true });
    const number = `INV${(count ?? 0) + 1}`;
    const due = new Date(); due.setDate(due.getDate() + 30);
    const issueDate = new Date().toISOString().slice(0, 10);
    const { data: inv, error } = await supabase.from("invoices").insert({
      user_id: u.user.id, customer_id: quote.customer_id, quote_id: quote.id,
      number, issue_date: issueDate, due_date: due.toISOString().slice(0, 10),
      status: "sent", currency: quote.currency,
      subtotal: quote.subtotal, vat_amount: quote.vat_amount, total: quote.total, notes: quote.notes,
    }).select().single();
    if (error || !inv) return toast.error(error?.message ?? "Failed");
    if (items?.length) {
      const { error: lineError } = await supabase.from("invoice_items").insert(items.map((it: any) => ({
        user_id: u.user.id, invoice_id: inv.id, stock_item_id: it.stock_item_id,
        description: it.description, quantity: it.quantity,
        unit_price: it.unit_price, vat_rate: it.vat_rate, line_total: it.line_total,
      })));
      if (lineError) return toast.error(lineError.message);
      for (const it of items) {
        if (it.stock_item_id) {
          await supabase.from("stock_movements").insert({
            user_id: u.user.id, item_id: it.stock_item_id, movement_type: "out",
            quantity: it.quantity, reference: number, note: `Invoice ${number} (from ${quote.number})`,
          });
        }
      }
    }
    await postInvoiceLedger({
      userId: u.user.id, invoiceId: inv.id, number, issueDate,
      subtotal: Number(quote.subtotal), vat: Number(quote.vat_amount), total: Number(quote.total),
      customerName: quote.customers?.name,
    });
    await supabase.from("quotes").update({ status: "converted" }).eq("id", quote.id);
    toast.success(`Invoice ${number} created & posted from ${quote.number}`);
    navigate({ to: "/invoices" });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search for Quotes, customers etc" value={q} onChange={e => setQ(e.target.value)} className="pl-9 bg-slate-50 border-slate-200" /></div>
        <div className="flex items-center gap-2 ml-auto"><QuickAddCustomer trigger={<Button variant="outline" className="gap-2"><UserPlus className="h-4 w-4" /> New Customer</Button>} onCreated={() => {}} /><Button asChild className="bg-[#0f4c5c] hover:bg-[#0c3f4c] text-white gap-2"><Link to="/quotes/new"><Plus className="h-4 w-4" /> New Quote</Link></Button></div>
      </div>
      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        <SifoModuleHeader module="sales" icon={Calendar} title="Quote Manager" description="Draft, send, accept and convert quotes to invoices." breadcrumbs={[{ label: "Sales", to: "/invoices" }, { label: "Quotes" }]} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><KPI label="Total Quotes" value={stats.total} /><KPI label="Pending" value={stats.pending} /><KPI label="Accepted" value={stats.accepted} /><KPI label="Converted" value={stats.converted} /></div>
        <div className="bg-white rounded-lg border">
          <div className="flex items-center justify-between border-b px-4 flex-wrap gap-2"><div className="flex gap-1">{(["all", "draft", "sent", "accepted", "converted"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`py-3 px-3 text-sm capitalize border-b-2 -mb-px transition ${tab === t ? "border-[#0f4c5c] text-[#0f4c5c] font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>)}</div><div className="flex items-center gap-2 py-2"><Select value={sort} onValueChange={(v: any) => setSort(v)}><SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">Newest to Oldest</SelectItem><SelectItem value="old">Oldest to Newest</SelectItem></SelectContent></Select></div></div>
          <div className="p-4"><div className="text-sm font-medium mb-3">Quotes</div>{loading ? <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div> : filtered.length === 0 ? <div className="py-14 flex flex-col items-center text-center"><div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4"><FileText className="h-9 w-9 text-slate-400" /></div><div className="font-semibold">No quotes yet</div><p className="text-sm text-muted-foreground mt-1 max-w-xs">Create your first quote to start winning deals.</p><Button asChild className="mt-5 bg-[#0f4c5c] hover:bg-[#0c3f4c] gap-2"><Link to="/quotes/new"><Plus className="h-4 w-4" /> Create Quote</Link></Button></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left font-medium py-2 px-2">#</th><th className="text-left font-medium py-2 px-2">Customer</th><th className="text-left font-medium py-2 px-2">Issued</th><th className="text-left font-medium py-2 px-2">Valid Until</th><th className="text-right font-medium py-2 px-2">Total</th><th className="text-left font-medium py-2 px-2">Status</th><th className="text-right font-medium py-2 px-2">Actions</th></tr></thead><tbody>{filtered.map(q => <tr key={q.id} className="border-b last:border-0 hover:bg-slate-50"><td className="py-2 px-2 font-mono text-xs"><Link to="/quotes/$id" params={{ id: q.id }} className="text-primary hover:underline">{q.number}</Link></td><td className="py-2 px-2">{q.customers?.name ?? "—"}</td><td className="py-2 px-2 text-xs">{q.issue_date}</td><td className="py-2 px-2 text-xs">{q.valid_until ?? "—"}</td><td className="py-2 px-2 text-right font-medium">{fmtMoney(q.total, q.currency)}</td><td className="py-2 px-2"><Select value={q.status} onValueChange={v => updateStatus(q.id, v)} disabled={q.status === "converted"}><SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["draft", "sent", "accepted", "declined", "converted"].map(s => <SelectItem key={s} value={s} disabled={s === "converted"}>{s}</SelectItem>)}</SelectContent></Select></td><td className="py-2 px-2 text-right">{q.status === "converted" ? <span className="text-xs text-emerald-700">Converted</span> : <Button size="sm" variant="outline" onClick={() => convert(q)} disabled={q.status !== "accepted"} className="mr-1"><ArrowRightCircle className="h-3 w-3 mr-1" /> To invoice</Button>}<ShareDoc kind="quote" id={q.id} docNumber={q.number} /><Button size="icon" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody></table></div>}</div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: number | string }) { return <div className="bg-white rounded-lg border p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-semibold mt-1">{value}</div></div>; }
