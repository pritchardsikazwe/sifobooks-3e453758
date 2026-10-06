import { supabase } from "@/integrations/supabase/client";

/** Resolve the company exactly once in the shared tenant-selection order. */
export async function resolveActiveCompanyId(userId: string): Promise<string | null> {
  const { data: profile } = await supabase.from("profiles").select("active_company_id").eq("id", userId).maybeSingle();
  let companyId = (profile?.active_company_id as string | null) ?? null;
  if (companyId) return companyId;

  const { data: owned } = await supabase.from("companies").select("id").eq("user_id", userId).order("created_at").limit(1);
  companyId = owned?.[0]?.id ?? null;
  if (companyId) return companyId;

  const { data: member } = await supabase.from("company_members").select("company_id").eq("user_id", userId).order("created_at").limit(1);
  return (member?.[0]?.company_id as string | undefined) ?? null;
}
