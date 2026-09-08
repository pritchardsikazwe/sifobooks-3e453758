import { createServerFn } from "@tanstack/react-start";

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
  .inputValidator((input: { email: string; pin: string }) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    const pin = String(input?.pin ?? "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter the cashier's email");
    if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN must be 4-8 digits");
    return { email, pin };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: perm } = await supabaseAdmin
      .from("employee_pos_permissions")
      .select("id, full_name, pos_role, email")
      .eq("email", data.email)
      .eq("is_active", true)
      .maybeSingle();

    // Same message either way — no account enumeration from the terminal.
    if (!perm) return { ok: false as const, error: "Incorrect email or PIN" };

    const { data: res, error } = await supabaseAdmin.rpc("verify_cashier_pin" as never, {
      _permission_id: perm.id,
      _pin: data.pin,
    } as never);
    if (error) return { ok: false as const, error: "Sign-in is unavailable right now. Try again." };

    const out = res as unknown as { ok: boolean; error?: string; pos_role?: string };
    if (!out?.ok) return { ok: false as const, error: out?.error ?? "Incorrect email or PIN" };

    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: data.email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (linkErr || !tokenHash) {
      return { ok: false as const, error: "This cashier has no active login. Ask your manager." };
    }

    return {
      ok: true as const,
      token_hash: tokenHash,
      full_name: perm.full_name as string | null,
      pos_role: (perm.pos_role as string | null) ?? "cashier",
    };
  });

/**
 * Unlock the terminal for the cashier who is already signed in.
 * Verification happens in the database (hash + rate limit + audit).
 */
export const verifyOwnPin = createServerFn({ method: "POST" })
  .middleware([(await import("@/integrations/supabase/auth-middleware")).requireSupabaseAuth])
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
