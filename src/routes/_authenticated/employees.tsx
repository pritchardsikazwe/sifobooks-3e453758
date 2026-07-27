import { createFileRoute } from "@tanstack/react-router";
import { UserSquare } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  on_leave: "bg-amber-50 text-amber-700 border-amber-200",
  terminated: "bg-rose-50 text-rose-700 border-rose-200",
};
const TYPE_TONE: Record<string, string> = {
  permanent: "bg-blue-50 text-blue-700 border-blue-200",
  contract: "bg-violet-50 text-violet-700 border-violet-200",
  casual: "bg-slate-50 text-slate-600 border-slate-200",
  intern: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

const Pill = ({ value, tones }: { value: string | null; tones: Record<string, string> }) => {
  const v = (value ?? "").toLowerCase();
  const cls = tones[v] ?? "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] rounded-full border capitalize ${cls}`}>
      {(value ?? "—").replace("_", " ")}
    </span>
  );
};

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({ meta: [{ title: "Employee Master — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Employee Master"
      icon={UserSquare}
      table="employees"
      orderBy={{ column: "last_name" }}
      searchKeys={["first_name", "last_name", "email", "employee_code", "national_id", "tpin"]}
      exportable
      statusField="status"
      dateField="hire_date"
      extraFilters={[
        { name: "employment_type", label: "Type", options: [
          { value: "permanent", label: "Permanent" },
          { value: "contract", label: "Contract" },
          { value: "casual", label: "Casual" },
          { value: "intern", label: "Intern" },
        ] },
      ]}
      columns={[
        { key: "employee_code", header: "Employee No" },
        { key: "name", header: "Name", render: r => (
          <div>
            <div className="font-medium text-slate-800">{r.first_name} {r.last_name}</div>
            {r.email && <div className="text-[11px] text-slate-500">{r.email}</div>}
          </div>
        ) },
        { key: "national_id", header: "NRC" },
        { key: "tpin", header: "TPIN" },
        { key: "phone", header: "Phone" },
        { key: "employment_type", header: "Type", render: r => <Pill value={r.employment_type} tones={TYPE_TONE} /> },
        { key: "basic_salary", header: "Salary", render: r => (
          <span className="font-medium text-slate-800">{fmtMoney(r.basic_salary ?? 0)}</span>
        ) },
        { key: "status", header: "Status", render: r => <Pill value={r.status} tones={STATUS_TONE} /> },
      ]}
      fields={[
        { name: "employee_code", label: "Employee Code" },
        { name: "first_name", label: "First Name", required: true },
        { name: "last_name", label: "Last Name", required: true },
        { name: "email", label: "Email" },
        { name: "phone", label: "Phone" },
        { name: "national_id", label: "National ID" },
        { name: "tpin", label: "TPIN" },
        { name: "napsa_number", label: "NAPSA Number" },
        { name: "nhima_number", label: "NHIMA Number" },
        { name: "date_of_birth", label: "Date of Birth", type: "date" },
        { name: "gender", label: "Gender", type: "select", options: [{value:"male",label:"Male"},{value:"female",label:"Female"},{value:"other",label:"Other"}] },
        { name: "hire_date", label: "Engagement / Hire Date", type: "date" },
        { name: "contract_end_date", label: "Contract End Date", type: "date" },
        { name: "employment_type", label: "Employment Type", type: "select", defaultValue: "permanent",
          options: [{value:"permanent",label:"Permanent"},{value:"contract",label:"Contract"},{value:"casual",label:"Casual"},{value:"intern",label:"Intern"}] },
        { name: "job_description", label: "Job Description" },
        { name: "marital_status", label: "Marital Status", type: "select",
          options: [{value:"single",label:"Single"},{value:"married",label:"Married"},{value:"divorced",label:"Divorced"},{value:"widowed",label:"Widowed"}] },
        { name: "num_children", label: "No. of Children", type: "number" },
        { name: "leave_days_entitlement", label: "Leave Days Entitlement / Year", type: "number", defaultValue: 24 },
        { name: "basic_salary", label: "Basic Salary (ZMW)", type: "number" },
        { name: "bank_name", label: "Bank Name" },
        { name: "bank_account", label: "Bank Account" },
        { name: "status", label: "Status", type: "select", defaultValue: "active",
          options: [{value:"active",label:"Active"},{value:"on_leave",label:"On Leave"},{value:"terminated",label:"Terminated"}] },
        { name: "address", label: "Address", type: "textarea" },
        { name: "emergency_contact", label: "Emergency Contact", type: "textarea" },
      ]}
    />
  ),
});

