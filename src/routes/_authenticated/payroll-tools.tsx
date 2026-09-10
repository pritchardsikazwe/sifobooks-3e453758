import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { EntitySelector, type EntityOption } from "@/components/selectors/EntitySelector";
import { toast } from "sonner";
import { Calculator, Download, Landmark, Smartphone, FileSpreadsheet } from "lucide-react";
import { solveBasicFromNet, computePayslip, NAPSA_CAP } from "@/lib/payroll";
import { fmtMoney } from "@/lib/format";
import {
  exportZraPaye, exportNapsaICare, exportNhima, exportBankSchedule, exportMobileMoney,
  downloadCsv, type PayrollExportRow,
} from "@/lib/payroll-exports";

function NetToBasic() {
  const [net, setNet] = useState<number>(10000);
  const [housing, setHousing] = useState<number>(0);
  const [transport, setTransport] = useState<number>(0);
  const [utility, setUtility] = useState<number>(0);

  const solved = useMemo(() => {
    const r = solveBasicFromNet(net, {
      housing_allowance: housing, transport_allowance: transport, utility_allowance: utility,
    });
    return r;
  }, [net, housing, transport, utility]);
  const preview = solved.result;

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-emerald-600" />
        <h2 className="font-semibold">Net-to-Basic Calculator</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter the take-home the employee has negotiated. We solve for the basic salary that produces this net
        after 2025 Zambian PAYE, NAPSA (cap {fmtMoney(NAPSA_CAP)}) and NHIMA.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div><Label className="text-xs">Target Net</Label><Input type="number" value={net} onChange={e => setNet(Number(e.target.value))} /></div>
        <div><Label className="text-xs">Housing</Label><Input type="number" value={housing} onChange={e => setHousing(Number(e.target.value))} /></div>
        <div><Label className="text-xs">Transport</Label><Input type="number" value={transport} onChange={e => setTransport(Number(e.target.value))} /></div>
        <div><Label className="text-xs">Utility</Label><Input type="number" value={utility} onChange={e => setUtility(Number(e.target.value))} /></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
        {[
          ["Solved Basic", solved.basic, "text-emerald-700 font-semibold"],
          ["Gross", preview.gross, ""],
          ["Taxable", preview.taxable, ""],
          ["PAYE", preview.paye, "text-rose-600"],
          ["NAPSA", preview.napsa, "text-rose-600"],
          ["NHIMA", preview.nhima, "text-rose-600"],
        ].map(([k, v, cls]) => (
          <div key={k as string} className="rounded-md border bg-muted/30 p-3">
            <div className="text-[10px] uppercase text-muted-foreground">{k as string}</div>
            <div className={`text-base ${cls as string}`}>ZMW {fmtMoney(Number(v))}</div>
          </div>
        ))}
      </div>
      <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm">
        Verified net pay: <span className="font-semibold text-emerald-700">ZMW {fmtMoney(preview.net)}</span> (target ZMW {fmtMoney(net)}).
      </div>
    </Card>
  );
}

type RunOpt = { id: string; run_number: string; period_year: number; period_month: number };

