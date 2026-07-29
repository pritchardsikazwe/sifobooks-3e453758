import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Settings2, Coins, MinusCircle, Building2, Network, Layers, Tags, Wallet,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SimpleCrud } from "@/components/SimpleCrud";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DEFAULT_INCOME_TYPES, DEFAULT_DEDUCTION_TYPES,
  YESNO, INCOME_TYPE_OPTIONS, DEDUCTION_BASIS, EARN_INCLUSION, SHOW_ON, STATUS_OPTIONS,
} from "@/lib/payroll-setup";

export const Route = createFileRoute("/_authenticated/payroll-setup")({
  head: () => ({
    meta: [
      { title: "Payroll Setup — SifoBooks" },
      { name: "description", content: "Configure incomes, deductions, divisions, departments, job categories, grades and cost centres for Zambian payroll." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayrollSetupPage,
});

function useCompany() {
  const [ids, setIds] = useState<{ user_id?: string; company_id?: string }>({});
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("active_company_id").eq("id", u.user.id).maybeSingle();
      let companyId = (p as any)?.active_company_id as string | undefined;
      if (!companyId) {
        const { data: c } = await supabase.from("companies").select("id").limit(1);
        companyId = c?.[0]?.id;
      }
      setIds({ user_id: u.user.id, company_id: companyId });
    })();
  }, []);
  return ids;
}

