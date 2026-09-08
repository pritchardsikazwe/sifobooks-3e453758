import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Server-side: the caller must hold `perm` (owners/super admins always pass). */
async function requirePerm(ctx: { supabase: any; userId: string }, perm: string) {
  const { data, error } = await ctx.supabase.rpc("has_perm", { _perm: perm });
  if (error || !data) throw new Error("You don't have permission to do that");
}

type InviteStaffInput = { email: string; full_name?: string; role_id: string; branch_id?: string | null; pin?: string };

/**
 * Invite (or attach) a staff member to the caller's business with a role and
 * optional branch. Requires `users.manage`. The role must belong to the tenant
 * or be a system template — and a staff member can never be made an owner.
 */
export const inviteStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: InviteStaffInput) => {
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address");
    if (!input.role_id) throw new Error("Choose a role");
    const pin = String(input.pin ?? "").trim();
    if (pin && !/^\d{4,8}$/.test(pin)) throw new Error("PIN must be 4-8 digits");
    return { email, full_name: String(input.full_name ?? "").trim(), role_id: String(input.role_id), branch_id: input.branch_id || null, pin };
  })
  .handler(async ({ data, context }) => {
    await requirePerm(context, "users.manage");
    const { supabase } = context;

    // Resolve tenant (owner id) and validate role/branch through RLS as the caller.
    const { data: acc } = await supabase.rpc("my_access");
    const tenantId = (acc as any)?.tenant_id as string | undefined;
    if (!tenantId) throw new Error("No business found for your account");

    const { data: role } = await supabase.from("rbac_roles").select("id, key, pos_channel, tenant_id, is_system").eq("id", data.role_id).maybeSingle();
    if (!role) throw new Error("Role not found");
    if (role.tenant_id && role.tenant_id !== tenantId) throw new Error("Role belongs to another business");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let userId: string | null = null; let invited = false;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u) => (u.email ?? "").toLowerCase() === data.email);
    if (existing) userId = existing.id;
    else {
      const { data: inv, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { data: { full_name: data.full_name } });
      if (error || !inv?.user) throw new Error(error?.message ?? "Could not invite that email");
      userId = inv.user.id; invited = true;
    }
    if (userId === tenantId) throw new Error("The business owner already has full access");

    // Never let a staff invite grant platform-level roles.
    const { data: sa } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "super_admin").maybeSingle();
    if (sa) throw new Error("That account is a platform administrator and cannot be added as staff");

    const { error: upErr } = await supabaseAdmin.from("staff_members").upsert(
      { tenant_id: tenantId, user_id: userId, email: data.email, full_name: data.full_name || data.email, role_id: data.role_id, branch_id: data.branch_id, is_active: true },
      { onConflict: "tenant_id,user_id" },
    );
    if (upErr) throw new Error(upErr.message);

    // Keep the legacy PIN-till bridge in sync so /w/* terminals still work.
    const legacyRole = role.key?.includes("manager") ? "manager" : role.pos_channel === "restaurant" ? "waiter" : "cashier";
    const { data: leg } = await supabaseAdmin.from("employee_pos_permissions").select("id").eq("user_id", tenantId).eq("worker_user_id", userId).maybeSingle();
    const legacyRow: any = { email: data.email, full_name: data.full_name || data.email, pos_role: legacyRole, is_active: true };
    if (data.pin) legacyRow.pin = data.pin;
    if (leg) await supabaseAdmin.from("employee_pos_permissions").update(legacyRow).eq("id", leg.id);
    else await supabaseAdmin.from("employee_pos_permissions").insert({ ...legacyRow, user_id: tenantId, worker_user_id: userId, pin: data.pin || null });

    return { ok: true, invited, user_id: userId };
  });

type OverrideInput = { manager_email: string; manager_pin: string; action: "pos.refund" | "pos.void" | "pos.discount" | "prices.manage"; entity_id?: string | null };

/**
 * Manager authorisation for a cashier-restricted action (refund/void/discount).
 * The manager's email + PIN are verified server-side; on success a short-lived
 * override row is written that `has_override()` honours in the database guards.
 */
export const requestManagerOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: OverrideInput) => {
    const email = String(input.manager_email ?? "").trim().toLowerCase();
    const pin = String(input.manager_pin ?? "").trim();
    if (!email || !pin) throw new Error("Enter the manager's email and PIN");
    if (!["pos.refund", "pos.void", "pos.discount", "prices.manage"].includes(input.action)) throw new Error("Unknown action");
    return { manager_email: email, manager_pin: pin, action: input.action, entity_id: input.entity_id ?? null };
  })
  .handler(async ({ data, context }) => {
    const { data: acc } = await context.supabase.rpc("my_access");
    const tenantId = (acc as any)?.tenant_id as string | undefined;
    if (!tenantId) throw new Error("No business found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const mgr = list?.users?.find((u) => (u.email ?? "").toLowerCase() === data.manager_email);
    if (!mgr) throw new Error("Manager not recognised");
    if (mgr.id === context.userId) throw new Error("You cannot authorise your own action");

    // PIN lives on the legacy worker row (owners may also set one there).
    const { data: legacy } = await supabaseAdmin.from("employee_pos_permissions")
      .select("pin, is_active").eq("user_id", tenantId).eq("worker_user_id", mgr.id).maybeSingle();
    const isOwner = mgr.id === tenantId;
    if (!isOwner) {
      if (!legacy || legacy.is_active === false || !legacy.pin || legacy.pin !== data.manager_pin) throw new Error("Manager PIN incorrect");
    } else if (legacy?.pin && legacy.pin !== data.manager_pin) {
      throw new Error("Manager PIN incorrect");
    } else if (!legacy?.pin) {
      // Owner without a PIN: require they set one first (prevents email-only bypass).
      throw new Error("The owner must set a manager PIN under Team & Roles before authorising");
    }

    // Verify the manager actually holds the permission in this tenant.
    if (!isOwner) {
      const { data: sm } = await supabaseAdmin.from("staff_members").select("role_id, is_active").eq("tenant_id", tenantId).eq("user_id", mgr.id).maybeSingle();
      if (!sm || !sm.is_active || !sm.role_id) throw new Error("Manager is not active in this business");
      const { data: rp } = await supabaseAdmin.from("rbac_role_permissions").select("permission_key").eq("role_id", sm.role_id).eq("permission_key", data.action).maybeSingle();
      if (!rp) throw new Error("That manager is not allowed to authorise this action");
    }

    const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin.from("pos_manager_overrides").insert({
      tenant_id: tenantId, cashier_user_id: context.userId, manager_user_id: mgr.id,
      action: data.action, entity_id: data.entity_id, expires_at: expires,
    });
    if (error) throw new Error(error.message);
    return { ok: true, expires_at: expires };
  });
