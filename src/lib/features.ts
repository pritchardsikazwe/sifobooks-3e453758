import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FeatureFlag = {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  category: string;
  updated_at: string;
};

export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.from("feature_flags").select("key,enabled");
      if (!mounted) return;
      const map: Record<string, boolean> = {};
      (data ?? []).forEach((f: any) => { map[f.key] = f.enabled; });
      setFlags(map);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);
  return { flags, loading, isOn: (k: string) => flags[k] !== false };
}

export async function checkIsSuperAdmin(): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "super_admin" as any });
  return Boolean(data);
}
