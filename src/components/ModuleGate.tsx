// @ts-nocheck -- loosely typed Supabase-compat client; see AGENTS.md
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { PackageX } from "lucide-react";

/**
 * Hides a screen whose records are not available in the current database
 * (planned/inactive module). Probes each required table once; if any is
 * missing, the user sees a clear "not yet available" state instead of a
 * screen that is guaranteed to fail. Works for both the web and Windows
 * databases, so a module appears automatically where its records exist.
 */
const MISSING = /PGRST205|42P01|no such table|TABLE_NOT_FOUND|Could not find the table|does not exist/i;
const cache = new Map<string, Promise<boolean>>();

export function isMissingTableError(err: any): boolean {
  return !!err && MISSING.test(String(err.message ?? err.code ?? err));
}

export function probeTable(table: string): Promise<boolean> {
  if (!cache.has(table)) {
    cache.set(table, (async () => {
      try {
        const { error } = await supabase.from(table).select("id").limit(1);
        return !isMissingTableError(error);
      } catch (e) {
        return !isMissingTableError(e);
      }
    })());
  }
  return cache.get(table)!;
}

export function useTablesAvailable(tables: string[]): boolean | null {
  const key = tables.join(",");
  const [ok, setOk] = useState<boolean | null>(tables.length ? null : true);
  useEffect(() => {
    let live = true;
    if (!tables.length) { setOk(true); return; }
    Promise.all(tables.map(probeTable)).then((r) => { if (live) setOk(r.every(Boolean)); });
    return () => { live = false; };
  }, [key]);
  return ok;
}

export function ModuleUnavailable({ name }: { name: string }) {
  return (
    <div className="p-6">
      <Card className="mx-auto max-w-xl p-8 text-center">
        <PackageX className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{name} is not yet available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This module is still being prepared for this edition of SifoBooks. Your other records are not affected.
        </p>
      </Card>
    </div>
  );
}

export function ModuleGate({ name, tables, children }: { name: string; tables: string[]; children: ReactNode }) {
  const ok = useTablesAvailable(tables);
  if (ok === null) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!ok) return <ModuleUnavailable name={name} />;
  return <>{children}</>;
}
