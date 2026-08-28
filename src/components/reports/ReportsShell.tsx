import { Link } from "@tanstack/react-router";
import { ArrowLeft, Printer, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { printCurrentView } from "@/services/printDocument";
import { ExportMenu } from "@/lib/exports";
import { exportBrandedPdf } from "@/lib/reports/pdf";
import { toggleFavorite, isFavorite, markGenerated, trackVisit } from "@/lib/reports/favorites";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type KPI = { label: string; value: string; sub?: string; tone?: "default" | "up" | "down" };

/**
 * Modern report viewer shell: branded header, KPI strip, chart/table slots,
 * printable layout, and universal export (PDF/Excel/CSV/Print).
 */
export function ReportsShell({
  reportId, title, subtitle, company, loading, kpis, chart, filters, children,
  filename, exportRows, pdfHead, pdfBody, pdfFoot, pdfOrientation = "portrait",
}: {
  reportId: string;
  title: string;
  subtitle?: string;
  company?: string;
  loading?: boolean;
  kpis?: KPI[];
  chart?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  filename: string;
  /** Rows for CSV/XLSX export. */
  exportRows: Record<string, any>[];
  /** Rows for branded PDF (columns → cells). */
  pdfHead?: string[];
  pdfBody?: (string | number)[][];
  pdfFoot?: (string | number)[][];
  pdfOrientation?: "portrait" | "landscape";
}) {
  const [fav, setFav] = useState(false);
  useEffect(() => { trackVisit(reportId); setFav(isFavorite(reportId)); }, [reportId]);

  const brandedPdf = () => {
    if (!pdfHead || !pdfBody) return;
    markGenerated(reportId);
    exportBrandedPdf({
      title, subtitle, company, filename, orientation: pdfOrientation,
      head: pdfHead, body: pdfBody, foot: pdfFoot,
      kpis: kpis?.map(k => ({ label: k.label, value: k.value })),
    });
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl print:p-0 print:max-w-none">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/reports"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground truncate">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm" variant="ghost"
            onClick={() => setFav(toggleFavorite(reportId))}
            title={fav ? "Remove favourite" : "Add to favourites"}
          >
            <Star className={cn("h-4 w-4", fav && "fill-amber-400 text-amber-400")} />
          </Button>
          <Button size="sm" variant="outline" onClick={() => void printCurrentView(title, subtitle, exportRows)}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          {pdfHead && pdfBody && (
            <Button size="sm" variant="outline" onClick={brandedPdf}>PDF</Button>
          )}
          <ExportMenu rows={exportRows} filename={filename} title={title} />
        </div>
      </div>

      {filters && <div className="print:hidden">{filters}</div>}

      {/* Branded print header */}
      <div className="hidden print:block mb-4">
        <div className="text-xs uppercase tracking-widest text-emerald-800">SifoBooks {company ? `• ${company}` : ""}</div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
        <p className="text-xs text-slate-500 mt-1">Generated {new Date().toLocaleString()}</p>
      </div>

      {/* KPI strip */}
      {kpis && kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{k.label}</div>
              <div className={cn(
                "mt-1 text-xl font-semibold tabular-nums",
                k.tone === "up" && "text-emerald-600",
                k.tone === "down" && "text-rose-600",
              )}>{k.value}</div>
              {k.sub && <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {chart && <div className="rounded-lg border border-border bg-card p-4 shadow-sm print:hidden">{chart}</div>}

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm print:border-0 print:shadow-none print:p-0">
        {loading
          ? <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          : children}
      </div>
    </div>
  );
}
