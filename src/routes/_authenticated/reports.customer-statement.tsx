import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num } from "@/lib/reports";
import { generateStatementPdf, type StatementLine } from "@/lib/statement-pdf";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/customer-statement")({
  head: () => ({ meta: [{ title: "Customer Statement — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: CustomerStatementPage,
});

function CustomerStatementPage() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfYear = `${new Date().getFullYear()}-01-01`;

  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [from, setFrom] = useState(firstOfYear);
  const [to, setTo] = useState(today);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("customers").select("id,name,email,phone,tpin,address").eq("active", true).order("name");
      setCustomers(data ?? []);
      if (data?.length && !customerId) setCustomerId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!customerId) return;
    (async () => {
      setLoading(true);
      const [{ data: inv }, { data: rec }, { data: cn }] = await Promise.all([
        supabase.from("invoices").select("id,number,issue_date,total,status").eq("customer_id", customerId).neq("status", "voided"),
        supabase.from("receipts").select("id,number,receipt_date,amount,method,reference,invoice_id").eq("customer_id", customerId),
        supabase.from("credit_notes").select("id,number,issue_date,total,status").eq("customer_id", customerId),
      ]);
      setInvoices(inv ?? []);
      setReceipts(rec ?? []);
      setCredits(cn ?? []);
      setLoading(false);
    })();
  }, [customerId]);

  const customer = customers.find(c => c.id === customerId);

  const { openingBalance, lines } = useMemo(() => {
    type Row = { date: string; ref: string; description: string; debit: number; credit: number };
    const all: Row[] = [];
    invoices.forEach(i => all.push({ date: i.issue_date, ref: i.number, description: `Invoice ${i.number}`, debit: num(i.total), credit: 0 }));
    receipts.forEach(r => all.push({ date: r.receipt_date, ref: r.number, description: `Receipt ${r.number}${r.reference ? ` (${r.reference})` : ""} — ${r.method}`, debit: 0, credit: num(r.amount) }));
    credits.filter(c => c.status !== "voided").forEach(c => all.push({ date: c.issue_date, ref: c.number, description: `Credit Note ${c.number}`, debit: 0, credit: num(c.total) }));

    all.sort((a, b) => a.date.localeCompare(b.date));

    const opening = all.filter(r => r.date < from).reduce((s, r) => s + r.debit - r.credit, 0);
    const period = all.filter(r => r.date >= from && r.date <= to);

    let bal = opening;
    const withBal: StatementLine[] = period.map(r => {
      bal += r.debit - r.credit;
      return { ...r, balance: bal };
    });
    return { openingBalance: opening, lines: withBal };
  }, [invoices, receipts, credits, from, to]);

  const closing = lines.length ? lines[lines.length - 1].balance : openingBalance;

  const csv = [
    { Date: "", Ref: "", Description: "Opening balance", Debit: "", Credit: "", Balance: openingBalance.toFixed(2) },
    ...lines.map(l => ({ Date: l.date, Ref: l.ref, Description: l.description, Debit: l.debit ? l.debit.toFixed(2) : "", Credit: l.credit ? l.credit.toFixed(2) : "", Balance: l.balance.toFixed(2) })),
    { Date: "", Ref: "", Description: "Closing balance", Debit: "", Credit: "", Balance: closing.toFixed(2) },
  ];

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <select className="border rounded px-2 py-1 text-sm" value={customerId} onChange={e => setCustomerId(e.target.value)}>
        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input type="date" className="border rounded px-2 py-1 text-sm" value={from} onChange={e => setFrom(e.target.value)} />
      <span className="text-slate-400">→</span>
      <input type="date" className="border rounded px-2 py-1 text-sm" value={to} onChange={e => setTo(e.target.value)} />
      <Button size="sm" variant="outline" disabled={!customer} onClick={() => customer && generateStatementPdf({
        kind: "customer", partyName: customer.name,
        partyMeta: { email: customer.email, phone: customer.phone, tpin: customer.tpin, address: customer.address },
        from, to, openingBalance, lines,
      })}>
        <FileDown className="h-4 w-4 mr-1" /> PDF
      </Button>
    </div>
  );

  return (
    <ReportShell
      title="Customer Statement"
      subtitle={customer ? `${customer.name} · ${from} → ${to}` : "Select a customer"}
      loading={loading}
      filename={`customer-statement-${customer?.name ?? "party"}-${from}_to_${to}`}
      rows={csv}
      filters={filters}
    >
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500 uppercase border-b">
          <tr>
            <th className="text-left py-2">Date</th>
            <th className="text-left">Ref</th>
            <th className="text-left">Description</th>
            <th className="text-right">Debit</th>
            <th className="text-right">Credit</th>
            <th className="text-right">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          <tr className="bg-slate-50 font-medium">
            <td colSpan={5} className="py-1.5">Opening balance</td>
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
            <td colSpan={5} className="pt-2">Closing balance</td>
            <td className="pt-2 text-right">{fmt(closing)}</td>
          </tr>
        </tfoot>
      </table>
    </ReportShell>
  );
}
