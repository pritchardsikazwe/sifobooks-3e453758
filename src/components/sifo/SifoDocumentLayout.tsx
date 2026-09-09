import type { ReactNode } from "react";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type SifoDocumentLine = { id: string; cells: ReactNode[] };

export function SifoDocumentLayout({ title, number, status, description, back, actions, party, metadata, lines, lineHeaders, lineActions, totals, footer, impact }: {
  title: string; number?: string | null; status?: string | null; description?: string; back?: ReactNode; actions?: ReactNode; party?: ReactNode; metadata?: ReactNode;
  lines: SifoDocumentLine[]; lineHeaders: string[]; lineActions?: ReactNode; totals: ReactNode; footer?: ReactNode; impact?: ReactNode;
}) {
  const print = () => window.print();
  return (
    <div className="sifo-document-page min-h-full bg-muted/20 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5 print:hidden">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">{back}<div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{number && <span className="font-mono text-sm text-muted-foreground">{number}</span>}{status && <Badge variant="secondary" className="capitalize">{status}</Badge>}</div>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div></div>
            <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" size="sm" onClick={print}><Printer className="mr-2 h-4 w-4" /> Print / Preview</Button>{actions}</div>
          </div>
          {(party || metadata) && <div className="grid gap-4 border-t pt-4 md:grid-cols-2">{party && <div className="min-w-0">{party}</div>}{metadata && <div className="min-w-0 md:text-right">{metadata}</div>}</div>}
        </div>

        <article className="sifo-print-document rounded-xl border bg-card p-5 shadow-sm sm:p-7 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
          <header className="mb-6 hidden border-b-2 border-foreground/20 pb-4 print:block"><div className="flex items-start justify-between gap-6"><div><div className="text-xl font-bold">SifoBooks</div><div className="mt-1 text-xs text-muted-foreground">Business document</div></div><div className="text-right"><div className="text-lg font-bold uppercase tracking-wide">{title}</div>{number && <div className="mt-1 font-mono text-xs">{number}</div>}{status && <div className="mt-1 text-xs uppercase">{status}</div>}</div></div></header>
          <div className="mb-5 grid gap-4 border-b pb-4 md:grid-cols-2 print:grid-cols-2">{party && <div>{party}</div>}{metadata && <div className="md:text-right">{metadata}</div>}</div>

          <Card className="overflow-hidden border-0 shadow-none print:border print:shadow-none"><CardHeader className="border-b bg-muted/20 py-3 print:bg-gray-50"><CardTitle className="text-sm font-semibold">Line items</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm print:min-w-0"><thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground print:table-header-group"><tr>{lineHeaders.map(h => <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">{h}</th>)}{lineActions && <th className="sticky right-0 bg-muted/30 px-3 py-2 text-right print:hidden">Actions</th>}</tr></thead><tbody className="divide-y">{lines.map(line => <tr key={line.id} className="group align-middle hover:bg-muted/20 print:hover:bg-transparent">{line.cells.map((cell, i) => <td key={`${line.id}-${i}`} className="px-3 py-2.5">{cell}</td>)}{lineActions && <td className="sticky right-0 bg-card px-3 py-2.5 text-right print:hidden">{lineActions}</td>}</tr>)}{lines.length === 0 && <tr><td colSpan={lineHeaders.length + (lineActions ? 1 : 0)} className="px-4 py-12 text-center text-sm text-muted-foreground">No line items yet.</td></tr>}</tbody></table></div></CardContent></Card>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px] print:grid-cols-[1fr_300px]"> <div className="space-y-5">{impact && <Card className="print-no-break"><CardHeader className="py-3"><CardTitle className="text-sm">Accounting & inventory impact</CardTitle></CardHeader><CardContent>{impact}</CardContent></Card>}{footer && <Card className="print-no-break"><CardContent className="p-5">{footer}</CardContent></Card>}</div><Card className="h-fit print-no-break"><CardHeader className="border-b py-3"><CardTitle className="text-sm">Document totals</CardTitle></CardHeader><CardContent className="p-5">{totals}</CardContent></Card></div>
          <footer className="mt-8 hidden border-t border-foreground/20 pt-3 print:block"><div className="flex justify-between gap-4 text-[10px] text-muted-foreground"><span>Generated by SifoBooks · {new Date().toLocaleString()}</span><span>Page <span className="sifo-page-number" /></span></div></footer>
        </article>
      </div>
      <style>{`@media print { @page { size:A4; margin:14mm 12mm 16mm; } html,body { background:#fff!important; } body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } .sifo-document-page { padding:0!important; background:#fff!important; } .sifo-print-document { max-width:none!important; width:100%!important; } table { width:100%!important; border-collapse:collapse!important; } tr { break-inside:avoid; } .print-no-break { break-inside:avoid; } .sifo-page-number::after { content:counter(page); } }`}</style>
    </div>
  );
}

export function BackToDocumentList({ onClick, label = "Back" }: { onClick?: () => void; label?: string }) { return <Button type="button" variant="ghost" size="sm" onClick={onClick}><ArrowLeft className="mr-1.5 h-4 w-4" />{label}</Button>; }
