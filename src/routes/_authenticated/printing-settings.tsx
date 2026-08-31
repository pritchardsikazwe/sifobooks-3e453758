import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Printer, RefreshCw, Wifi, WifiOff, CheckCircle2, AlertTriangle, Monitor, RotateCw, Trash2, Cloud,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  discoverAgent, discoverPrinters, fetchSystemDefaultPrinter, setSystemDefaultPrinter,
  getAdvancedSettings, saveAdvancedSettings, BROWSER_PRINTER,
  type AgentState, type DiscoveredPrinter, type AdvancedPrintSettings,
} from "@/services/printDiscovery";
import {
  JOB_TYPES, getRouting, saveRouting, getPreferences, savePreferences,
  pushRoutingToCloud, pullRoutingFromCloud,
  type RoutingMap, type TerminalPrintPreferences, type PrintJobType,
} from "@/services/printRouting";
import { getDeviceId, getTerminalInfo, saveTerminalInfo, registerTerminal } from "@/services/printTerminal";
import { printTestPage, initPrinting, openCashDrawer } from "@/services/universalPrintService";
import {
  getPrintQueue, subscribeToQueue, retryJob, cancelPrintJob, clearPrintQueue,
  flushPrintQueue, syncPrintQueueToCloud, type QueuedPrintJob,
} from "@/services/printQueue";

