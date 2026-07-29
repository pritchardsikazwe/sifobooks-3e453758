import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coins, Landmark, ShieldCheck, CalendarRange, Wallet2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleCrud } from "@/components/SimpleCrud";
import { supabase } from "@/integrations/supabase/client";
import {
  CURRENCY_OPTIONS, MONTH_OPTIONS, PROCESS_OPTIONS, STATUS_OPTIONS, THIS_MONTH_OPTIONS,
} from "@/lib/payroll-setup";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payroll-transactions")({
  head: () => ({
    meta: [
      { title: "Payroll Transactions — SifoBooks" },
      { name: "description", content: "Assign employee incomes, loans and deductions, NAPSA iCare entries and the leave register." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayrollTransactionsPage,
});

function useLookups() {
  const [employees, setEmployees] = useState<{ value: string; label: string }[]>([]);
  const [incomes, setIncomes] = useState<{ value: string; label: string }[]>([]);
  const [deductions, setDeductions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    (async () => {
      const [{ data: e }, { data: i }, { data: d }] = await Promise.all([
        supabase.from("employees").select("id, employee_code, first_name, last_name").order("first_name"),
        supabase.from("payroll_income_types").select("id, code, name").order("sort_order"),
        supabase.from("payroll_deduction_types").select("id, code, name").order("sort_order"),
      ]);
      setEmployees((e ?? []).map((x: any) => ({
        value: x.id,
        label: `${x.employee_code ? x.employee_code + " - " : ""}${x.first_name ?? ""} ${x.last_name ?? ""}`.trim(),
      })));
      setIncomes((i ?? []).map((x: any) => ({ value: x.id, label: `${x.name} - ${x.code}` })));
      setDeductions((d ?? []).map((x: any) => ({ value: x.id, label: `${x.code} - ${x.name}` })));
    })();
  }, []);
  return { employees, incomes, deductions };
}

function PayrollTransactionsPage() {
  const { employees, incomes, deductions } = useLookups();
  const empLabel = (id: string) => employees.find(e => e.value === id)?.label ?? "—";

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Wallet2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payroll Transactions</h1>
          <p className="text-sm text-muted-foreground">Employee incomes, loans &amp; deductions, NAPSA iCare and the leave register.</p>
        </div>
      </div>

      <Tabs defaultValue="incomes" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="incomes"><Coins className="h-4 w-4 mr-1.5" />Manage Incomes</TabsTrigger>
          <TabsTrigger value="loans"><Landmark className="h-4 w-4 mr-1.5" />Loans &amp; Deductions</TabsTrigger>
          <TabsTrigger value="napsa"><ShieldCheck className="h-4 w-4 mr-1.5" />NAPSA iCare</TabsTrigger>
          <TabsTrigger value="leave"><CalendarRange className="h-4 w-4 mr-1.5" />Leave Register</TabsTrigger>
        </TabsList>

        <TabsContent value="incomes" className="mt-2">
          <SimpleCrud
            title="Manage Incomes" icon={Coins} table="employee_incomes"
            orderBy={{ column: "created_at", ascending: false }} searchKeys={["comments", "currency"]}
            statusField="status" dateField="effective_from"
            columns={[
              { key: "income_type_id", header: "Income", render: (r: any) => incomes.find(i => i.value === r.income_type_id)?.label ?? "—" },
              { key: "employee_id", header: "Employee", render: (r: any) => empLabel(r.employee_id) },
              { key: "amount", header: "Amount", align: "right", render: (r: any) => fmtMoney(Number(r.amount ?? 0), r.currency ?? "ZMW") },
              { key: "currency", header: "Currency" },
              { key: "hours_days_worked", header: "Hours/Days", align: "right" },
              { key: "effective_from", header: "From" },
              { key: "status", header: "Status" },
            ]}
            fields={[
              { name: "income_type_id", label: "Income", type: "select", required: true, options: incomes },
              { name: "employee_id", label: "Employee", type: "select", required: true, options: employees },
              { name: "amount", label: "Amount", type: "number" },
              { name: "currency", label: "Currency", type: "select", defaultValue: "ZMW", options: CURRENCY_OPTIONS },
              { name: "hours_days_worked", label: "Hours / Days Worked", type: "number" },
              { name: "data1", label: "Data 1", type: "number" },
              { name: "data2", label: "Data 2", type: "number" },
              { name: "data3", label: "Data 3", type: "number" },
              { name: "effective_from", label: "Effective From", type: "date" },
              { name: "effective_to", label: "Effective To", type: "date" },
              { name: "comments", label: "Comments", type: "textarea", colSpan: 2 },
              { name: "status", label: "Status", type: "select", defaultValue: "Active", options: STATUS_OPTIONS },
            ]}
          />
        </TabsContent>

        <TabsContent value="loans" className="mt-2">
          <SimpleCrud
            title="Loans & Deductions" icon={Landmark} table="employee_deductions"
            orderBy={{ column: "created_at", ascending: false }} searchKeys={["comments", "currency"]}
            statusField="status" dateField="date_taken"
            columns={[
              { key: "employee_id", header: "Employee", render: (r: any) => empLabel(r.employee_id) },
              { key: "deduction_type_id", header: "Deduction", render: (r: any) => deductions.find(d => d.value === r.deduction_type_id)?.label ?? "—" },
              { key: "this_month", header: "This Month" },
              { key: "total_amount", header: "Total Amount", align: "right" },
              { key: "monthly_amount", header: "Monthly", align: "right" },
              { key: "outstanding_amount", header: "Outstanding", align: "right" },
              { key: "currency", header: "Currency" },
              { key: "status", header: "Status" },
            ]}
            fields={[
              { name: "employee_id", label: "Employee", type: "select", required: true, options: employees },
              { name: "deduction_type_id", label: "Deduction", type: "select", required: true, options: deductions },
              { name: "this_month", label: "This Month", type: "select", defaultValue: "Show & Deduct", options: THIS_MONTH_OPTIONS },
              { name: "date_taken", label: "Date Taken", type: "date" },
              { name: "start_date", label: "Start Date", type: "date" },
              { name: "end_date", label: "End Date", type: "date" },
              { name: "instalments", label: "Instalments", type: "number" },
              { name: "outstanding_months", label: "Outstanding Months", type: "number" },
              { name: "total_amount", label: "Total Amount", type: "number" },
              { name: "initial_deposit", label: "Initial Deposit", type: "number" },
              { name: "monthly_amount", label: "Monthly Amount", type: "number" },
              { name: "outstanding_amount", label: "Outstanding Amount", type: "number" },
              { name: "interest_rate", label: "Interest Rate (straight line)", type: "number" },
              { name: "total_interest", label: "Total Interest", type: "number" },
              { name: "interest_monthly", label: "Interest Monthly", type: "number" },
              { name: "interest_outstanding", label: "Interest Outstanding", type: "number" },
              { name: "data1", label: "Data 1", type: "number" },
              { name: "data2", label: "Data 2", type: "number" },
              { name: "data3", label: "Data 3", type: "number" },
              { name: "currency", label: "Currency", type: "select", defaultValue: "ZMW", options: CURRENCY_OPTIONS },
              { name: "comments", label: "Comments", type: "textarea", colSpan: 2 },
              { name: "status", label: "Status", type: "select", defaultValue: "Active", options: STATUS_OPTIONS },
            ]}
          />
        </TabsContent>

        <TabsContent value="napsa" className="mt-2">
          <SimpleCrud
            title="NAPSA iCare — Entries" icon={ShieldCheck} table="napsa_icare_entries"
            orderBy={{ column: "created_at", ascending: false }}
            searchKeys={["surname", "forename", "social_security_no"]} statusField="status"
            extraFilters={[{ name: "process", label: "Process", options: PROCESS_OPTIONS }]}
            columns={[
              { key: "employee_id", header: "Employee", render: (r: any) => empLabel(r.employee_id) },
              { key: "year", header: "Year" },
              { key: "month", header: "Month" },
              { key: "gross_pay", header: "Gross Pay", align: "right" },
              { key: "employer_contribution", header: "Employer", align: "right" },
              { key: "employee_contribution", header: "Employee", align: "right" },
              { key: "process", header: "Process" },
              { key: "status", header: "Status" },
            ]}
            fields={[
              { name: "employee_id", label: "Employee", type: "select", options: employees },
              { name: "employer_acc_no", label: "Employer Acc No" },
              { name: "social_security_no", label: "Social Security No" },
              { name: "id_no", label: "ID No" },
              { name: "surname", label: "Surname" },
              { name: "forename", label: "Forename" },
              { name: "other_names", label: "Other Names" },
              { name: "date_of_birth", label: "Date of Birth", type: "date" },
              { name: "year", label: "Year", type: "number", required: true, defaultValue: new Date().getFullYear() },
              { name: "month", label: "Month", type: "select", required: true, defaultValue: String(new Date().getMonth() + 1), options: MONTH_OPTIONS },
              { name: "gross_pay", label: "Gross Pay", type: "number" },
              { name: "employer_contribution", label: "Employer Contribution", type: "number" },
              { name: "employee_contribution", label: "Employee Contribution", type: "number" },
              { name: "process", label: "Process", type: "select", defaultValue: "TRIAL", options: PROCESS_OPTIONS },
              { name: "status", label: "Status", type: "select", defaultValue: "Active", options: STATUS_OPTIONS },
            ]}
          />
        </TabsContent>

        <TabsContent value="leave" className="mt-2">
          <SimpleCrud
            title="Leave Register" icon={CalendarRange} table="leave_register"
            orderBy={{ column: "created_at", ascending: false }} searchKeys={["notes"]} statusField="status"
            columns={[
              { key: "year", header: "Year" },
              { key: "month", header: "Month" },
              { key: "employee_id", header: "Employee", render: (r: any) => empLabel(r.employee_id) },
              { key: "opening_balance", header: "Balance B/F", align: "right" },
              { key: "normal_accrual", header: "Normal", align: "right" },
              { key: "total_days", header: "Total Days", align: "right" },
              { key: "leave_days_taken", header: "Leave Days", align: "right" },
              { key: "closing_balance", header: "Balance C/F", align: "right" },
              { key: "leave_value", header: "Leave Value", align: "right", render: (r: any) => fmtMoney(Number(r.leave_value ?? 0)) },
              { key: "status", header: "Status" },
            ]}
            fields={[
              { name: "employee_id", label: "Employee", type: "select", required: true, options: employees },
              { name: "year", label: "Year", type: "number", required: true, defaultValue: new Date().getFullYear() },
              { name: "month", label: "Month", type: "select", required: true, defaultValue: String(new Date().getMonth() + 1), options: MONTH_OPTIONS },
              { name: "opening_balance", label: "Balance Brought Forward", type: "number" },
              { name: "normal_accrual", label: "Normal Accrual (days)", type: "number", defaultValue: 2 },
              { name: "total_days", label: "Total Days", type: "number" },
              { name: "leave_days_taken", label: "Leave Days Taken", type: "number" },
              { name: "closing_balance", label: "Balance Carried Forward", type: "number" },
              { name: "leave_value", label: "Leave Value", type: "number" },
              { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
              { name: "status", label: "Status", type: "select", defaultValue: "Active", options: STATUS_OPTIONS },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
