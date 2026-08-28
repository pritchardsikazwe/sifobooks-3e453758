import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { landingFor } from "@/lib/workspace";

/**
 * Post-login entry point. Sends the user to the experience their company was
 * configured for during onboarding (Restaurant, General POS or Accounting).
 */
export const Route = createFileRoute("/_authenticated/launch")({
  beforeLoad: async () => {
    let target = "/dashboard";
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("active_company_id,onboarded")
          .eq("id", u.user.id)
          .maybeSingle();
        if (p && p.onboarded === false) throw redirect({ to: "/onboarding" });
        let companyId = p?.active_company_id as string | null;
        if (!companyId) {
          const { data: cs } = await supabase
            .from("companies")
            .select("id")
            .eq("user_id", u.user.id)
            .order("created_at")
            .limit(1);
          companyId = cs?.[0]?.id ?? null;
        }
        if (companyId) {
          const { data: c } = await supabase
            .from("companies")
            .select("workspace_mode")
            .eq("id", companyId)
            .maybeSingle();
          target = landingFor(c?.workspace_mode);
        }
      }
    } catch (e: any) {
      if (e?.isRedirect || e?.to) throw e;
    }
    throw redirect({ to: target as never });
  },
});
