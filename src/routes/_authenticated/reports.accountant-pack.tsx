import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileDown, Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateAccountantPack } from "@/lib/reports-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports/accountant-pack")({
  head: () => ({ meta: [{ title: "Accountant Pack (PDF) — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: AccountantPack,
});

function AccountantPack() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const last = today.toISOString().slice(0, 10);
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(last);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      await generateAccountantPack(from, to);
      toast.success("PDF generated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-semibold">Accountant Pack</h1>
          <p className="text-sm text-muted-foreground">Combined PDF of Profit &amp; Loss, Trial Balance, and Balance Sheet — ready to share.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Period</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div><Label>To (Balance Sheet as of)</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
          </div>
          <div className="text-xs text-muted-foreground">
            The P&amp;L covers only the selected period. Trial Balance and Balance Sheet include all posted entries up to the "To" date.
          </div>
          <Button onClick={download} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Download PDF pack
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
