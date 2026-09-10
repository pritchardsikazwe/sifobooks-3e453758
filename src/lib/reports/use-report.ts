import { useCallback, useEffect, useState } from "react";
import type { ReportResult } from "./engine";

/**
 * Runs a report loader against the live tenant data.
 * Loaders are read-only; nothing is written or seeded.
 */
export function useReport<P>(loader: (p: P) => Promise<ReportResult>, params: P, deps: unknown[]) {
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await loader(params));
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error while reading your data.");
      setResult(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { result, loading, error, refresh: run };
}
