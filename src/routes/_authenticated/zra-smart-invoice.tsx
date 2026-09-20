import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Database, KeyRound, RefreshCw, Server, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  zraGetConfigFn,
  zraGetStandardCodesFn,
  zraInitializeDeviceFn,
  zraSaveConfigFn,
} from "@/lib/zra/server";

export const Route = createFileRoute("/_authenticated/zra-smart-invoice")({
  head: () => ({
    meta: [
      { title: "ZRA Smart Invoice — SifoBooks" },
      { name: "description", content: "Configure and monitor the ZRA Smart Invoice VSDC connection for SifoBooks." },
    ],
  }),
  component: ZraSmartInvoicePage,
});

type Config = {
  id?: string;
  mode?: string;
  taxpayer_name?: string;
  tpin?: string;
  branch_code?: string;
  device_serial?: string;
  vsdc_endpoint?: string;
  last_verified_at?: string;
  notes?: string;
};

function ZraSmartInvoicePage() {
  const [userId, setUserId] = useState("");
  const [config, setConfig] = useState<Config>({});
  const [form, setForm] = useState<Config>({
    mode: "test",
    vsdc_endpoint: "http://127.0.0.1:8080/zrasmartinvoice",
  });
  const [stats, setStats] = useState({ pending: 0, submitted: 0, failed: 0, total: 0 });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async (uid: string) => {
    const result = await zraGetConfigFn({ data: { userId: uid } });
    const saved = (result as any)?.data ?? {};
    setConfig(saved);
    setForm((old) => ({ ...old, ...saved }));
    const { data: queue } = await supabase
      .from("zra_invoice_queue")
      .select("status")
      .eq("user_id", uid);
    const rows = queue ?? [];
    setStats({
      total: rows.length,
      pending: rows.filter((x: any) => ["pending", "submitting"].includes(x.status)).length,
      submitted: rows.filter((x: any) => x.status === "submitted").length,
      failed: rows.filter((x: any) => x.status === "failed").length,
    });
  };

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUserId(data.user.id);
      await load(data.user.id);
    })();
  }, []);

  const update = (key: keyof Config, value: string) => setForm((old) => ({ ...old, [key]: value }));

  const save = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      await zraSaveConfigFn({
        data: {
          userId,
          mode: form.mode,
          taxpayerName: form.taxpayer_name,
          tpin: form.tpin,
          branchCode: form.branch_code,
          deviceSerial: form.device_serial,
          vsdcEndpoint: form.vsdc_endpoint,
          notes: form.notes,
        },
      });
      await load(userId);
      toast.success("ZRA Smart Invoice configuration saved");
    } catch (e: any) {
      toast.error(e?.message || "Could not save ZRA configuration");
    } finally {
      setBusy(false);
    }
  };

  const initialize = async () => {
    if (!userId || !form.tpin || !form.branch_code || !form.device_serial) {
      toast.error("Enter TPIN, Branch ID and Device Serial first.");
      return;
    }
    setBusy(true);
    setMessage("Initializing the VSDC device...");
    try {
      const result: any = await zraInitializeDeviceFn({
        data: {
          userId,
          tpin: form.tpin,
          bhfId: form.branch_code,
          dvcSrlNo: form.device_serial,
        },
      });
      if (result?.resultCd === "000") {
        setMessage("VSDC initialized successfully.");
        toast.success("ZRA VSDC initialized");
        await load(userId);
      } else {
        setMessage(result?.resultMsg || "VSDC returned an unsuccessful result.");
        toast.error(result?.resultMsg || "VSDC initialization failed");
      }
    } catch (e: any) {
      setMessage(e?.message || "Could not reach the VSDC.");
      toast.error(e?.message || "Could not reach the VSDC");
    } finally {
      setBusy(false);
    }
  };

  const syncCodes = async () => {
    if (!userId || !form.tpin || !form.branch_code) {
      toast.error("Enter TPIN and Branch ID first.");
      return;
    }
    setBusy(true);
    try {
      const result: any = await zraGetStandardCodesFn({
        data: {
          userId,
          tpin: form.tpin,
          bhfId: form.branch_code,
          lastReqDt: "2010-01-01 00:00:00",
        },
      });
      if (result?.resultCd === "000") {
        toast.success("ZRA standard codes synchronized");
        setMessage("Standard codes synchronized from VSDC.");
      } else {
        toast.error(result?.resultMsg || "Code synchronization failed");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not synchronize codes");
    } finally {
      setBusy(false);
    }
  };

  const status = config.mode === "initialized" ? "connected" : config.mode === "test" ? "test" : "not_configured";

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">ZRA Smart Invoice</h1>
          <p className="text-sm text-muted-foreground">Connect SifoBooks to the ZRA VSDC running on this Windows Server.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => userId && load(userId)} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={save} disabled={busy}>
            Save configuration
          </Button>
        </div>
      </div>

      <Card className={`flex flex-wrap items-center gap-4 rounded-xl border p-4 ${status === "connected" ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${status === "connected" ? "bg-emerald-600" : "bg-amber-500"} text-white`}>
          {status === "connected" ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{status === "connected" ? "ZRA VSDC initialized" : status === "test" ? "VSDC configured — not initialized" : "ZRA VSDC not configured"}</div>
          <div className="truncate text-xs text-muted-foreground">{form.vsdc_endpoint || "No VSDC endpoint"}{config.last_verified_at ? ` · verified ${config.last_verified_at}` : ""}</div>
        </div>
        <Badge className={status === "connected" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{status}</Badge>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total", stats.total, Database],
          ["Submitted", stats.submitted, CheckCircle2],
          ["Pending", stats.pending, Server],
          ["Failed", stats.failed, CircleAlert],
        ].map(([label, value, Icon]: any) => (
          <Card key={label} className="rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{label}</div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="rounded-xl p-5">
          <div className="mb-5 flex items-center gap-2">
            <Server className="h-5 w-5" />
            <div>
              <h2 className="font-semibold">VSDC Connection</h2>
              <p className="text-xs text-muted-foreground">The Java/Tomcat VSDC remains separate from SifoBooks.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Environment</Label><Select value={form.mode || "test"} onValueChange={(v) => update("mode", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="test">TEST / UAT</SelectItem><SelectItem value="production">PRODUCTION</SelectItem></SelectContent></Select></div>
            <div><Label>VSDC Endpoint</Label><Input className="mt-1" value={form.vsdc_endpoint || ""} onChange={(e) => update("vsdc_endpoint", e.target.value)} placeholder="http://127.0.0.1:8080/zrasmartinvoice" /></div>
            <div><Label>TPIN</Label><Input className="mt-1" value={form.tpin || ""} onChange={(e) => update("tpin", e.target.value)} placeholder="ZRA TPIN" /></div>
            <div><Label>Branch ID</Label><Input className="mt-1" value={form.branch_code || ""} onChange={(e) => update("branch_code", e.target.value)} placeholder="000" /></div>
            <div><Label>Device Serial</Label><Input className="mt-1" value={form.device_serial || ""} onChange={(e) => update("device_serial", e.target.value)} placeholder="VSDC device serial" /></div>
            <div><Label>Taxpayer Name</Label><Input className="mt-1" value={form.taxpayer_name || ""} onChange={(e) => update("taxpayer_name", e.target.value)} placeholder="Registered taxpayer name" /></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={save} disabled={busy}>Save configuration</Button>
            <Button variant="outline" onClick={initialize} disabled={busy}><KeyRound className="mr-2 h-4 w-4" />Initialize Device</Button>
            <Button variant="outline" onClick={syncCodes} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" />Sync ZRA Codes</Button>
          </div>
          {message && <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">{message}</div>}
        </Card>

        <Card className="rounded-xl p-5">
          <h2 className="font-semibold">Windows Server Setup</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg border p-3"><strong>1. SifoBooks</strong><div className="text-muted-foreground">Runs locally on the server, normally on port 3000.</div></div>
            <div className="rounded-lg border p-3"><strong>2. Java 8</strong><div className="text-muted-foreground">Required by the ZRA VSDC package.</div></div>
            <div className="rounded-lg border p-3"><strong>3. Tomcat 9.x</strong><div className="text-muted-foreground">Deploy the ZRA-provided WAR into Tomcat.</div></div>
            <div className="rounded-lg border p-3"><strong>4. VSDC</strong><div className="text-muted-foreground">SifoBooks communicates with it using REST/JSON.</div></div>
            <div className="rounded-lg border p-3"><strong>5. ZRA</strong><div className="text-muted-foreground">VSDC communicates securely with ZRA.</div></div>
          </div>
        </Card>
      </div>

      <Card className="rounded-xl border-blue-200 bg-blue-50/50 p-4 text-sm">
        <strong>Production safety:</strong> Keep SifoBooks in TEST/UAT until the ZRA integration is approved. Do not place VSDC security keys in the browser or Git repository.
      </Card>
    </div>
  );
}
