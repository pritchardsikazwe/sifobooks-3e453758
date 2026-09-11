import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loadAssignment, currentShiftFor, shiftTotals, kw,
  submitShift, type CashierAssignment, type ShiftTotals,
} from "@/lib/cashier-workspace";
import {
  ZMW_DENOMINATIONS, countedFromDenominations, denominationPayload, expectedCashFrom,
  varianceOf, requiresReason, canSubmitDeclaration, varianceLabel, type DenominationCounts,
} from "@/lib/cashier-cashup";

export const Route = createFileRoute("/_worker/w/cashup")({
  head: () => ({
    meta: [
      { title: "Cash Declaration — SifoBooks Cashier" },
      { name: "description", content: "Count your drawer note by note, compare it with expected cash and send the declaration for manager review." },
      { property: "og:title", content: "Cash Declaration — SifoBooks Cashier" },
      { property: "og:description", content: "Opening float plus cash sales less refunds and payouts, against the cash you actually counted." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CashUp,
});

const EMPTY: ShiftTotals = { transactions: 0, salesTotal: 0, itemsSold: 0, refunds: 0, discounts: 0, byMethod: {} };

function CashUp() {
  const [a, setA] = useState<CashierAssignment | null>(null);
  const [shift, setShift] = useState<Record<string, any> | null>(null);
  const [totals, setTotals] = useState<ShiftTotals>(EMPTY);
  const [counts, setCounts] = useState<DenominationCounts>({});
  const [manual, setManual] = useState("");
  const [reason, setReason] = useState("");
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

  const sheetTotal = useMemo(() => countedFromDenominations(counts), [counts]);
  const declared = manual !== "" ? Number(manual) : sheetTotal;

  const expected = expectedCashFrom({
    openingFloat: Number(shift?.opening_float ?? 0),
    cashSales: Number(totals.byMethod["cash"] ?? 0),
    cashRefunds: totals.refunds,
    cashIn: Number(shift?.cash_in ?? 0),
    cashOut: Number(shift?.cash_out ?? 0),
  });
  const variance = varianceOf(declared, expected);
  const state = varianceLabel(variance);

  if (!shift) {
    return (
      <div className="p-4 md:p-6 max-w-md space-y-4">
        <h1 className="text-xl font-bold">Cash declaration</h1>
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-200">
          You have no open shift to declare.{" "}
          <Link to="/w/shift" className="underline">Start your shift</Link> first.
        </div>
      </div>
    );
  }

  const submitted = shift.review_status === "pending_review" || shift.review_status === "approved";

  const onSubmit = async () => {
    setBusy(true);
    try {
      const res = await submitShift(shift.id, Number(declared), reason, denominationPayload(counts));
      toast.success(`Declaration sent for review · variance ${kw(Number(res.variance ?? variance))}`);
      setCounts({}); setManual(""); setReason("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit the declaration");
    }
    setBusy(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Cash declaration</h1>
        <p className="text-sm text-slate-400">
          {a?.displayName} · {a?.branchName ?? a?.locationName ?? "Your store"}
          {a?.stationName ? ` · ${a.stationName}` : ""}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2 text-sm">
        <Row label="Opening float" value={kw(Number(shift.opening_float ?? 0))} />
        <Row label="Cash sales" value={kw(totals.byMethod["cash"] ?? 0)} />
        <Row label="Cash in" value={kw(Number(shift.cash_in ?? 0))} />
        <Row label="Refunds" value={`− ${kw(totals.refunds)}`} />
        <Row label="Cash out / payouts" value={`− ${kw(Number(shift.cash_out ?? 0))}`} />
        <hr className="border-slate-800" />
        <Row label="Expected cash" value={kw(expected)} strong />
        <p className="pt-1 text-xs text-slate-500">
          The final expected figure and variance are recalculated by SifoBooks from the recorded sales when you submit.
        </p>
      </div>

      {submitted ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-200 space-y-1">
          <div className="font-semibold uppercase">
            {shift.review_status === "approved" ? "Approved by manager" : "Pending manager review"}
          </div>
          <Row label="Declared cash" value={kw(Number(shift.actual_cash ?? 0))} />
          <Row label="Variance" value={kw(Number(shift.variance ?? 0))} />
          {shift.variance_reason && <p className="pt-1">Your reason: {shift.variance_reason}</p>}
          {shift.manager_comment && <p>Manager: {shift.manager_comment}</p>}
          <p className="pt-1 text-xs">You cannot approve your own variance — a manager reviews and closes it.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="font-semibold">Count the drawer</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ZMW_DENOMINATIONS.map((d) => (
                <label key={d.value} className="flex items-center gap-2 rounded-xl bg-slate-800/70 px-3 py-2">
                  <span className="w-12 text-sm font-semibold">{d.label}</span>
                  <Input
                    inputMode="numeric"
                    className="h-9"
                    value={String(counts[String(d.value)] ?? "")}
                    onChange={(e) => setCounts({ ...counts, [String(d.value)]: e.target.value.replace(/\D/g, "") })}
                    placeholder="0"
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-slate-400">Counted from the sheet</span>
              <span className="font-bold">{kw(sheetTotal)}</span>
            </div>
            <label className="block text-sm text-slate-400">Or declare a total directly</label>
            <Input inputMode="decimal" value={manual} onChange={(e) => setManual(e.target.value)} placeholder={String(sheetTotal || "0.00")} />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Declared cash</span>
              <span className="font-bold">{kw(declared)}</span>
            </div>
            <div className={`flex items-center justify-between text-sm font-semibold ${state === "balanced" ? "text-emerald-400" : state === "over" ? "text-sky-400" : "text-rose-400"}`}>
              <span>Variance ({state})</span>
              <span>{kw(variance)}</span>
            </div>
            {requiresReason(variance) && (
              <>
                <label className="block text-sm">Explain the difference (required)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. K20 short — change given from own float at 14:10"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                />
              </>
            )}
            <Button
              className="w-full bg-emerald-500 text-slate-950"
              disabled={!canSubmitDeclaration({ declared: manual !== "" ? manual : String(sheetTotal), variance, reason, busy })}
              onClick={() => void onSubmit()}
            >
              Submit declaration for review
            </Button>
          </div>
        </>
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
