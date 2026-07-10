import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportShell } from "@/components/ReportShell";
import { fmt, num } from "@/lib/reports";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/reports/income-tax")({
  head: () => ({ meta: [{ title: "Income Tax Computation — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: IncomeTaxPage,
});

function IncomeTaxPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [expense, setExpense] = useState(0);
  const [addBacks, setAddBacks] = useState<number>(0);
  const [allowable, setAllowable] = useState<number>(0);
  const [capitalAllowances, setCapitalAllowances] = useState<number>(0);
  const [lossesBF, setLossesBF] = useState<number>(0);
  const [rate, setRate] = useState<number>(30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const from = `${year}-01-01`; const to = `${year}-12-31`;
      const { data } = await supabase
        .from("journal_lines")
        .select("debit,credit,account:chart_of_accounts(account_type),entry:journal_entries!inner(entry_date,status,user_id)")
        .eq("entry.user_id", u.user.id)
        .eq("entry.status", "posted")
        .gte("entry.entry_date", from).lte("entry.entry_date", to);
      let rev = 0, exp = 0;
      (data ?? []).forEach((r: any) => {
        const t = r.account?.account_type;
        if (t === "revenue") rev += num(r.credit) - num(r.debit);
        else if (t === "expense") exp += num(r.debit) - num(r.credit);
      });
      setRevenue(rev); setExpense(exp);
      setLoading(false);
    })();
  }, [year]);

  const pbt = revenue - expense;
  const taxable = Math.max(0, pbt + addBacks - allowable - capitalAllowances - lossesBF);
  const tax = +(taxable * rate / 100).toFixed(2);
  const quarterly = +(tax / 4).toFixed(2);

  const rows = [
    { Line: "Profit before tax", Amount: pbt.toFixed(2) },
    { Line: "Add: Non-deductible expenses", Amount: addBacks.toFixed(2) },
    { Line: "Less: Allowable deductions", Amount: (-allowable).toFixed(2) },
    { Line: "Less: Capital allowances", Amount: (-capitalAllowances).toFixed(2) },
    { Line: "Less: Tax losses brought forward", Amount: (-lossesBF).toFixed(2) },
    { Line: "Taxable income", Amount: taxable.toFixed(2) },
    { Line: `Corporate Income Tax @ ${rate}%`, Amount: tax.toFixed(2) },
    { Line: "Provisional tax per quarter", Amount: quarterly.toFixed(2) },
  ];

  return (
    <ReportShell
      title="Income Tax Computation"
      subtitle={`FY ${year} · Zambia — adjust rate for mining/other special rates`}
      loading={loading} filename={`income-tax-${year}`} rows={rows}
      filters={<Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="h-9 w-28" />}
    >
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <Field label="Add-backs (non-deductible expenses)" value={addBacks} onChange={setAddBacks} />
        <Field label="Allowable deductions (extra)" value={allowable} onChange={setAllowable} />
        <Field label="Capital allowances (wear & tear)" value={capitalAllowances} onChange={setCapitalAllowances} />
        <Field label="Tax losses brought forward" value={lossesBF} onChange={setLossesBF} />
        <Field label="Corporate tax rate %" value={rate} onChange={setRate} />
      </div>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => {
              const bold = /Taxable income|Corporate Income Tax|Profit before tax/.test(r.Line);
              return (
                <tr key={i} className={bold ? "bg-slate-50 font-semibold" : ""}>
                  <td className="px-4 py-2">{r.Line}</td>
                  <td className="px-4 py-2 text-right font-mono">{fmt(Number(r.Amount))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-xs text-slate-500">
        Provisional tax dates in Zambia (approx.): 31 Mar, 30 Jun, 30 Sep, 31 Dec. Each instalment = 25% of estimated annual liability.
      </div>
    </ReportShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step="0.01" value={value} onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}
