import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AFS_GROUPS, suggestGroup, computeAfs, afsFactSheet, type AfsPayload } from "@/lib/afs";
import { useServerFn } from "@tanstack/react-start";
import { generateAfsCommentary } from "@/lib/afs-ai.functions";
import { Sparkles, FileDown, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/reports/afs")({
  head: () => ({ meta: [{ title: "Annual Financial Statements — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: AfsPage,
});

const BRAND = "#0f4c5c";
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function AfsPage() {
  const generate = useServerFn(generateAfsCommentary);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [company, setCompany] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [ai, setAi] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: comp }, { data: coa }, { data: entries }] = await Promise.all([
      supabase.from("companies").select("name,address,tpin,email,phone").limit(1).maybeSingle(),
      supabase.from("chart_of_accounts").select("id,account_code,account_name,account_type,reporting_group").order("account_code"),
      supabase.from("journal_entries").select("id,entry_date").eq("status", "posted")
        .gte("entry_date", `${year}-01-01`).lte("entry_date", `${year}-12-31`),
    ]);
    setCompany(comp);
    setAccounts(coa ?? []);
    const ids = (entries ?? []).map((e: any) => e.id);
    if (ids.length) {
      const { data: jl } = await supabase.from("journal_lines")
        .select("debit,credit,account:account_id(account_code,account_name,account_type,reporting_group)")
        .in("entry_id", ids);
      setLines(jl ?? []);
    } else setLines([]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year]);

  const payload: AfsPayload = useMemo(
    () => computeAfs(lines, year, `${year}-12-31`, "ZMW", company?.name ?? "Company"),
    [lines, year, company],
  );
  const facts = useMemo(() => afsFactSheet(payload), [payload]);

  const setGroup = async (id: string, group: string) => {
    const { error } = await supabase.from("chart_of_accounts").update({ reporting_group: group || null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setAccounts((a) => a.map((x) => x.id === id ? { ...x, reporting_group: group || null } : x));
    // reflect in lines
    setLines((ls) => ls.map((l) => l.account && accounts.find((a) => a.id === id && a.account_code === l.account.account_code)
      ? { ...l, account: { ...l.account, reporting_group: group || null } } : l));
  };

  const autoMap = async () => {
    const updates = accounts
      .filter((a) => !a.reporting_group)
      .map((a) => ({ id: a.id, g: suggestGroup(a.account_name, a.account_type) }))
      .filter((u) => u.g);
    if (!updates.length) { toast.info("Nothing to auto-map"); return; }
    for (const u of updates) await supabase.from("chart_of_accounts").update({ reporting_group: u.g }).eq("id", u.id);
    toast.success(`Auto-mapped ${updates.length} accounts`);
    load();
  };

  const runAi = async (section: "summary" | "variance" | "cashflow" | "strategy") => {
    try {
      setBusy(section);
      const { content } = await generate({ data: { section, factSheet: facts } });
      setAi((a) => ({ ...a, [section]: content }));
    } catch (e: any) {
      toast.error(e.message ?? "AI failed");
    } finally { setBusy(null); }
  };

  const saveSnapshot = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("afs_reports" as any).insert({
      user_id: u.user.id,
      fiscal_year: year,
      period_end: `${year}-12-31`,
      currency: "ZMW",
      payload: payload as any,
      ai_summary: ai.summary ?? null,
      ai_variance: ai.variance ?? null,
      ai_cashflow: ai.cashflow ?? null,
      ai_strategy: ai.strategy ?? null,
    });
    if (error) toast.error(error.message); else toast.success("AFS snapshot saved");
  };

  const downloadPdf = () => {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    // Cover
    pdf.setFillColor(BRAND); pdf.rect(0, 0, pageW, 120, "F");
    pdf.setTextColor(255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(22);
    pdf.text(company?.name ?? "Company", 40, 60);
    pdf.setFontSize(14); pdf.text("Annual Financial Statements", 40, 90);
    pdf.setFontSize(11); pdf.text(`For the year ended ${year}-12-31`, 40, 108);
    pdf.setTextColor(20);

    const addSection = (title: string, y: number) => {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(BRAND);
      pdf.text(title, 40, y); pdf.setTextColor(20);
      return y + 10;
    };

    // SoCI
    pdf.addPage();
    let y = addSection("Statement of Comprehensive Income", 60);
    const s = payload.soci.totals;
    autoTable(pdf, {
      startY: y + 10,
      head: [["", `${year} (${payload.currency})`]],
      body: [
        ["Revenue", fmt(s.totalRevenue)],
        ["Cost of sales", `(${fmt(s.totalCogs)})`],
        [{ content: "Gross profit", styles: { fontStyle: "bold" } }, { content: fmt(s.grossProfit), styles: { fontStyle: "bold", halign: "right" } }],
        ["Operating expenses", `(${fmt(s.totalOpex)})`],
        [{ content: "Operating profit", styles: { fontStyle: "bold" } }, { content: fmt(s.operatingProfit), styles: { fontStyle: "bold", halign: "right" } }],
        ["Finance costs", `(${fmt(payload.soci.finance.reduce((a, x) => a + x.balance, 0))})`],
        [{ content: "Profit before tax", styles: { fontStyle: "bold" } }, { content: fmt(s.profitBeforeTax), styles: { fontStyle: "bold", halign: "right" } }],
        ["Income tax", `(${fmt(payload.soci.tax.reduce((a, x) => a + x.balance, 0))})`],
        [{ content: "Net profit for the year", styles: { fontStyle: "bold", fillColor: [15, 76, 92], textColor: 255 } },
         { content: fmt(s.netProfit), styles: { fontStyle: "bold", halign: "right", fillColor: [15, 76, 92], textColor: 255 } }],
      ],
      styles: { fontSize: 10, cellPadding: 6 }, headStyles: { fillColor: BRAND, textColor: 255 },
      columnStyles: { 1: { halign: "right" } }, margin: { left: 40, right: 40 },
    });

    // SFP
    pdf.addPage();
    y = addSection("Statement of Financial Position", 60);
    const f = payload.sfp.totals;
    autoTable(pdf, {
      startY: y + 10,
      head: [["", `${year} (${payload.currency})`]],
      body: [
        [{ content: "ASSETS", colSpan: 2, styles: { fontStyle: "bold", fillColor: [235, 240, 242] } }],
        ["Current assets", fmt(f.totalCurrentAssets)],
        ["Non-current assets", fmt(f.totalNonCurrentAssets)],
        [{ content: "Total assets", styles: { fontStyle: "bold" } }, { content: fmt(f.totalAssets), styles: { fontStyle: "bold", halign: "right" } }],
        [{ content: "EQUITY & LIABILITIES", colSpan: 2, styles: { fontStyle: "bold", fillColor: [235, 240, 242] } }],
        ["Total equity (incl. current period earnings)", fmt(f.totalEquity)],
        ["Current liabilities", fmt(f.totalCurrentLiab)],
        ["Non-current liabilities", fmt(f.totalNonCurrentLiab)],
        [{ content: "Total equity & liabilities", styles: { fontStyle: "bold", fillColor: [15, 76, 92], textColor: 255 } },
         { content: fmt(f.totalEquity + f.totalLiab), styles: { fontStyle: "bold", halign: "right", fillColor: [15, 76, 92], textColor: 255 } }],
      ],
      styles: { fontSize: 10, cellPadding: 6 }, headStyles: { fillColor: BRAND, textColor: 255 },
      columnStyles: { 1: { halign: "right" } }, margin: { left: 40, right: 40 },
    });

    // Ratios
    // @ts-expect-error lastAutoTable
    y = pdf.lastAutoTable.finalY + 30;
    y = addSection("Key Ratios", y);
    autoTable(pdf, {
      startY: y + 10,
      body: [
        ["Gross margin", (payload.ratios.grossMargin * 100).toFixed(1) + "%"],
        ["Net margin", (payload.ratios.netMargin * 100).toFixed(1) + "%"],
        ["Current ratio", payload.ratios.currentRatio.toFixed(2)],
        ["Quick ratio", payload.ratios.quickRatio.toFixed(2)],
        ["Debt-to-equity", payload.ratios.debtToEquity.toFixed(2)],
        ["Return on assets", (payload.ratios.returnOnAssets * 100).toFixed(1) + "%"],
      ],
      styles: { fontSize: 10, cellPadding: 6 }, columnStyles: { 1: { halign: "right" } }, margin: { left: 40, right: 40 },
    });

    // AI narratives
    const aiSections: [string, string | undefined][] = [
      ["Executive Summary", ai.summary],
      ["Variance & Trend Commentary", ai.variance],
      ["Cashflow & Funding Actions", ai.cashflow],
      ["Growth & Strategy Recommendations", ai.strategy],
    ];
    if (aiSections.some(([, v]) => v)) {
      pdf.addPage();
      let yy = addSection("Directors' Narrative (AI-generated)", 60) + 20;
      aiSections.forEach(([t, v]) => {
        if (!v) return;
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(BRAND);
        pdf.text(t, 40, yy); yy += 16;
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(30);
        const lines2 = pdf.splitTextToSize(v, pageW - 80);
        lines2.forEach((line: string) => {
          if (yy > 780) { pdf.addPage(); yy = 60; }
          pdf.text(line, 40, yy); yy += 13;
        });
        yy += 12;
      });
    }

    pdf.save(`AFS-${company?.name ?? "company"}-${year}.pdf`.replace(/\s+/g, "_"));
  };

  const unmapped = accounts.filter((a) => !a.reporting_group).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Annual Financial Statements</h1>
          <p className="text-sm text-slate-500">IFRS-for-SME compilation from posted journals · {company?.name ?? "Company"}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Year</label>
          <Input type="number" className="w-24" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} />
          <Button variant="outline" onClick={saveSnapshot}><Save className="h-4 w-4 mr-1" /> Save snapshot</Button>
          <Button onClick={downloadPdf}><FileDown className="h-4 w-4 mr-1" /> Download PDF</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-semibold">Reporting class mapping</div>
            <div className="text-xs text-slate-500">{unmapped} of {accounts.length} accounts still unmapped</div>
          </div>
          <Button variant="secondary" onClick={autoMap}><Wand2 className="h-4 w-4 mr-1" /> Auto-map by name</Button>
        </div>
        <div className="max-h-72 overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0"><tr>
              <th className="text-left px-2 py-1.5">Code</th><th className="text-left">Account</th>
              <th className="text-left">Type</th><th className="text-left">IFRS reporting class</th>
            </tr></thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-2 py-1 text-slate-500">{a.account_code}</td>
                  <td>{a.account_name}</td>
                  <td className="text-slate-500">{a.account_type}</td>
                  <td>
                    <select className="border rounded px-1 py-0.5 text-xs w-full max-w-[280px]"
                      value={a.reporting_group ?? ""} onChange={(e) => setGroup(a.id, e.target.value)}>
                      <option value="">— unmapped —</option>
                      {AFS_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.parent} → {g.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {loading ? <div className="text-slate-500">Loading…</div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="font-semibold mb-2">Statement of Comprehensive Income · {year}</div>
            <Row label="Revenue" v={payload.soci.totals.totalRevenue} />
            <Row label="Cost of sales" v={-payload.soci.totals.totalCogs} />
            <Row label="Gross profit" v={payload.soci.totals.grossProfit} bold />
            <Row label="Operating expenses" v={-payload.soci.totals.totalOpex} />
            <Row label="Operating profit" v={payload.soci.totals.operatingProfit} bold />
            <Row label="Finance costs" v={-payload.soci.finance.reduce((a, x) => a + x.balance, 0)} />
            <Row label="Income tax" v={-payload.soci.tax.reduce((a, x) => a + x.balance, 0)} />
            <Row label="Net profit" v={payload.soci.totals.netProfit} bold big />
          </Card>
          <Card className="p-4">
            <div className="font-semibold mb-2">Statement of Financial Position · {year}-12-31</div>
            <Row label="Current assets" v={payload.sfp.totals.totalCurrentAssets} />
            <Row label="Non-current assets" v={payload.sfp.totals.totalNonCurrentAssets} />
            <Row label="Total assets" v={payload.sfp.totals.totalAssets} bold />
            <Row label="Total equity" v={payload.sfp.totals.totalEquity} />
            <Row label="Current liabilities" v={payload.sfp.totals.totalCurrentLiab} />
            <Row label="Non-current liabilities" v={payload.sfp.totals.totalNonCurrentLiab} />
            <Row label="Total equity + liabilities" v={payload.sfp.totals.totalEquity + payload.sfp.totals.totalLiab} bold big />
          </Card>
          <Card className="p-4 lg:col-span-2">
            <div className="font-semibold mb-2">Key ratios</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              <Kpi label="Gross margin" v={(payload.ratios.grossMargin * 100).toFixed(1) + "%"} />
              <Kpi label="Net margin" v={(payload.ratios.netMargin * 100).toFixed(1) + "%"} />
              <Kpi label="Current" v={payload.ratios.currentRatio.toFixed(2)} />
              <Kpi label="Quick" v={payload.ratios.quickRatio.toFixed(2)} />
              <Kpi label="Debt / Equity" v={payload.ratios.debtToEquity.toFixed(2)} />
              <Kpi label="ROA" v={(payload.ratios.returnOnAssets * 100).toFixed(1) + "%"} />
            </div>
          </Card>
        </div>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold">Business AI generator</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(["summary", "variance", "cashflow", "strategy"] as const).map((k) => (
            <div key={k} className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold capitalize">
                  {k === "summary" ? "Executive summary" : k === "variance" ? "Variance & trend" :
                    k === "cashflow" ? "Cashflow & funding" : "Growth & strategy"}
                </div>
                <Button size="sm" variant="secondary" onClick={() => runAi(k)} disabled={busy === k}>
                  {busy === k ? "Generating…" : "Generate"}
                </Button>
              </div>
              <div className="text-xs whitespace-pre-wrap text-slate-700 max-h-64 overflow-auto">
                {ai[k] || <span className="text-slate-400">Not generated yet.</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, v, bold, big }: { label: string; v: number; bold?: boolean; big?: boolean }) {
  return (
    <div className={`flex justify-between border-b py-1.5 ${bold ? "font-semibold" : ""} ${big ? "text-base bg-emerald-50 px-2 rounded mt-1" : "text-sm"}`}>
      <span>{label}</span><span>{fmt(v)}</span>
    </div>
  );
}
function Kpi({ label, v }: { label: string; v: string }) {
  return (
    <div className="border rounded p-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{v}</div>
    </div>
  );
}
