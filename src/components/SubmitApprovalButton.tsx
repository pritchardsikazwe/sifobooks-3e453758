import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { submitForApproval, type ApprovalModule } from "@/lib/approvals";
import { toast } from "sonner";

export function SubmitApprovalButton(props: {
  module: ApprovalModule;
  referenceType: string;
  referenceId?: string;
  referenceNumber?: string;
  amount: number;
  currency?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  className?: string;
  label?: string;
  onSubmitted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await submitForApproval({
        module: props.module,
        referenceType: props.referenceType,
        referenceId: props.referenceId,
        referenceNumber: props.referenceNumber,
        amount: props.amount,
        currency: props.currency,
        description: note || `${props.referenceType} ${props.referenceNumber ?? ""}`.trim(),
      });
      toast.success("Sent for approval");
      setOpen(false); setNote("");
      props.onSubmitted?.();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <Button size={props.size ?? "sm"} variant={props.variant ?? "outline"} className={props.className} onClick={() => setOpen(true)}>
        <Send className="h-4 w-4 mr-1" /> {props.label ?? "Submit for approval"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request approval</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="text-slate-600">
              {props.referenceType} <b>{props.referenceNumber ?? ""}</b> · Amount {props.amount.toLocaleString()} {props.currency ?? "ZMW"}
            </div>
            <Textarea placeholder="Reason / justification (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
