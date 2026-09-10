import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num, monthRange } from "@/lib/reports";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/reports/tax-summary")({
  head: () => ({ meta: [{ title: "Tax Summary — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: TaxSummaryPage,
});

function TaxSummaryPage() {
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { from, to } = monthRange(month);
      const [{ data: inv }, { data: bl }] = await Promise.all([
        supabase.from("invoices").select("number,issue_date,subtotal,vat_amount,total,status,customers(name)")
          .gte("issue_date", from).lte("issue_date", to).neq("status", "draft"),
        supabase.from("bills").select("bill_number,bill_date,subtotal,tax_amount,total,status,suppliers(name)")
          .gte("bill_date", from).lte("bill_date", to).neq("status", "draft"),
      ]);
      setInvoices(inv ?? []); setBills(bl ?? []);
      setLoading(false);
    })();
  }, [month]);

  const { outputVat, inputVat, salesNet, purchasesNet } = useMemo(() => {
    const outputVat = invoices.reduce((s, r) => s + num(r.vat_amount), 0);
    const inputVat = bills.reduce((s, r) => s + num(r.tax_amount), 0);
    const salesNet = invoices.reduce((s, r) => s + num(r.subtotal), 0);
    const purchasesNet = bills.reduce((s, r) => s + num(r.subtotal), 0);
    return { outputVat, inputVat, salesNet, purchasesNet };
  }, [invoices, bills]);

  const netPayable = outputVat - inputVat;

  const csvRows = [
    { Section: "Sales (Output VAT)", Reference: "Total", Party: "", Net: salesNet.toFixed(2), VAT: outputVat.toFixed(2) },
    ...invoices.map((i) => ({
      Section: "Sales", Reference: i.number, Party: i.customers?.name ?? "",
      Net: num(i.subtotal).toFixed(2), VAT: num(i.vat_amount).toFixed(2),
    })),
    { Section: "Purchases (Input VAT)", Reference: "Total", Party: "", Net: purchasesNet.toFixed(2), VAT: inputVat.toFixed(2) },
    ...bills.map((b) => ({
      Section: "Purchases", Reference: b.bill_number, Party: b.suppliers?.name ?? "",
      Net: num(b.subtotal).toFixed(2), VAT: num(b.tax_amount).toFixed(2),
    })),
    { Section: "NET VAT PAYABLE", Reference: "", Party: "", Net: "", VAT: netPayable.toFixed(2) },
  ];

  return (
    <ReportShell
      title="Tax Summary (VAT)"
      subtitle={`ZRA VAT — Output vs Input · ${month}`}
      loading={loading} filename={`tax-summary-${month}`} rows={csvRows}
      filters={<Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 w-40" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Output VAT (Sales)" value={outputVat} tone="emerald" />
        <StatCard label="Input VAT (Purchases)" value={inputVat} tone="blue" />
        <StatCard label={netPayable >= 0 ? "Net VAT Payable" : "Net VAT Refund"} value={Math.abs(netPayable)} tone={netPayable >= 0 ? "rose" : "emerald"} />
      </div>

      <Section title="Sales — Output VAT" rows={invoices} party="customers" refKey="number" dateKey="issue_date" total={outputVat} />
      <Section title="Purchases — Input VAT" rows={bills} party="suppliers" refKey="bill_number" dateKey="bill_date" total={inputVat} />

      <div className="mt-6 pt-4 border-t-2 flex justify-between text-lg font-bold text-slate-900">
        <span>Net VAT {netPayable >= 0 ? "Payable to ZRA" : "Refund from ZRA"}</span>
        <span className={netPayable >= 0 ? "text-rose-700" : "text-emerald-700"}>{fmt(Math.abs(netPayable))}</span>
      </div>
    </ReportShell>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "emerald" | "blue" | "rose" }) {
  const bg = tone === "emerald" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : tone === "blue" ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-rose-50 text-rose-700 border-rose-200";
  return (
    <div className={`rounded-lg border p-4 ${bg}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{fmt(value)}</div>
    </div>
  );
}

function Section({ title, rows, party, refKey, dateKey, total }:
  { title: string; rows: any[]; party: "customers" | "suppliers"; refKey: string; dateKey: string; total: number }) {
  return (
    <div className="mb-6">
      <div className="text-sm font-semibold text-slate-700 mb-1">{title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b">
            <th className="text-left py-1.5 w-24">Date</th>
            <th className="text-left w-32">Ref</th>
            <th className="text-left">Party</th>
            <th className="text-right w-28">Net</th>
            <th className="text-right w-28">VAT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="py-1.5 text-slate-500">{r[dateKey]}</td>
              <td>{r[refKey]}</td>
              <td>{r[party]?.name ?? "—"}</td>
              <td className="text-right">{fmt(num(r.subtotal))}</td>
              <td className="text-right">{fmt(num(r.vat_amount))}</td>
            </tr>
          ))}
          {!rows.length && <tr><td className="py-2 text-slate-400" colSpan={5}>No entries</td></tr>}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td colSpan={4} className="pt-2 text-right">Total VAT</td>
            <td className="pt-2 text-right">{fmt(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
