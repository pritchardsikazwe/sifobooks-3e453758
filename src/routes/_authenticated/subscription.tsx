import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { activatePayrollOnly, upgradeFromPayrollOnly, isPayrollOnly } from "@/lib/payroll-product";
import { activateHotelOnly, upgradeFromHotelOnly, isHotelOnly } from "@/lib/hotel-product";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [{ title: "Subscription — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [current, setCurrent] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUserId(u.user.id);
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("companies").select("*").eq("user_id", u.user.id).maybeSingle(),
    ]);
    setPlans(p ?? []); setCompany(c ?? null);
    if (c) {
      const { data: s } = await supabase.from("company_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("company_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setCurrent(s ?? null);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const activate = async (planId: string) => {
    if (!company) return toast.error("Set up your company first");
    setBusy(planId);
    // Cancel existing
    if (current) {
      await supabase.from("company_subscriptions").update({ status: "cancelled", cancel_at: new Date().toISOString() }).eq("id", current.id);
    }
    const end = new Date(); end.setDate(end.getDate() + 30);
    const { error } = await supabase.from("company_subscriptions").insert({
      company_id: company.id, user_id: userId, plan_id: planId,
      status: "active", current_period_end: end.toISOString(),
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Subscription activated");
    load();
  };

  const payrollOnly = isPayrollOnly((company as any)?.workspace_mode);

  const switchPayrollOnly = async () => {
    if (!company) return toast.error("Set up your company first");
    setBusy("payroll_only");
    try {
      await activatePayrollOnly({ companyId: company.id, userId });
      toast.success("Payroll-only workspace activated");
      await load();
    } catch (e: any) { toast.error(e.message ?? "Could not switch to Payroll only"); }
    setBusy(null);
  };

  const switchFullSuite = async () => {
    if (!company) return;
    setBusy("full_suite");
    try {
      await upgradeFromPayrollOnly({ companyId: company.id });
      toast.success("Full SifoBooks switched on");
      await load();
    } catch (e: any) { toast.error(e.message ?? "Could not switch on the full suite"); }
    setBusy(null);
  };

  if (loading) return <div className="p-8 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading plans…</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Sparkles className="h-6 w-6 text-[#0f4c5c]" /> Subscription</h1>
          <p className="text-sm text-muted-foreground mt-1">Pick the plan that fits your business. Change or cancel anytime.</p>
        </div>

        {current && (
          <div className="rounded-lg border bg-white p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Current plan</div>
              <div className="text-lg font-semibold">{current.subscription_plans?.name} · <span className="text-emerald-700">{current.status}</span></div>
              <div className="text-xs text-muted-foreground">Renews {new Date(current.current_period_end).toLocaleDateString()}</div>
            </div>
            <div className="text-2xl font-bold">{fmtMoney(current.subscription_plans?.price_monthly, current.subscription_plans?.currency)}/mo</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(p => {
            const isCurrent = current?.plan_id === p.id && current?.status === "active";
            const highlight = p.code === "business";
            return (
              <div key={p.id} className={`rounded-xl border p-6 flex flex-col bg-white ${highlight ? "border-[#0f4c5c] shadow-lg ring-2 ring-[#0f4c5c]/10" : ""}`}>
                {highlight && <div className="text-xs font-bold text-[#0f4c5c] uppercase tracking-wide mb-2">Most popular</div>}
                <div className="font-semibold text-lg">{p.name}</div>
                <div className="mt-3">
                  <span className="text-3xl font-bold">{fmtMoney(p.price_monthly, p.currency)}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{p.max_users} user{p.max_users === 1 ? "" : "s"}</div>
                <ul className="space-y-2 mt-5 text-sm flex-1">
                  {(p.features as string[]).map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" /> <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => activate(p.id)}
                  disabled={isCurrent || busy === p.id}
                  className={`mt-6 w-full ${highlight ? "bg-[#0f4c5c] hover:bg-[#0c3f4c]" : ""}`}
                  variant={isCurrent ? "outline" : highlight ? "default" : "outline"}
                >
                  {busy === p.id ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating…</> :
                    isCurrent ? "Current plan" :
                    p.price_monthly === 0 ? "Start free" : "Activate"}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Product</div>
              <div className="text-lg font-semibold">SifoPayroll — Payroll only</div>
              <p className="text-sm text-muted-foreground mt-1">
                Employees, pay runs, payslips, payment batches and PAYE, NAPSA and NHIMA returns, without accounting,
                POS or inventory. Payroll journals only post to the general ledger once Accounting is switched on —
                nothing is posted in the meantime. Your payroll history is kept either way.
              </p>
              <p className="text-xs text-muted-foreground mt-2">Pricing for Payroll only is quoted per company and user — talk to us for a quote.</p>
            </div>
            <div className="flex flex-col gap-2">
              {payrollOnly ? (
                <>
                  <span className="text-xs font-semibold text-emerald-700">Currently on Payroll only</span>
                  <Button variant="outline" onClick={switchFullSuite} disabled={busy === "full_suite"}>
                    {busy === "full_suite" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Switching…</> : "Upgrade to full SifoBooks"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={switchPayrollOnly} disabled={busy === "payroll_only"}>
                  {busy === "payroll_only" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Switching…</> : "Use Payroll only"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Product</div>
              <div className="text-lg font-semibold">SifoHotel — Hotel only</div>
              <p className="text-sm text-muted-foreground mt-1">
                Reservations, front desk, room rack, rates and packages, housekeeping, maintenance, folios, payments,
                outlet sales, events and night audit — for hotels, lodges, guest houses, B&Bs, hostels and serviced
                apartments. No POS, inventory or accounting setup needed first. Hotel activity only posts to the general
                ledger once Accounting is switched on; nothing is posted silently. Your property history is kept either way.
              </p>
              <p className="text-xs text-muted-foreground mt-2">Pricing for Hotel only is quoted per property and room count — talk to us for a quote.</p>
            </div>
            <div className="flex flex-col gap-2">
              {hotelOnly ? (
                <>
                  <span className="text-xs font-semibold text-emerald-700">Currently on Hotel only</span>
                  <Button variant="outline" onClick={switchFullSuiteFromHotel} disabled={busy === "full_suite_hotel"}>
                    {busy === "full_suite_hotel" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Switching…</> : "Upgrade to full SifoBooks"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={switchHotelOnly} disabled={busy === "hotel_only"}>
                  {busy === "hotel_only" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Switching…</> : "Use Hotel only"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2">
          Prices in ZMW. Billing integration coming soon — activate to preview limits.
        </div>
      </div>
    </div>
  );
}
