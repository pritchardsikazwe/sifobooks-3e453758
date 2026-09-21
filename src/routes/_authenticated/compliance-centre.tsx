import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CircleDashed,
  ExternalLink, FileCheck2, HardHat, Landmark, ListChecks, Pickaxe,
  ReceiptText, RefreshCw, ShieldCheck, ShieldPlus, UsersRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GOVERNMENT_PROVIDERS,
  integrationLabel,
  calculateMineralRoyalty,
  type GovernmentProvider,
  type GovernmentStatus,
} from "@/services/government-compliance";

export const Route = createFileRoute("/_authenticated/compliance-centre")({
  head: () => ({
    meta: [
      { title: "Government Compliance — SifoBooks" },
      { name: "description", content: "Zambian government integration and statutory compliance control centre." },
    ],
  }),
  component:GovernmentCompliancePage,
});

const statusVariant = (status: GovernmentStatus) => {
  if (status === "CONNECTED") return "default" as const;
  if (status === "ERROR" || status === "DISCONNECTED") return "destructive" as const;
  return "secondary" as const;
};

const providerIcon = (code: string) => {
  if (code.startsWith("ZRA")) return ReceiptText;
  if (code === "NAPSA" || code === "NHIMA") return UsersRound;
  if (code === "WCFCB") return ShieldPlus;
  if (code === "NCC") return HardHat;
  return ShieldCheck;
};

const calendar = [
  { body: "NAPSA", obligation: "Employer contribution / return", due: "10th monthly", status: "Tracked" },
  { body: "NHIMA", obligation: "Health insurance contribution", due: "10th monthly", status: "Tracked" },
  { body: "ZRA", obligation: "PAYE / withholding / turnover tax", due: "Configured by rule", status: "Tracked" },
  { body: "ZRA", obligation: "VAT return", due: "Configured by rule", status: "Tracked" },
  { body: "ZRA", obligation: "Mineral royalty return", due: "14 days after qualifying month-end", status: "Tracked" },
  { body: "WCFCB", obligation: "Annual return", due: "15 January", status: "Tracked" },
  { body: "NCC", obligation: "Registration / renewal / projects", due: "Certificate dependent", status: "Tracked" },
];

const queue = [
  { id: "ZRA-001", provider: "ZRA VSDC", type: "Sales invoice", status: "ACCEPTED", reference: "Demo / awaiting live credentials" },
  { id: "PAY-001", provider: "NAPSA", type: "Monthly payroll return", status: "READY", reference: "Prepared from payroll" },
  { id: "NH-001", provider: "NHIMA", type: "Monthly contribution", status: "READY", reference: "Prepared from payroll" },
  { id: "WC-001", provider: "WCFCB", type: "Annual assessment", status: "DRAFT", reference: "Awaiting employer assessment" },
];

