import { useEffect, useState } from "react";
import { DEFAULT_BRANDING, loadBranding, type DocumentBranding } from "@/lib/branding";

/** Read-only access to the active tenant's document branding. */
export function useBranding() {
  const [branding, setBranding] = useState<DocumentBranding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadBranding()
      .then((b) => { if (alive) setBranding(b); })
      .catch(() => { /* fall back to neutral defaults — never another tenant's identity */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { branding, loading };
}
