import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num, monthRange } from "@/lib/reports";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/reports/vat-return")({
  head: () => ({ meta: [{ title: "VAT Return (VAT 3) — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: VatReturnPage,
});

function VatReturnPage() {
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { from, to } = monthRange(month);
      const [{ data: inv }, { data: bl }] = await Promise.all([
        supabase.from("invoices").select("invoice_number,issue_date,subtotal,vat_amount,total,status,customers(name)")
          .gte("issue_date", from).lte("issue_date", to).neq("status", "draft"),
        supabase.from("bills").select("bill_number,bill_date,subtotal,vat_amount,total,status,suppliers(name)")
          .gte("bill_date", from).lte("bill_date", to).neq("status", "draft"),
      ]);
      setInvoices(inv ?? []); setBills(bl ?? []);
      setLoading(false);
    })();
  }, [month]);

  const totals = useMemo(() => {
    const standardOut = invoices.filter(i => num(i.vat_amount) > 0);
    const zeroRatedOut = invoices.filter(i => num(i.vat_amount) === 0);
    const standardIn = bills.filter(b => num(b.vat_amount) > 0);
    return {
      salesStandardNet: standardOut.reduce((s, r) => s + num(r.subtotal), 0),
      salesStandardVat: standardOut.reduce((s, r) => s + num(r.vat_amount), 0),
      salesZeroRatedNet: zeroRatedOut.reduce((s, r) => s + num(r.subtotal), 0),
      purchasesNet: standardIn.reduce((s, r) => s + num(r.subtotal), 0),
      purchasesVat: standardIn.reduce((s, r) => s + num(r.vat_amount), 0),
    };
  }, [invoices, bills]);

  const netVat = totals.salesStandardVat - totals.purchasesVat;

  const rows = [
    { Box: "1. Standard-rated sales (net)", Amount: totals.salesStandardNet.toFixed(2) },
    { Box: "2. Output VAT on standard sales", Amount: totals.salesStandardVat.toFixed(2) },
    { Box: "3. Zero-rated / export sales (net)", Amount: totals.salesZeroRatedNet.toFixed(2) },
    { Box: "4. Standard-rated purchases (net)", Amount: totals.purchasesNet.toFixed(2) },
    { Box: "5. Input VAT on purchases", Amount: totals.purchasesVat.toFixed(2) },
    { Box: "6. NET VAT " + (netVat >= 0 ? "PAYABLE" : "REFUND"), Amount: Math.abs(netVat).toFixed(2) },
  ];

  return (
    <ReportShell
      title="VAT Return (VAT 3)"
      subtitle={`ZRA VAT return · ${month}`}
      loading={loading} filename={`vat-return-${month}`} rows={rows}
      filters={<Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="h-9 w-40" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Stat label="Output VAT" value={totals.salesStandardVat} tone="emerald" />
        <Stat label="Input VAT" value={totals.purchasesVat} tone="blue" />
        <Stat label={netVat >= 0 ? "Net VAT Payable" : "Net VAT Refund"} value={Math.abs(netVat)} tone={netVat >= 0 ? "rose" : "emerald"} />
      </div>

      <div className="border rounded-md overflow-hidden mb-6">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.Box.startsWith("6.") ? "bg-slate-50 font-semibold border-t-2" : ""}>
                <td className="px-4 py-2">{r.Box}</td>
                <td className="px-4 py-2 text-right font-mono">{fmt(Number(r.Amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Register title="VAT Output Register (Sales)" rows={invoices} refKey="invoice_number" dateKey="issue_date" party="customers" />
      <Register title="VAT Input Register (Purchases)" rows={bills} refKey="bill_number" dateKey="bill_date" party="suppliers" />
    </ReportShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "blue" | "rose" }) {
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

function Register({ title, rows, refKey, dateKey, party }: { title: string; rows: any[]; refKey: string; dateKey: string; party: "customers" | "suppliers" }) {
  return (
    <div className="mb-6">
      <div className="text-sm font-semibold text-slate-700 mb-1">{title}</div>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs">
            <tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Ref</th><th className="px-3 py-2 text-left">Party</th>
              <th className="px-3 py-2 text-right">Net</th><th className="px-3 py-2 text-right">VAT</th><th className="px-3 py-2 text-right">Total</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No records.</td></tr>
              : rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{r[dateKey]}</td>
                  <td className="px-3 py-2 font-mono">{r[refKey]}</td>
                  <td className="px-3 py-2">{r[party]?.name ?? ""}</td>
                  <td className="px-3 py-2 text-right">{fmt(num(r.subtotal))}</td>
                  <td className="px-3 py-2 text-right">{fmt(num(r.vat_amount))}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmt(num(r.total))}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
