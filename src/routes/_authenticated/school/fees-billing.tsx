import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Coins, ReceiptText, ListChecks, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SimpleCrud } from "@/components/SimpleCrud";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { RequireModule } from "@/components/RequireModule";

export const Route = createFileRoute("/_authenticated/school/fees-billing")({
  head: () => ({
    meta: [
      { title: "School Fees — SifoBooks" },
      { name: "description", content: "Fee structures per class and term, student fee bills, receipts and an arrears report." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <RequireModule moduleKey="school_erp"><FeesPage /></RequireModule>,
});

const YEAR = new Date().getFullYear();
const TERMS = [{ value: "Term 1", label: "Term 1" }, { value: "Term 2", label: "Term 2" }, { value: "Term 3", label: "Term 3" }];
const FEE_TYPES = [
  { value: "tuition", label: "Tuition" }, { value: "boarding", label: "Boarding" },
  { value: "pta", label: "PTA fund" }, { value: "exam", label: "Examination" },
  { value: "uniform", label: "Uniform" }, { value: "other", label: "Other" },
];

function FeesPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);

  const load = async () => {
    const [s, f, b] = await Promise.all([
      supabase.from("students").select("id, student_no, first_name, last_name, class_id").order("last_name"),
      supabase.from("fee_structures").select("*").order("fee_name"),
      supabase.from("student_fees").select("*"),
    ]);
    setStudents(s.data ?? []); setStructures(f.data ?? []); setBills(b.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const studentOpts = students.map(s => ({ value: s.id, label: `${s.student_no ?? ""} ${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() }));
  const studentName = (id: string) => studentOpts.find(s => s.value === id)?.label ?? "—";

  const kpis = useMemo(() => {
    const billed = bills.reduce((s, b) => s + (Number(b.amount_due) || 0), 0);
    const paid = bills.reduce((s, b) => s + (Number(b.amount_paid) || 0), 0);
    return { billed, paid, arrears: Math.max(billed - paid, 0), rate: billed ? Math.round((paid / billed) * 100) : 0 };
  }, [bills]);

  const arrears = useMemo(() => {
    const byStudent: Record<string, { billed: number; paid: number }> = {};
    for (const b of bills) {
      const k = b.student_id ?? "—";
      byStudent[k] ||= { billed: 0, paid: 0 };
      byStudent[k].billed += Number(b.amount_due) || 0;
      byStudent[k].paid += Number(b.amount_paid) || 0;
    }
    return Object.entries(byStudent)
      .map(([id, v]) => ({ student: studentName(id), billed: v.billed, paid: v.paid, balance: v.billed - v.paid }))
      .filter(r => r.balance > 0.01)
      .sort((a, b) => b.balance - a.balance);
  }, [bills, students]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Coins className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">School Fees</h1>
          <p className="text-sm text-muted-foreground">Fee structures, student bills, collections and arrears.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total billed", value: fmtMoney(kpis.billed) },
          { label: "Collected", value: fmtMoney(kpis.paid) },
          { label: "Arrears", value: fmtMoney(kpis.arrears) },
          { label: "Collection rate", value: `${kpis.rate}%` },
        ].map(k => (
          <Card key={k.label} className="p-4">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="text-xl font-semibold tabular-nums">{k.value}</div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="bills">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="structures"><ListChecks className="h-4 w-4 mr-1.5" />Fee Structures</TabsTrigger>
          <TabsTrigger value="bills"><Coins className="h-4 w-4 mr-1.5" />Student Fees</TabsTrigger>
          <TabsTrigger value="payments"><ReceiptText className="h-4 w-4 mr-1.5" />Fee Payments</TabsTrigger>
          <TabsTrigger value="arrears"><AlertTriangle className="h-4 w-4 mr-1.5" />Arrears</TabsTrigger>
        </TabsList>

        <TabsContent value="structures" className="mt-2">
          <SimpleCrud
            title="Fee Structure" icon={ListChecks} table="fee_structures" orderBy={{ column: "fee_name" }}
            searchKeys={["fee_name"]}
            extraFilters={[{ name: "term", label: "Term", options: TERMS }, { name: "fee_type", label: "Fee type", options: FEE_TYPES }]}
            columns={[
              { key: "fee_name", header: "Fee" },
              { key: "fee_type", header: "Type", render: (r: any) => <Badge variant="outline">{r.fee_type}</Badge> },
              { key: "academic_year", header: "Year" },
              { key: "term", header: "Term" },
              { key: "amount", header: "Amount", align: "right", render: (r: any) => fmtMoney(Number(r.amount ?? 0)) },
              { key: "is_mandatory", header: "Mandatory", render: (r: any) => (r.is_mandatory ? "Yes" : "No") },
            ]}
            fields={[
              { name: "fee_name", label: "Fee name", required: true, colSpan: 2 },
              { name: "fee_type", label: "Fee type", type: "select", options: FEE_TYPES, defaultValue: "tuition" },
              { name: "academic_year", label: "Academic year", type: "number", defaultValue: YEAR },
              { name: "term", label: "Term", type: "select", options: TERMS, defaultValue: "Term 1" },
              { name: "amount", label: "Amount (K)", type: "number", required: true },
              { name: "is_mandatory", label: "Mandatory", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }], defaultValue: "true" },
              { name: "income_account_code", label: "Income account code", defaultValue: "4200" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </TabsContent>

        <TabsContent value="bills" className="mt-2">
          <SimpleCrud
            title="Student Fee" icon={Coins} table="student_fees" orderBy={{ column: "created_at", ascending: false }}
            searchKeys={["description"]} statusField="status" dateField="due_date"
            extraFilters={[{ name: "term", label: "Term", options: TERMS }]}
            columns={[
              { key: "student_id", header: "Student", render: (r: any) => studentName(r.student_id) },
              { key: "description", header: "Description" },
              { key: "academic_year", header: "Year" },
              { key: "term", header: "Term" },
              { key: "amount_due", header: "Billed", align: "right", render: (r: any) => fmtMoney(Number(r.amount_due ?? 0)) },
              { key: "amount_paid", header: "Paid", align: "right", render: (r: any) => fmtMoney(Number(r.amount_paid ?? 0)) },
              { key: "balance", header: "Balance", align: "right", render: (r: any) => fmtMoney(Math.max((Number(r.amount_due) || 0) - (Number(r.amount_paid) || 0), 0)) },
              { key: "due_date", header: "Due" },
              { key: "status", header: "Status", render: (r: any) => <Badge>{r.status}</Badge> },
            ]}
            fields={[
              { name: "student_id", label: "Student", type: "lookup", required: true, lookup: { table: "students", labelColumn: "first_name", labelColumns: ["last_name"], codeColumn: "student_no", orderBy: "last_name", createTo: "/students", createLabel: "New student", emptyTitle: "No students found for this school yet." } },
              { name: "fee_structure_id", label: "Fee structure", type: "lookup", lookup: { table: "fee_structures", labelColumn: "fee_name", metaColumns: ["term", "fee_type", "amount"], orderBy: "fee_name", emptyTitle: "No fee structures configured yet." } },
              { name: "description", label: "Description", colSpan: 2 },
              { name: "academic_year", label: "Academic year", type: "number", defaultValue: YEAR },
              { name: "term", label: "Term", type: "select", options: TERMS, defaultValue: "Term 1" },
              { name: "amount_due", label: "Amount billed (K)", type: "number", required: true },
              { name: "amount_paid", label: "Amount paid (K)", type: "number" },
              { name: "due_date", label: "Due date", type: "date" },
              { name: "status", label: "Status", type: "select", options: [{ value: "unpaid", label: "Unpaid" }, { value: "partial", label: "Partly paid" }, { value: "paid", label: "Paid" }, { value: "waived", label: "Waived" }], defaultValue: "unpaid" },
            ]}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-2">
          <SimpleCrud
            title="Fee Payment" icon={ReceiptText} table="fee_payments" orderBy={{ column: "payment_date", ascending: false }}
            searchKeys={["receipt_no", "reference"]} dateField="payment_date"
            columns={[
              { key: "receipt_no", header: "Receipt #" },
              { key: "student_id", header: "Student", render: (r: any) => studentName(r.student_id) },
              { key: "payment_date", header: "Date" },
              { key: "amount", header: "Amount", align: "right", render: (r: any) => fmtMoney(Number(r.amount ?? 0)) },
              { key: "method", header: "Method" },
              { key: "reference", header: "Reference" },
            ]}
            fields={[
              { name: "student_id", label: "Student", type: "lookup", required: true, lookup: { table: "students", labelColumn: "first_name", labelColumns: ["last_name"], codeColumn: "student_no", orderBy: "last_name", createTo: "/students", createLabel: "New student", emptyTitle: "No students found for this school yet." } },
              { name: "student_fee_id", label: "Against fee bill", type: "lookup", lookup: { table: "student_fees", labelColumn: "term", metaColumns: ["amount_due", "status"], orderBy: "created_at", emptyTitle: "No fee bills raised yet." } },
              { name: "receipt_no", label: "Receipt #", defaultValue: `FEE-${Date.now().toString().slice(-6)}` },
              { name: "payment_date", label: "Date", type: "date", defaultValue: new Date().toISOString().slice(0, 10) },
              { name: "amount", label: "Amount (K)", type: "number", required: true },
              { name: "method", label: "Method", type: "select", options: [{ value: "cash", label: "Cash" }, { value: "bank", label: "Bank" }, { value: "mobile", label: "Mobile money" }], defaultValue: "cash" },
              { name: "reference", label: "Reference" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </TabsContent>

        <TabsContent value="arrears" className="mt-2">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">Fee arrears by student</div>
              <ExportMenu rows={arrears.map(a => ({ Student: a.student, Billed: a.billed, Paid: a.paid, Balance: a.balance }))} filename="fee-arrears" title="Fee Arrears" />
            </div>
            <DataTable
              tableId="school-fees.arrears"
              data={arrears.map((a, i) => ({ ...a, id: String(i) }))}
              searchPlaceholder="Search students…"
              empty="No outstanding fees."
              totals={rows => ({
                student: "Total",
                billed: fmtMoney(rows.reduce((s, r) => s + r.billed, 0)),
                paid: fmtMoney(rows.reduce((s, r) => s + r.paid, 0)),
                balance: <span className="font-semibold">{fmtMoney(rows.reduce((s, r) => s + r.balance, 0))}</span>,
              })}
              columns={[
                { key: "student", header: "Student" },
                { key: "billed", header: "Billed", align: "right", accessor: r => r.billed, cell: r => fmtMoney(r.billed) },
                { key: "paid", header: "Paid", align: "right", accessor: r => r.paid, cell: r => fmtMoney(r.paid) },
                { key: "balance", header: "Balance", align: "right", accessor: r => r.balance, cell: r => <span className="font-semibold">{fmtMoney(r.balance)}</span> },
              ]}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
