import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Printer, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExportMenu } from "@/lib/exports";
import { printCurrentView } from "@/services/printDocument";
import type { ReactNode } from "react";

export function ReportShell({
  title, subtitle, loading, filename, rows, children, filters,
}: {
  title: string; subtitle?: string; loading?: boolean;
  filename: string; rows: Record<string, any>[];
  children: ReactNode; filters?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5f8f7] p-4 sm:p-6 space-y-5 max-w-7xl print:p-0 print:max-w-none print:bg-white">
      <div className="overflow-hidden rounded-[24px] bg-[#073b38] text-white shadow-lg print:hidden">
        <div className="p-5 sm:p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#e5b83f] text-[#173b3a] shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-[#e5b83f]">SifoBooks Reports</div>
              <h1 className="text-2xl font-black tracking-tight">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {filters}
        <div className="flex items-center gap-3">
          <Link to="/reports"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {filters}
          <Button size="sm" className="bg-[#e5b83f] text-[#173b3a] hover:bg-[#f0ca58]" onClick={() => void printCurrentView(title, subtitle, rows)}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <ExportMenu rows={rows} filename={filename} title={title} subtitle={subtitle} />
        </div>
      </div>
      </div>
      <div className="hidden print:block mb-4 border-b-2 border-[#073b38] pb-3">
        <div className="text-[10px] font-black uppercase tracking-[.2em] text-[#087b4b]">SifoBooks Reports</div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </div>
      <Card className="rounded-2xl border-[#dbe5e2] bg-white p-5 shadow-sm print:p-0 print:shadow-none print:border-0">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : children}
      </Card>
    </div>
  );
}