function StatutoryExports() {
  const [runs, setRuns] = useState<RunOpt[]>([]);
  const [runId, setRunId] = useState<string>("");
  const [rows, setRows] = useState<PayrollExportRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useMemo(() => {
    supabase.from("payroll_runs").select("id, run_number, period_year, period_month").order("period_year", { ascending: false }).order("period_month", { ascending: false }).limit(24)
      .then(({ data }) => { setRuns(data ?? []); if (!runId && data?.[0]) setRunId(data[0].id); });
  }, []);

  const runOptions = useMemo<EntityOption[]>(() => runs.map(r => ({
    id: r.id, code: r.run_number,
    label: `${String(r.period_month).padStart(2, "0")}/${r.period_year}`,
    meta: "Existing payroll run",
  })), [runs]);

  const period = useMemo(() => {
    const r = runs.find(x => x.id === runId);
    return r ? `${String(r.period_month).padStart(2,"0")}/${r.period_year}` : "";
  }, [runId, runs]);

  const load = async () => {
    if (!runId) return;
    const { data, error } = await supabase.from("payslips")
      .select("basic_salary, gross_pay, net_pay, paye, napsa, nhima, ytd_taxable, employees!inner(employee_code, first_name, last_name, national_id, tpin, napsa_number, nhima_number, bank_name, bank_branch, bank_account)")
      .eq("payroll_run_id", runId);
    if (error) { toast.error(error.message); return; }
    const mapped: PayrollExportRow[] = (data ?? []).map((s: any) => ({
      employee_code: s.employees.employee_code,
      first_name: s.employees.first_name, last_name: s.employees.last_name,
      national_id: s.employees.national_id, tpin: s.employees.tpin,
      napsa_number: s.employees.napsa_number, nhima_number: s.employees.nhima_number,
      bank_name: s.employees.bank_name, bank_branch: s.employees.bank_branch, bank_account: s.employees.bank_account,
      mobile_money_provider: null, mobile_money_number: null,
      basic: Number(s.basic_salary ?? 0),
      gross: Number(s.gross_pay ?? 0),
      taxable: Number(s.ytd_taxable ?? s.gross_pay ?? 0),
      paye: Number(s.paye ?? 0), napsa: Number(s.napsa ?? 0), nhima: Number(s.nhima ?? 0),
      net: Number(s.net_pay ?? 0),
    }));
    setRows(mapped); setLoaded(true);
    toast.success(`Loaded ${mapped.length} payslips`);
  };

  const dl = (name: string, csv: string) => { if (!rows.length) { toast.info("Load a run first"); return; } downloadCsv(name, csv); };
  const today = new Date().toISOString().slice(0,10);

  return (
    <div className="space-y-6">
      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Payroll Run</Label>
          <div className="mt-1 min-w-[240px]">
            <EntitySelector
              label=""
              options={runOptions}
              value={runId || null}
              onChange={v => setRunId(v ?? "")}
              placeholder="Search payroll runs…"
              recentKey="payroll-tools-run"
              emptyTitle="No payroll runs found yet."
              emptyActionLabel="Go to payroll"
              emptyActionTo="/payroll"
            />
          </div>
        </div>
        <Button onClick={load} variant="outline">Load payslips</Button>
        {loaded && <span className="text-xs text-muted-foreground">{rows.length} payslips loaded for {period}</span>}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-emerald-600"/><h3 className="font-semibold">Statutory Returns</h3></div>
          <div className="grid gap-2">
            <Button variant="outline" onClick={() => dl(`zra-paye-${period.replace("/","-")}.csv`, exportZraPaye(rows, period))}><Download className="h-4 w-4 mr-2"/>ZRA PAYE (TaxOnline)</Button>
            <Button variant="outline" onClick={() => dl(`napsa-icare-${period.replace("/","-")}.csv`, exportNapsaICare(rows, period))}><Download className="h-4 w-4 mr-2"/>NAPSA iCare Upload</Button>
            <Button variant="outline" onClick={() => dl(`nhima-${period.replace("/","-")}.csv`, exportNhima(rows, period))}><Download className="h-4 w-4 mr-2"/>NHIMA Schedule</Button>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-emerald-600"/><h3 className="font-semibold">Bank Payment Schedules</h3></div>
          <div className="grid gap-2">
            {(["zanaco","stanbic","fnb","absa","generic"] as const).map(f => (
              <Button key={f} variant="outline" onClick={() => dl(`bank-${f}-${period.replace("/","-")}.csv`, exportBankSchedule(rows, { format: f, valueDate: today, narration: `SALARY ${period}` }))}>
                <Download className="h-4 w-4 mr-2"/>{f.toUpperCase()}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-3 md:col-span-2">
          <div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-emerald-600"/><h3 className="font-semibold">Mobile Money Bulk Pay</h3></div>
          <p className="text-xs text-muted-foreground">Filters payslips whose employee mobile-money provider matches. Configure the number on each employee record.</p>
          <div className="grid gap-2 md:grid-cols-3">
            {(["mtn","airtel","zamtel"] as const).map(p => (
              <Button key={p} variant="outline" onClick={() => dl(`momo-${p}-${period.replace("/","-")}.csv`, exportMobileMoney(rows, { provider: p, reference: `SALARY ${period}` }))}>
                <Download className="h-4 w-4 mr-2"/>{p.toUpperCase()} MoMo
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function PayrollTools() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Payroll Tools</h1>
        <p className="text-sm text-muted-foreground">Net-to-basic calculator and Zambian statutory / bank / mobile-money exports.</p>
      </div>
      <Tabs defaultValue="calc">
        <TabsList>
          <TabsTrigger value="calc">Net-to-Basic</TabsTrigger>
          <TabsTrigger value="exports">Statutory & Bank Exports</TabsTrigger>
        </TabsList>
        <TabsContent value="calc" className="mt-4"><NetToBasic /></TabsContent>
        <TabsContent value="exports" className="mt-4"><StatutoryExports /></TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/payroll-tools")({
  head: () => ({ meta: [{ title: "Payroll Tools — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: PayrollTools,
});
