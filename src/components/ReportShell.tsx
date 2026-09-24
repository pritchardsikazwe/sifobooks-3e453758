import { Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, CalendarDays, Loader2, Printer, Sparkles } from "lucide-react";
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
    <div className="min-h-screen bg-[#f4f8f6] p-4 sm:p-6 lg:p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-7xl space-y-5 print:max-w-none print:space-y-0">
        <header className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#063d37] via-[#075447] to-[#0b6b55] text-white shadow-xl shadow-emerald-950/10 print:hidden">
          <div className="px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e7bd4b] text-[#153b36] shadow-lg">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#f2ce68]">
                    <Sparkles className="h-3.5 w-3.5" />
                    SifoBooks Reports
                  </div>
                  <h1 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
                  {subtitle && <p className="mt-1 max-w-3xl text-sm text-white/70">{subtitle}</p>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link to="/reports">
                  <Button variant="ghost" size="sm" className="border border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Reports Centre
                  </Button>
                </Link>
                {filters}
                <Button
                  size="sm"
                  className="bg-[#e7bd4b] font-bold text-[#153b36] hover:bg-[#f3d477]"
                  onClick={() => void printCurrentView(title, subtitle, rows)}
                >
                  <Printer className="mr-1.5 h-4 w-4" /> Print
                </Button>
                <ExportMenu
                  rows={rows}
                  filename={filename}
                  title={title}
                  subtitle={subtitle}
                  docType="report"
                />
              </div>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-[#dcae34] via-[#f3d477] to-transparent" />
        </header>

        <div className="hidden print:block border-b-2 border-[#063d37] pb-4 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-[#087b4b]">SifoBooks Reports</div>
              <h1 className="mt-1 text-2xl font-black text-slate-900">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
            </div>
            <div className="text-right text-xs text-slate-500">Generated {new Date().toLocaleString()}</div>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[22px] border-[#d9e6e1] bg-white shadow-[0_8px_30px_rgba(6,61,55,0.06)] print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
              Preparing report…
            </div>
          ) : (
            <div className="p-4 sm:p-6 lg:p-7 print:p-0">{children}</div>
          )}
        </Card>

        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 print:hidden">
          <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Live posted transaction data</span>
          <span>Professional reporting • SifoBooks</span>
        </div>
      </div>
    </div>
  );
}
