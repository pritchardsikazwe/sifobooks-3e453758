import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, ReceiptText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [{ title: "Plans & Billing — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: SubscriptionPage,
});

type Plan = "starter" | "standard" | "full";
type Cycle = "monthly" | "annual";

const PLANS: Record<Plan, { name: string; description: string; monthly: number; annual: number; features: string[] }> = {
  starter: { name: "Starter", description: "Simple invoicing, expenses, customers, suppliers and basic reports.", monthly: 0, annual: 0, features: ["Invoicing & expenses", "Customers & suppliers", "Basic reports", "Core finance"] },
  standard: { name: "Standard", description: "Core accounting plus inventory, banking, reconciliation and management reports.", monthly: 0, annual: 0, features: ["Everything in Starter", "Inventory", "Banking & reconciliation", "Management reports"] },
  full: { name: "Full", description: "Complete SifoBooks accounting with ledgers, journals, controls, compliance and advanced reporting.", monthly: 0, annual: 0, features: ["Everything in Standard", "Advanced accounting", "Compliance", "Advanced reporting"] },
};

const PAYMENT_METHODS = [
  ["bank_transfer", "Bank transfer"],
  ["mtn_momo", "MTN MoMo"],
  ["airtel_money", "Airtel Money"],
  ["cash", "Cash"],
  ["other", "Other"],
] as const;

function SubscriptionPage() {
  const [company, setCompany] = useState<any>(null);
  const [current, setCurrent] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [plan, setPlan] = useState<Plan>("standard");
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [method, setMethod] = useState("mtn_momo");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const selected = useMemo(() => PLANS[plan], [plan]);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: c } = await supabase.from("companies").select("id,name,currency").eq("user_id", u.user.id).maybeSingle();
    setCompany(c);
    if (c) {
      const [{ data: s }, { data: r }] = await Promise.all([
        supabase.from("company_subscriptions").select("*").eq("company_id", c.id).maybeSingle(),
        supabase.from("subscription_payment_requests").select("*").eq("company_id", c.id).order("created_at", { ascending: false }),
      ]);
      setCurrent(s); setRequests(r ?? []);
      if (s?.plan) setPlan(s.plan);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submitPayment = async () => {
    if (!company) return toast.error("Set up your company first");
    if (!reference.trim()) return toast.error("Enter the payment transaction/reference number");
    const paid = Number(amount);
    if (!Number.isFinite(paid) || paid <= 0) return toast.error("Enter a valid amount paid");
    setBusy(true);
    const { error } = await supabase.from("subscription_payment_requests").insert({
      company_id: company.id, plan, billing_cycle: cycle, amount: paid,
      currency: company.currency || "ZMW", payment_method: method,
      transaction_reference: reference.trim(), payment_date: paymentDate, notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Payment submitted for verification");
    setReference(""); setAmount(""); setNotes("");
    load();
  };

  const copy = async (value: string) => { await navigator.clipboard?.writeText(value); toast.success("Copied"); };

  if (loading) return <div className="p-8 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading billing…</div>;

  return <div className="min-h-screen bg-slate-50"><div className="p-6 max-w-6xl mx-auto space-y-6">
    <div><h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Sparkles className="h-6 w-6" /> Plans & Billing</h1><p className="text-sm text-muted-foreground mt-1">Pay offline and submit your payment for manual verification.</p></div>

    {current && <div className="rounded-xl border bg-white p-5 flex flex-wrap items-center justify-between gap-4"><div><div className="text-xs uppercase tracking-wide text-muted-foreground">Current subscription</div><div className="text-xl font-semibold capitalize">{current.plan} · <span className="text-emerald-700">{current.status}</span></div><div className="text-sm text-muted-foreground">{current.current_period_end ? `Valid until ${new Date(current.current_period_end).toLocaleDateString()}` : "No expiry date recorded"}</div></div><div className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700">Manual payment</div></div>}

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{(Object.keys(PLANS) as Plan[]).map(key => { const p = PLANS[key]; const chosen = key === plan; return <button type="button" key={key} onClick={() => setPlan(key)} className={`text-left rounded-xl border bg-white p-5 transition ${chosen ? "border-primary ring-2 ring-primary/10" : "hover:border-primary/40"}`}><div className="flex justify-between items-center"><div className="font-semibold text-lg">{p.name}</div>{chosen && <Check className="h-5 w-5" />}</div><p className="text-sm text-muted-foreground mt-2">{p.description}</p><ul className="mt-4 space-y-2 text-sm">{p.features.map(f => <li key={f} className="flex gap-2"><Check className="h-4 w-4 mt-0.5" />{f}</li>)}</ul></button>; })}</div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border bg-white p-6 space-y-5"><div><h2 className="font-semibold text-lg">Payment instructions</h2><p className="text-sm text-muted-foreground">Replace these placeholders with your official SifoBooks payment details.</p></div><div className="rounded-lg bg-muted/50 p-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><span>Bank account</span><span className="font-medium">SifoBooks Business Account</span></div><div className="flex justify-between gap-3"><span>MTN MoMo</span><span className="font-medium">YOUR-MOMO-NUMBER <button className="ml-2" onClick={() => copy("YOUR-MOMO-NUMBER")}><Copy className="inline h-4 w-4" /></button></span></div><div className="flex justify-between gap-3"><span>Airtel Money</span><span className="font-medium">YOUR-AIRTEL-NUMBER</span></div></div><p className="text-xs text-muted-foreground">Keep your transaction reference. Your subscription is not activated until the payment is verified.</p></div>

      <div className="rounded-xl border bg-white p-6 space-y-4"><div><h2 className="font-semibold text-lg flex gap-2 items-center"><ReceiptText className="h-5 w-5" /> Submit payment</h2><p className="text-sm text-muted-foreground">Your request will remain pending until an authorised administrator verifies it.</p></div><div className="grid grid-cols-2 gap-4"><div><Label>Billing cycle</Label><select className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm" value={cycle} onChange={e => setCycle(e.target.value as Cycle)}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></div><div><Label>Amount paid</Label><Input className="mt-1" type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} /></div></div><div><Label>Payment method</Label><select className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm" value={method} onChange={e => setMethod(e.target.value)}>{PAYMENT_METHODS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div><div><Label>Transaction / reference number</Label><Input className="mt-1" placeholder="e.g. MP2609091234" value={reference} onChange={e => setReference(e.target.value)} /></div><div><Label>Payment date</Label><Input className="mt-1" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /></div><div><Label>Notes (optional)</Label><Textarea className="mt-1" placeholder="Any additional information" value={notes} onChange={e => setNotes(e.target.value)} /></div><Button onClick={submitPayment} disabled={busy} className="w-full">{busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : "Submit for verification"}</Button></div>
    </div>

    <div className="rounded-xl border bg-white overflow-hidden"><div className="p-5 border-b"><h2 className="font-semibold">Payment history</h2></div>{requests.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No payment submissions yet.</div> : <div className="divide-y">{requests.map(r => <div key={r.id} className="p-4 flex flex-wrap justify-between gap-3"><div><div className="font-medium capitalize">{r.plan} · {r.payment_method.replaceAll("_", " ")}</div><div className="text-sm text-muted-foreground">{r.transaction_reference} · {new Date(r.payment_date).toLocaleDateString()}</div></div><div className="text-right"><div className="font-medium">{r.currency} {Number(r.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</div><div className="text-sm capitalize text-muted-foreground">{r.status.replaceAll("_", " ")}</div></div></div>)}</div>}</div>
  </div></div>;
}
