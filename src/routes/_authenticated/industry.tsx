import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  INDUSTRY_SOLUTIONS, getSolution, loadIndustryState, isFeatureOn,
  setFeature, applyIndustrySolution, type IndustrySolution,
} from "@/lib/industry-solutions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, Clock, Layers, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/industry")({
  head: () => ({
    meta: [
      { title: "Industry & Business — SifoBooks" },
      { name: "description", content: "Configure your business type, industry solution and industry features." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IndustryPage,
});

function IndustryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [solutionId, setSolutionId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [switchTo, setSwitchTo] = useState<IndustrySolution | null>(null);

  useEffect(() => {
    (async () => {
      const s = await loadIndustryState();
      setUserId(s.userId); setCompanyId(s.companyId);
      setSolutionId(getSolution(s.solutionId)?.id ?? "general");
      setOverrides(s.overrides);
      setLoading(false);
    })();
  }, []);

  const current = useMemo(() => getSolution(solutionId) ?? INDUSTRY_SOLUTIONS[0], [solutionId]);

  const toggleFeature = async (key: string, next: boolean) => {
    if (!userId || !companyId) { toast.error("No active company"); return; }
    setBusy(key);
    setOverrides(p => ({ ...p, [key]: next }));
    try {
      await setFeature({ userId, companyId, key, enabled: next });
    } catch (e: any) {
      setOverrides(p => ({ ...p, [key]: !next }));
      toast.error(e.message ?? "Could not update feature");
    } finally { setBusy(null); }
  };

  const confirmSwitch = async () => {
    if (!switchTo || !userId || !companyId) return;
    setBusy("switch");
    try {
      const res = await applyIndustrySolution({ userId, companyId, solutionId: switchTo.id });
      setSolutionId(switchTo.id);
      toast.success(`${switchTo.label} is now your industry solution`, {
        description: res.coa_added ? `${res.coa_added} account(s) added. No existing data was changed.` : "No existing data was changed.",
      });
      setSwitchTo(null);
    } catch (e: any) {
      toast.error(e.message ?? "Could not switch industry");
    } finally { setBusy(null); }
  };

  if (loading) {
    return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading business configuration…</div>;
  }

  return (
    <div className="px-6 py-6 max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Industry &amp; Business
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            SifoBooks is one complete platform. Business suites are always available — your industry
            solution simply configures the workspace, workflows, accounts and terminology around them.
          </p>
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/setup">Back to Setup</Link></Button>
      </div>

      {/* Current industry */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription>Current industry</CardDescription>
              <CardTitle className="text-xl flex items-center gap-2 mt-1">
                <span>{current.emoji}</span> {current.label}
                <Badge className="bg-emerald-600 hover:bg-emerald-600">ACTIVE</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{current.tagline}</p>
            </div>
            {current.landing !== "/dashboard" && (
              <Button size="sm" onClick={() => navigate({ to: current.landing })}>Open workspace</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Active business suites</div>
          <div className="flex flex-wrap gap-2">
            {current.suites.map(s => (
              <span key={s} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-sm">
                <Layers className="h-3.5 w-3.5 text-primary" /> {s}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Industry features */}
      {current.features.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{current.label} features</CardTitle>
            <CardDescription>Turn industry functionality on or off. Nothing is installed or removed — your data always stays.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {current.features.map(f => {
                const on = isFeatureOn(current, f.key, overrides);
                return (
                  <div key={f.key} className="flex items-center justify-between gap-3 py-2.5 border-b last:border-b-0">
                    <span className="text-sm font-medium">{f.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${on ? "text-emerald-600" : "text-muted-foreground"}`}>{on ? "ON" : "OFF"}</span>
                      <Switch checked={on} disabled={busy === f.key} onCheckedChange={v => toggleFeature(f.key, v)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other solutions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Other industry solutions</CardTitle>
          <CardDescription>Available solutions can be switched to at any time. Switching never deletes company data.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INDUSTRY_SOLUTIONS.filter(s => s.id !== "other").map(s => {
              const isCurrent = s.id === current.id;
              const soon = s.status === "coming_soon";
              return (
                <div key={s.id} className={`rounded-xl border p-4 ${isCurrent ? "ring-1 ring-emerald-500/40 bg-emerald-500/5" : soon ? "opacity-80" : "bg-card"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span>{s.emoji}</span>
                        <span className="font-semibold truncate">{s.label}</span>
                        {isCurrent ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
                        ) : soon ? (
                          <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Coming Soon</Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-300"><CheckCircle2 className="h-3 w-3" /> Available</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.tagline}</p>
                      <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{s.areas.join(" · ")}</p>
                    </div>
                    {!isCurrent && !soon && (
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => setSwitchTo(s)}>Switch</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!switchTo} onOpenChange={o => !o && setSwitchTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to {switchTo?.label}?</DialogTitle>
            <DialogDescription>
              This changes your workspace configuration only — sidebar, dashboard, workflows and
              terminology. Existing transactions, accounts, customers, inventory and reports are
              never deleted. Missing industry accounts will be added to your chart of accounts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSwitchTo(null)}>Cancel</Button>
            <Button onClick={confirmSwitch} disabled={busy === "switch"}>
              {busy === "switch" && <Loader2 className="h-4 w-4 animate-spin" />} Switch industry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
