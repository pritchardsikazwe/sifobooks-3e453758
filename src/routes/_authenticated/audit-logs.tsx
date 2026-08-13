import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DataTable, type DTColumn } from "@/components/data-table";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — SifoBooks" }, { name: "robots", content: "noindex" }] }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);
  const columns: DTColumn<any>[] = [
    { key: "created_at", header: "When", cell: (r) => <span className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</span> },
    { key: "actor_email", header: "Actor", cell: (r) => r.actor_email ?? "-" },
    { key: "action", header: "Action", cell: (r) => <Badge variant="outline">{r.action}</Badge> },
    { key: "entity_type", header: "Entity", cell: (r) => r.entity_type ?? "-" },
    { key: "details", header: "Details", accessor: (r) => r.details ? JSON.stringify(r.details) : "-", cell: (r) => <span className="text-xs text-muted-foreground max-w-md truncate block">{r.details ? JSON.stringify(r.details) : "-"}</span> },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-emerald-600" />
        <h1 className="text-2xl font-bold">Audit Trail</h1>
      </div>
      <Card className="p-0 overflow-hidden">
        <DataTable
          tableId="audit-logs"
          columns={columns}
          data={rows}
          loading={loading}
          empty="No audit records yet."
          searchPlaceholder="Search audit logs…"
          toolbarLeft={<span className="text-sm font-medium text-foreground">Recent Activity ({rows.length})</span>}
        />
      </Card>
    </div>
  );
}
