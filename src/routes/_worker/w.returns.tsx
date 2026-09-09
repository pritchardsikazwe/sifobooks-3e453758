import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ManagerAuthDialog } from "@/components/pos/ManagerAuthDialog";
import { refundSale } from "@/lib/pos";
import { loadAssignment, recentSalesForReturn, saleLines, logActivity, kw, type CashierAssignment } from "@/lib/cashier-workspace";

export const Route = createFileRoute("/_worker/w/returns")({
  head: () => ({
    meta: [
      { title: "Returns — SifoBooks Cashier" },
      { name: "description", content: "Find one of your own receipts and return it with manager authorisation — stock and accounting reverse automatically." },
      { property: "og:title", content: "Returns — SifoBooks Cashier" },
      { property: "og:description", content: "Cashier returns with manager approval and a full audit trail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Returns,
});

function Returns() {
  const [a, setA] = useState<CashierAssignment | null>(null);
  const [sales, setSales] = useState<Record<string, any>[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, any> | null>(null);
  const [lines, setLines] = useState<Record<string, any>[]>([]);
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("cash");
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const asg = a ?? (await loadAssignment());
    setA(asg);
    if (asg) setSales(await recentSalesForReturn(asg.cashierUserId));
  };
  useEffect(() => { void load(); }, []);

  const select = async (s: Record<string, any>) => {
    setOpen(s);
    setReason("");
    setLines(await saleLines(s.id as string));
  };

  const doRefund = async () => {
    if (!open) return;
    setBusy(true);
    try {
      await refundSale(open.id as string, method, reason || "Customer return");
      if (a) await logActivity(a.tenantId, "sale.returned", open.id as string, { reason, method });
      toast.success(`Receipt ${open.sale_no} returned`);
      setOpen(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not process the return");
    }
    setBusy(false);
  };

  const filtered = sales.filter((s) => !q || String(s.sale_no ?? "").toLowerCase().includes(q.toLowerCase()) || String(s.customer_name ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Returns</h1>
        <p className="text-sm text-slate-400">Only your own receipts. A manager must approve every return.</p>
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Receipt number or customer"
        className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm" />

      <div className="rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-400">
            <tr>{["Receipt", "Time", "Customer", "Total", "Status", ""].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-slate-800">
                <td className="px-3 py-2 font-semibold">{s.sale_no}</td>
                <td className="px-3 py-2 text-slate-400">{new Date(s.sold_at).toLocaleString("en-ZM")}</td>
                <td className="px-3 py-2">{s.customer_name ?? "Walk-in"}</td>
                <td className="px-3 py-2">{kw(Number(s.total ?? 0))}</td>
                <td className="px-3 py-2 capitalize">{s.status}</td>
                <td className="px-3 py-2 text-right">
                  {s.status === "completed" && (
                    <Button size="sm" variant="secondary" onClick={() => void select(s)}>Return</Button>
                  )}
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No receipts to return.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="font-semibold">Return {open.sale_no} · {kw(Number(open.total ?? 0))}</div>
          <ul className="text-sm text-slate-300 space-y-1">
            {lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-4">
                <span>{l.qty} × {l.name}</span>
                <span>{kw(Number(l.line_total ?? 0))}</span>
              </li>
            ))}
          </ul>
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for the return"
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm" />
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">
              <option value="cash">Refund in cash</option>
              <option value="card">Refund to card</option>
              <option value="momo">Refund to mobile money</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button className="bg-emerald-500 text-slate-950" disabled={busy} onClick={() => setAuthOpen(true)}>
              Get manager approval
            </Button>
            <Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <ManagerAuthDialog
        action="pos.refund"
        entityId={(open?.id as string) ?? null}
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthorised={() => { setAuthOpen(false); void doRefund(); }}
      />
    </div>
  );
}
