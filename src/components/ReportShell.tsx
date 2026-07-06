import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { exportCsv } from "@/lib/reports";
import type { ReactNode } from "react";

export function ReportShell({
  title, subtitle, loading, filename, rows, children, filters,
}: {
  title: string; subtitle?: string; loading?: boolean;
  filename: string; rows: Record<string, any>[];
  children: ReactNode; filters?: ReactNode;
}) {
  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/reports"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {filters}
          <Button size="sm" variant="outline" onClick={() => exportCsv(rows, `${filename}.csv`)} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>
      <Card className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : children}
      </Card>
    </div>
  );
}
