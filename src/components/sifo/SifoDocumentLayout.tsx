import type { ReactNode } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type SifoDocumentLine = {
  id: string;
  cells: ReactNode[];
};

export function SifoDocumentLayout({
  title,
  number,
  status,
  description,
  back,
  actions,
  party,
  metadata,
  lines,
  lineHeaders,
  lineActions,
  totals,
  footer,
  impact,
}: {
  title: string;
  number?: string | null;
  status?: string | null;
  description?: string;
  back?: ReactNode;
  actions?: ReactNode;
  party?: ReactNode;
  metadata?: ReactNode;
  lines: SifoDocumentLine[];
  lineHeaders: string[];
  lineActions?: ReactNode;
  totals: ReactNode;
  footer?: ReactNode;
  impact?: ReactNode;
}) {
  return (
    <div className="min-h-full bg-muted/20 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {back}
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
                  {number && <span className="font-mono text-sm text-muted-foreground">{number}</span>}
                  {status && <Badge variant="secondary" className="capitalize">{status}</Badge>}
                </div>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </div>
          {(party || metadata) && (
            <div className="grid gap-4 border-t pt-4 md:grid-cols-2">
              {party && <div className="min-w-0">{party}</div>}
              {metadata && <div className="min-w-0 md:text-right">{metadata}</div>}
            </div>
          )}
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20 py-3">
            <CardTitle className="text-sm font-semibold">Line items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {lineHeaders.map((header) => <th key={header} className="whitespace-nowrap px-3 py-2 text-left font-medium">{header}</th>)}
                    {lineActions && <th className="sticky right-0 bg-muted/30 px-3 py-2 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line) => (
                    <tr key={line.id} className="group align-middle hover:bg-muted/20">
                      {line.cells.map((cell, index) => <td key={`${line.id}-${index}`} className="px-3 py-2.5">{cell}</td>)}
                      {lineActions && <td className="sticky right-0 bg-card px-3 py-2.5 text-right group-hover:bg-muted/20">{lineActions}</td>}
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr><td colSpan={lineHeaders.length + (lineActions ? 1 : 0)} className="px-4 py-12 text-center text-sm text-muted-foreground">No line items yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            {impact && <Card><CardHeader className="py-3"><CardTitle className="text-sm">Accounting & inventory impact</CardTitle></CardHeader><CardContent>{impact}</CardContent></Card>}
            {footer && <Card><CardContent className="p-5">{footer}</CardContent></Card>}
          </div>
          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader className="border-b py-3"><CardTitle className="text-sm">Document totals</CardTitle></CardHeader>
            <CardContent className="p-5">{totals}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function BackToDocumentList({ onClick, label = "Back" }: { onClick?: () => void; label?: string }) {
  return <Button type="button" variant="ghost" size="sm" onClick={onClick}><ArrowLeft className="mr-1.5 h-4 w-4" />{label}</Button>;
}
