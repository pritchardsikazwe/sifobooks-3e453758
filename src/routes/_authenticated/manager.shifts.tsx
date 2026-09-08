import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { kw, reviewShift } from "@/lib/cashier-workspace";

export const Route = createFileRoute("/_authenticated/manager/shifts")({
  head: () => ({
    meta: [
      { title: "Cashier Shifts — SifoBooks Manager" },
      { name: "description", content: "Review submitted cashier shifts: opening cash, sales, expected versus counted cash, variance, then approve, reject or request a recount." },
      { property: "og:title", content: "Cashier Shifts — SifoBooks Manager" },
      { property: "og:description", content: "Shift approvals and cash variance review for every cashier in your branch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShiftReview,
});

const FILTERS = ["pending_review", "open", "approved", "rejected", "recount", "all"] as const;
type Filter = (typeof FILTERS)[number];

function ShiftReview() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>("pending_review");
  const [comment, setComment] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    let q = supabase.from("pos_shifts").select("*").order("opened_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("review_status", filter);
    const { data, error } = await q;
    if (error) return toast.error(error.message);
    setRows((data ?? []) as any[]);
  };
  useEffect(() => { void load(); }, [filter]);

  const decide = async (id: string, decision: "approved" | "rejected" | "recount") => {
    setBusy(id);
    try {
      await reviewShift(id, decision, comment[id] ?? "");
      toast.success(`Shift ${decision === "recount" ? "sent back for recount" : decision}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that decision");
    }
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-sm capitalize ${filter === f ? "bg-primary text-primary-foreground font-semibold" : "bg-muted text-muted-foreground"}`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="overflow-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Cashier</th><th className="p-2">Opened</th>
              <th className="p-2 text-right">Opening</th><th className="p-2 text-right">Sales</th>
              <th className="p-2 text-right">Expected</th><th className="p-2 text-right">Counted</th>
              <th className="p-2 text-right">Variance</th><th className="p-2">Status</th><th className="p-2">Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const sales = Number(s.cash_sales ?? 0) + Number(s.card_sales ?? 0) + Number(s.momo_sales ?? 0) + Number(s.other_sales ?? 0);
              const v = Number(s.variance ?? 0);
              return (
                <tr key={s.id} className="border-t align-top">
                  <td className="p-2">
                    <div className="font-medium">{s.cashier_name ?? "Cashier"}</div>
                    <div className="text-xs text-muted-foreground">{s.station ?? ""}{s.drawer_name ? ` · ${s.drawer_name}` : ""}</div>
                  </td>
                  <td className="p-2 whitespace-nowrap">{new Date(s.opened_at).toLocaleString("en-ZM", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="p-2 text-right">{kw(Number(s.opening_float ?? 0))}</td>
                  <td className="p-2 text-right">{kw(sales)}</td>
                  <td className="p-2 text-right">{kw(Number(s.expected_cash ?? 0))}</td>
                  <td className="p-2 text-right">{kw(Number(s.actual_cash ?? 0))}</td>
                  <td className={`p-2 text-right font-semibold ${v < 0 ? "text-destructive" : v > 0 ? "text-sky-600" : ""}`}>{kw(v)}</td>
                  <td className="p-2 capitalize">
                    {String(s.review_status).replace("_", " ")}
                    {s.manager_comment && <div className="text-xs text-muted-foreground">{s.manager_comment}</div>}
                  </td>
                  <td className="p-2">
                    {s.review_status === "pending_review" ? (
                      <div className="w-56 space-y-2">
                        <Input
                          placeholder="Comment (optional)"
                          value={comment[s.id] ?? ""}
                          onChange={(e) => setComment((c) => ({ ...c, [s.id]: e.target.value }))}
                          className="h-8"
                        />
                        <div className="flex gap-1">
                          <Button size="sm" disabled={busy === s.id} onClick={() => void decide(s.id, "approved")}>Approve</Button>
                          <Button size="sm" variant="secondary" disabled={busy === s.id} onClick={() => void decide(s.id, "recount")}>Recount</Button>
                          <Button size="sm" variant="destructive" disabled={busy === s.id} onClick={() => void decide(s.id, "rejected")}>Reject</Button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {s.reviewed_at ? `Reviewed ${new Date(s.reviewed_at).toLocaleDateString("en-ZM")}` : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nothing here.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">A cashier can never approve their own shift — the database rejects it even if the request is sent directly.</p>
    </div>
  );
}
