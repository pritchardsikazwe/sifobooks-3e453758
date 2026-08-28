import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { usePosContext } from "@/components/pos/PosContextProvider";
import { can } from "@/lib/pos-permissions";
import { money } from "@/lib/worker-pos";

export const Route = createFileRoute("/_worker/w/cash")({
  head: () => ({
    meta: [
      { title: "Cash Drawer — SifoBooks POS" },
      { name: "description", content: "Open the drawer with a float, record cash in, drops and payouts, then count and close." },
      { property: "og:title", content: "Cash Drawer — SifoBooks POS" },
      { property: "og:description", content: "Cash control for cashiers, supervisors and managers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerCash,
});

function WorkerCash() {
  const ctx = usePosContext();
  const [drawer, setDrawer] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [float, setFloat] = useState("");
  const [counted, setCounted] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    if (!ctx?.tenantId) return;
    const { data } = await supabase.from("restaurant_cash_drawers")
      .select("*").eq("user_id", ctx.tenantId).eq("business_date", today)
      .eq("status", "open").maybeSingle();
    setDrawer(data ?? null);
    if (data) {
      const { data: t } = await supabase.from("restaurant_cash_transactions")
        .select("*").eq("drawer_id", data.id).order("created_at", { ascending: false });
      setTxns(t ?? []);
    } else setTxns([]);
  };
  useEffect(() => { load(); }, [ctx?.tenantId]);

  if (!can(ctx, "cash_drawer")) return <div className="p-10 text-center text-slate-400">Cash management is not available for your role.</div>;

  const openDrawer = async () => {
    const { error } = await supabase.from("restaurant_cash_drawers").insert({
      user_id: ctx!.tenantId, name: `${ctx!.displayName} drawer`, business_date: today,
      opening_float: Number(float || 0), status: "open", opened_by: ctx!.displayName,
    });
    if (error) return toast.error(error.message);
    setFloat(""); toast.success("Drawer opened"); load();
  };

  const addTxn = async (type: "cash_in" | "drop" | "payout") => {
    if (type === "payout" && !can(ctx, "cash_payout")) return toast.error("Your role cannot make payouts");
    const { error } = await supabase.from("restaurant_cash_transactions").insert({
      user_id: ctx!.tenantId, drawer_id: drawer.id, txn_type: type,
      amount: Number(amount || 0), reason: reason || null,
    });
    if (error) return toast.error(error.message);
    setAmount(""); setReason(""); load();
  };

  const closeDrawer = async () => {
    const expected = Number(drawer.opening_float ?? 0) + Number(drawer.cash_sales ?? 0)
      - Number(drawer.cash_payouts ?? 0) - Number(drawer.cash_drops ?? 0);
    const { error } = await supabase.from("restaurant_cash_drawers").update({
      status: "closed", counted_cash: Number(counted || 0), expected_cash: expected,
      variance: Number(counted || 0) - expected, closed_at: new Date().toISOString(), closed_by: ctx!.displayName,
    }).eq("id", drawer.id);
    if (error) return toast.error(error.message);
    toast.success("Drawer closed"); setCounted(""); load();
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-5">
      <h1 className="text-xl font-bold">Cash drawer</h1>

      {!drawer ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="font-semibold">Open drawer</div>
          <input value={float} onChange={(e) => setFloat(e.target.value)} type="number" placeholder="Opening float (ZMW)"
            className="w-full rounded-lg bg-slate-800 px-3 py-2" />
          <Button className="bg-emerald-500 text-slate-950" onClick={openDrawer}>Open drawer</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[["Float", drawer.opening_float], ["Cash sales", drawer.cash_sales], ["Payouts", drawer.cash_payouts], ["Drops", drawer.cash_drops]].map(([l, v]) => (
              <div key={l as string} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs text-slate-400">{l as string}</div>
                <div className="text-lg font-bold">{money(Number(v ?? 0))}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="font-semibold">Movement</div>
            <div className="flex flex-wrap gap-2">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Amount"
                className="w-36 rounded-lg bg-slate-800 px-3 py-2" />
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason"
                className="flex-1 min-w-[10rem] rounded-lg bg-slate-800 px-3 py-2" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => addTxn("cash_in")}>Cash in</Button>
              <Button variant="secondary" onClick={() => addTxn("drop")}>Cash drop</Button>
              <Button variant="secondary" disabled={!can(ctx, "cash_payout")} onClick={() => addTxn("payout")}>Payout</Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="font-semibold">Close &amp; count</div>
            <input value={counted} onChange={(e) => setCounted(e.target.value)} type="number" placeholder="Counted cash"
              className="w-full rounded-lg bg-slate-800 px-3 py-2" />
            <Button className="bg-emerald-500 text-slate-950" onClick={closeDrawer}>Close drawer</Button>
          </div>

          <div className="rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-slate-400">
                <tr>{["Time", "Type", "Reason", "Amount"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} className="border-t border-slate-800">
                    <td className="px-3 py-2">{new Date(t.created_at).toLocaleTimeString()}</td>
                    <td className="px-3 py-2 capitalize">{String(t.txn_type).replace("_", " ")}</td>
                    <td className="px-3 py-2">{t.reason ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{money(Number(t.amount))}</td>
                  </tr>
                ))}
                {!txns.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No movements yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
