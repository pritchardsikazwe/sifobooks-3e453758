import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Building2, Search, Archive, ArchiveRestore, Trash2, Loader2, ShieldAlert, Users2, Layers, ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SifoStatusBadge } from "@/components/sifo/SifoStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  listManagedCompanies, fetchCompanyInventory, archiveCompany, restoreCompany, deleteCompany,
  summariseInventory, isEmptyCompany, deleteBlockedReason, canConfirmDelete,
  type ManagedCompany, type CompanyInventory,
} from "@/lib/company-lifecycle";

export const Route = createFileRoute("/_authenticated/companies")({
  head: () => ({
    meta: [
      { title: "Company Management — SifoBooks" },
      { name: "description", content: "Review, archive, restore or remove the companies you administer in SifoBooks." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CompanyManagementPage,
});

type Mode = "archive" | "restore" | "delete";

function CompanyManagementPage() {
  const [rows, setRows] = useState<ManagedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  const [target, setTarget] = useState<ManagedCompany | null>(null);
  const [mode, setMode] = useState<Mode>("archive");
  const [inventory, setInventory] = useState<CompanyInventory | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data: prof } = await supabase.from("profiles").select("active_company_id").eq("id", u.user.id).maybeSingle();
    setActiveCompanyId(prof?.active_company_id ?? null);
    try {
      setRows(await listManagedCompanies(u.user.id));
    } catch (e: any) {
      toast.error(e.message ?? "Could not load companies");
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) =>
      (statusFilter === "all" || r.status === statusFilter) &&
      (!term || `${r.name} ${r.trading_name ?? ""} ${r.country ?? ""}`.toLowerCase().includes(term)));
  }, [rows, q, statusFilter]);

  const openDialog = async (company: ManagedCompany, m: Mode) => {
    setTarget(company); setMode(m);
    setTypedName(""); setAcknowledged(false); setReason("");
    setInventory(null); setInventoryError(null);
    if (m === "restore") return;
    setInspecting(true);
    try {
      setInventory(await fetchCompanyInventory(company.id));
    } catch (e: any) {
      setInventoryError(e.message ?? "Could not inspect this company");
    }
    setInspecting(false);
  };

  const close = () => { setTarget(null); setInventory(null); };

  const run = async () => {
    if (!target) return;
    setBusy(true);
    try {
      if (mode === "archive") {
        await archiveCompany(target.id, reason.trim() || null);
        toast.success(`${target.name} archived — its records are preserved and read-only.`);
      } else if (mode === "restore") {
        await restoreCompany(target.id);
        toast.success(`${target.name} restored.`);
      } else {
        await deleteCompany(target.id, typedName.trim());
        toast.success(`${target.name} deleted permanently.`);
      }
      close();
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Action failed");
    }
    setBusy(false);
  };

  const summary = inventory ? summariseInventory(inventory) : [];
  const blockedReason = inventory ? deleteBlockedReason(inventory) : null;
  const deleteReady = canConfirmDelete({ inventory, typedName, acknowledged, authorised: !!target });

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-start gap-3">
        <Building2 className="h-6 w-6 text-[#0f4c5c]" />
        <div>
          <h1 className="text-2xl font-bold">Company Management</h1>
          <p className="text-sm text-muted-foreground">
            Only companies you own or administer are listed. Archiving keeps every record; deletion is only offered
            for companies with no financial or operational history.
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies…" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="py-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading companies…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No companies match this view.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{c.name}</span>
                    {c.trading_name && <span className="text-xs text-muted-foreground">t/a {c.trading_name}</span>}
                    <SifoStatusBadge status={c.status === "archived" ? "archived" : "active"} />
                    {c.id === activeCompanyId && <Badge variant="outline">Current workspace</Badge>}
                    {c.isOwner ? <Badge variant="outline">Owner</Badge> : <Badge variant="outline">Administrator</Badge>}
                    {c.subscription && <Badge variant="outline" className="capitalize">{c.subscription}</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span>Created {new Date(c.created_at).toLocaleDateString()}</span>
                    <span className="inline-flex items-center gap-1"><Users2 className="h-3 w-3" /> {c.members} authorised user(s)</span>
                    <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> {c.modules.length} module(s){c.modules.length ? `: ${c.modules.slice(0, 4).join(", ")}${c.modules.length > 4 ? "…" : ""}` : ""}</span>
                    <span>{c.country ?? "—"} · {c.base_currency ?? "ZMW"}</span>
                  </div>
                  {c.status === "archived" && (
                    <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                      Archived {c.archived_at ? new Date(c.archived_at).toLocaleString() : ""}
                      {c.archive_reason ? ` — ${c.archive_reason}` : ""}. Users cannot transact until it is restored.
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <Link to="/setup"><ExternalLink className="h-3.5 w-3.5" /> Open setup</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <Link to="/admin"><Users2 className="h-3.5 w-3.5" /> Manage users</Link>
                  </Button>
                  {c.status === "active" ? (
                    <>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => openDialog(c, "archive")}>
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-1 text-destructive hover:text-destructive"
                              onClick={() => openDialog(c, "delete")}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete…
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => openDialog(c, "restore")}>
                        <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-1 text-destructive hover:text-destructive"
                              onClick={() => openDialog(c, "delete")}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete…
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === "delete" ? <Trash2 className="h-4 w-4 text-destructive" />
                : mode === "archive" ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
              {mode === "delete" ? "Delete company permanently" : mode === "archive" ? "Archive company" : "Restore company"}
            </DialogTitle>
            <DialogDescription>
              {target && <>You are about to affect <strong>{target.name}</strong> (ID {target.id}).</>}
            </DialogDescription>
          </DialogHeader>

          {mode !== "restore" && (
            <div className="space-y-3">
              {inspecting ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking what this company holds…
                </div>
              ) : inventoryError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {inventoryError}
                </div>
              ) : inventory && (
                <>
                  <div className="rounded-md border p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      What this company holds
                    </div>
                    {summary.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No records at all — this company is empty.</div>
                    ) : (
                      <div className="space-y-2">
                        {summary.map((s) => (
                          <div key={s.category} className="text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{s.category}</span>
                              <span className={s.blocking ? "text-destructive font-semibold" : "text-muted-foreground"}>
                                {s.total} record(s){s.blocking ? ` · ${s.blocking} protected` : ""}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {s.rows.map((r) => `${r.table.replace(/_/g, " ")} (${r.count})`).join(" · ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {mode === "delete" && blockedReason && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 flex gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Deletion is not permitted</div>
                        <div>{blockedReason}</div>
                        <Button size="sm" variant="outline" className="mt-2 gap-1"
                                onClick={() => target && openDialog(target, "archive")}>
                          <Archive className="h-3.5 w-3.5" /> Archive instead
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {mode === "archive" && (
            <div className="space-y-3">
              <div className="rounded-md border p-3 text-sm">
                Archiving keeps every transaction, report and audit record. People will no longer be able to open the
                company or record new activity until it is restored.
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reason (recorded in the audit trail)</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Business closed / created in error" />
              </div>
            </div>
          )}

          {mode === "restore" && (
            <div className="rounded-md border p-3 text-sm">
              Restoring makes this company active again so authorised people can open it and record activity. No balances
              or historical records change.
            </div>
          )}

          {mode === "delete" && inventory && isEmptyCompany(inventory) && (
            <div className="space-y-3">
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                This permanently removes the company and its remaining setup records. It cannot be undone.
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type the company name exactly: <strong>{inventory.company_name}</strong></Label>
                <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder={inventory.company_name} />
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={acknowledged} onCheckedChange={(v) => setAcknowledged(v === true)} />
                <span>I understand this deletion is permanent and cannot be reversed.</span>
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
            {mode === "delete" ? (
              <Button variant="destructive" onClick={run} disabled={busy || !deleteReady} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete permanently
              </Button>
            ) : (
              <Button onClick={run} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" />
                  : mode === "archive" ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                {mode === "archive" ? "Archive company" : "Restore company"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
