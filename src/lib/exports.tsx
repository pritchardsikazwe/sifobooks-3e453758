import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react";
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

export function exportExcel(rows: Record<string, any>[], filename: string, sheetName = "Sheet1") {
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * PDF export — always rendered on the tenant's own letterhead through the
 * shared document engine, never as a bare table.
 */
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

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
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
    } catch (e: any) {
      toast.error(e?.message ?? "Could not build the PDF");
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportCSV(rows, filename)}>
          <FileText className="h-4 w-4 mr-2" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportExcel(rows, filename)}>
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void pdf()}>
          <FileType className="h-4 w-4 mr-2" /> PDF (branded)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
