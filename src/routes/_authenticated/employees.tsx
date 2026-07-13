import { createFileRoute } from "@tanstack/react-router";
import { UserSquare } from "lucide-react";
import { SimpleCrud } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({ meta: [{ title: "Employees — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SimpleCrud
      title="Employees"
      icon={UserSquare}
      table="employees"
      orderBy={{ column: "last_name" }}
      searchKeys={["first_name", "last_name", "email", "employee_code"]}
      columns={[
        { key: "employee_code", header: "Code" },
        { key: "first_name", header: "First Name" },
        { key: "last_name", header: "Last Name" },
        { key: "email", header: "Email" },
        { key: "phone", header: "Phone" },
        { key: "employment_type", header: "Type" },
        { key: "basic_salary", header: "Salary", render: r => fmtMoney(r.basic_salary ?? 0) },
        { key: "status", header: "Status" },
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
