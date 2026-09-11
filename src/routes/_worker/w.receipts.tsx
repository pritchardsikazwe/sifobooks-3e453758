import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { printHtmlDocument } from "@/services/printDocument";
import { loadAssignment, kw, type CashierAssignment } from "@/lib/cashier-workspace";

export const Route = createFileRoute("/_worker/w/receipts")({
  head: () => ({
    meta: [
      { title: "Receipts — SifoBooks Cashier" },
      { name: "description", content: "Find one of your completed receipts and reprint it for the customer." },
      { property: "og:title", content: "Receipts — SifoBooks Cashier" },
      { property: "og:description", content: "Search your own completed sales and reprint the receipt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Receipts,
});

function Receipts() {
  const [a, setA] = useState<CashierAssignment | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    void (async () => {
      const asg = await loadAssignment();
      setA(asg);
      if (!asg) return;
      const { data } = await supabase
        .from("pos_sales")
        .select("id,sale_no,customer_name,total,tax,status,sold_at")
        .eq("created_by", asg.cashierUserId)
        .eq("status", "completed")
        .order("sold_at", { ascending: false })
        .limit(100);
      setRows(data ?? []);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    !q || `${r.sale_no ?? ""} ${r.customer_name ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  const reprint = async (sale: any) => {
    const [{ data: lines }, { data: pays }] = await Promise.all([
      supabase.from("pos_sale_items").select("name,qty,price,line_total").eq("sale_id", sale.id),
      supabase.from("pos_payments").select("method,amount").eq("sale_id", sale.id),
    ]);
    const html = `
      <h2 style="margin:0">Receipt ${sale.sale_no ?? sale.id.slice(0, 8)}</h2>
      <p style="margin:2px 0">${new Date(sale.sold_at).toLocaleString("en-ZM")}</p>
      <p style="margin:2px 0">Customer: ${sale.customer_name ?? "Walk-in"} · Served by ${a?.displayName ?? ""}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:10px">
        <thead><tr><th align="left">Item</th><th align="right">Qty</th><th align="right">Price</th><th align="right">Amount</th></tr></thead>
        <tbody>
          ${(lines ?? []).map((l: any) => `<tr><td>${l.name ?? "Item"}</td><td align="right">${l.qty}</td><td align="right">${kw(Number(l.price))}</td><td align="right">${kw(Number(l.line_total))}</td></tr>`).join("")}
        </tbody>
      </table>
      <p style="margin-top:10px"><strong>VAT:</strong> ${kw(Number(sale.tax ?? 0))}<br/>
      <strong>Total:</strong> ${kw(Number(sale.total ?? 0))}<br/>
      <strong>Paid:</strong> ${(pays ?? []).map((p: any) => `${p.method} ${kw(Number(p.amount))}`).join(", ") || "—"}</p>
      <p style="margin-top:10px;font-size:11px">Reprint — this is a copy of an existing receipt. No new sale was recorded.</p>`;
    try {
      await printHtmlDocument(`Receipt ${sale.sale_no ?? ""}`, html, `receipt-${sale.sale_no ?? sale.id}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not print that receipt");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Receipts</h1>
        <p className="text-sm text-slate-400">Your completed sales. Reprinting never changes a posted sale.</p>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Receipt number or customer" className="max-w-sm" />

      <div className="overflow-auto rounded-2xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase text-slate-400">
            <tr>{["Receipt", "Time", "Customer", "Total", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="px-3 py-2 font-semibold">{r.sale_no ?? r.id.slice(0, 8)}</td>
                <td className="px-3 py-2">{new Date(r.sold_at).toLocaleString("en-ZM", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-3 py-2">{r.customer_name ?? "Walk-in"}</td>
                <td className="px-3 py-2">{kw(Number(r.total))}</td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="secondary" onClick={() => void reprint(r)}>Reprint</Button>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No completed receipts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
