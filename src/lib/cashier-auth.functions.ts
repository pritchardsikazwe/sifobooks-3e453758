// @ts-nocheck -- loosely typed after local-database port; see AGENTS.md
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createSessionTokenForUser, adminCreateLocalUser, adminDeleteUser } from "@/lib/db/auth";

function normalizeCashierCode(value: string) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

/**
 * Cashier PIN sign-in.
 *
 * The PIN is NEVER validated in the browser. This server function checks the
 * bcrypt hash through the `verify_cashier_pin` database function (service role
 * only, rate limited, audited) and — only on success — mints a real Supabase
 * session for the cashier's own login. So the cashier ends up with the same
 * authenticated session (and therefore the same RLS rules) as a normal user.
 */
export const cashierPinLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { cashier_code: string; pin: string }) => {
    const cashier_code = normalizeCashierCode(input?.cashier_code);
    const pin = String(input?.pin ?? "").trim();
    if (!/^[A-Z0-9-]{4,20}$/.test(cashier_code)) throw new Error("Enter the cashier ID code");
    if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN must be 4-8 digits");
    return { cashier_code, pin };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perms } = await supabaseAdmin
      .from("employee_pos_permissions")
      .select("id, full_name, display_name, pos_role, email, cashier_code, pin_set_at, pin_disabled, worker_user_id")
      .eq("cashier_code", data.cashier_code)
      .eq("is_active", true)
      .order("pin_set_at", { ascending: false, nullsFirst: false });
    const candidates = (perms ?? []).filter((p: any) => p.pin_set_at && !p.pin_disabled);
    if (candidates.length === 0) return { ok: false as const, error: "Incorrect cashier ID or PIN" };
    let perm: any = null;
    let lastError: string | null = null;
    for (const candidate of candidates) {
      const { data: res, error } = await supabaseAdmin.rpc("verify_cashier_pin" as never, {
        _permission_id: candidate.id, _pin: data.pin,
      } as never);
      if (error) return { ok: false as const, error: "Sign-in is unavailable right now. Try again." };
      const out = res as unknown as { ok: boolean; error?: string };
      if (out?.ok) { perm = candidate; break; }
      lastError = out?.error ?? null;
    }
    if (!perm) return { ok: false as const, error: lastError ?? "Incorrect cashier ID or PIN" };
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    if (perm.worker_user_id && import.meta.env.VITE_SIFOBOOKS_BACKEND === "local") {
      accessToken = await createSessionTokenForUser(String(perm.worker_user_id));
    } else if (perm.worker_user_id) {
      // Hosted: mint a normal session for the cashier's own login via a one-time server-side link.
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(String(perm.worker_user_id));
      const email = u?.user?.email;
      if (email) {
        const { data: link } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
        const hashed = link?.properties?.hashed_token;
        if (hashed) {
          const { createClient } = await import("@supabase/supabase-js");
          const anon = createClient(process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
          const { data: v } = await anon.auth.verifyOtp({ token_hash: hashed, type: "magiclink" });
          accessToken = v?.session?.access_token ?? null;
          refreshToken = v?.session?.refresh_token ?? null;
        }
      }
    }
    if (!accessToken) return { ok: false as const, error: "Cashier login is not available. Ask your manager." };
    return {
      ok: true as const, access_token: accessToken, refresh_token: refreshToken, full_name: (perm.display_name ?? perm.full_name ?? perm.cashier_code) as string | null,
      cashier_code: perm.cashier_code as string | null, pos_role: (perm.pos_role as string | null) ?? "cashier",
    };
  });

/**
 * Unlock the terminal for the cashier who is already signed in.
 * Verification happens in the database (hash + rate limit + audit).
 */
export const verifyOwnPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pin: string }) => {
    const pin = String(input?.pin ?? "").trim();
    if (!/^\d{4,8}$/.test(pin)) throw new Error("Enter your PIN");
    return { pin };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perm } = await supabaseAdmin
      .from("employee_pos_permissions")
      .select("id")
      .eq("worker_user_id", context.userId)
      .eq("is_active", true)
      .maybeSingle();
    if (!perm) return { ok: false as const, error: "No till profile found for this login" };
    const { data: res } = await supabaseAdmin.rpc("verify_cashier_pin" as never, {
      _permission_id: perm.id, _pin: data.pin,
    } as never);
    const out = res as unknown as { ok: boolean; error?: string };
    return out?.ok ? { ok: true as const } : { ok: false as const, error: out?.error ?? "Incorrect PIN" };
  });

