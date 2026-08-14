import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type DTColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { ExportMenu } from "@/lib/exports";

import { RequireModule } from "@/components/RequireModule";

export const Route = createFileRoute("/_authenticated/teaching-materials")({
  head: () => ({ meta: [{ title: "Teaching Materials — SifoBooks" }] }),
  component: () => <RequireModule moduleKey="school_erp"><Page /></RequireModule>,
});

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("teaching_material_requests").select("*").eq("user_id", u.user.id).order("request_date", { ascending: false });
    setRows((data ?? []) as any);
    const { data: qs } = await supabase.from("supplier_quotations").select("*").eq("user_id", u.user.id);
    const grouped: Record<string, any[]> = {};
    for (const row of qs ?? []) { if (!row.request_id) continue; (grouped[row.request_id] ||= []).push(row); }
    setQuotes(grouped);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const selectQuote = async (quoteId: string, requestId: string, amount: number) => {
    await supabase.from("supplier_quotations").update({ is_selected: false }).eq("request_id", requestId);
    await supabase.from("supplier_quotations").update({ is_selected: true }).eq("id", quoteId);
    await supabase.from("teaching_material_requests").update({ status: "approved", actual_cost: amount }).eq("id", requestId);
    toast.success("Supplier selected"); load();
  };

  const requestColumns: DTColumn<any>[] = [
    { key: "request_no", header: "Req #", cell: r => <span className="font-mono text-xs">{r.request_no}</span> },
    { key: "item_name", header: "Item", cell: r => <span className="font-medium">{r.item_name}</span> },
    { key: "category", header: "Category", cell: r => <Badge variant="outline">{r.category}</Badge> },
    { key: "quantity", header: "Qty", align: "right" },
    { key: "estimated_cost", header: "Est.", align: "right", cell: r => fmtMoney(Number(r.estimated_cost)) },
    { key: "status", header: "Status", cell: r => <Badge>{r.status}</Badge> },
    { key: "quotes", header: "Quotes", sortable: false, cell: r => {
        const qs = quotes[r.id] || [];
        return (
          <div className="flex flex-col gap-1">
            {qs.map((quote: any) => (
              <div key={quote.id} className="flex items-center gap-2 text-xs">
                <span>{quote.supplier_name}: {fmtMoney(Number(quote.quoted_amount))}</span>
                {quote.is_selected ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => selectQuote(quote.id, r.id, Number(quote.quoted_amount))}>Select</Button>}
              </div>
            ))}
            <Button asChild size="sm" variant="outline" className="h-7 mt-1">
              <Link to="/teaching-materials/$id/quote" params={{ id: r.id }}>+ Add Quote</Link>
            </Button>
          </div>
        );
      } },
  ];

  const exportRows = rows.map(r => ({
    RequestNo: r.request_no, Date: r.request_date, Category: r.category,
    Item: r.item_name, Qty: r.quantity, Estimated: r.estimated_cost,
    Actual: r.actual_cost ?? "", By: r.requested_by ?? "", Status: r.status,
  }));

  return (
    <div className="px-6 py-6 max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Teaching Materials</h1>
          <p className="text-sm text-muted-foreground">Classroom materials & learning equipment — 3-quote comparison before purchase.</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu rows={exportRows} filename="teaching-materials" title="Teaching Material Requests" />
          <Button asChild size="sm" className="h-9" variant="save"><Link to="/teaching-materials/new"><Plus className="h-4 w-4 mr-1" /> New Request</Link></Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable
          tableId="teaching-materials"
          columns={requestColumns}
          data={rows}
          loading={loading}
          empty="No requests yet."
          totals={rs => ({ estimated_cost: fmtMoney(rs.reduce((s, r) => s + Number(r.estimated_cost || 0), 0)) })}
        />
      </Card>
    </div>
  );
}
