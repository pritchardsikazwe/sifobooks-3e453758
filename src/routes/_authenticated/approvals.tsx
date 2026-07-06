import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, Ban, Loader2, Inbox, Send, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { actOnRequest, cancelRequest } from "@/lib/approvals";
import { toast } from "sonner";
import { fmt } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({ meta: [{ title: "Approvals — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: ApprovalsPage,
});

type Req = {
  id: string; module: string; reference_number: string | null; description: string | null;
  amount: number; currency: string; status: string; current_level: number; max_level: number;
  requested_by: string; created_at: string;
  requester?: { email: string | null; full_name: string | null } | null;
};

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, { icon: any; cls: string }> = {
    pending: { icon: Clock, cls: "bg-amber-100 text-amber-700 border-amber-200" },
    approved: { icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    rejected: { icon: XCircle, cls: "bg-rose-100 text-rose-700 border-rose-200" },
    cancelled: { icon: Ban, cls: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const it = map[s] ?? map.pending;
  const I = it.icon;
  return <Badge className={it.cls + " gap-1"}><I className="h-3 w-3" /> {s}</Badge>;
}

function ApprovalsPage() {
  const [userId, setUserId] = useState("");
  const [inbox, setInbox] = useState<Req[]>([]);
  const [mine, setMine] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [decideOn, setDecideOn] = useState<{ req: Req; action: "approve" | "reject" } | null>(null);
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    setUserId(u.user.id);

    // My submissions
    const { data: my } = await supabase.from("approval_requests")
      .select("*").eq("requested_by", u.user.id).order("created_at", { ascending: false });
    setMine((my ?? []) as any);

    // Pending requests I can act on
    const { data: pending } = await supabase.from("approval_requests")
      .select("*, requester:requested_by(email, full_name)")
      .eq("status", "pending").order("created_at", { ascending: false }).limit(200);
    const filtered: Req[] = [];
    for (const r of pending ?? []) {
      const { data: can } = await supabase.rpc("can_act_on_request", { _req: r.id, _user: u.user.id });
      if (can) filtered.push(r as any);
    }
    setInbox(filtered);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const doDecision = async () => {
    if (!decideOn) return;
    setBusy(decideOn.req.id);
    try {
      const result = await actOnRequest(decideOn.req.id, decideOn.action, notes || undefined);
      toast.success(`Request ${result}`);
      setDecideOn(null); setNotes("");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const doCancel = async (id: string) => {
    if (!confirm("Cancel this pending request?")) return;
    setBusy(id);
    try { await cancelRequest(id); toast.success("Cancelled"); load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const renderTable = (rows: Req[], mode: "inbox" | "mine") => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500 uppercase border-b">
          <tr>
            <th className="text-left py-2">Module</th>
            <th className="text-left">Ref</th>
            {mode === "inbox" && <th className="text-left">Requested By</th>}
            <th className="text-right">Amount</th>
            <th className="text-left">Level</th>
            <th className="text-left">Status</th>
            <th className="text-left">Date</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-2 capitalize">{r.module.replace(/_/g, " ")}</td>
              <td>
                <div className="font-medium">{r.reference_number || "—"}</div>
                {r.description && <div className="text-xs text-slate-500">{r.description}</div>}
              </td>
              {mode === "inbox" && (
                <td className="text-slate-600">{r.requester?.full_name || r.requester?.email || "—"}</td>
              )}
              <td className="text-right font-medium">{fmt(Number(r.amount), r.currency || "ZMW")}</td>
              <td className="text-slate-500">L{r.current_level}/{r.max_level}</td>
              <td><StatusBadge s={r.status} /></td>
              <td className="text-slate-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
              <td className="text-right">
                {mode === "inbox" && r.status === "pending" && (
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-emerald-700 border-emerald-300"
                      disabled={busy === r.id} onClick={() => { setDecideOn({ req: r, action: "approve" }); setNotes(""); }}>
                      {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Approve"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-rose-700 border-rose-300"
                      disabled={busy === r.id} onClick={() => { setDecideOn({ req: r, action: "reject" }); setNotes(""); }}>
                      Reject
                    </Button>
                  </div>
                )}
                {mode === "mine" && r.status === "pending" && (
                  <Button size="sm" variant="ghost" className="h-7 text-slate-500" onClick={() => doCancel(r.id)}>Cancel</Button>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={mode === "inbox" ? 8 : 7} className="py-6 text-center text-slate-400">Nothing here.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Inbox className="h-6 w-6 text-[#0f4c5c]" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Approvals</h1>
            <p className="text-sm text-slate-500">Route purchases, expenses, leave, discounts and payments through configured hierarchies.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
      </div>

      <Card className="p-5">
        <Tabs defaultValue="inbox">
          <TabsList>
            <TabsTrigger value="inbox">
              <Inbox className="h-4 w-4 mr-1" /> Inbox
              {inbox.length > 0 && <Badge className="ml-2 bg-rose-500 text-white">{inbox.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="mine">
              <Send className="h-4 w-4 mr-1" /> My Requests ({mine.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="inbox" className="mt-4">
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : renderTable(inbox, "inbox")}
          </TabsContent>
          <TabsContent value="mine" className="mt-4">
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : renderTable(mine, "mine")}
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="text-xs text-slate-600">
          <b>Tip:</b> Configure approval thresholds in <a href="/setup" className="underline">Company Setup → Approval Hierarchy</a>.
          Requests skip levels with no matching threshold, and any user with the <code>admin</code> or <code>super_admin</code> role can override at any level.
        </div>
      </Card>

      <Dialog open={!!decideOn} onOpenChange={(o) => !o && setDecideOn(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{decideOn?.action} — {decideOn?.req.reference_number || decideOn?.req.module}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-slate-600">
              {decideOn?.req.description || "No description provided."}
              <div className="mt-1 text-xs text-slate-500">
                Amount {fmt(Number(decideOn?.req.amount ?? 0), decideOn?.req.currency || "ZMW")} · Level {decideOn?.req.current_level}/{decideOn?.req.max_level}
              </div>
            </div>
            <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDecideOn(null)}>Close</Button>
            <Button onClick={doDecision}
              className={decideOn?.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}>
              Confirm {decideOn?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
