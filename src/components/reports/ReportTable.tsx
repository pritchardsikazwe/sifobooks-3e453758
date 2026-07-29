import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { acct } from "@/lib/reports/format";

export type RTColumn = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  className?: string;
};

export type RTRow = {
  cells: (string | number | null | undefined | ReactNode)[];
  /** Section header / totals / subtotal styling. */
  variant?: "row" | "section" | "subtotal" | "total";
  onClick?: () => void;
};

/**
 * Presentational report table with sticky headers, zebra rows, subtotals,
 * grand totals, tabular numbers, and negatives-in-brackets formatting
 * (via `acct` on numeric-align cells when the cell is a number).
 */
export function ReportTable({
  columns, rows, footer, dense,
}: {
  columns: RTColumn[];
  rows: RTRow[];
  footer?: RTRow;
  dense?: boolean;
}) {
  const pad = dense ? "py-1.5" : "py-2.5";
  const alignClass = (a?: string) =>
    a === "right" ? "text-right tabular-nums" : a === "center" ? "text-center" : "text-left";

  const renderCell = (cell: any, col: RTColumn) => {
    if (typeof cell === "number") return acct(cell);
    return cell ?? "";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border sticky top-0 z-[1] print:static">
          <tr>
            {columns.map(c => (
              <th
                key={c.key}
                className={cn(
                  "px-3 py-2 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground",
                  alignClass(c.align), c.className,
                )}
              >{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const variant = r.variant ?? "row";
            const isSection = variant === "section";
            const isSubtotal = variant === "subtotal";
            const isTotal = variant === "total";
            return (
              <tr
                key={i}
                onClick={r.onClick}
                className={cn(
                  "border-b border-border/50",
                  variant === "row" && "hover:bg-muted/40 even:bg-muted/10",
                  isSection && "bg-muted/60 font-semibold text-foreground",
                  isSubtotal && "bg-emerald-50/40 font-semibold border-t border-border",
                  isTotal && "bg-emerald-700 text-white font-bold",
                  r.onClick && "cursor-pointer",
                )}
              >
                {r.cells.map((cell, j) => (
                  <td
                    key={j}
                    className={cn(
                      "px-3", pad,
                      alignClass(columns[j]?.align),
                      columns[j]?.className,
                    )}
                  >{renderCell(cell, columns[j])}</td>
                ))}
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="py-10 text-center text-muted-foreground">No data.</td></tr>
          )}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="border-t-2 border-emerald-700 bg-emerald-700 text-white font-bold">
              {footer.cells.map((cell, j) => (
                <td key={j} className={cn("px-3 py-3", alignClass(columns[j]?.align))}>
                  {renderCell(cell, columns[j])}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
