import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { HeartHandshake, Handshake, ReceiptText, Flag, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DTColumn } from "@/components/data-table";
import { SimpleCrud } from "@/components/SimpleCrud";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";
import { RequireModule } from "@/components/RequireModule";

export const Route = createFileRoute("/_authenticated/donors")({
  head: () => ({
    meta: [
      { title: "Donors & Pledges — SifoBooks" },
      { name: "description", content: "Donor register, pledges, donation receipts, grant reporting milestones and per-donor statements." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <RequireModule moduleKey="donors"><DonorsPage /></RequireModule>,
});

const DONOR_TYPES = [
  { value: "institution", label: "Institution" },
  { value: "individual", label: "Individual" },
  { value: "government", label: "Government" },
  { value: "corporate", label: "Corporate" },
  { value: "foundation", label: "Foundation" },
];
const PLEDGE_STATUS = [
  { value: "pledged", label: "Pledged" },
  { value: "partial", label: "Partly received" },
  { value: "received", label: "Fully received" },
  { value: "cancelled", label: "Cancelled" },
];
const MILESTONE_TYPES = [
  { value: "report", label: "Narrative / financial report" },
  { value: "disbursement", label: "Disbursement tranche" },
  { value: "deliverable", label: "Deliverable" },
  { value: "audit", label: "Audit" },
];
const MILESTONE_STATUS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
  { value: "overdue", label: "Overdue" },
  { value: "done", label: "Done" },
];

function DonorsPage() {
  const [donors, setDonors] = useState<any[]>([]);
  const [pledges, setPledges] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [stmtDonor, setStmtDonor] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [d, p, r, g] = await Promise.all([
        supabase.from("donors").select("*").order("name"),
        supabase.from("donor_pledges").select("*").order("pledge_date", { ascending: false }),
        supabase.from("donation_receipts").select("*").order("receipt_date", { ascending: false }),
        supabase.from("school_grants").select("id, grant_name, grant_ref").order("grant_name"),
      ]);
      setDonors(d.data ?? []); setPledges(p.data ?? []); setReceipts(r.data ?? []); setGrants(g.data ?? []);
    })();
  }, []);

  const donorOpts = donors.map(d => ({ value: d.id, label: d.name }));
  const donorName = (id: string) => donors.find(d => d.id === id)?.name ?? "—";

  const kpis = useMemo(() => {
    const pledged = pledges.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const received = receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const restricted = pledges.filter(p => p.is_restricted).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return { pledged, received, outstanding: Math.max(pledged - received, 0), restricted };
  }, [pledges, receipts]);

  const statement = useMemo(() => {
    if (!stmtDonor) return [];
    const rows = [
      ...pledges.filter(p => p.donor_id === stmtDonor).map(p => ({ date: p.pledge_date, ref: p.pledge_ref ?? "—", detail: p.purpose ?? "Pledge", pledged: Number(p.amount) || 0, received: 0 })),
      ...receipts.filter(r => r.donor_id === stmtDonor).map(r => ({ date: r.receipt_date, ref: r.receipt_no ?? "—", detail: r.fund_name ?? "Donation received", pledged: 0, received: Number(r.amount) || 0 })),
    ].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    let bal = 0;
    return rows.map(r => { bal += r.pledged - r.received; return { ...r, balance: bal }; });
  }, [stmtDonor, pledges, receipts]);

  const statementColumns: DTColumn<any>[] = [
    { key: "date", header: "Date" },
    { key: "ref", header: "Ref", cell: (r) => <span className="font-mono text-xs">{r.ref}</span> },
    { key: "detail", header: "Detail" },
    { key: "pledged", header: "Pledged", align: "right", cell: (r) => r.pledged ? fmtMoney(r.pledged) : "—" },
    { key: "received", header: "Received", align: "right", cell: (r) => r.received ? fmtMoney(r.received) : "—" },
    { key: "balance", header: "Balance", align: "right", cell: (r) => <span className="font-medium">{fmtMoney(r.balance)}</span> },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <HeartHandshake className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Donors & Fundraising</h1>
          <p className="text-sm text-muted-foreground">Donor register, pledges vs receipts, restricted funds, grant milestones and donor statements.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total pledged", value: kpis.pledged },
          { label: "Received", value: kpis.received },
          { label: "Outstanding pledges", value: kpis.outstanding },
          { label: "Restricted funds", value: kpis.restricted },
        ].map(k => (
          <Card key={k.label} className="p-4">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="text-xl font-semibold tabular-nums">{fmtMoney(k.value)}</div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="donors">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="donors"><Users className="h-4 w-4 mr-1.5" />Donors</TabsTrigger>
          <TabsTrigger value="pledges"><Handshake className="h-4 w-4 mr-1.5" />Pledges</TabsTrigger>
          <TabsTrigger value="receipts"><ReceiptText className="h-4 w-4 mr-1.5" />Donations Received</TabsTrigger>
          <TabsTrigger value="milestones"><Flag className="h-4 w-4 mr-1.5" />Milestones & Deadlines</TabsTrigger>
          <TabsTrigger value="statement"><ReceiptText className="h-4 w-4 mr-1.5" />Donor Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="donors" className="mt-2">
          <SimpleCrud
            title="Donor" icon={Users} table="donors" orderBy={{ column: "name" }}
            searchKeys={["name", "donor_code", "contact_person"]} statusField="status"
            extraFilters={[{ name: "donor_type", label: "Type", options: DONOR_TYPES }]}
            columns={[
              { key: "donor_code", header: "Code" },
              { key: "name", header: "Donor" },
              { key: "donor_type", header: "Type", render: (r: any) => <Badge variant="outline">{r.donor_type}</Badge> },
              { key: "contact_person", header: "Contact" },
              { key: "email", header: "Email" },
              { key: "phone", header: "Phone" },
              { key: "country", header: "Country" },
              { key: "status", header: "Status" },
            ]}
            fields={[
              { name: "name", label: "Donor name", required: true, colSpan: 2 },
              { name: "donor_code", label: "Donor code" },
              { name: "donor_type", label: "Type", type: "select", options: DONOR_TYPES, defaultValue: "institution" },
              { name: "contact_person", label: "Contact person" },
              { name: "email", label: "Email" },
              { name: "phone", label: "Phone" },
              { name: "country", label: "Country", defaultValue: "Zambia" },
              { name: "focus_area", label: "Focus area" },
              { name: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }], defaultValue: "active" },
              { name: "address", label: "Address", type: "textarea" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </TabsContent>

        <TabsContent value="pledges" className="mt-2">
          <SimpleCrud
            title="Pledge" icon={Handshake} table="donor_pledges" orderBy={{ column: "pledge_date", ascending: false }}
            searchKeys={["pledge_ref", "purpose", "fund_name"]} statusField="status" dateField="pledge_date"
            columns={[
              { key: "pledge_ref", header: "Ref" },
              { key: "donor_id", header: "Donor", render: (r: any) => donorName(r.donor_id) },
              { key: "pledge_date", header: "Pledged" },
              { key: "expected_date", header: "Expected" },
              { key: "amount", header: "Amount", align: "right", render: (r: any) => fmtMoney(Number(r.amount ?? 0), r.currency ?? "ZMW") },
              { key: "received_amount", header: "Received", align: "right", render: (r: any) => fmtMoney(Number(r.received_amount ?? 0), r.currency ?? "ZMW") },
              { key: "balance", header: "Outstanding", align: "right", render: (r: any) => fmtMoney(Math.max((Number(r.amount) || 0) - (Number(r.received_amount) || 0), 0), r.currency ?? "ZMW") },
              { key: "fund_name", header: "Fund" },
              { key: "is_restricted", header: "Restricted", render: (r: any) => (r.is_restricted ? "Yes" : "No") },
              { key: "status", header: "Status", render: (r: any) => <Badge>{r.status}</Badge> },
            ]}
            fields={[
              { name: "donor_id", label: "Donor", type: "select", options: donorOpts, required: true },
              { name: "pledge_ref", label: "Pledge ref" },
              { name: "pledge_date", label: "Pledge date", type: "date", defaultValue: new Date().toISOString().slice(0, 10) },
              { name: "expected_date", label: "Expected receipt", type: "date" },
              { name: "amount", label: "Amount (K)", type: "number", required: true },
              { name: "received_amount", label: "Received to date", type: "number" },
              { name: "fund_name", label: "Fund / project" },
              { name: "is_restricted", label: "Restricted fund", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }], defaultValue: "false" },
              { name: "status", label: "Status", type: "select", options: PLEDGE_STATUS, defaultValue: "pledged" },
              { name: "purpose", label: "Purpose", type: "textarea" },
            ]}
          />
        </TabsContent>

        <TabsContent value="receipts" className="mt-2">
          <SimpleCrud
            title="Donation Received" icon={ReceiptText} table="donation_receipts" orderBy={{ column: "receipt_date", ascending: false }}
            searchKeys={["receipt_no", "reference", "fund_name"]} dateField="receipt_date"
            columns={[
              { key: "receipt_no", header: "Receipt #" },
              { key: "donor_id", header: "Donor", render: (r: any) => donorName(r.donor_id) },
              { key: "receipt_date", header: "Date" },
              { key: "amount", header: "Amount", align: "right", render: (r: any) => fmtMoney(Number(r.amount ?? 0), r.currency ?? "ZMW") },
              { key: "method", header: "Method" },
              { key: "fund_name", header: "Fund" },
              { key: "reference", header: "Reference" },
            ]}
            fields={[
              { name: "donor_id", label: "Donor", type: "select", options: donorOpts, required: true },
              { name: "pledge_id", label: "Against pledge", type: "select", options: pledges.map(p => ({ value: p.id, label: `${p.pledge_ref ?? "Pledge"} — ${fmtMoney(Number(p.amount) || 0)}` })) },
              { name: "receipt_no", label: "Receipt #", defaultValue: `DON-${Date.now().toString().slice(-6)}` },
              { name: "receipt_date", label: "Date", type: "date", defaultValue: new Date().toISOString().slice(0, 10) },
              { name: "amount", label: "Amount (K)", type: "number", required: true },
              { name: "method", label: "Method", type: "select", options: [{ value: "bank", label: "Bank" }, { value: "cash", label: "Cash" }, { value: "mobile", label: "Mobile money" }, { value: "in_kind", label: "In kind" }], defaultValue: "bank" },
              { name: "fund_name", label: "Fund / project" },
              { name: "reference", label: "Reference" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </TabsContent>

        <TabsContent value="milestones" className="mt-2">
          <SimpleCrud
            title="Milestone" icon={Flag} table="grant_milestones" orderBy={{ column: "due_date" }}
            searchKeys={["title", "owner"]} statusField="status" dateField="due_date"
            extraFilters={[{ name: "milestone_type", label: "Type", options: MILESTONE_TYPES }]}
            columns={[
              { key: "title", header: "Milestone" },
              { key: "donor_id", header: "Donor", render: (r: any) => donorName(r.donor_id) },
              { key: "grant_id", header: "Grant", render: (r: any) => grants.find(g => g.id === r.grant_id)?.grant_name ?? "—" },
              { key: "milestone_type", header: "Type", render: (r: any) => <Badge variant="outline">{r.milestone_type}</Badge> },
              { key: "due_date", header: "Due" },
              { key: "amount", header: "Amount", align: "right", render: (r: any) => fmtMoney(Number(r.amount ?? 0)) },
              { key: "owner", header: "Owner" },
              { key: "status", header: "Status", render: (r: any) => {
                const overdue = r.status !== "done" && r.due_date && r.due_date < new Date().toISOString().slice(0, 10);
                return <Badge variant={overdue ? "destructive" : "default"}>{overdue ? "overdue" : r.status}</Badge>;
              } },
            ]}
            fields={[
              { name: "title", label: "Milestone", required: true, colSpan: 2 },
              { name: "donor_id", label: "Donor", type: "select", options: donorOpts },
              { name: "grant_id", label: "Grant", type: "select", options: grants.map(g => ({ value: g.id, label: g.grant_name })) },
              { name: "milestone_type", label: "Type", type: "select", options: MILESTONE_TYPES, defaultValue: "report" },
              { name: "due_date", label: "Due date", type: "date" },
              { name: "completed_date", label: "Completed on", type: "date" },
              { name: "amount", label: "Amount (K)", type: "number" },
              { name: "owner", label: "Responsible" },
              { name: "status", label: "Status", type: "select", options: MILESTONE_STATUS, defaultValue: "pending" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
          />
        </TabsContent>

        <TabsContent value="statement" className="mt-2">
          <Card className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">Donor statement {stmtDonor ? `— ${donorName(stmtDonor)}` : ""}</div>
              <div className="flex items-center gap-2">
                <Select value={stmtDonor} onValueChange={setStmtDonor}>
                  <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Select donor" /></SelectTrigger>
                  <SelectContent>{donorOpts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
                <ExportMenu
                  rows={statement.map(s => ({ Date: s.date, Ref: s.ref, Detail: s.detail, Pledged: s.pledged, Received: s.received, Balance: s.balance }))}
                  filename={`donor-statement-${donorName(stmtDonor)}`} title="Donor Statement"
                />
              </div>
            </div>
            <DataTable
              tableId="donor-statement"
              columns={statementColumns}
              data={statement.map((s, i) => ({ ...s, id: i }))}
              empty="Select a donor to view their statement."
              searchPlaceholder={null}
              totals={(list) => ({
                pledged: fmtMoney(list.reduce((s, r) => s + r.pledged, 0)),
                received: fmtMoney(list.reduce((s, r) => s + r.received, 0)),
              })}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