export const createCashier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; code?: string; pin: string; role?: string }) => {
    const name = String(input?.name ?? "").trim();
    const code = normalizeCashierCode(input?.code || "");
    const pin = String(input?.pin ?? "").trim();
    const role = String(input?.role ?? "cashier").trim().toLowerCase();
    if (!name) throw new Error("Cashier name is required");
    if (code && !/^[A-Z0-9-]{4,20}$/.test(code)) throw new Error("Cashier ID must be 4-20 letters/numbers");
    if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN must be 4-8 digits");
    if (!["cashier","supervisor","manager"].includes(role)) throw new Error("Invalid POS role");
    return { name, code, pin, role };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin.from("profiles").select("active_company_id").eq("id", context.userId).maybeSingle();
    const companyId = profile?.active_company_id;
    if (!companyId) return { ok: false as const, error: "No active company" };
    const { data: company } = await supabaseAdmin.from("companies").select("id,user_id").eq("id", companyId).maybeSingle();
    const { data: member } = await supabaseAdmin.from("company_members").select("role").eq("company_id", companyId).eq("user_id", context.userId).maybeSingle();
    const allowed = company?.user_id === context.userId || ["owner","admin","administrator"].includes(String(member?.role ?? "").toLowerCase());
    if (!allowed) return { ok: false as const, error: "Only the company owner or administrator can create cashiers" };
    let code = data.code || ("CASH-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase());
    for (let i = 0; i < 8; i++) {
      const { data: existing } = await supabaseAdmin.from("employee_pos_permissions").select("id").eq("cashier_code", code).maybeSingle();
      if (!existing) break;
      code = "CASH-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    }
    const email = `${code.toLowerCase()}@${companyId.slice(0, 8)}.cashier.sifobooks.local`;
    const { data: authUser, error: authError } = await adminCreateLocalUser(email, {
      full_name: data.name,
      sifobooks_cashier: true,
    });
    if (authError || !authUser?.user) return { ok: false as const, error: authError?.message ?? "Could not create cashier login" };
    const { data: perm, error: permError } = await supabaseAdmin.from("employee_pos_permissions").insert({
      user_id: context.userId, worker_user_id: authUser.user.id, company_id: companyId,
      full_name: data.name, display_name: data.name, pos_role: data.role, allow: true, deny: false, is_active: true,
      email, cashier_code: code
    }).select("id,full_name,cashier_code,pos_role").single();
    if (permError) {
      await adminDeleteUser(authUser.user.id);
      return { ok: false as const, error: permError.message };
    }
    const { data: pinRes, error: pinError } = await supabaseAdmin.rpc("set_cashier_pin" as never, { _permission_id: perm.id, _pin: data.pin } as never);
    const out = pinRes as unknown as { ok: boolean; error?: string };
    if (pinError || !out?.ok) {
      await supabaseAdmin.from("employee_pos_permissions").delete().eq("id", perm.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return { ok: false as const, error: pinError?.message ?? out?.error ?? "Could not set cashier PIN" };
    }
    return { ok: true as const, cashier: perm };
  });

/** Hosted admin reset of a team member's password (owner/admin of a shared company only). */
export const adminResetMemberPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetUserId: string; newPassword: string; forceChange?: boolean; reason?: string }) => {
    const targetUserId = String(input?.targetUserId ?? "");
    const newPassword = String(input?.newPassword ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) throw new Error("Invalid user");
    if (newPassword.length < 8) throw new Error("Password must be at least 8 characters");
    return { targetUserId, newPassword, forceChange: input?.forceChange !== false, reason: String(input?.reason ?? "Administrator password reset").slice(0, 200) };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin.from("profiles").select("active_company_id").eq("id", context.userId).maybeSingle();
    const companyId = profile?.active_company_id;
    if (!companyId) return { ok: false as const, error: "No active company" };
    const { data: company } = await supabaseAdmin.from("companies").select("user_id").eq("id", companyId).maybeSingle();
    const { data: me } = await supabaseAdmin.from("company_members").select("role").eq("company_id", companyId).eq("user_id", context.userId).maybeSingle();
    const allowed = company?.user_id === context.userId || ["owner","admin","administrator"].includes(String(me?.role ?? "").toLowerCase());
    if (!allowed) return { ok: false as const, error: "Only the company owner or administrator can reset passwords" };
    const { data: target } = await supabaseAdmin.from("company_members").select("user_id").eq("company_id", companyId).eq("user_id", data.targetUserId).maybeSingle();
    if (!target && company?.user_id !== data.targetUserId) return { ok: false as const, error: "That user is not a member of this company" };
    const { data: existing } = await supabaseAdmin.auth.admin.getUserById(data.targetUserId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, {
      password: data.newPassword,
      user_metadata: { ...(existing?.user?.user_metadata ?? {}), must_change_password: data.forceChange },
    });
    if (error) return { ok: false as const, error: "Password reset failed" };
    await supabaseAdmin.from("audit_logs").insert({ user_id: context.userId, action: "admin_password_reset", entity_type: "user", entity_id: data.targetUserId, details: { company_id: companyId, reason: data.reason, force_change: data.forceChange } }).then(() => {}, () => {});
    return { ok: true as const };
  });


