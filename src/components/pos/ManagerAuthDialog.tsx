import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestManagerOverride } from "@/lib/staff.functions";

export type OverrideAction = "pos.refund" | "pos.void" | "pos.discount" | "prices.manage";
const LABEL: Record<OverrideAction, string> = {
  "pos.refund": "Refund", "pos.void": "Void sale", "pos.discount": "Discount", "prices.manage": "Change price",
};

/**
 * Cashier-side prompt: a manager enters their email + PIN to authorise one
 * restricted action. The authorisation is verified and recorded server-side and
 * expires after 5 minutes; the database guards honour it.
 */
export function ManagerAuthDialog({ action, entityId, open, onOpenChange, onAuthorised }: {
  action: OverrideAction; entityId?: string | null; open: boolean; onOpenChange: (o: boolean) => void; onAuthorised: () => void | Promise<void>;
}) {
  const request = useServerFn(requestManagerOverride);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await request({ data: { manager_email: email, manager_pin: pin, action, entity_id: entityId ?? null } });
      toast.success("Authorised by manager");
      setPin("");
      onOpenChange(false);
      await onAuthorised();
    } catch (e: any) {
      toast.error(e?.message ?? "Authorisation failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" /> Manager authorisation</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground"><b>{LABEL[action]}</b> needs a manager. Ask a manager to enter their email and PIN.</p>
        <div className="grid gap-3">
          <div><Label>Manager email</Label><Input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Manager PIN</Label><Input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} onKeyDown={(e) => e.key === "Enter" && submit()} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !email || pin.length < 4}>{busy ? "Checking…" : "Authorise"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
