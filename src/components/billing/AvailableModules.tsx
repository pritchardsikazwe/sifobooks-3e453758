import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MODULE_CATALOG, addCatalogModule, loadEnabledCatalogModules, type CatalogModule } from "@/lib/module-catalog";

export function AvailableModules({ companyId, userId }: { companyId: string | null; userId: string }) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<CatalogModule | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (companyId) void loadEnabledCatalogModules(companyId).then(setEnabled); }, [companyId]);

  const add = async (m: CatalogModule) => {
    if (!companyId || !m.moduleKey) return toast.error("Set up your company first");
    setBusy(true);
    try {
      await addCatalogModule({ userId, companyId, moduleKey: m.moduleKey, extraKeys: m.extraKeys });
      setEnabled((s) => new Set(s).add(m.moduleKey!));
      toast.success(`${m.label} activated successfully`);
      setDetail(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not add module");
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="text-lg font-semibold">Add modules</div>
      <p className="text-sm text-muted-foreground">Add a module any time — no reinstall. It appears in your menus straight away.</p>
      <div className="mt-4 divide-y">
        {MODULE_CATALOG.map((m) => {
          const on = !!m.moduleKey && enabled.has(m.moduleKey);
          return (
            <div key={m.label} className="flex flex-wrap items-center gap-3 py-3">
              <span className="text-xl">{m.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.moduleKey ? "Price on request" : "Not yet available"}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setDetail(m)}>View Details</Button>
              {on ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary"><Check className="h-4 w-4" /> Active</span>
              ) : (
                <Button size="sm" variant="outline" disabled={!m.moduleKey} onClick={() => setDetail(m)}>Add Module</Button>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {detail?.label}</DialogTitle>
            <DialogDescription>This will enable:</DialogDescription>
          </DialogHeader>
          <ul className="space-y-1 text-sm">{detail?.includes.map((i) => <li key={i} className="flex gap-2"><Check className="h-4 w-4 text-primary" />{i}</li>)}</ul>
          <DialogFooter>
            {detail?.moduleKey && !enabled.has(detail.moduleKey) ? (
              <Button onClick={() => detail && add(detail)} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Activate module
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
