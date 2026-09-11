/**
 * Company Profile → Administrator Email.
 *
 * Shows the CURRENT administrator identity of the company (resolved from the
 * company owner / membership, never a hardcoded address) and lets an
 * authorised owner or administrator replace it. Everything destructive is
 * re-authorised and audited on the server.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Loader2, Mail, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getCompanyAdministrator,
  replaceCompanyAdministratorEmail,
  type CompanyAdministrator,
} from "@/lib/company-admin.functions";
import { canSubmitAdminReplacement, validateAdminReplacement, isSelfHandover } from "@/lib/company-admin";

export function AdministratorEmailCard({ companyId, companyName }: { companyId: string; companyName: string }) {
  const load = useServerFn(getCompanyAdministrator);
  const replace = useServerFn(replaceCompanyAdministratorEmail);

  const [state, setState] = useState<CompanyAdministrator | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);
  const [actorId, setActorId] = useState<string>("");

  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [typedName, setTypedName] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setDenied(null);
    const { data: u } = await supabase.auth.getUser();
    setActorId(u.user?.id ?? "");
    try {
      setState(await load({ data: { companyId } }));
    } catch (e: any) {
      setDenied(e?.message ?? "You are not authorised to view the administrator of this company");
      setState(null);
    }
    setLoading(false);
  };
  useEffect(() => { if (companyId) refresh(); /* eslint-disable-next-line */ }, [companyId]);

  const reset = () => { setNewEmail(""); setConfirmEmail(""); setTypedName(""); setAcknowledged(false); };

  const problem = validateAdminReplacement({
    currentEmail: state?.adminEmail ?? null, newEmail, confirmedEmail: confirmEmail, acknowledged,
  });
  const nameOk = typedName.trim() === companyName.trim();
  const ready = canSubmitAdminReplacement({
    currentEmail: state?.adminEmail ?? null, newEmail, confirmedEmail: confirmEmail,
    acknowledged, authorised: !!state,
  }) && nameOk;

  const handover = state ? isSelfHandover({ actorUserId: actorId, currentAdminUserId: state.adminUserId, isSuperAdmin: false }) : false;

  const submit = async () => {
    setBusy(true);
    try {
      const res = await replace({ data: { companyId, newEmail, confirmCompanyName: typedName.trim() } });
      toast.success(
        res.invited
          ? `${res.newAdminEmail} is now the administrator — an invitation was sent so they can claim the account.`
          : `${res.newAdminEmail} is now the administrator of ${companyName}.`,
      );
      setOpen(false); reset();
      await refresh();
      if (res.selfHandover) {
        toast.message("You handed over your own administrator access — you may lose access to this company.");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "The administrator could not be changed");
    }
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Administrator Email</CardTitle>
        <CardDescription>
          The single sign-in identity that administers this company. Replacing it transfers administration to the new
          address — the old one stops being an administrator of this company.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking…</div>
        ) : denied ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {denied}
          </div>
        ) : state ? (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{state.adminEmail ?? "Not set"}</span>
              {state.adminName && <span className="text-xs text-muted-foreground">{state.adminName}</span>}
              {state.pendingClaim && <Badge variant="outline">Invitation pending</Badge>}
              <div className="ml-auto">
                <Button size="sm" variant="outline" onClick={() => { reset(); setOpen(true); }}>Change / Replace</Button>
              </div>
            </div>
            {state.contactEmail && state.contactEmail.toLowerCase() !== (state.adminEmail ?? "").toLowerCase() && (
              <p className="text-xs text-muted-foreground">
                Public contact email on documents is {state.contactEmail} — that is a separate field above.
              </p>
            )}
          </>
        ) : null}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Replace the company administrator</DialogTitle>
            <DialogDescription>
              {state?.adminEmail ?? "The current administrator"} will no longer administer <strong>{companyName}</strong>.
              All company records, users, transactions and settings stay exactly as they are.
            </DialogDescription>
          </DialogHeader>

          {handover && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>You are handing over your own administrator access. You will lose administration of this company.</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">New administrator email</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="owner@company.co.zm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Confirm the new email</Label>
              <Input type="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type the company name exactly: <strong>{companyName}</strong></Label>
              <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder={companyName} />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={acknowledged} onCheckedChange={(v) => setAcknowledged(v === true)} />
              <span>I understand the current administrator is being replaced.</span>
            </label>
            <p className="text-xs text-muted-foreground">
              If the new address has no account yet, an invitation is sent so the person can securely set their own
              password. Nothing about the company is duplicated or reset.
            </p>
            {(problem || (!nameOk && typedName)) && (
              <p className="text-xs text-destructive">{problem ?? "The company name does not match"}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy || !ready} className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Replace administrator
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
