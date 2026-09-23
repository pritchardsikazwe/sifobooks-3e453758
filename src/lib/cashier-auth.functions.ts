import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
      .select("id, full_name, display_name, pos_role, email, cashier_code, pin_set_at, pin_disabled")
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
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink", email: perm.email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (linkErr || !tokenHash) return { ok: false as const, error: "Cashier login is not available. Ask your manager." };
    return {
      ok: true as const, token_hash: tokenHash, full_name: (perm.display_name ?? perm.full_name ?? perm.cashier_code) as string | null,
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
    let code = data.code || ("C" + Math.random().toString(36).slice(2, 7).toUpperCase());
    for (let i = 0; i < 8; i++) {
      const { data: existing } = await supabaseAdmin.from("employee_pos_permissions").select("id").eq("cashier_code", code).maybeSingle();
      if (!existing) break;
      code = "C" + Math.random().toString(36).slice(2, 7).toUpperCase();
    }
    const email = `${code.toLowerCase()}@${companyId.slice(0, 8)}.cashier.sifobooks.local`;
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { full_name: data.name, sifobooks_cashier: true }
    });
    if (authError || !authUser.user) return { ok: false as const, error: authError?.message ?? "Could not create cashier login" };
    const { data: perm, error: permError } = await supabaseAdmin.from("employee_pos_permissions").insert({
      user_id: context.userId, worker_user_id: authUser.user.id, company_id: companyId,
      full_name: data.name, display_name: data.name, pos_role: data.role, allow: true, is_active: true,
      email, cashier_code: code
    }).select("id,full_name,cashier_code,pos_role").single();
    if (permError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
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
