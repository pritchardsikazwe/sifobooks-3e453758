import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CoaAccount } from "@/components/selectors/AccountSelector";

/**
 * Loads the tenant chart of accounts once and exposes helpers used by the
 * shared selectors and posting previews.
 */
export function useCoaAccounts() {
  const [accounts, setAccounts] = useState<CoaAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("chart_of_accounts")
        .select("id, account_code, account_name, account_type, parent_id, is_active")
        .order("account_code");
      if (!alive) return;
      setAccounts((data ?? []) as CoaAccount[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const byId = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const byCode = useMemo(() => new Map(accounts.map(a => [a.account_code, a])), [accounts]);

  /** First account matching any of the given codes — used for sensible defaults. */
  const defaultFor = (...codes: string[]) => codes.map(c => byCode.get(c)).find(Boolean) ?? null;

  const get = (id: string | null | undefined) => (id ? byId.get(id) ?? null : null);

  return { accounts, loading, byId, byCode, get, defaultFor };
}
