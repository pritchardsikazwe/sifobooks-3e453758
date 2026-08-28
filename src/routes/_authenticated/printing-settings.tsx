import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Printer, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getAgentUrls, setAgentUrls, getDeviceId, getDeviceType, getPrinters, getPrintStatus,
  printKitchenOrder, printReceipt,
} from "@/services/universalPrintService";
import {
  getPrinterConfiguration, savePrinterConfiguration, getPrinterForType,
  type PrinterConfiguration,
} from "@/services/printerConfiguration";
import { getPrintQueue, clearPrintQueue, syncPrintQueueToCloud, fetchCloudPrintQueue, type QueuedPrintJob } from "@/services/printQueue";
import { supabase } from "@/integrations/supabase/client";
import { printTableDocument } from "@/services/printDocument";

export const Route = createFileRoute("/_authenticated/printing-settings")({
  head: () => ({
    meta: [
      { title: "Printing Settings — SifoBooks" },
      { name: "description", content: "Configure SifoPrint agents, receipt, kitchen, bar and accounting printers for this terminal." },
      { property: "og:title", content: "Printing Settings — SifoBooks" },
      { property: "og:description", content: "Silent printing configuration for SifoBooks POS and accounting terminals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrintingSettings,
});

const SLOTS: Array<{ key: keyof PrinterConfiguration; label: string }> = [
  { key: "defaultPrinter", label: "Default printer" },
  { key: "receiptPrinter", label: "Receipt printer" },
  { key: "accountingPrinter", label: "Accounting printer (A4 / PDF)" },
  { key: "kitchenPrinter", label: "Kitchen printer" },
  { key: "barPrinter", label: "Bar printer" },
  { key: "labelPrinter", label: "Label printer" },
];

function PrintingSettings() {
  const [config, setConfig] = useState<PrinterConfiguration>({});
  const [printers, setPrinters] = useState<string[]>([]);
  const [status, setStatus] = useState<{ online: boolean; mode: string } | null>(null);
  const [agents, setAgents] = useState({ windows: "", android: "" });
  const [queue, setQueue] = useState<QueuedPrintJob[]>([]);
  const [cloudQueue, setCloudQueue] = useState<any[]>([]);
  const [terminal, setTerminal] = useState({ terminal_name: "", branch_name: "", company_name: "" });
  const [loading, setLoading] = useState(false);
  const device = typeof window === "undefined" ? "web" : getDeviceType();

  const refresh = async () => {
    setLoading(true);
    const [s, p] = await Promise.all([getPrintStatus(), getPrinters()]);
    setStatus({ online: !!s.online, mode: String(s.mode) });
    setPrinters(p.printers ?? []);
    setQueue(getPrintQueue());
    void syncPrintQueueToCloud();
    setCloudQueue(await fetchCloudPrintQueue());
    setLoading(false);
  };

  useEffect(() => {
    setConfig(getPrinterConfiguration());
    setAgents(getAgentUrls());
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("print_devices").select("terminal_name, branch_name, company_name")
        .eq("device_id", getDeviceId()).maybeSingle();
      if (data) setTerminal({
        terminal_name: (data as any).terminal_name ?? "",
        branch_name: (data as any).branch_name ?? "",
        company_name: (data as any).company_name ?? "",
      });
    })();
    void refresh();
  }, []);

  /** Save locally (works offline) and register this terminal in the backend. */
  const save = async () => {
    savePrinterConfiguration(config);
    setAgentUrls(agents);
    toast.success("Printer configuration saved for this terminal");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("print_devices").upsert({
      user_id: u.user.id,
      device_id: getDeviceId(),
      device_type: device,
      terminal_name: terminal.terminal_name || null,
      branch_name: terminal.branch_name || null,
      company_name: terminal.company_name || null,
      printer_config: config as any,
      last_seen_at: new Date().toISOString(),
    } as any, { onConflict: "user_id,device_id" });
    if (error) toast.error(`Terminal not registered: ${error.message}`);
  };

  const testReceipt = async () => {
    try {
      await printReceipt({
        businessName: "SifoBooks",
        receiptNumber: "TEST-0001",
        date: new Date().toISOString(),
        cashier: "Test",
        items: [{ name: "Test item", quantity: 1, price: 10, total: 10 }],
        subtotal: 10, tax: 0, total: 10,
        paymentMethod: "cash", amountPaid: 10, change: 0,
        footer: "SifoPrint test receipt",
      }, getPrinterForType("receipt"));
      toast.success("Test receipt sent");
    } catch (e: any) { toast.error(e?.message ?? "Printer unavailable"); }
  };

  const testKitchen = async () => {
    try {
      await printKitchenOrder({
        orderNumber: "TEST-K1", tableNumber: "1", waiter: "Test", orderType: "dine_in",
        items: [{ name: "Test dish", quantity: 1, notes: "SifoPrint test" }],
      }, getPrinterForType("kitchen"));
      toast.success("Test kitchen ticket sent");
    } catch (e: any) { toast.error(e?.message ?? "Printer unavailable"); }
  };

  const testA4 = () =>
    printTableDocument({
      title: "SifoPrint A4 test page",
      subtitle: "Silent print verification",
      meta: [`Device: ${device}`, `Terminal: ${getDeviceId()}`],
      columns: ["Check", "Result"],
      rows: [["Agent reachable", status?.online ? "Yes" : "No"], ["Printers found", String(printers.length)]],
      fileName: "sifoprint-test.pdf",
    });

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Printing</h1>
          <p className="text-sm text-muted-foreground">Silent printing for POS, kitchen and accounting documents.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Printer className="h-5 w-5 text-emerald-600" />
          <span className="font-medium">SifoPrint</span>
          {status?.online
            ? <Badge className="bg-emerald-600"><Wifi className="h-3 w-3 mr-1" /> Connected</Badge>
            : <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" /> Not detected</Badge>}
          <Badge variant="outline" className="capitalize">Device: {device}</Badge>
          <span className="text-xs text-muted-foreground font-mono">Terminal {getDeviceId().slice(0, 8)}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Windows agent URL</Label>
            <Input value={agents.windows} onChange={(e) => setAgents({ ...agents, windows: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Android bridge URL</Label>
            <Input value={agents.android} onChange={(e) => setAgents({ ...agents, android: e.target.value })} />
          </div>
        </div>
        {!status?.online && (
          <p className="text-xs text-muted-foreground">
            No local agent detected — jobs are routed to the network / AirPrint print gateway, and queued if that is
            unreachable. Printing never blocks a sale.
          </p>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-medium">Terminal registration</h2>
        <p className="text-xs text-muted-foreground">
          Links this device to a company, branch and till so its printer assignments are recoverable.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Company</Label>
            <Input value={terminal.company_name} placeholder="Sifa Restaurant"
              onChange={(e) => setTerminal({ ...terminal, company_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Branch</Label>
            <Input value={terminal.branch_name} placeholder="Main Branch"
              onChange={(e) => setTerminal({ ...terminal, branch_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Terminal</Label>
            <Input value={terminal.terminal_name} placeholder="POS-01"
              onChange={(e) => setTerminal({ ...terminal, terminal_name: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-medium">Printer assignment</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SLOTS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label>{label}</Label>
              <Input
                list="sifo-printers"
                placeholder={printers.length ? "Select or type printer name" : "Type printer name"}
                value={(config[key] as string) ?? ""}
                onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              />
            </div>
          ))}
          <datalist id="sifo-printers">
            {printers.map((p) => <option key={p} value={p} />)}
          </datalist>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()}>Save configuration</Button>
          <Button variant="outline" onClick={() => void testReceipt()}>Test receipt</Button>
          <Button variant="outline" onClick={() => void testA4()}>Test A4</Button>
          <Button variant="outline" onClick={() => void testKitchen()}>Test kitchen</Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Queued print jobs ({queue.length})</h2>
          {queue.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { clearPrintQueue(); setQueue([]); }}>Clear</Button>
          )}
        </div>
        {queue.length === 0
          ? <p className="text-sm text-muted-foreground">No pending jobs.</p>
          : (
            <ul className="text-sm divide-y">
              {queue.slice().reverse().map((j) => (
                <li key={j.id} className="py-2 flex items-center justify-between gap-3">
                  <span className="capitalize">{j.type}{j.title ? ` · ${j.title}` : ""}</span>
                  <span className="text-xs text-muted-foreground">{new Date(j.createdAt).toLocaleString()} · {j.status}</span>
                </li>
              ))}
            </ul>
          )}
        {cloudQueue.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Pending on other terminals ({cloudQueue.length})</p>
            <ul className="text-sm divide-y">
              {cloudQueue.map((j) => (
                <li key={j.id} className="py-1.5 flex items-center justify-between gap-3">
                  <span className="capitalize">{j.job_type}{j.title ? ` · ${j.title}` : ""}</span>
                  <span className="text-xs text-muted-foreground font-mono">{String(j.device_id ?? "").slice(0, 8)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
