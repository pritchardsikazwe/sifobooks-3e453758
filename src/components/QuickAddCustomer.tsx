import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  onCreated: (customer: { id: string; name: string; tpin: string | null; payment_terms_days: number }) => void;
  trigger?: React.ReactNode;
  /** Controlled mode: lets a selector own the "create new" secondary action. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function QuickAddCustomer({ onCreated, trigger, open: openProp, onOpenChange }: Props) {
  const [openState, setOpenState] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const setOpen = (v: boolean) => { if (!controlled) setOpenState(v); onOpenChange?.(v); };
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", tpin: "", payment_terms_days: 30 });

  const save = async () => {
    if (!f.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return toast.error("Not signed in"); }
    const { data, error } = await supabase.from("customers").insert({
      user_id: u.user.id, name: f.name.trim(), email: f.email || null, phone: f.phone || null,
      tpin: f.tpin || null, payment_terms_days: Number(f.payment_terms_days) || 30, active: true,
    }).select("id, name, tpin, payment_terms_days").single();
    setSaving(false);
    if (error || !data) return toast.error(error?.message ?? "Failed");
    toast.success(`${data.name} added`);
    setOpen(false);
    setF({ name: "", email: "", phone: "", tpin: "", payment_terms_days: 30 });
    onCreated(data as any);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!controlled && (
        <DialogTrigger asChild>
          {trigger ?? <Button type="button" variant="outline" size="sm"><UserPlus className="h-4 w-4 mr-1" />New customer</Button>}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader><DialogTitle>New customer</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1"><Label>Name *</Label><Input autoFocus value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>TPIN</Label><Input value={f.tpin} onChange={e => setF({ ...f, tpin: e.target.value })} /></div>
            <div className="space-y-1"><Label>Payment terms (days)</Label><Input type="number" value={f.payment_terms_days} onChange={e => setF({ ...f, payment_terms_days: Number(e.target.value) })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save & use</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