/** Administration: transfer a company to another existing member. */
export const transferCompanyOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; targetUserId: string }) => {
    const companyId = String(input?.companyId ?? "");
    const targetUserId = String(input?.targetUserId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(companyId) || !/^[0-9a-f-]{36}$/i.test(targetUserId)) throw new Error("Invalid company or user");
    return { companyId, targetUserId };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company } = await supabaseAdmin.from("companies").select("id,user_id,name").eq("id", data.companyId).maybeSingle();
    if (!company) return { ok: false as const, error: "Company not found" };
    const { data: me } = await supabaseAdmin.from("company_members").select("role").eq("company_id", data.companyId).eq("user_id", context.userId).maybeSingle();
    if (company.user_id !== context.userId && !["owner","admin","administrator"].includes(String(me?.role ?? "").toLowerCase()))
      return { ok: false as const, error: "Only the company owner or administrator can transfer ownership" };
    const { data: target } = await supabaseAdmin.from("company_members").select("id,user_id").eq("company_id", data.companyId).eq("user_id", data.targetUserId).maybeSingle();
    if (!target) return { ok: false as const, error: "The new owner must already be a member of this company" };
    const { error: companyError } = await supabaseAdmin.from("companies").update({ user_id: data.targetUserId }).eq("id", data.companyId);
    if (companyError) return { ok: false as const, error: companyError.message };
    await supabaseAdmin.from("company_members").update({ role: "admin" }).eq("company_id", data.companyId).eq("user_id", context.userId);
    await supabaseAdmin.from("company_members").update({ role: "owner" }).eq("company_id", data.companyId).eq("user_id", data.targetUserId);
    await supabaseAdmin.from("audit_logs").insert({ user_id: context.userId, action: "company_ownership_transferred", entity_type: "company", entity_id: data.companyId, details: { target_user_id: data.targetUserId } }).then(() => {}, () => {});
    return { ok: true as const };
  });

/** Administration: change a member's login email without changing their company/data. */
export const changeUserEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetUserId: string; email: string }) => {
    const targetUserId = String(input?.targetUserId ?? "");
    const email = String(input?.email ?? "").trim().toLowerCase();
    if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) throw new Error("Invalid user");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email");
    return { targetUserId, email };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("company_members").select("company_id,role").eq("user_id", context.userId).in("role", ["owner","admin","administrator"]).limit(1).maybeSingle();
    if (!me) return { ok: false as const, error: "Only a company owner or administrator can change user emails" };
    const { data: targetMember } = await supabaseAdmin.from("company_members").select("user_id").eq("company_id", me.company_id).eq("user_id", data.targetUserId).maybeSingle();
    if (!targetMember && data.targetUserId !== context.userId) return { ok: false as const, error: "That user is not in your company" };
    const { data: existing } = await supabaseAdmin.auth.admin.getUserById(data.targetUserId);
    if (!existing?.user) return { ok: false as const, error: "User not found" };
    const { data: conflict } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const duplicate = conflict?.users?.find((u: any) => u.email?.toLowerCase() === data.email && u.id !== data.targetUserId);
    if (duplicate) return { ok: false as const, error: "That email is already registered. Delete or use the existing account first." };
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.targetUserId, { email: data.email, email_confirm: true });
    if (error) return { ok: false as const, error: error.message };
    await supabaseAdmin.from("profiles").update({ email: data.email }).eq("id", data.targetUserId);
    await supabaseAdmin.from("audit_logs").insert({ user_id: context.userId, action: "admin_email_changed", entity_type: "user", entity_id: data.targetUserId, details: { company_id: me.company_id, new_email: data.email } }).then(() => {}, () => {});
    return { ok: true as const };
  });

/** Administration: permanently delete a user after ownership checks. */
export const deleteManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetUserId: string; confirmation: string }) => {
    const targetUserId = String(input?.targetUserId ?? "");
    const confirmation = String(input?.confirmation ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) throw new Error("Invalid user");
    if (confirmation !== "DELETE USER") throw new Error("Type DELETE USER to confirm");
    return { targetUserId, confirmation };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.targetUserId === context.userId) return { ok: false as const, error: "You cannot delete your own account from this screen" };
    const { data: me } = await supabaseAdmin.from("company_members").select("company_id,role").eq("user_id", context.userId).in("role", ["owner","admin","administrator"]).limit(1).maybeSingle();
    if (!me) return { ok: false as const, error: "Only a company owner or administrator can delete users" };
    const { data: target } = await supabaseAdmin.from("company_members").select("id,role").eq("company_id", me.company_id).eq("user_id", data.targetUserId).maybeSingle();
    if (!target) return { ok: false as const, error: "That user is not a member of your company" };
    if (target.role === "owner") return { ok: false as const, error: "Transfer company ownership before deleting the owner" };
    const { data: owned } = await supabaseAdmin.from("companies").select("id").eq("user_id", data.targetUserId).limit(2);
    if ((owned ?? []).length) return { ok: false as const, error: "This user owns another company. Transfer those companies first." };
    await supabaseAdmin.from("company_members").delete().eq("company_id", me.company_id).eq("user_id", data.targetUserId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.targetUserId);
    if (error) return { ok: false as const, error: error.message };
    await supabaseAdmin.from("audit_logs").insert({ user_id: context.userId, action: "admin_user_deleted", entity_type: "user", entity_id: data.targetUserId, details: { company_id: me.company_id } }).then(() => {}, () => {});
    return { ok: true as const };
  });
