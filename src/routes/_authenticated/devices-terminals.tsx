import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Monitor, Printer, RefreshCw, Wifi, WifiOff, RotateCw, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { listTerminals, getDeviceId } from "@/services/printTerminal";
import { fetchCloudPrintQueue } from "@/services/printQueue";

export const Route = createFileRoute("/_authenticated/devices-terminals")({
  head: () => ({
    meta: [
      { title: "Devices & Terminals — SifoBooks" },
      { name: "description", content: "Manage every SifoBooks till, SifoPrint agent, registered printer and print job across your branches." },
      { property: "og:title", content: "Devices & Terminals — SifoBooks" },
      { property: "og:description", content: "Terminal registry, printer assignments and live print-queue monitoring for SifoBooks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DevicesTerminals,
});

const STATUS_TONE: Record<string, string> = {
  printed: "bg-emerald-100 text-emerald-800",
  printing: "bg-blue-100 text-blue-800",
  queued: "bg-amber-100 text-amber-800",
  retrying: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-muted text-muted-foreground",
};

function ago(value?: string | null) {
  if (!value) return "never";
  const mins = Math.round((Date.now() - Date.parse(value)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return new Date(value).toLocaleDateString();
}

function DevicesTerminals() {
  const [terminals, setTerminals] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, p, j] = await Promise.all([
      listTerminals(),
      supabase.from("print_printers").select("*").order("created_at", { ascending: false }).then((r) => r.data ?? []),
      fetchCloudPrintQueue(["queued", "retrying", "printing", "failed", "printed"]),
    ]);
    setTerminals(t);
    setPrinters(p);
    setJobs(j);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const q = search.trim().toLowerCase();
  const match = (...values: Array<string | null | undefined>) =>
    !q || values.some((v) => (v ?? "").toLowerCase().includes(q));

  const onlineCount = terminals.filter((t) => t.agent_status === "connected").length;
  const pending = jobs.filter((j) => j.status !== "printed" && j.status !== "cancelled");

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Devices &amp; Terminals</h1>
          <p className="text-sm text-muted-foreground">Every till, SifoPrint agent, printer and print job across your branches.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" asChild>
            <Link to="/printing-settings"><Settings2 className="mr-2 h-4 w-4" /> This terminal</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Terminals registered", value: terminals.length, icon: Monitor },
          { label: "Agents connected", value: onlineCount, icon: Wifi },
          { label: "Jobs pending", value: pending.length, icon: Printer },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 rounded-xl p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></div>
            <div>
              <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search terminals, printers or documents…" className="max-w-sm" />

      <Tabs defaultValue="terminals">
        <TabsList>
          <TabsTrigger value="terminals">Terminals</TabsTrigger>
          <TabsTrigger value="printers">Printers</TabsTrigger>
          <TabsTrigger value="jobs">Print jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="terminals" className="pt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {terminals.filter((t) => match(t.terminal_name, t.branch_name, t.company_name, t.device_id)).map((t) => {
              const online = t.agent_status === "connected";
              return (
                <Card key={t.id ?? t.device_id} className="rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-medium">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{t.terminal_name || "Unnamed terminal"}</span>
                        {t.device_id === getDeviceId() && <Badge variant="secondary">This device</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {[t.company_name, t.branch_name].filter(Boolean).join(" · ") || "No branch set"} · {t.device_type} · seen {ago(t.last_seen_at)}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{t.agent_url ?? "No agent URL"}</div>
                    </div>
                    <Badge className={online ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                      {online ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
                      {t.agent_status ?? "unknown"}
                    </Badge>
                  </div>
                </Card>
              );
            })}
            {!loading && terminals.length === 0 && (
              <Card className="rounded-xl p-6 text-center text-sm text-muted-foreground md:col-span-2">
                No terminals registered yet. Open SifoPrint on a till and save its terminal name to register it here.
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="printers" className="pt-4">
          <Card className="overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Printer</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Source</th>
                    <th className="px-3 py-2 text-left">Terminal</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {printers.filter((p) => match(p.printer_name, p.printer_type, p.device_id)).map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{p.printer_name}</td>
                      <td className="px-3 py-2 capitalize">{p.printer_type ?? "document"}</td>
                      <td className="px-3 py-2 capitalize">{p.source ?? "agent"}</td>
                      <td className="px-3 py-2 text-xs">{p.device_id?.slice(0, 8) ?? "—"}</td>
                      <td className="px-3 py-2"><Badge variant="secondary">{p.status ?? "ready"}</Badge></td>
                    </tr>
                  ))}
                  {printers.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No printers registered from any terminal yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="pt-4">
          <Card className="overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Document</th>
                    <th className="px-3 py-2 text-left">Terminal</th>
                    <th className="px-3 py-2 text-left">Printer</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Attempts</th>
                    <th className="px-3 py-2 text-left">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.filter((j) => match(j.title, j.job_type, j.terminal_name, j.printer_name)).map((j) => (
                    <tr key={j.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{j.title ?? j.job_type}</div>
                        {j.error && <div className="text-xs text-red-600">{j.error}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs">{j.terminal_name ?? j.device_id?.slice(0, 8) ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{j.printer_name ?? "—"}</td>
                      <td className="px-3 py-2"><Badge className={STATUS_TONE[j.status] ?? ""}>{j.status}</Badge></td>
                      <td className="px-3 py-2 text-right tabular-nums">{j.attempt_count ?? 0}</td>
                      <td className="px-3 py-2 text-xs">{new Date(j.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {jobs.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No print jobs recorded yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="pt-3">
            <Button size="sm" variant="outline" onClick={() => { void load(); toast.success("Print jobs refreshed"); }}>
              <RotateCw className="mr-2 h-4 w-4" /> Refresh jobs
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
