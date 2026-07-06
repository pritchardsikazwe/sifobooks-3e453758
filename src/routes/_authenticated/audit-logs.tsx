import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — EdgeCore" }, { name: "robots", content: "noindex" }] }),
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
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-emerald-600" />
        <h1 className="text-2xl font-bold">Audit Trail</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Activity ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          : rows.length === 0 ? <div className="text-center py-12 text-muted-foreground">No audit records yet.</div>
          : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead>
                <TableHead>Entity</TableHead><TableHead>Details</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell>{r.actor_email ?? "-"}</TableCell>
                    <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                    <TableCell>{r.entity_type ?? "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md truncate">{r.details ? JSON.stringify(r.details) : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
