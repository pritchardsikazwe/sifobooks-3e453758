import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type InviteInput = {
  email: string;
  full_name?: string;
  pos_role: string;
  pin?: string;
};

/** Owner-only: attach a POS worker by email. Creates/invites the login if needed. */
export const invitePosWorker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: InviteInput) => {
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address");
    const pin = String(input.pin ?? "").trim();
    if (pin && !/^\d{4,8}$/.test(pin)) throw new Error("PIN must be 4-8 digits");
    return {
      email,
      full_name: String(input.full_name ?? "").trim(),
      pos_role: String(input.pos_role ?? "cashier"),
      pin,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find an existing login for this email, otherwise invite one.
    let workerId: string | null = null;
    let invited = false;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => (u.email ?? "").toLowerCase() === data.email);
    if (existing) {
      workerId = existing.id;
    } else {
      const { data: inv, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
      if (invErr || !inv?.user) throw new Error(invErr?.message ?? "Could not invite that email");
      workerId = inv.user.id;
      invited = true;
    }

    const { data: perm, error } = await supabaseAdmin
      .from("employee_pos_permissions")
      .insert({
        user_id: context.userId,
        worker_user_id: workerId,
        email: data.email,
        full_name: data.full_name || data.email,
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

    return { ok: true, invited, email: data.email };
  });
