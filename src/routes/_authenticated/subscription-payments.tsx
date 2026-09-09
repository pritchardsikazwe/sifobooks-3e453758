import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileCheck2, Loader2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/subscription-payments")({
  head: () => ({ meta: [{ title: "Payment Verification — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: SubscriptionPaymentsPage,
});

function SubscriptionPaymentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscription_payment_requests")
      .select("*, companies(name), company_subscriptions(plan,status,current_period_end)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const review = async (row: any, decision: "approved" | "rejected" | "needs_info") => {
    setBusy(row.id);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setBusy(null); return toast.error("You must be signed in"); }

    if (decision === "approved") {
      const start = new Date();
      const end = new Date(start);
      if (row.billing_cycle === "annual") end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);

      const { error: subError } = await supabase.from("company_subscriptions").upsert({
        company_id: row.company_id,
        plan: row.requested_plan,
        status: "active",
        billing_cycle: row.billing_cycle,
        currency: row.currency,
        amount: row.amount,
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
        cancel_at_period_end: false,
        cancelled_at: null,
      }, { onConflict: "company_id" });
      if (subError) { setBusy(null); return toast.error(subError.message); }

      const { data: sub } = await supabase.from("company_subscriptions")
        .select("id").eq("company_id", row.company_id).maybeSingle();

      const { error } = await supabase.from("subscription_payment_requests").update({
        status: "approved",
        subscription_id: sub?.id ?? null,
        admin_notes: notes[row.id] || null,
        verified_by: user.user.id,
        verified_at: new Date().toISOString(),
      }).eq("id", row.id);
      if (error) { setBusy(null); return toast.error(error.message); }
      toast.success("Payment approved — subscription activated");
    } else {
      const { error } = await supabase.from("subscription_payment_requests").update({
        status: decision,
        admin_notes: notes[row.id] || null,
        verified_by: user.user.id,
        verified_at: new Date().toISOString(),
      }).eq("id", row.id);
      if (error) { setBusy(null); return toast.error(error.message); }
      toast.success(decision === "rejected" ? "Payment rejected" : "More information requested");
    }
    setBusy(null);
    load();
  };

  const pending = rows.filter(r => r.status === "pending");
  const history = rows.filter(r => r.status !== "pending");

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <FileCheck2 className="h-6 w-6 text-[#0f4c5c]" />
        <div>
          <h1 className="text-2xl font-bold">Payment Verification</h1>
          <p className="text-sm text-muted-foreground">Review offline subscription payments before granting paid access.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Pending</div><div className="text-2xl font-bold flex gap-2 items-center"><Clock3 className="h-5 w-5" />{pending.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Approved</div><div className="text-2xl font-bold flex gap-2 items-center"><CheckCircle2 className="h-5 w-5" />{rows.filter(r => r.status === "approved").length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Rejected</div><div className="text-2xl font-bold flex gap-2 items-center"><XCircle className="h-5 w-5" />{rows.filter(r => r.status === "rejected").length}</div></Card>
      </div>

      <Card className="p-5">
        <div className="font-semibold mb-4">Pending Payments</div>
        {loading ? <div className="py-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div> : pending.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No pending payments.</div> : (
          <div className="space-y-4">
            {pending.map(row => (
              <div key={row.id} className="border rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Company</div><div className="font-medium">{row.companies?.name ?? row.company_id}</div></div>
                  <div><div className="text-xs text-muted-foreground">Plan</div><div className="font-medium capitalize">{row.requested_plan}</div></div>
                  <div><div className="text-xs text-muted-foreground">Amount</div><div className="font-medium">{row.currency} {Number(row.amount).toLocaleString()}</div></div>
                  <div><div className="text-xs text-muted-foreground">Method</div><div className="capitalize">{String(row.payment_method).replaceAll("_", " ")}</div></div>
                  <div><div className="text-xs text-muted-foreground">Reference</div><div className="font-mono">{row.reference}</div></div>
                  <div><div className="text-xs text-muted-foreground">Payment date</div><div>{row.payment_date}</div></div>
                </div>
                {row.customer_notes && <div className="text-sm bg-slate-50 rounded p-3"><span className="font-medium">Customer note:</span> {row.customer_notes}</div>}
                {row.proof_url && <a className="text-sm underline text-[#0f4c5c]" href={row.proof_url} target="_blank" rel="noreferrer">View proof of payment</a>}
                <Textarea placeholder="Admin note (optional or explain rejection / information required)" value={notes[row.id] ?? ""} onChange={e => setNotes(n => ({ ...n, [row.id]: e.target.value }))} />
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="outline" disabled={busy === row.id} onClick={() => review(row, "needs_info")}>Request information</Button>
                  <Button variant="outline" disabled={busy === row.id} onClick={() => review(row, "rejected")} className="text-red-700">Reject</Button>
                  <Button disabled={busy === row.id} onClick={() => review(row, "approved")} className="bg-[#0f4c5c] hover:bg-[#0c3f4c]">{busy === row.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}Approve & Activate</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="font-semibold mb-4">Verification History</div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="text-left py-2">Company</th><th className="text-left py-2">Plan</th><th className="text-left py-2">Amount</th><th className="text-left py-2">Reference</th><th className="text-left py-2">Status</th><th className="text-left py-2">Verified</th></tr></thead><tbody>{history.map(r => <tr key={r.id} className="border-b last:border-0"><td className="py-2">{r.companies?.name ?? "—"}</td><td className="py-2 capitalize">{r.requested_plan}</td><td className="py-2">{r.currency} {Number(r.amount).toLocaleString()}</td><td className="py-2 font-mono">{r.reference}</td><td className="py-2 capitalize">{String(r.status).replaceAll("_", " ")}</td><td className="py-2">{r.verified_at ? new Date(r.verified_at).toLocaleString() : "—"}</td></tr>)}</tbody></table></div>
      </Card>
    </div>
  );
}
