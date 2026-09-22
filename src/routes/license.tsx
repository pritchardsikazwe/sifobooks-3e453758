import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Clock3, Monitor, Copy, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/license")({
  head: () => ({ meta: [{ title: "SifoBooks Licence Activation" }, { name: "robots", content: "noindex" }] }),
  component: LicensePage,
});

function LicensePage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [trialDays, setTrialDays] = useState("30");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch("/api/license/status");
    setStatus(await res.json());
  };

  useEffect(() => { load().catch(() => {}); }, []);

  const activate = async () => {
    if (!token.trim()) return toast.error("Enter the SifoBooks licence key");
    setBusy(true);
    try {
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Activation failed");
      toast.success("SifoBooks licence activated");
      await load();
      setTimeout(() => window.location.href = "/", 500);
    } catch (e: any) {
      toast.error(e.message || "Activation failed");
    } finally { setBusy(false); }
  };

  const copyFingerprint = async () => {
    if (!status?.device_fingerprint) return;
    await navigator.clipboard.writeText(status.device_fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Device fingerprint copied");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-5">
        <div className="text-center">
          <KeyRound className="mx-auto h-10 w-10 text-[#0f4c5c]" />
          <h1 className="text-3xl font-bold mt-3">SifoBooks Licence</h1>
          <p className="text-muted-foreground mt-2">Activate your SifoBooks edition to continue.</p>
        </div>

        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div><div className="font-semibold">Current status</div><div className="text-sm text-muted-foreground">{status?.status === "active" ? "Licensed" : "Unlicensed"}</div></div>
            <ShieldCheck className="h-6 w-6 text-[#0f4c5c]" />
          </div>

          {status?.license && (
            <div className="grid grid-cols-2 gap-3 text-sm rounded-lg bg-muted p-4">
              <div>Customer<br/><b>{status.license.customer}</b></div>
              <div>Edition<br/><b className="capitalize">{status.license.edition}</b></div>
              <div>Type<br/><b className="capitalize">{status.license.type}</b></div>
              <div>Expiry<br/><b>{status.license.expires_at ? new Date(status.license.expires_at).toLocaleDateString() : "Never"}</b></div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Licence key</label>
            <Input value={token} onChange={e => setToken(e.target.value)} placeholder="Paste your SifoBooks licence key here" className="font-mono text-xs" />
            <Button onClick={activate} disabled={busy} className="w-full bg-[#0f4c5c] hover:bg-[#0c3f4c]">
              <KeyRound className="h-4 w-4 mr-2" /> Activate Licence
            </Button>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 font-semibold"><Clock3 className="h-4 w-4" /> Demo / Trial</div>
            <p className="text-sm text-muted-foreground mt-1">Ask Sifonet Technologies for a trial key. Your trial can be issued for 14 or 30 days and tied to this computer.</p>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <Input value={trialDays} onChange={e => setTrialDays(e.target.value)} type="number" min="1" max="90" />
              <Button variant="outline" onClick={copyFingerprint}><Monitor className="h-4 w-4 mr-2" />{copied ? "Copied" : "Device ID"}</Button>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground">SifoBooks — Sifonet Technologies</p>
      </div>
    </div>
  );
}
