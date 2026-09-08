import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loadAssignment, currentShiftFor, shiftTotals, expectedCash, startShift, submitShift, kw,
  type CashierAssignment, type ShiftTotals,
} from "@/lib/cashier-workspace";

export const Route = createFileRoute("/_worker/w/shift")({
  head: () => ({
    meta: [
      { title: "My Shift — SifoBooks Cashier" },
      { name: "description", content: "Start your shift with an opening float, watch expected cash build up, then count and submit the shift for manager review." },
      { property: "og:title", content: "My Shift — SifoBooks Cashier" },
      { property: "og:description", content: "Opening cash, sales by payment method, expected cash, declared cash and variance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyShift,
});

const EMPTY: ShiftTotals = { transactions: 0, salesTotal: 0, itemsSold: 0, refunds: 0, discounts: 0, byMethod: {} };

function MyShift() {
  const [a, setA] = useState<CashierAssignment | null>(null);
  const [shift, setShift] = useState<Record<string, any> | null>(null);
  const [totals, setTotals] = useState<ShiftTotals>(EMPTY);
  const [opening, setOpening] = useState("");
  const [counted, setCounted] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const asg = a ?? (await loadAssignment());
    setA(asg);
    if (!asg) return;
    const s = await currentShiftFor(asg.cashierUserId);
    setShift(s);
    setTotals(s?.id ? await shiftTotals(s.id) : EMPTY);
  };
  useEffect(() => { void load(); }, []);

  const expected = expectedCash(shift, totals);
  const variance = Number(counted || 0) - expected;

  const onStart = async () => {
    if (!a) return;
    setBusy(true);
    try {
      await startShift(a, Number(opening || 0));
      setOpening("");
      toast.success("Shift started");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the shift");
    }
    setBusy(false);
  };

  const onSubmit = async () => {
    if (!shift?.id) return;
    if (counted === "") return toast.error("Enter the cash you counted");
    setBusy(true);
    try {
      await submitShift(shift.id, Number(counted), totals);
      toast.success("Shift submitted — waiting for manager review");
      setCounted("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit the shift");
    }
    setBusy(false);
  };

  if (!shift) {
    return (
      <div className="p-4 md:p-6 max-w-md space-y-4">
        <h1 className="text-xl font-bold">Start shift</h1>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="text-sm text-slate-400">
            {a?.displayName} · {a?.branchName ?? a?.locationName ?? "Your store"}
            {a?.stationName ? ` · ${a.stationName}` : ""}
          </div>
          <label className="block text-sm">Opening cash (float)</label>
          <Input inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="500" />
          <Button className="w-full" disabled={busy} onClick={() => void onStart()}>Start shift</Button>
        </div>
      </div>
    );
  }

  const submitted = shift.review_status === "pending_review" || shift.review_status === "approved";

  return (
    <div className="p-4 md:p-6 max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Shift summary</h1>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2 text-sm">
        <Row label="Cashier" value={a?.displayName ?? shift.cashier_name ?? "—"} />
        <Row label="Branch" value={a?.branchName ?? a?.locationName ?? "—"} />
        <Row label="Opened" value={new Date(shift.opened_at).toLocaleString("en-ZM")} />
        <Row label="Opening cash" value={kw(Number(shift.opening_float ?? 0))} />
        <hr className="border-slate-800" />
        <Row label="Cash sales" value={kw(totals.byMethod["cash"] ?? 0)} />
        <Row label="Card" value={kw(totals.byMethod["card"] ?? 0)} />
        <Row label="Mobile money" value={kw((totals.byMethod["momo"] ?? 0) + (totals.byMethod["mobile_money"] ?? 0))} />
        <Row label="Refunds" value={kw(totals.refunds)} />
        <Row label="Discounts" value={kw(totals.discounts)} />
        <hr className="border-slate-800" />
        <Row label="Transactions" value={String(totals.transactions)} />
        <Row label="Expected cash" value={kw(expected)} strong />
      </div>

      {submitted ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-200 space-y-1">
          <div className="font-semibold uppercase">
            {shift.review_status === "approved" ? "Approved by manager" : "Pending manager review"}
          </div>
          <Row label="Declared cash" value={kw(Number(shift.actual_cash ?? 0))} />
          <Row label="Variance" value={kw(Number(shift.variance ?? 0))} />
          {shift.manager_comment && <p className="pt-1">Manager: {shift.manager_comment}</p>}
          <p className="pt-1 text-xs">A submitted shift can no longer be changed by you.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <label className="block text-sm">Actual cash counted</label>
          <Input inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="0.00" />
          {counted !== "" && (
            <div className={`text-sm font-semibold ${variance === 0 ? "text-emerald-400" : variance > 0 ? "text-sky-400" : "text-rose-400"}`}>
              Variance: {kw(variance)}
            </div>
          )}
          <Button className="w-full" disabled={busy} onClick={() => void onSubmit()}>End shift &amp; submit</Button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className={strong ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}
