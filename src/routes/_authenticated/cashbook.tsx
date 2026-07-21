import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookText, Printer, Download, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/cashbook")({
  head: () => ({ meta: [{ title: "Cashbook — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: CashbookPage,
});

type Row = {
  id: string; txn_date: string; description: string | null; reference: string | null;
  amount: number; payee?: string | null; charge_code?: string | null;
};

function ymRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { from, to };
}

function CashbookPage() {
  const now = new Date();
  const defaultYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [ym, setYm] = useState(defaultYm);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [opening, setOpening] = useState(0);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [preparedBy, setPreparedBy] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [bankCharges, setBankCharges] = useState(0);
  const [unpresented, setUnpresented] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: c } = await supabase.from("companies").select("*").eq("user_id", u.user.id).maybeSingle();
      setCompany(c);
      const { data: a } = await supabase.from("bank_accounts").select("*").order("name");
      setAccounts(a ?? []);
      if (a && a.length && !accountId) setAccountId(a[0].id);
    })();
  }, []);

  useEffect(() => { if (accountId) void load(); }, [accountId, ym]);

  async function load() {
    setLoading(true);
    const { from, to } = ymRange(ym);
    // Opening = account opening_balance + sum of prior transactions
    const acc = accounts.find(a => a.id === accountId);
    const ob = Number(acc?.opening_balance ?? 0);
    const { data: prior } = await supabase.from("bank_transactions")
      .select("amount").eq("bank_account_id", accountId).lt("txn_date", from);
    const priorSum = (prior ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    setOpening(ob + priorSum);

    const { data, error } = await supabase.from("bank_transactions")
      .select("id, txn_date, description, reference, amount, payee, charge_code")
      .eq("bank_account_id", accountId)
      .gte("txn_date", from).lte("txn_date", to)
      .order("txn_date").order("id");
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }

  const enriched = useMemo(() => {
    let bal = opening;
    return rows.map(r => {
      const amt = Number(r.amount || 0);
      const receipts = amt > 0 ? amt : 0;
      const payments = amt < 0 ? -amt : 0;
      bal = bal + amt;
      return { ...r, receipts, payments, balance: bal };
    });
  }, [rows, opening]);

  const totals = useMemo(() => {
    const receipts = enriched.reduce((s, r) => s + r.receipts, 0);
    const payments = enriched.reduce((s, r) => s + r.payments, 0);
    return { receipts, payments, closing: opening + receipts - payments };
  }, [enriched, opening]);

  const adjusted = totals.closing - Number(bankCharges || 0);
  const bankStatement = adjusted + Number(unpresented || 0);
  const acc = accounts.find(a => a.id === accountId);

  async function exportPdf() {
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const margin = 32;
    let y = margin;

    pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
    pdf.text((company?.trading_name || company?.name || "Cashbook").toUpperCase(), margin, y);
    y += 16;
    pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
    const headerL = [
      `School / Entity: ${company?.name || ""}`,
      `School type: ${company?.industry || ""}`,
      `School code: ${company?.registration_number || ""}`,
      `Location: ${company?.address || ""}`,
      `Bank account name: ${acc?.name || ""}`,
      `Bank account number: ${acc?.account_number || ""}`,
    ];
    const headerR = [
      `Period: ${ym}`,
      `Page number: 1`,
      `Statement prepared by: ${preparedBy}`,
      `Statement checked by: ${checkedBy}`,
      `Date of check: ${new Date().toISOString().slice(0,10)}`,
    ];
    headerL.forEach((t,i) => pdf.text(t, margin, y + i*12));
    headerR.forEach((t,i) => pdf.text(t, 460, y + i*12));
    y += Math.max(headerL.length, headerR.length)*12 + 10;

    autoTable(pdf, {
      startY: y,
      head: [["DATE","PAYEE","DESCRIPTION","REFERENCE","CHARGE CODE","RECEIPTS","PAYMENTS","BALANCE"]],
      body: [
        [ymRange(ym).from, "", "BALANCE B/F", "", "", "", "", fmtMoney(opening)],
        ...enriched.map(r => [
          r.txn_date,
          r.payee ?? "",
          r.description ?? "",
          r.reference ?? "",
          r.charge_code ?? "",
          r.receipts ? fmtMoney(r.receipts) : "",
          r.payments ? fmtMoney(r.payments) : "",
          fmtMoney(r.balance),
        ]),
        ["TOTAL","","","","", fmtMoney(totals.receipts), fmtMoney(totals.payments), fmtMoney(totals.closing)],
      ],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 76, 92] },
      columnStyles: { 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
    });
    let y2 = (pdf as any).lastAutoTable.finalY + 20;

    pdf.setFont("helvetica","bold"); pdf.text(`BANK RECONCILIATION STATEMENT AS AT ${ymRange(ym).to}`, margin, y2);
    y2 += 14;
    pdf.setFont("helvetica","normal");
    const recon: [string, number][] = [
      [`Opening cashbook balance as at ${ymRange(ym).from}`, opening],
      ["Add: Receipts during the month", totals.receipts],
      ["Subtotal", opening + totals.receipts],
      ["Less: Expenditure during the month", totals.payments],
      ["Subtotal", totals.closing],
      ["Less: Bank charges", Number(bankCharges||0)],
      [`Adjusted cashbook balance as at ${ymRange(ym).to}`, adjusted],
      ["Add unpresented cheques", Number(unpresented||0)],
      ["Balance as per bank statement", bankStatement],
    ];
    recon.forEach(([label, val], i) => {
      pdf.text(label, margin, y2 + i*13);
      pdf.text(fmtMoney(val), 700, y2 + i*13, { align: "right" });
    });
    y2 += recon.length*13 + 24;
    pdf.text(`Prepared by: ${preparedBy}`, margin, y2);
    pdf.text(`Checked by: ${checkedBy}`, 460, y2);

    pdf.save(`cashbook-${ym}-${(acc?.name||"account").replace(/\s+/g,"_")}.pdf`);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <BookText className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl font-bold">Cashbook</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
          <Button onClick={exportPdf} className="bg-emerald-600 hover:bg-emerald-700"><Download className="h-4 w-4 mr-2" />PDF</Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <Label>Bank account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Choose account" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} {a.account_number ? `— ${a.account_number}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Month</Label><Input type="month" value={ym} onChange={e => setYm(e.target.value)} /></div>
          <div><Label>Prepared by</Label><Input value={preparedBy} onChange={e => setPreparedBy(e.target.value)} /></div>
          <div><Label>Checked by</Label><Input value={checkedBy} onChange={e => setCheckedBy(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Bank charges</Label><Input type="number" value={bankCharges} onChange={e => setBankCharges(Number(e.target.value))} /></div>
            <div><Label>Unpresented</Label><Input type="number" value={unpresented} onChange={e => setUnpresented(Number(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Header block (print-friendly) */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div><b>School / Entity:</b> {company?.name}</div>
          <div><b>Period:</b> {ym}</div>
          <div><b>School type:</b> {company?.industry}</div>
          <div><b>Prepared by:</b> {preparedBy}</div>
          <div><b>School code:</b> {company?.registration_number}</div>
          <div><b>Checked by:</b> {checkedBy}</div>
          <div><b>Location:</b> {company?.address}</div>
          <div><b>Date of check:</b> {new Date().toISOString().slice(0,10)}</div>
          <div><b>Bank account name:</b> {acc?.name}</div>
          <div><b>Bank account number:</b> {acc?.account_number}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>DATE</TableHead>
                  <TableHead>PAYEE</TableHead>
                  <TableHead>DESCRIPTION</TableHead>
                  <TableHead>REFERENCE</TableHead>
                  <TableHead>CHARGE CODE</TableHead>
                  <TableHead className="text-right">RECEIPTS</TableHead>
                  <TableHead className="text-right">PAYMENTS</TableHead>
                  <TableHead className="text-right">BALANCE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="font-medium">
                  <TableCell>{ymRange(ym).from}</TableCell>
                  <TableCell />
                  <TableCell>BALANCE B/F</TableCell>
                  <TableCell colSpan={4} />
                  <TableCell className="text-right">{fmtMoney(opening)}</TableCell>
                </TableRow>
                {enriched.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.txn_date}</TableCell>
                    <TableCell>{r.payee ?? ""}</TableCell>
                    <TableCell>{r.description ?? ""}</TableCell>
                    <TableCell>{r.reference ?? ""}</TableCell>
                    <TableCell>{r.charge_code ?? ""}</TableCell>
                    <TableCell className="text-right text-emerald-700">{r.receipts ? fmtMoney(r.receipts) : ""}</TableCell>
                    <TableCell className="text-right text-red-600">{r.payments ? fmtMoney(r.payments) : ""}</TableCell>
                    <TableCell className="text-right font-medium">{fmtMoney(r.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={5}>TOTAL</TableCell>
                  <TableCell className="text-right">{fmtMoney(totals.receipts)}</TableCell>
                  <TableCell className="text-right">{fmtMoney(totals.payments)}</TableCell>
                  <TableCell className="text-right">{fmtMoney(totals.closing)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bank Reconciliation Statement as at {ymRange(ym).to}</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <table className="w-full">
            <tbody>
              {[
                [`Opening cashbook balance as at ${ymRange(ym).from}`, opening],
                ["Add: Receipts during the month", totals.receipts],
                ["Subtotal", opening + totals.receipts],
                ["Less: Expenditure during the month", totals.payments],
                ["Subtotal", totals.closing],
                ["Less: Bank charges", Number(bankCharges||0)],
                [`Adjusted cashbook balance as at ${ymRange(ym).to}`, adjusted],
                ["Add unpresented cheques", Number(unpresented||0)],
                ["Balance as per bank statement", bankStatement],
              ].map(([label, val], i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5">{label as string}</td>
                  <td className="py-1.5 text-right font-medium">{fmtMoney(val as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