function GovernmentCompliancePage() {
  const [royaltyValue, setRoyaltyValue] = useState("100000");
  const [royaltyRate, setRoyaltyRate] = useState("0.05");
  const [royaltyMethod, setRoyaltyMethod] = useState<"GROSS_VALUE" | "NORM_VALUE">("GROSS_VALUE");

  const royalty = useMemo(
    () => calculateMineralRoyalty({
      value: Number(royaltyValue),
      rate: Number(royaltyRate),
      method: royaltyMethod,
    }),
    [royaltyValue, royaltyRate, royaltyMethod],
  );

  const configured = GOVERNMENT_PROVIDERS.filter(p => ["CONNECTED", "CONFIGURED", "TESTING"].includes(p.status)).length;
  const manual = GOVERNMENT_PROVIDERS.filter(p => p.status === "MANUAL_WORKFLOW").length;

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Zambia Government & Statutory Compliance
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Government Compliance Centre</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              One control layer for ZRA, payroll statutory obligations, Workers' Compensation, NCC and mineral royalty workflows.
              Existing SifoBooks accounting, inventory, POS and payroll remain the source records.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/compliance"><CalendarClock className="mr-2 h-4 w-4" />Compliance Calendar</Link></Button>
            <Button asChild><Link to="/zra-smart-invoice"><ReceiptText className="mr-2 h-4 w-4" />ZRA Smart Invoice</Link></Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric title="Government providers" value={String(GOVERNMENT_PROVIDERS.length)} detail="Configured integration targets" icon={<Landmark className="h-5 w-5" />} />
          <Metric title="Configured / testing" value={String(configured)} detail="Ready for credentials or UAT" icon={<CheckCircle2 className="h-5 w-5" />} />
          <Metric title="Portal workflows" value={String(manual)} detail="No live API claimed" icon={<CircleDashed className="h-5 w-5" />} />
          <Metric title="Submission queue" value={String(queue.length)} detail="Demo control records" icon={<ListChecks className="h-5 w-5" />} />
        </div>

        <Card className="border-blue-200 bg-blue-50/60 dark:bg-blue-950/20">
          <CardContent className="flex gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <div>
              <strong>Integration safety:</strong> SifoBooks never marks a government system as live merely because the UI exists.
              Live submission requires the applicable official credentials, API access, testing and any required approval/certification.
              Until then, the system uses TEST, CONFIGURED or PORTAL/MANUAL WORKFLOW states.
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="government" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="government">Government</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="royalty">Mineral Royalty</TabsTrigger>
            <TabsTrigger value="queue">Submission Queue</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="government" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {GOVERNMENT_PROVIDERS.map((provider) => <ProviderCard key={provider.code} provider={provider} />)}
            </div>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <PayrollCard title="PAYE" detail="Calculated from approved payroll" status="Ready for payroll workflow" />
              <PayrollCard title="NAPSA" detail="Member numbers, contributions, returns and reconciliation" status="Portal/API adapter ready" />
              <PayrollCard title="NHIMA" detail="Employee registration, contributions and return preparation" status="Portal/API adapter ready" />
              <PayrollCard title="Workers' Compensation" detail="Employer assessment, annual return and certificate tracking" status="eWorkers workflow ready" />
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Statutory payroll control flow</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-5">
                  {["Employees", "Approved payroll", "PAYE / NAPSA / NHIMA", "Workers' Compensation", "Submission & reconciliation"].map((step, i) => (
                    <div key={step} className="rounded-lg border bg-muted/30 p-4">
                      <div className="mb-2 text-xs font-semibold text-primary">STEP {i + 1}</div>
                      <div className="font-medium">{step}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="royalty" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><Pickaxe className="h-5 w-5" />Mineral Royalty Workbench</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Use configurable rules and effective dates. SifoBooks does not permanently hard-code changing royalty rates.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Valuation base (ZMW)" value={royaltyValue} onChange={setRoyaltyValue} />
                    <Field label="Royalty rate (decimal)" value={royaltyRate} onChange={setRoyaltyRate} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant={royaltyMethod === "GROSS_VALUE" ? "default" : "outline"} onClick={() => setRoyaltyMethod("GROSS_VALUE")}>Gross value</Button>
                    <Button variant={royaltyMethod === "NORM_VALUE" ? "default" : "outline"} onClick={() => setRoyaltyMethod("NORM_VALUE")}>Norm value</Button>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="text-xs text-muted-foreground">Calculated royalty</div>
                    <div className="mt-1 text-3xl font-bold">K {royalty.royalty.toLocaleString("en-ZM", { minimumFractionDigits: 2 })}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Method: {royalty.method.replace("_", " ")}</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Mining controls</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {["Mineral master and classification", "Production → stock → sale reconciliation", "Local vs export sale tracking", "Price and exchange-rate evidence", "Monthly return / nil return preparation", "Payment and submission reference", "Immutable audit trail"].map(x => (
                    <div key={x} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{x}</div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle className="text-base">Government Submission Queue</CardTitle><p className="text-sm text-muted-foreground">Central status control; live credentials are intentionally not fabricated.</p></div>
                <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {queue.map(item => (
                    <div key={item.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1fr_1.2fr_1fr_1.5fr] md:items-center">
                      <span className="font-medium">{item.id}</span>
                      <span>{item.provider}</span>
                      <span className="text-sm text-muted-foreground">{item.type}</span>
                      <Badge variant={item.status === "ACCEPTED" ? "default" : "secondary"}>{item.status}</Badge>
                      <span className="text-xs text-muted-foreground">{item.reference}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Submission states</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {["DRAFT","READY","VALIDATING","QUEUED","SUBMITTING","SUBMITTED","ACCEPTED","REJECTED","FAILED","RETRY_REQUIRED","RECONCILIATION_REQUIRED"].map(s => <Badge key={s} variant="outline">{s}</Badge>)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Statutory calendar</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {calendar.map(row => (
                  <div key={row.body + row.obligation} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[.7fr_1.7fr_1.2fr_.8fr] md:items-center">
                    <Badge variant="outline">{row.body}</Badge>
                    <span className="font-medium">{row.obligation}</span>
                    <span className="text-sm text-muted-foreground">{row.due}</span>
                    <span className="text-xs font-medium text-emerald-700">{row.status}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid gap-4 md:grid-cols-3">
          <QuickLink title="Existing compliance calendar" description="Detailed obligations, filing status and due-date control." href="/compliance" />
          <QuickLink title="ZRA Smart Invoice" description="Existing VSDC configuration and ZRA item mapping tools." href="/zra-smart-invoice" />
          <QuickLink title="Audit logs" description="Review the existing SifoBooks audit trail and controlled changes." href="/audit-logs" />
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value, detail, icon }: { title:string; value:string; detail:string; icon:React.ReactNode }) {
  return <Card><CardContent className="p-4"><div className="flex items-center justify-between text-muted-foreground"><span className="text-sm">{title}</span>{icon}</div><div className="mt-2 text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{detail}</div></CardContent></Card>;
}

function ProviderCard({ provider }: { provider: GovernmentProvider }) {
  const Icon = providerIcon(provider.code);
  return <Card><CardHeader className="flex flex-row items-start justify-between gap-3"><div className="flex gap-3"><div className="rounded-lg bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div><div><CardTitle className="text-base">{provider.name}</CardTitle><p className="text-xs text-muted-foreground">{provider.purpose}</p></div></div><Badge variant={statusVariant(provider.status)}>{integrationLabel(provider.status)}</Badge></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Environment</span><span className="font-medium">{provider.environment}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Transport</span><span className="font-medium">{provider.integrationType}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Live API</span><span className="font-medium">{provider.liveApiConfigured ? "Configured" : "Not configured"}</span></div><a href={provider.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Official information <ExternalLink className="h-3 w-3" /></a></CardContent></Card>;
}

function PayrollCard({ title, detail, status }: { title:string; detail:string; status:string }) {
  return <Card><CardContent className="p-4"><div className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-primary" /><span className="font-semibold">{title}</span></div><p className="mt-2 text-xs text-muted-foreground">{detail}</p><Badge variant="outline" className="mt-3">{status}</Badge></CardContent></Card>;
}

function Field({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  return <label className="space-y-1 text-sm"><span className="text-muted-foreground">{label}</span><Input value={value} onChange={e => onChange(e.target.value)} /></label>;
}

function QuickLink({ title, description, href }: { title:string; description:string; href:string }) {
  return <Card className="transition-colors hover:border-primary/40"><CardContent className="p-4"><div className="font-semibold">{title}</div><p className="mt-1 text-xs text-muted-foreground">{description}</p><Button variant="link" className="mt-2 h-auto p-0" asChild><Link to={href as any}>Open <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button></CardContent></Card>;
}
