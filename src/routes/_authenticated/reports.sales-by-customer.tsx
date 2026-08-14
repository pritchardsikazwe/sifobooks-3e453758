import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num } from "@/lib/reports";
import { ReportFilterBar, type ReportFilters } from "@/components/reports/ReportFilterBar";
import { resolvePeriod } from "@/lib/reports/format";

export const Route = createFileRoute("/_authenticated/reports/sales-by-customer")({
  head: () => ({ meta: [{ title: "Sales by Customer — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: SalesByCustomerPage,
});

function SalesByCustomerPage() {
  const [filters, setFilters] = useState<ReportFilters>({ range: resolvePeriod("this-month"), periodKey: "this-month" });
  const { from, to, label } = filters.range;
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("invoices")
        .select("total,vat_amount,subtotal,status,issue_date,customer:customer_id(name)")
        .neq("status", "voided").neq("status", "draft")
        .gte("issue_date", from).lte("issue_date", to);
      setInvoices(data ?? []);
      setLoading(false);
    })();
  }, [from, to]);

  const rows = useMemo(() => {
    const map = new Map<string, { customer: string; count: number; net: number; vat: number; total: number }>();
    invoices.forEach((i: any) => {
      const name = i.customer?.name ?? "(unknown)";
      const r = map.get(name) ?? { customer: name, count: 0, net: 0, vat: 0, total: 0 };
      r.count += 1;
      r.net += num(i.subtotal); r.vat += num(i.vat_amount); r.total += num(i.total);
      map.set(name, r);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [invoices]);

  const totals = rows.reduce((a, r) => ({
    count: a.count + r.count, net: a.net + r.net, vat: a.vat + r.vat, total: a.total + r.total,
  }), { count: 0, net: 0, vat: 0, total: 0 });

  const csv = rows.map((r) => ({
    Customer: r.customer, Invoices: r.count,
    Net: r.net.toFixed(2), VAT: r.vat.toFixed(2), Total: r.total.toFixed(2),
  }));

  return (
    <ReportShell title="Sales by Customer" subtitle={`Posted invoices only · ${label}`} loading={loading} filename="sales-by-customer" rows={csv}>
      <ReportFilterBar initial={{ periodKey: "this-month" }} onApply={setFilters} />
      <table className="w-full text-sm mt-4">
        <thead className="text-xs text-slate-500 uppercase border-b">
          <tr>
            <th className="text-left py-2">Customer</th>
            <th className="text-right"># Inv</th>
            <th className="text-right">Net</th><th className="text-right">VAT</th><th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.customer}>
              <td className="py-1.5">{r.customer}</td>
              <td className="text-right">{r.count}</td>
              <td className="text-right">{fmt(r.net)}</td>
              <td className="text-right">{fmt(r.vat)}</td>
              <td className="text-right font-semibold">{fmt(r.total)}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={5} className="py-4 text-slate-400">No sales yet.</td></tr>}
        </tbody>
        <tfoot className="border-t-2 font-semibold">
          <tr>
            <td className="pt-2">Totals</td>
            <td className="pt-2 text-right">{totals.count}</td>
            <td className="pt-2 text-right">{fmt(totals.net)}</td>
            <td className="pt-2 text-right">{fmt(totals.vat)}</td>
            <td className="pt-2 text-right">{fmt(totals.total)}</td>
          </tr>
        </tfoot>
      </table>
    </ReportShell>
  );
}
