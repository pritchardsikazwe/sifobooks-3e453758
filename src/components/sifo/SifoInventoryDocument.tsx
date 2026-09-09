import type { ReactNode } from "react";
import { ArrowLeft, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type SifoInventoryLine = { id: string; cells: ReactNode[] };

export function SifoInventoryDocument({
  title,
  number,
  status,
  description,
  back,
  actions,
  source,
  destination,
  metadata,
  lines,
  lineHeaders,
  totals,
  impact,
  footer,
}: {
  title: string;
  number?: string | null;
  status?: string | null;
  description?: string;
  back?: ReactNode;
  actions?: ReactNode;
  source?: ReactNode;
  destination?: ReactNode;
  metadata?: ReactNode;
  lines: SifoInventoryLine[];
  lineHeaders: string[];
  totals?: ReactNode;
  impact?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-full bg-muted/20 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {back ?? <Button variant="ghost" size="sm"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button>}
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
                  {number && <span className="font-mono text-sm text-muted-foreground">{number}</span>}
                  {status && <Badge variant="secondary" className="capitalize">{status.replaceAll("_", " ")}</Badge>}
                </div>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">{actions}</div>
          </div>
          {(source || destination || metadata) && (
            <div className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-3">
              {source && <div><div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</div>{source}</div>}
              {destination && <div><div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Destination</div>{destination}</div>}
              {metadata && <div className="md:text-right">{metadata}</div>}
            </div>
          )}
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20 py-3"><CardTitle className="text-sm">Inventory lines</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>{lineHeaders.map(h => <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map(line => <tr key={line.id} className="align-middle hover:bg-muted/20">{line.cells.map((cell, i) => <td key={`${line.id}-${i}`} className="px-3 py-2.5">{cell}</td>)}</tr>)}
                  {!lines.length && <tr><td colSpan={lineHeaders.length} className="px-4 py-12 text-center text-sm text-muted-foreground">No inventory lines yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            {impact && <Card><CardHeader className="py-3"><CardTitle className="text-sm">Stock & accounting impact</CardTitle></CardHeader><CardContent>{impact}</CardContent></Card>}
            {footer && <Card><CardContent className="p-5">{footer}</CardContent></Card>}
          </div>
          {totals && <Card className="h-fit lg:sticky lg:top-4"><CardHeader className="border-b py-3"><CardTitle className="text-sm">Document totals</CardTitle></CardHeader><CardContent className="p-5">{totals}</CardContent></Card>}
        </div>
      </div>
    </div>
  );
}
