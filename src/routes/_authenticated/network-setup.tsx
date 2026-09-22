import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Server, Monitor, Wifi, ShieldCheck, CheckCircle2, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/network-setup")({
  head: () => ({ meta: [{ title: "Network Setup — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: NetworkSetupPage,
});

type Mode = "server" | "pos";
type Form = {
  mode: Mode;
  serverHost: string;
  serverPort: string;
  serverName: string;
  serverUrl: string;
  stationCode: string;
  stationName: string;
  stationType: string;
  assignedRole: string;
  zraEnvironment: string;
  zraBranchCode: string;
  zraDeviceId: string;
  zraSdcId: string;
  zraDeviceSerial: string;
  vsdcEndpoint: string;
};

const initial: Form = {
  mode: "server",
  serverHost: "0.0.0.0",
  serverPort: "3000",
  serverName: "SifoBooks Server",
  serverUrl: "http://192.168.1.100:3000",
  stationCode: "POS-01",
  stationName: "Front Counter 1",
  stationType: "pos",
  assignedRole: "cashier",
  zraEnvironment: "production",
  zraBranchCode: "",
  zraDeviceId: "",
  zraSdcId: "",
  zraDeviceSerial: "",
  vsdcEndpoint: "http://127.0.0.1:8080",
};

function NetworkSetupPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/network/info").then(r => r.ok ? r.json() : null).then(info => {
      if (!info) return;
      setForm(f => ({
        ...f,
        mode: info.mode === "server" ? "server" : f.mode,
        serverHost: info.host || f.serverHost,
        serverPort: String(info.port || f.serverPort),
        serverName: info.serverName || f.serverName,
        serverUrl: info.station?.server_url || f.serverUrl,
        stationCode: info.station?.station_code || f.stationCode,
        stationName: info.station?.station_name || f.stationName,
        stationType: info.station?.station_type || f.stationType,
        assignedRole: info.station?.assigned_role || f.assignedRole,
        zraEnvironment: info.zra?.environment || f.zraEnvironment,
        zraBranchCode: info.zra?.branchCode || f.zraBranchCode,
        zraDeviceId: info.zra?.deviceId || f.zraDeviceId,
        zraSdcId: info.zra?.sdcId || f.zraSdcId,
        zraDeviceSerial: info.zra?.deviceSerial || f.zraDeviceSerial,
        vsdcEndpoint: info.zra?.vsdcEndpoint || f.vsdcEndpoint,
      }));
    }).catch(() => {});
  }, []);

  const set = (key: keyof Form, value: string) => setForm(f => ({ ...f, [key]: value }));

  const save = async () => {
    if (form.mode === "pos" && !form.stationCode.trim()) return toast.error("Station code is required");
    if (form.mode === "pos" && !form.serverUrl.trim()) return toast.error("Server URL is required");
    setSaving(true);
    try {
      const res = await fetch("/api/network/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: form.mode === "server" ? "network" : "pos",
          server: { host: form.serverHost, port: Number(form.serverPort) || 3000, display_name: form.serverName },
          client: { server_url: form.serverUrl, station_code: form.stationCode.toUpperCase(), station_name: form.stationName, station_type: form.stationType, assigned_role: form.assignedRole },
          zra: { environment: form.zraEnvironment, branch_code: form.zraBranchCode, device_id: form.zraDeviceId, sdc_id: form.zraSdcId, device_serial: form.zraDeviceSerial, vsdc_endpoint: form.vsdcEndpoint },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save network configuration");
      setSaved(true);
      toast.success("Network configuration saved");
    } catch (e: any) {
      toast.error(e.message || "Could not save configuration");
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step === 1 && !form.mode) return;
    setStep(s => Math.min(4, s + 1));
  };

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Wifi className="h-7 w-7 text-[#0f4c5c]" />
          <div>
            <h1 className="text-2xl font-bold">Network Setup</h1>
            <p className="text-sm text-muted-foreground">Configure the SifoBooks server, POS station and ZRA/VSDC identity without editing files.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          {["Deployment", "Server / POS", "ZRA / VSDC", "Review"].map((label, i) => (
            <div key={label} className={`flex-1 rounded-lg border p-3 text-xs ${step === i + 1 ? "border-[#0f4c5c] bg-[#0f4c5c]/5" : ""}`}>
              <div className="font-semibold">{i + 1}. {label}</div>
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className={`p-6 cursor-pointer ${form.mode === "server" ? "border-[#0f4c5c] ring-1 ring-[#0f4c5c]" : ""}`} onClick={() => setForm(f => ({ ...f, mode: "server" }))}>
            <Server className="h-10 w-10 text-[#0f4c5c] mb-4" />
            <h2 className="font-semibold text-lg">Server / Main Computer</h2>
            <p className="text-sm text-muted-foreground mt-2">Hosts the central SifoBooks database and serves all POS stations over the LAN.</p>
          </Card>
          <Card className={`p-6 cursor-pointer ${form.mode === "pos" ? "border-[#0f4c5c] ring-1 ring-[#0f4c5c]" : ""}`} onClick={() => setForm(f => ({ ...f, mode: "pos" }))}>
            <Monitor className="h-10 w-10 text-[#0f4c5c] mb-4" />
            <h2 className="font-semibold text-lg">POS Station</h2>
            <p className="text-sm text-muted-foreground mt-2">Connects this computer to the central SifoBooks server as POS-01, POS-02, POS-03, etc.</p>
          </Card>
        </div>
      )}

      {step === 2 && (
        <Card className="p-6 space-y-5">
          {form.mode === "server" ? (
            <>
              <h2 className="font-semibold text-lg">Server Configuration</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div><Label>Listen address</Label><Input value={form.serverHost} onChange={e => set("serverHost", e.target.value)} /></div>
                <div><Label>Port</Label><Input value={form.serverPort} onChange={e => set("serverPort", e.target.value)} /></div>
                <div><Label>Server name</Label><Input value={form.serverName} onChange={e => set("serverName", e.target.value)} /></div>
              </div>
              <div className="rounded-lg bg-muted p-4 text-sm">Recommended: use a fixed LAN IP for this PC and allow TCP port 3000 through Windows Firewall on the private network.</div>
            </>
          ) : (
            <>
              <h2 className="font-semibold text-lg">POS Station</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>SifoBooks Server URL</Label><Input value={form.serverUrl} onChange={e => set("serverUrl", e.target.value)} placeholder="http://192.168.1.100:3000" /></div>
                <div><Label>Station ID</Label><Input value={form.stationCode} onChange={e => set("stationCode", e.target.value.toUpperCase())} placeholder="POS-01" /></div>
                <div><Label>Station name</Label><Input value={form.stationName} onChange={e => set("stationName", e.target.value)} placeholder="Front Counter 1" /></div>
                <div><Label>Assigned role</Label><Select value={form.assignedRole} onValueChange={v => set("assignedRole", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cashier">Cashier</SelectItem><SelectItem value="supervisor">Supervisor</SelectItem><SelectItem value="manager">Manager</SelectItem></SelectContent></Select></div>
              </div>
              <div className="rounded-lg bg-muted p-4 text-sm">Use a unique station ID for every POS: POS-01, POS-02, POS-03. All stations use the central server database.</div>
            </>
          )}
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 space-y-5">
          <div className="flex items-start gap-3"><ShieldCheck className="h-6 w-6 text-[#0f4c5c]" /><div><h2 className="font-semibold text-lg">ZRA Smart Invoice / VSDC</h2><p className="text-sm text-muted-foreground">Enter only identifiers issued/registered by ZRA. SifoBooks will retain them against the station and fiscal transactions.</p></div></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Environment</Label><Select value={form.zraEnvironment} onValueChange={v => set("zraEnvironment", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="production">Production</SelectItem><SelectItem value="test">Test</SelectItem></SelectContent></Select></div>
            <div><Label>ZRA Branch Code</Label><Input value={form.zraBranchCode} onChange={e => set("zraBranchCode", e.target.value)} /></div>
            <div><Label>ZRA Device ID</Label><Input value={form.zraDeviceId} onChange={e => set("zraDeviceId", e.target.value)} /></div>
            <div><Label>SDC ID</Label><Input value={form.zraSdcId} onChange={e => set("zraSdcId", e.target.value)} /></div>
            <div><Label>Device Serial Number</Label><Input value={form.zraDeviceSerial} onChange={e => set("zraDeviceSerial", e.target.value)} /></div>
            <div><Label>VSDC Endpoint</Label><Input value={form.vsdcEndpoint} onChange={e => set("vsdcEndpoint", e.target.value)} placeholder="http://127.0.0.1:8080" /></div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">Do not enter invented device identifiers. ZRA/VSDC configuration should match the client's registered Smart Invoice setup.</div>
        </Card>
      )}

      {step === 4 && (
        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-lg">Review & Apply</h2>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Deployment:</span> <b>{form.mode === "server" ? "Network Server" : "POS Station"}</b></div>
            <div><span className="text-muted-foreground">Station:</span> <b>{form.stationCode || "—"}</b></div>
            <div><span className="text-muted-foreground">Server:</span> <b>{form.serverUrl}</b></div>
            <div><span className="text-muted-foreground">Role:</span> <b className="capitalize">{form.assignedRole}</b></div>
            <div><span className="text-muted-foreground">ZRA Environment:</span> <b>{form.zraEnvironment}</b></div>
            <div><span className="text-muted-foreground">ZRA Device ID:</span> <b>{form.zraDeviceId || "Not entered"}</b></div>
            <div><span className="text-muted-foreground">SDC ID:</span> <b>{form.zraSdcId || "Not entered"}</b></div>
            <div><span className="text-muted-foreground">VSDC:</span> <b>{form.vsdcEndpoint}</b></div>
          </div>
          {saved && <div className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-5 w-5" /> Configuration saved.</div>}
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
        {step < 4 ? <Button onClick={next} className="bg-[#0f4c5c] hover:bg-[#0c3f4c]">Next<ChevronRight className="h-4 w-4 ml-1" /></Button> :
          <Button onClick={save} disabled={saving} className="bg-[#0f4c5c] hover:bg-[#0c3f4c]">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}Apply Configuration</Button>}
      </div>
    </div>
  );
}