export const Route = createFileRoute("/_authenticated/printing-settings")({
  head: () => ({
    meta: [
      { title: "SifoPrint — Printers & Terminals" },
      { name: "description", content: "Discover SifoPrint agents, assign receipt, kitchen, bar and A4 printers, and monitor the print queue for this terminal." },
      { property: "og:title", content: "SifoPrint — Printers & Terminals" },
      { property: "og:description", content: "Automatic printer discovery, routing and print-queue management for SifoBooks terminals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrintingSettings,
});

const STATUS_TONE: Record<string, string> = {
  printed: "bg-emerald-100 text-emerald-800",
  printing: "bg-blue-100 text-blue-800",
  queued: "bg-amber-100 text-amber-800",
  retrying: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-muted text-muted-foreground",
};

function PrintingSettings() {
  const [agent, setAgent] = useState<AgentState | null>(null);
  const [printers, setPrinters] = useState<DiscoveredPrinter[]>([]);
  const [systemDefault, setSystemDefault] = useState<string | null>(null);
  const [routing, setRouting] = useState<RoutingMap>({});
  const [prefs, setPrefs] = useState<TerminalPrintPreferences>(getPreferences());
  const [terminal, setTerminal] = useState(getTerminalInfo());
  const [advanced, setAdvanced] = useState<AdvancedPrintSettings>({});
  const [queue, setQueue] = useState<QueuedPrintJob[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (force = true) => {
    setBusy(true);
    try {
      const state = await discoverAgent(force);
      setAgent(state);
      const list = await discoverPrinters(state);
      setPrinters(list);
      const sys = await fetchSystemDefaultPrinter(state);
      setSystemDefault(sys);
      if (sys) savePreferences({ systemDefault: sys });
      void registerTerminal(state, { preferences: getPreferences() });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    setRouting(getRouting());
    setPrefs(getPreferences());
    setTerminal(getTerminalInfo());
    setAdvanced(getAdvancedSettings());
    setQueue(getPrintQueue());
    void refresh(true);
    void pullRoutingFromCloud().then((cloud) => {
      if (Object.keys(cloud).length && !Object.keys(getRouting()).length) {
        saveRouting(cloud);
        setRouting(cloud);
      }
    });
    const unsubscribe = subscribeToQueue(() => setQueue(getPrintQueue()));
    return () => { unsubscribe(); };
  }, [refresh]);

  const printerNames = printers.map((p) => p.name);
  const online = !!agent?.online;

  const updateRoute = (type: PrintJobType, patch: { printer?: string; copies?: number; enabled?: boolean }) => {
    const next: RoutingMap = { ...routing, [type]: { ...(routing[type] ?? {}), ...patch } };
    setRouting(next);
    saveRouting(next);
    void pushRoutingToCloud(next);
  };

  const updatePrefs = (patch: Partial<TerminalPrintPreferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePreferences(patch);
  };

  const saveTerminal = async () => {
    saveTerminalInfo(terminal);
    await registerTerminal(agent ?? undefined, { preferences: getPreferences() });
    toast.success("Terminal saved");
  };

  const test = async (name: string) => {
    const res = await printTestPage(name);
    res.ok ? toast.success(`Test page sent to ${name}`) : toast.error(res.error ?? "Test print failed — job queued");
  };

  const pending = queue.filter((j) => j.status === "queued" || j.status === "retrying" || j.status === "failed");

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">SifoPrint</h1>
          <p className="text-sm text-muted-foreground">Printers, routing and the print queue for this terminal.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh(true)} disabled={busy}>
            <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Rescan
          </Button>
          <Button size="sm" onClick={async () => { await initPrinting(); const r = await flushPrintQueue(); toast.success(`Queue flushed — ${r.printed} printed, ${r.failed} pending`); }}>
            Reconnect &amp; flush
          </Button>
        </div>
      </div>

      {/* Connection banner */}
      <Card className={`flex flex-wrap items-center gap-4 rounded-xl border p-4 ${online ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${online ? "bg-emerald-600" : "bg-amber-500"} text-white`}>
          {online ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            {online ? "SifoPrint agent connected" : agent?.transport === "gateway" ? "No local agent — using the cloud print gateway" : "Offline — jobs are queued and retried automatically"}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {agent?.url ?? "No agent URL"} · device {agent?.device ?? "unknown"} · {printers.length} printer{printers.length === 1 ? "" : "s"} · id {getDeviceId().slice(0, 8)}
            {agent?.version ? ` · agent v${agent.version}` : ""}
          </div>
        </div>
        {pending.length > 0 && <Badge className="bg-amber-100 text-amber-800">{pending.length} pending job{pending.length === 1 ? "" : "s"}</Badge>}
      </Card>

      <Tabs defaultValue="printers">
        <TabsList className="flex-wrap">
          <TabsTrigger value="printers">Printers</TabsTrigger>
          <TabsTrigger value="routing">Routing</TabsTrigger>
          <TabsTrigger value="terminal">Terminal</TabsTrigger>
          <TabsTrigger value="queue">Queue {pending.length ? `(${pending.length})` : ""}</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* ---------------- Printers ---------------- */}
        <TabsContent value="printers" className="space-y-3 pt-4">
          {printers.length === 0 && (
            <Card className="rounded-xl p-6 text-center text-sm text-muted-foreground">
              <Printer className="mx-auto mb-2 h-6 w-6" />
              No printers detected. Install the SifoPrint agent on this till, or enable the browser printer under Advanced.
            </Card>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {printers.map((p) => (
              <Card key={p.name} className="rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <Printer className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{p.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge variant="secondary" className="capitalize">{p.type}</Badge>
                      <Badge variant="outline" className="capitalize">{p.source}</Badge>
                      {p.paper && <Badge variant="outline">{p.paper}</Badge>}
                      {(p.name === systemDefault || (p.isDefault && p.source === "agent")) && <Badge className="bg-blue-100 text-blue-800">System default</Badge>}
                      {prefs.assignedPrinter === p.name && <Badge className="bg-emerald-100 text-emerald-800">Terminal default</Badge>}
                    </div>
                    {p.label && <p className="mt-1 text-xs text-muted-foreground">{p.label}</p>}
                  </div>
                  {p.status === "ready" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => test(p.name)}>Test print</Button>
                  <Button size="sm" variant="outline" onClick={() => { updatePrefs({ assignedPrinter: p.name, defaultMode: "assigned" }); toast.success(`${p.name} is this terminal's default`); }}>
                    Set terminal default
                  </Button>
                  {p.source === "agent" && (
                    <Button size="sm" variant="ghost" onClick={async () => {
                      const ok = await setSystemDefaultPrinter(p.name);
                      if (ok) { setSystemDefault(p.name); savePreferences({ systemDefault: p.name }); toast.success("Windows default updated"); }
                      else toast.error("Agent could not change the system default");
                    }}>Make system default</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Card className="rounded-xl p-4">
            <Label className="text-sm">Default printer behaviour</Label>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              <Select value={prefs.defaultMode} onValueChange={(v) => updatePrefs({ defaultMode: v as TerminalPrintPreferences["defaultMode"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">Use the printer assigned in SifoBooks</SelectItem>
                  <SelectItem value="system">Use the system default printer</SelectItem>
                  <SelectItem value="ask">Ask each time</SelectItem>
                </SelectContent>
              </Select>
              <Select value={prefs.assignedPrinter ?? ""} onValueChange={(v) => updatePrefs({ assignedPrinter: v })}>
                <SelectTrigger><SelectValue placeholder="Assigned printer" /></SelectTrigger>
                <SelectContent>
                  {printerNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-md border px-3 text-xs text-muted-foreground">
                System default: {systemDefault ?? prefs.systemDefault ?? "unknown"}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- Routing ---------------- */}
        <TabsContent value="routing" className="pt-4">
          <Card className="overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Job type</th>
                    <th className="px-3 py-2 text-left">Printer</th>
                    <th className="px-3 py-2 text-right">Copies</th>
                    <th className="px-3 py-2 text-center">Enabled</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {JOB_TYPES.map((jt) => {
                    const route = routing[jt.key] ?? {};
                    return (
                      <tr key={jt.key} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium">{jt.label}</div>
                          <div className="text-xs text-muted-foreground">{jt.group}</div>
                        </td>
                        <td className="px-3 py-2">
                          <Select value={route.printer ?? ""} onValueChange={(v) => updateRoute(jt.key, { printer: v })}>
                            <SelectTrigger className="h-9 w-full min-w-[200px]"><SelectValue placeholder={prefs.assignedPrinter ?? "Terminal default"} /></SelectTrigger>
                            <SelectContent>
                              {printerNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                              <SelectItem value={BROWSER_PRINTER}>{BROWSER_PRINTER}</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input type="number" min={1} className="ml-auto h-9 w-20 text-right"
                            value={route.copies ?? 1}
                            onChange={(e) => updateRoute(jt.key, { copies: Math.max(1, Number(e.target.value) || 1) })} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Switch checked={route.enabled !== false} onCheckedChange={(v) => updateRoute(jt.key, { enabled: v })} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button size="sm" variant="ghost" disabled={!route.printer} onClick={() => route.printer && test(route.printer)}>Test</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- Terminal ---------------- */}
        <TabsContent value="terminal" className="space-y-3 pt-4">
          <Card className="rounded-xl p-4">
            <div className="mb-3 flex items-center gap-2 font-medium"><Monitor className="h-4 w-4" /> Terminal identity</div>
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label className="text-xs">Terminal name</Label><Input value={terminal.terminal_name ?? ""} onChange={(e) => setTerminal({ ...terminal, terminal_name: e.target.value })} placeholder="Till 1" /></div>
              <div><Label className="text-xs">Branch</Label><Input value={terminal.branch_name ?? ""} onChange={(e) => setTerminal({ ...terminal, branch_name: e.target.value })} placeholder="Main branch" /></div>
              <div><Label className="text-xs">Company</Label><Input value={terminal.company_name ?? ""} onChange={(e) => setTerminal({ ...terminal, company_name: e.target.value })} /></div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" onClick={saveTerminal}>Save terminal</Button>
              <span className="text-xs text-muted-foreground">Device id {getDeviceId()}</span>
            </div>
          </Card>

          <Card className="space-y-3 rounded-xl p-4">
            <div className="font-medium">Behaviour</div>
            {([
              ["autoPrintReceipt", "Automatically print the receipt when a sale completes"],
              ["autoPrintKitchen", "Automatically print kitchen tickets when an order is sent"],
              ["queueWhenOffline", "Queue jobs when the printer is unavailable"],
              ["retryFailed", "Retry failed jobs automatically"],
              ["openCashDrawer", "Open the cash drawer on cash sales"],
            ] as Array<[keyof TerminalPrintPreferences, string]>).map(([key, label]) => (
              <div key={String(key)} className="flex items-center justify-between gap-4 border-b pb-2 last:border-0">
                <span className="text-sm">{label}</span>
                <Switch checked={!!prefs[key]} onCheckedChange={(v) => updatePrefs({ [key]: v } as Partial<TerminalPrintPreferences>)} />
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={async () => (await openCashDrawer()) ? toast.success("Drawer kicked") : toast.error("No agent to open the drawer")}>
              Test cash drawer
            </Button>
          </Card>
        </TabsContent>

        {/* ---------------- Queue ---------------- */}
        <TabsContent value="queue" className="space-y-3 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={async () => { const r = await flushPrintQueue(); toast.success(`${r.printed} printed, ${r.failed} still pending`); }}>
              <RotateCw className="mr-2 h-4 w-4" /> Retry all
            </Button>
            <Button size="sm" variant="outline" onClick={async () => { await syncPrintQueueToCloud(); toast.success("Queue synced"); }}>
              <Cloud className="mr-2 h-4 w-4" /> Sync to cloud
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { clearPrintQueue(); toast.success("Queue cleared"); }}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear history
            </Button>
          </div>
          <Card className="overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Document</th>
                    <th className="px-3 py-2 text-left">Printer</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Attempts</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {queue.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No print jobs yet.</td></tr>}
                  {[...queue].reverse().map((j) => (
                    <tr key={j.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{j.title ?? j.type}</div>
                        {j.error && <div className="text-xs text-red-600">{j.error}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs">{j.printer ?? "—"}</td>
                      <td className="px-3 py-2"><Badge className={STATUS_TONE[j.status] ?? ""}>{j.status}</Badge></td>
                      <td className="px-3 py-2 text-right tabular-nums">{j.attempts}</td>
                      <td className="px-3 py-2 text-xs">{new Date(j.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">
                        {j.status !== "printed" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={async () => (await retryJob(j.id)) ? toast.success("Printed") : toast.error("Still unavailable")}>Retry</Button>
                            <Button size="sm" variant="ghost" onClick={() => cancelPrintJob(j.id)}>Cancel</Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- Advanced ---------------- */}
        <TabsContent value="advanced" className="pt-4">
          <Card className="space-y-3 rounded-xl p-4">
            <p className="text-sm text-muted-foreground">
              Discovery handles normal installations automatically. Only use these overrides for network tills or non-standard ports.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label className="text-xs">Windows agent URL</Label><Input value={advanced.windowsAgentUrl ?? ""} onChange={(e) => setAdvanced({ ...advanced, windowsAgentUrl: e.target.value })} placeholder="http://127.0.0.1:17890" /></div>
              <div><Label className="text-xs">Android bridge URL</Label><Input value={advanced.androidAgentUrl ?? ""} onChange={(e) => setAdvanced({ ...advanced, androidAgentUrl: e.target.value })} placeholder="http://127.0.0.1:17891" /></div>
              <div className="md:col-span-2"><Label className="text-xs">Network print server</Label><Input value={advanced.networkServerUrl ?? ""} onChange={(e) => setAdvanced({ ...advanced, networkServerUrl: e.target.value })} placeholder="http://192.168.1.50:17890" /></div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t pt-3">
              <span className="text-sm">Allow the browser system-default printer as a target</span>
              <Switch checked={advanced.allowBrowserPrinter !== false} onCheckedChange={(v) => setAdvanced({ ...advanced, allowBrowserPrinter: v })} />
            </div>
            <Button size="sm" onClick={async () => { saveAdvancedSettings(advanced); await refresh(true); toast.success("Advanced settings saved"); }}>Save &amp; rescan</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
