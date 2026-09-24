import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, FileType, MessageCircle } from "lucide-react";
import { downloadBrandedDoc, type DocKpi, type DocSection, type DocSpec } from "@/lib/doc-engine";

export function exportCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

export function exportExcel(rows: Record<string, any>[], filename: string, sheetName = "Report") {
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const widths = Object.keys(rows[0]).map(h => ({
    wch: Math.min(32, Math.max(12, Math.max(h.length, ...rows.slice(0, 100).map(r => String(r[h] ?? "").length)) + 2)),
  }));
  ws["!cols"] = widths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportPDF(
  rows: Record<string, any>[],
  filename: string,
  title?: string,
  extra?: { subtitle?: string; period?: string; filters?: string[]; kpis?: DocKpi[]; sections?: DocSection[]; docType?: string },
) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]!);
  const spec: DocSpec = {
    docType: extra?.docType ?? "report",
    title: title ?? filename.replace(/[-_]/g, " "),
    subtitle: extra?.subtitle,
    period: extra?.period,
    filters: extra?.filters,
    kpis: extra?.kpis,
    sections: [
      ...(extra?.sections ?? []),
      { columns: headers, rows: rows.map((r) => headers.map((h) => r[h] ?? "")) },
    ],
    filename,
    orientation: headers.length > 7 ? "landscape" : "portrait",
  };
  await downloadBrandedDoc(spec);
}

export function shareReportWhatsApp(title: string, subtitle?: string, rows?: Record<string, any>[]) {
  const sample = (rows ?? []).slice(0, 8);
  const lines = [
    `*SifoBooks — ${title}*`,
    subtitle ?? "",
    sample.length ? "" : "",
    ...sample.map((r, i) => {
      const values = Object.values(r).slice(0, 3).map(v => String(v ?? "")).join(" · ");
      return `${i + 1}. ${values}`;
    }),
    "",
    "Generated from SifoBooks.",
  ].filter(Boolean);
  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportMenu({
  rows, filename, title, subtitle, period, filters, kpis, sections, docType,
}: {
  rows: Record<string, any>[];
  filename: string;
  title?: string;
  subtitle?: string;
  period?: string;
  filters?: string[];
  kpis?: DocKpi[];
  sections?: DocSection[];
  docType?: string;
}) {
  const disabled = !rows.length;
  const pdf = async () => {
    try {
      await exportPDF(rows, filename, title, { subtitle, period, filters, kpis, sections, docType });
      toast.success("Branded PDF is ready.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not build the PDF");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white"
        >
          <Download className="mr-1.5 h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => exportCSV(rows, filename)}>
          <FileText className="mr-2 h-4 w-4" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportExcel(rows, filename)}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void pdf()}>
          <FileType className="mr-2 h-4 w-4" /> PDF (branded)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => shareReportWhatsApp(title ?? filename, subtitle, rows)}>
          <MessageCircle className="mr-2 h-4 w-4" /> Share to WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
