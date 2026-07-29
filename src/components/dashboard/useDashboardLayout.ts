import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY_PREFIX = "sifobooks.dashboard.layout.v1";

export type Layout = { order: string[]; hidden: string[] };

async function getScopeKey(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? "anon";
    const { data: p } = await supabase.from("profiles").select("active_company_id").eq("id", uid).maybeSingle();
    return `${KEY_PREFIX}:${uid}:${p?.active_company_id ?? "default"}`;
  } catch {
    return `${KEY_PREFIX}:anon:default`;
  }
}

export function useDashboardLayout(defaults: string[]) {
  const [key, setKey] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>({ order: defaults, hidden: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const k = await getScopeKey();
      if (cancelled) return;
      setKey(k);
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw) as Layout;
          // Merge in any new default widgets that weren't in the saved layout
          const missing = defaults.filter(d => !parsed.order.includes(d) && !parsed.hidden.includes(d));
          setLayout({ order: [...parsed.order.filter(o => defaults.includes(o)), ...missing], hidden: parsed.hidden.filter(h => defaults.includes(h)) });
        }
      } catch { /* noop */ }
      setReady(true);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((next: Layout) => {
    setLayout(next);
    if (key) { try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* noop */ } }
  }, [key]);

  const move = useCallback((activeId: string, overId: string) => {
    if (activeId === overId) return;
    const order = [...layout.order];
    const from = order.indexOf(activeId);
    const to = order.indexOf(overId);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    order.splice(to, 0, activeId);
    persist({ ...layout, order });
  }, [layout, persist]);

  const hide = useCallback((id: string) => {
    persist({ order: layout.order.filter(o => o !== id), hidden: [...layout.hidden, id] });
  }, [layout, persist]);

  const show = useCallback((id: string) => {
    persist({ order: [...layout.order, id], hidden: layout.hidden.filter(h => h !== id) });
  }, [layout, persist]);

  const reset = useCallback(() => {
    persist({ order: defaults, hidden: [] });
  }, [defaults, persist]);

  return { layout, ready, move, hide, show, reset };
}
