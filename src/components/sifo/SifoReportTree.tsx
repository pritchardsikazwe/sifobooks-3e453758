import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileBarChart3, Search, Star } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SifoReportTreeItem = {
  id: string;
  name: string;
  description?: string;
  url: string;
  category: string;
  tags?: string[];
  favorite?: boolean;
};

export function SifoReportTree({ reports, title = "Report tree" }: { reports: SifoReportTreeItem[]; title?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = query
      ? reports.filter(r => `${r.name} ${r.description || ""} ${r.category} ${(r.tags || []).join(" ")}`.toLowerCase().includes(query))
      : reports;
    return Array.from(new Set(filtered.map(r => r.category))).map(category => ({ category, items: filtered.filter(r => r.category === category) }));
  }, [reports, q]);

  return (
    <aside className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="border-b p-4">
        <div className="flex items-center gap-2 font-semibold"><FileBarChart3 className="h-4 w-4 text-primary" /> {title}</div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a report…" className="pl-9 h-9" />
        </div>
      </div>
      <div className="max-h-[70vh] overflow-auto p-2">
        {groups.map(group => {
          const expanded = open[group.category] ?? true;
          return (
            <div key={group.category} className="mb-1">
              <button type="button" className="flex w-full items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground hover:bg-muted/60" onClick={() => setOpen(v => ({ ...v, [group.category]: !expanded }))}>
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span className="truncate">{group.category}</span><Badge variant="secondary" className="ml-auto text-[10px]">{group.items.length}</Badge>
              </button>
              {expanded && <div className="ml-2 border-l pl-2">
                {group.items.map(report => (
                  <Link key={report.id} to={report.url} className="group flex items-start gap-2 rounded-lg px-2.5 py-2.5 hover:bg-muted/60">
                    <FileBarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                    <span className="min-w-0 flex-1"><span className="flex items-center gap-1 text-sm font-medium">{report.name} {report.favorite && <Star className="h-3 w-3 fill-current" />}</span>{report.description && <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{report.description}</span>}</span>
                  </Link>
                ))}
              </div>}
            </div>
          );
        })}
        {groups.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No reports match your search.</div>}
      </div>
    </aside>
  );
}