function PayrollSetupPage() {
  const { user_id, company_id } = useCompany();
  const [seeding, setSeeding] = useState(false);

  const seedDefaults = async () => {
    if (!user_id) return toast.error("Not signed in");
    setSeeding(true);
    try {
      const { count: ic } = await supabase.from("payroll_income_types").select("id", { count: "exact", head: true });
      if (!ic) {
        const { error } = await supabase.from("payroll_income_types")
          .insert(DEFAULT_INCOME_TYPES.map((r, i) => ({ ...r, sort_order: i, user_id, company_id })) as any);
        if (error) throw error;
      }
      const { count: dc } = await supabase.from("payroll_deduction_types").select("id", { count: "exact", head: true });
      if (!dc) {
        const { error } = await supabase.from("payroll_deduction_types")
          .insert(DEFAULT_DEDUCTION_TYPES.map((r, i) => ({ ...r, sort_order: i, user_id, company_id })) as any);
        if (error) throw error;
      }
      toast.success("Zambian payroll defaults loaded");
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message ?? "Could not load defaults");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payroll Setup</h1>
            <p className="text-sm text-muted-foreground">Incomes, deductions and the organisation structure that drive every payroll run.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={seedDefaults} disabled={seeding}>
          {seeding ? "Loading…" : "Load Zambian defaults"}
        </Button>
      </div>

      <Tabs defaultValue="incomes" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="incomes"><Coins className="h-4 w-4 mr-1.5" />Incomes Setup</TabsTrigger>
          <TabsTrigger value="deductions"><MinusCircle className="h-4 w-4 mr-1.5" />Deductions Setup</TabsTrigger>
          <TabsTrigger value="divisions"><Network className="h-4 w-4 mr-1.5" />Divisions</TabsTrigger>
          <TabsTrigger value="departments"><Building2 className="h-4 w-4 mr-1.5" />Departments</TabsTrigger>
          <TabsTrigger value="categories"><Tags className="h-4 w-4 mr-1.5" />Job Categories</TabsTrigger>
          <TabsTrigger value="grades"><Layers className="h-4 w-4 mr-1.5" />Grades</TabsTrigger>
          <TabsTrigger value="costcentres"><Wallet className="h-4 w-4 mr-1.5" />Cost Centres</TabsTrigger>
        </TabsList>

        <TabsContent value="incomes" className="mt-2">
          <SimpleCrud
            title="Incomes Setup" icon={Coins} table="payroll_income_types"
            orderBy={{ column: "sort_order", ascending: true }}
            searchKeys={["code", "name", "type"]} statusField="status"
            extraFilters={[{ name: "type", label: "Type", options: INCOME_TYPE_OPTIONS }]}
            columns={[
              { key: "code", header: "Code" },
              { key: "type", header: "Type" },
              { key: "name", header: "Name" },
              { key: "deductible", header: "Deductible", render: (r: any) => (r.deductible ? "YES" : "NO") },
              { key: "taxable", header: "Taxable", render: (r: any) => (r.taxable ? "Taxable" : "No Tax") },
              { key: "has_napsa", header: "Has NAPSA", render: (r: any) => (r.has_napsa ? "NAPSA" : "No NAPSA") },
              { key: "to_all", header: "To All", render: (r: any) => (r.to_all ? "YES" : "NO") },
              { key: "status", header: "Status" },
            ]}
            fields={[
              { name: "code", label: "Code", required: true },
              { name: "name", label: "Name", required: true },
              { name: "type", label: "Type", type: "select", defaultValue: "ALLOWANCE", options: INCOME_TYPE_OPTIONS },
              { name: "short_name", label: "Short Name" },
              { name: "basis", label: "Basis", type: "select", defaultValue: "Monthly", options: [{ value: "Monthly", label: "Monthly" }, { value: "Annual", label: "Annual" }, { value: "Once Off", label: "Once Off" }] },
              { name: "default_amount", label: "Default Amount", type: "number" },
              { name: "taxable", label: "Taxable", type: "select", defaultValue: "true", options: YESNO },
              { name: "taxable_pct", label: "Taxable %", type: "number", defaultValue: 100 },
              { name: "has_napsa", label: "Has NAPSA", type: "select", defaultValue: "false", options: YESNO },
              { name: "has_nhima", label: "Has NHIMA", type: "select", defaultValue: "false", options: YESNO },
              { name: "deductible", label: "Deductible", type: "select", defaultValue: "false", options: YESNO },
              { name: "to_all", label: "To All Employees", type: "select", defaultValue: "false", options: YESNO },
              { name: "gross_up", label: "Gross Me Up", type: "select", defaultValue: "false", options: YESNO },
              { name: "recover_days", label: "Recover Days", type: "select", defaultValue: "false", options: YESNO },
              { name: "freeze_me", label: "Freeze Me", type: "select", defaultValue: "false", options: YESNO },
              { name: "show_on", label: "Show On", type: "select", defaultValue: "Payslip Only", options: SHOW_ON },
              { name: "employee_formula", label: "Employee Formula", colSpan: 2 },
              { name: "employer_formula", label: "Employer Formula", colSpan: 2 },
              { name: "account_ref", label: "Account Ref" },
              { name: "employer_account_ref", label: "Employer Account Ref" },
              { name: "sort_order", label: "Sort Order", type: "number" },
              { name: "status", label: "Status", type: "select", defaultValue: "Active", options: STATUS_OPTIONS },
            ]}
          />
        </TabsContent>

        <TabsContent value="deductions" className="mt-2">
          <SimpleCrud
            title="Deductions Setup" icon={MinusCircle} table="payroll_deduction_types"
            orderBy={{ column: "sort_order", ascending: true }}
            searchKeys={["code", "name"]} statusField="status"
            columns={[
              { key: "code", header: "Code" },
              { key: "name", header: "Name" },
              { key: "rate", header: "Employee Rate", align: "right", render: (r: any) => pct(r.rate) },
              { key: "employer_rate", header: "Employer Rate", align: "right", render: (r: any) => pct(r.employer_rate) },
              { key: "basis", header: "Basis" },
              { key: "earn_inclusion", header: "Inclusion" },
              { key: "earnings_max", header: "Earnings Max", align: "right" },
              { key: "statutory", header: "Statutory", render: (r: any) => (r.statutory ? "YES" : "NO") },
              { key: "status", header: "Status" },
            ]}
            fields={[
              { name: "code", label: "Code", required: true },
              { name: "name", label: "Name", required: true },
              { name: "rate", label: "Employee Rate (e.g. 0.05)", type: "number" },
              { name: "employer_rate", label: "Employer Rate", type: "number" },
              { name: "basis", label: "Basis", type: "select", defaultValue: "Gross", options: DEDUCTION_BASIS },
              { name: "earn_inclusion", label: "Earnings Inclusion", type: "select", defaultValue: "Taxable", options: EARN_INCLUSION },
              { name: "earn_exclusion", label: "Earnings Exclusion" },
              { name: "earnings_max", label: "Earnings Max (cap base)", type: "number" },
              { name: "annual_tax_limit", label: "Annual Tax Limit", type: "number" },
              { name: "tax_pct", label: "Tax Relief %", type: "number" },
              { name: "statutory", label: "Statutory", type: "select", defaultValue: "false", options: YESNO },
              { name: "before_tax", label: "Deduct Before Tax", type: "select", defaultValue: "false", options: YESNO },
              { name: "show_on", label: "Show On", type: "select", defaultValue: "Payslip Only", options: SHOW_ON },
              { name: "employee_formula", label: "Employee Formula", colSpan: 2 },
              { name: "employer_formula", label: "Employer Formula", colSpan: 2 },
              { name: "account_ref", label: "Account Ref" },
              { name: "employer_account_ref", label: "Employer Account Ref" },
              { name: "sort_order", label: "Sort Order", type: "number" },
              { name: "status", label: "Status", type: "select", defaultValue: "Active", options: STATUS_OPTIONS },
            ]}
          />
        </TabsContent>

        <TabsContent value="divisions" className="mt-2">
          <SimpleCrud
            title="Divisions" icon={Network} table="divisions" orderBy={{ column: "name" }}
            searchKeys={["code", "name"]} statusField="status"
            columns={[{ key: "code", header: "Code" }, { key: "name", header: "Division" }, { key: "manager_name", header: "Manager" }, { key: "status", header: "Status" }]}
            fields={[
              { name: "code", label: "Code" },
              { name: "name", label: "Division Name", required: true },
              { name: "manager_name", label: "Manager" },
              { name: "description", label: "Description", type: "textarea", colSpan: 2 },
              { name: "status", label: "Status", type: "select", defaultValue: "Active", options: STATUS_OPTIONS },
            ]}
          />
        </TabsContent>

        <TabsContent value="departments" className="mt-2">
          <DepartmentsCrud />
        </TabsContent>

        <TabsContent value="categories" className="mt-2">
          <SimpleCrud
            title="Job Categories" icon={Tags} table="job_categories" orderBy={{ column: "name" }}
            searchKeys={["code", "name"]} statusField="status"
            columns={[{ key: "code", header: "Code" }, { key: "name", header: "Category" }, { key: "description", header: "Description" }, { key: "status", header: "Status" }]}
            fields={[
              { name: "code", label: "Code" },
              { name: "name", label: "Category Name", required: true },
              { name: "description", label: "Description", type: "textarea", colSpan: 2 },
              { name: "status", label: "Status", type: "select", defaultValue: "Active", options: STATUS_OPTIONS },
            ]}
          />
        </TabsContent>

        <TabsContent value="grades" className="mt-2">
          <SimpleCrud
            title="Grades" icon={Layers} table="pay_grades" orderBy={{ column: "name" }}
            searchKeys={["code", "name", "notch"]} statusField="status"
            columns={[
              { key: "code", header: "Code" }, { key: "name", header: "Grade" }, { key: "notch", header: "Notch" },
              { key: "min_salary", header: "Min", align: "right" }, { key: "mid_salary", header: "Mid", align: "right" },
              { key: "max_salary", header: "Max", align: "right" }, { key: "status", header: "Status" },
            ]}
            fields={[
              { name: "code", label: "Code" },
              { name: "name", label: "Grade Name", required: true },
              { name: "notch", label: "Notch" },
              { name: "min_salary", label: "Minimum Salary", type: "number" },
              { name: "mid_salary", label: "Midpoint Salary", type: "number" },
              { name: "max_salary", label: "Maximum Salary", type: "number" },
              { name: "housing_allowance", label: "Housing Allowance", type: "number" },
              { name: "transport_allowance", label: "Transport Allowance", type: "number" },
              { name: "description", label: "Description", type: "textarea", colSpan: 2 },
              { name: "status", label: "Status", type: "select", defaultValue: "Active", options: STATUS_OPTIONS },
            ]}
          />
        </TabsContent>

        <TabsContent value="costcentres" className="mt-2">
          <SimpleCrud
            title="Cost Centres" icon={Wallet} table="cost_centres" orderBy={{ column: "name" }}
            searchKeys={["code", "name"]}
            columns={[{ key: "code", header: "Code" }, { key: "name", header: "Cost Centre" }, { key: "annual_budget", header: "Annual Budget", align: "right" }]}
            fields={[
              { name: "code", label: "Code" },
              { name: "name", label: "Cost Centre Name", required: true },
              { name: "annual_budget", label: "Annual Budget", type: "number" },
              { name: "description", label: "Description", type: "textarea", colSpan: 2 },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function pct(v: any) {
  const n = Number(v ?? 0);
  return n ? `${(n * 100).toFixed(2)}%` : "—";
}

function DepartmentsCrud() {
  const [divisions, setDivisions] = useState<{ value: string; label: string }[]>([]);
  const [centres, setCentres] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    (async () => {
      const [{ data: d }, { data: c }] = await Promise.all([
        supabase.from("divisions").select("id, name").order("name"),
        supabase.from("cost_centres").select("id, name, code").order("name"),
      ]);
      setDivisions((d ?? []).map((x: any) => ({ value: x.id, label: x.name })));
      setCentres((c ?? []).map((x: any) => ({ value: x.id, label: x.code ? `${x.code} — ${x.name}` : x.name })));
    })();
  }, []);

  return (
    <SimpleCrud
      title="Departments" icon={Building2} table="departments" orderBy={{ column: "name" }}
      searchKeys={["code", "name"]}
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Department" },
        { key: "division_id", header: "Division", render: (r: any) => divisions.find(d => d.value === r.division_id)?.label ?? "—" },
        { key: "cost_centre_id", header: "Cost Centre", render: (r: any) => centres.find(c => c.value === r.cost_centre_id)?.label ?? "—" },
        { key: "manager_name", header: "Manager" },
      ]}
      fields={[
        { name: "code", label: "Code" },
        { name: "name", label: "Department Name", required: true },
        { name: "division_id", label: "Division", type: "select", options: divisions },
        { name: "cost_centre_id", label: "Cost Centre", type: "select", options: centres },
        { name: "manager_name", label: "Manager" },
        { name: "description", label: "Description", type: "textarea", colSpan: 2 },
      ]}
    />
  );
}
