import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { resolveAuthenticatedContext } from "@/lib/workspace-context";

/**
 * Post-login entry point.
 *
 * The destination comes from the single resolver: company membership + company
 * product entitlement + the user's role/permissions + their operational
 * context. A role alone never selects a product, and when the answer is
 * ambiguous the user is sent to the chooser instead of being guessed into a
 * workspace.
 */
export const Route = createFileRoute("/_authenticated/launch")({
  beforeLoad: async () => {
    let target = "/dashboard";
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const ctx = await resolveAuthenticatedContext();
        const isStaff = Boolean(ctx?.access && !ctx.access.is_owner && !ctx.access.is_super_admin);
        if (!isStaff) {
          // Only the person who owns the books goes through company onboarding.
          const { data: p } = await supabase
            .from("profiles").select("onboarded").eq("id", u.user.id).maybeSingle();
          if (p && p.onboarded === false) throw redirect({ to: "/onboarding" });
        }
        if (ctx) target = ctx.resolution.route;
      }
    } catch (e: any) {
      if (e?.isRedirect || e?.to) throw e;
    }
    throw redirect({ to: target as never });
  },
});
