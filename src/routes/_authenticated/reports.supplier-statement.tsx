import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num } from "@/lib/reports";
import { generateStatementPdf, type StatementLine } from "@/lib/statement-pdf";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/supplier-statement")({
  head: () => ({ meta: [{ title: "Supplier Statement — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: SupplierStatementPage,
});

function SupplierStatementPage() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfYear = `${new Date().getFullYear()}-01-01`;

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [from, setFrom] = useState(firstOfYear);
  const [to, setTo] = useState(today);
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("suppliers").select("id,name,email,phone,tpin,address").order("name");
      setSuppliers(data ?? []);
      if (data?.length && !supplierId) setSupplierId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      setLoading(true);
      const [{ data: b }, { data: p }] = await Promise.all([
        supabase.from("bills").select("id,bill_number,bill_date,total,status,supplier_invoice_number").eq("supplier_id", supplierId),
        supabase.from("bill_payments").select("id,payment_number,payment_date,amount,payment_method,reference").eq("supplier_id", supplierId),
      ]);
      setBills(b ?? []);
      setPayments(p ?? []);
      setLoading(false);
    })();
  }, [supplierId]);

  const supplier = suppliers.find(s => s.id === supplierId);

  // For suppliers: credit increases what we owe them, debit (payment) reduces it.
  const { openingBalance, lines } = useMemo(() => {
    type Row = { date: string; ref: string; description: string; debit: number; credit: number };
    const all: Row[] = [];
    bills.forEach(b => all.push({
      date: b.bill_date, ref: b.bill_number,
      description: `Bill ${b.bill_number}${b.supplier_invoice_number ? ` (Sup #${b.supplier_invoice_number})` : ""}`,
      debit: 0, credit: num(b.total),
    }));
    payments.forEach(p => all.push({
      date: p.payment_date, ref: p.payment_number,
      description: `Payment ${p.payment_number}${p.reference ? ` (${p.reference})` : ""} — ${p.payment_method}`,
      debit: num(p.amount), credit: 0,
    }));

    all.sort((a, b) => a.date.localeCompare(b.date));

    const opening = all.filter(r => r.date < from).reduce((s, r) => s + r.credit - r.debit, 0);
    const period = all.filter(r => r.date >= from && r.date <= to);

    let bal = opening;
    const withBal: StatementLine[] = period.map(r => {
      bal += r.credit - r.debit;
      return { ...r, balance: bal };
    });
    return { openingBalance: opening, lines: withBal };
  }, [bills, payments, from, to]);

  const closing = lines.length ? lines[lines.length - 1].balance : openingBalance;

  const csv = [
    { Date: "", Ref: "", Description: "Opening balance (payable)", Debit: "", Credit: "", Balance: openingBalance.toFixed(2) },
    ...lines.map(l => ({ Date: l.date, Ref: l.ref, Description: l.description, Debit: l.debit ? l.debit.toFixed(2) : "", Credit: l.credit ? l.credit.toFixed(2) : "", Balance: l.balance.toFixed(2) })),
    { Date: "", Ref: "", Description: "Closing balance (payable)", Debit: "", Credit: "", Balance: closing.toFixed(2) },
  ];

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <select className="border rounded px-2 py-1 text-sm" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <input type="date" className="border rounded px-2 py-1 text-sm" value={from} onChange={e => setFrom(e.target.value)} />
      <span className="text-slate-400">→</span>
      <input type="date" className="border rounded px-2 py-1 text-sm" value={to} onChange={e => setTo(e.target.value)} />
      <Button size="sm" variant="outline" disabled={!supplier} onClick={() => supplier && generateStatementPdf({
        kind: "supplier", partyName: supplier.name,
        partyMeta: { email: supplier.email, phone: supplier.phone, tpin: supplier.tpin, address: supplier.address },
        from, to, openingBalance, lines,
      })}>
        <FileDown className="h-4 w-4 mr-1" /> PDF
      </Button>
    </div>
  );

  return (
    <ReportShell
      title="Supplier Statement"
      subtitle={supplier ? `${supplier.name} · ${from} → ${to}` : "Select a supplier"}
      loading={loading}
      filename={`supplier-statement-${supplier?.name ?? "party"}-${from}_to_${to}`}
      rows={csv}
      filters={filters}
    >
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500 uppercase border-b">
          <tr>
            <th className="text-left py-2">Date</th>
            <th className="text-left">Ref</th>
            <th className="text-left">Description</th>
            <th className="text-right">Debit (Paid)</th>
            <th className="text-right">Credit (Billed)</th>
            <th className="text-right">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          <tr className="bg-slate-50 font-medium">
            <td colSpan={5} className="py-1.5">Opening balance (payable)</td>
            <td className="text-right">{fmt(openingBalance)}</td>
          </tr>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="py-1.5">{l.date}</td>
              <td>{l.ref}</td>
              <td>{l.description}</td>
              <td className="text-right">{l.debit ? fmt(l.debit) : "—"}</td>
              <td className="text-right">{l.credit ? fmt(l.credit) : "—"}</td>
              <td className="text-right font-medium">{fmt(l.balance)}</td>
            </tr>
          ))}
          {!lines.length && <tr><td colSpan={6} className="py-4 text-center text-slate-400">No transactions in this period.</td></tr>}
        </tbody>
        <tfoot className="border-t-2 font-semibold bg-emerald-50">
          <tr>
            <td colSpan={5} className="pt-2">Closing balance (payable)</td>
            <td className="pt-2 text-right">{fmt(closing)}</td>
          </tr>
        </tfoot>
      </table>
    </ReportShell>
  );
}
