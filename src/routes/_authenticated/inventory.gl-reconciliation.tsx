import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SifoModuleHeader } from "@/components/sifo/SifoModuleHeader";
import { InventoryGLReconciliation } from "@/components/sifo/InventoryGLReconciliation";

export const Route = createFileRoute("/_authenticated/inventory/gl-reconciliation")({
  head: () => ({ meta: [{ title: "Inventory → GL Reconciliation — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: InventoryGLReconciliationPage,
});

function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

function InventoryGLReconciliationPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-4 p-6">
      <SifoModuleHeader
        module="inventory"
        title="Inventory → GL reconciliation"
        description="Reconcile inventory movement value against the general ledger, with period controls and audit coverage."
        icon={Scale}
        actions={<Button asChild variant="outline" size="sm"><Link to="/inventory/reconciliation"><ArrowLeft className="mr-1.5 h-4 w-4" />Stock reconciliation</Link></Button>}
      />
      <div className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
        <label className="space-y-1 text-sm"><span className="block text-xs text-muted-foreground">From</span><input className="h-9 rounded-md border bg-background px-3" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="space-y-1 text-sm"><span className="block text-xs text-muted-foreground">To</span><input className="h-9 rounded-md border bg-background px-3" type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      </div>
      <InventoryGLReconciliation from={from} to={to} />
    </div>
  );
}
