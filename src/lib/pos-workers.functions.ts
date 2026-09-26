// @ts-nocheck -- loosely typed after local-database port; see AGENTS.md
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type InviteInput = {
  email?: string;
  full_name?: string;
  pos_role: string;
  pin?: string;
  cashier_code?: string;
};

/** Owner-only: attach a POS worker by email. Creates/invites the login if needed. */
export const invitePosWorker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: InviteInput) => {
    const email = String(input.email ?? "").trim().toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address");
    const cashier_code = String(input.cashier_code ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
    const pin = String(input.pin ?? "").trim();
    if (pin && !/^\d{4,8}$/.test(pin)) throw new Error("PIN must be 4-8 digits");
    return {
      email,
      full_name: String(input.full_name ?? "").trim(),
      pos_role: String(input.pos_role ?? "cashier"),
      pin,
      cashier_code,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let workerId: string | null = null;
    let invited = false;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const normalizedCode = data.cashier_code || "CASH-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const { data: existingCode } = await supabaseAdmin.from("employee_pos_permissions").select("id").eq("cashier_code", normalizedCode).maybeSingle();
    if (existingCode) throw new Error("That cashier code is already in use");
    let loginEmail = data.email;
    if (loginEmail) {
      const existing = list?.users?.find((u) => (u.email ?? "").toLowerCase() === loginEmail);
      if (existing) workerId = existing.id;
      else {
        const { data: inv, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(loginEmail);
        if (invErr || !inv?.user) throw new Error(invErr?.message ?? "Could not invite that email");
        workerId = inv.user.id; invited = true;
      }
    } else {
      loginEmail = "cashier." + normalizedCode.toLowerCase() + "@sifobooks.local";
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({ email: loginEmail, password: crypto.randomUUID() + "-Cashier!", email_confirm: true });
      if (createErr || !created?.user) throw new Error(createErr?.message ?? "Could not create cashier identity");
      workerId = created.user.id;
    }

    const { data: perm, error } = await supabaseAdmin
      .from("employee_pos_permissions")
      .insert({
        user_id: context.userId,
        worker_user_id: workerId,
        email: loginEmail,
        full_name: data.full_name || normalizedCode,
        display_name: data.full_name || normalizedCode,
        cashier_code: normalizedCode,
        pos_role: data.pos_role,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // PIN is hashed server-side; the plaintext value is never persisted.
    if (data.pin && perm?.id) {
      const { data: pinRes, error: pinErr } = await supabaseAdmin.rpc("set_cashier_pin" as never, {
        _permission_id: perm.id, _pin: data.pin,
      } as never);
      if (pinErr) throw new Error(pinErr.message);
      const ok = (pinRes as unknown as { ok?: boolean })?.ok;
      if (!ok) throw new Error("Could not set the worker PIN");
    }

    return { ok: true, invited, email: loginEmail, cashier_code: normalizedCode };
  });


type CashierInput = {
  name: string;
  code?: string;
  pin: string;
  role?: string;
};

/** Owner-only: create an internal POS cashier identity using cashier code + PIN. */
export const createCashier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CashierInput) => {
    const name = String(input.name ?? "").trim();
    const code = String(input.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
    const pin = String(input.pin ?? "").trim();
    const role = String(input.role ?? "cashier").trim() || "cashier";
    if (!name) throw new Error("Cashier name is required");
    if (pin && !/^\d{4,8}$/.test(pin)) throw new Error("PIN must be 4-8 digits");
    return { name, code, pin, role };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cashierCode = data.code || "CASH-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const { data: existingCode } = await supabaseAdmin
      .from("employee_pos_permissions")
      .select("id")
      .eq("cashier_code", cashierCode)
      .maybeSingle();
    if (existingCode) throw new Error("That cashier ID code is already in use");

    const loginEmail = "cashier." + cashierCode.toLowerCase() + "@sifobooks.local";
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: loginEmail,
      password: crypto.randomUUID() + "-Cashier!",
      email_confirm: true,
    });
    if (createErr || !created?.user) {
      throw new Error(createErr?.message ?? "Could not create cashier identity");
    }

    const { data: perm, error } = await supabaseAdmin
      .from("employee_pos_permissions")
      .insert({
        user_id: context.userId,
        worker_user_id: created.user.id,
        email: loginEmail,
        full_name: data.name,
        display_name: data.name,
        cashier_code: cashierCode,
        pos_role: data.role,
      })
      .select("id,cashier_code,email,full_name,pos_role")
      .single();

    if (error) {
      try { await supabaseAdmin.auth.admin.deleteUser(created.user.id); } catch {}
      throw new Error(error.message);
    }

    const { data: pinRes, error: pinErr } = await supabaseAdmin.rpc("set_cashier_pin" as never, {
      _permission_id: perm.id,
      _pin: data.pin,
    } as never);
    if (pinErr) throw new Error(pinErr.message);
    const ok = (pinRes as unknown as { ok?: boolean })?.ok;
    if (!ok) throw new Error("Could not set the cashier PIN");

    return {
      ok: true,
      cashier: {
        id: perm.id,
        cashier_code: cashierCode,
        email: loginEmail,
        name: data.name,
        role: data.role,
      },
    };
  });
