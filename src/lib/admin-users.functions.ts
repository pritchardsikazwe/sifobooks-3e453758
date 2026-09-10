/**
 * Platform account administration.
 *
 * Every function here is privileged, so each one re-checks that the CALLER is
 * a platform super administrator against the database (`has_role`) before the
 * service-role client is loaded. Being signed in is never enough.
 *
 * Nothing here touches accounting, inventory, POS or payroll records — it only
 * administers sign-in accounts and platform roles, and each action is written
 * to `audit_logs`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

/** Platform roles defined by the database `app_role` enum. */
type AppRole = "admin" | "manager" | "accountant" | "sales" | "purchaser" | "hr" | "viewer" | "super_admin";

async function assertSuperAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden — platform super administrators only");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function logAction(context: Ctx, action: string, entityId: string | null, metadata: Record<string, unknown>) {
  const db = await admin();
  await db.from("audit_logs").insert({
    user_id: context.userId,
    action,
    entity_type: "auth_user",
    entity_id: entityId,
    details: metadata as never,
  });
}

function assertPassword(password: string) {
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
}

export type AdminAuthUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  disabled: boolean;
  providers: string[];
};

/** Sign-in accounts with their real auth signals (never any password material). */
export const adminListAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminAuthUser[]> => {
    await assertSuperAdmin(context as Ctx);
    const db = await admin();

    const out: AdminAuthUser[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const users = data?.users ?? [];
      for (const u of users) {
        const bannedUntil = (u as any).banned_until as string | null | undefined;
        out.push({
          id: u.id,
          email: u.email ?? null,
          fullName: (u.user_metadata?.full_name as string) ?? null,
          createdAt: u.created_at ?? null,
          lastSignInAt: u.last_sign_in_at ?? null,
          emailConfirmed: Boolean(u.email_confirmed_at),
          disabled: Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now()),
          providers: ((u.app_metadata?.providers as string[]) ?? []).filter(Boolean),
        });
      }
      if (users.length < 200) break;
    }
    return out;
  });

/** Set a new sign-in password for an account. */
export const adminSetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; password: string }) => data)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as Ctx);
    assertPassword(data.password);
    const db = await admin();
    const { error } = await db.auth.admin.updateUserById(data.userId, {
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    await logAction(context as Ctx, "admin.password_set", data.userId, {});
    return { ok: true as const };
  });

/** Block or restore sign-in for an account. Data is never deleted. */
export const adminSetDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; disabled: boolean }) => data)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as Ctx);
    if (data.userId === (context as Ctx).userId) throw new Error("You cannot disable your own account");
    const db = await admin();
    const { error } = await db.auth.admin.updateUserById(data.userId, {
      ban_duration: data.disabled ? "876000h" : "none",
    } as any);
    if (error) throw new Error(error.message);
    await logAction(context as Ctx, data.disabled ? "admin.account_disabled" : "admin.account_enabled", data.userId, {});
    return { ok: true as const };
  });

/** Mark an email address as confirmed so the person can sign in. */
export const adminConfirmEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as Ctx);
    const db = await admin();
    const { error } = await db.auth.admin.updateUserById(data.userId, { email_confirm: true });
    if (error) throw new Error(error.message);
    await logAction(context as Ctx, "admin.email_confirmed", data.userId, {});
    return { ok: true as const };
  });

/** Create a sign-in account. Optionally grants a platform role at the same time. */
export const adminCreateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; password: string; fullName?: string; role?: string | null }) => data)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as Ctx);
    assertPassword(data.password);
    const db = await admin();
    const { data: created, error } = await db.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: data.fullName ? { full_name: data.fullName } : undefined,
    });
    if (error) throw new Error(error.message);
    const id = created?.user?.id ?? null;
    if (id && data.role) {
      const { error: roleError } = await db.from("user_roles").insert({ user_id: id, role: data.role as AppRole });
      if (roleError && !`${roleError.message}`.includes("duplicate")) throw new Error(roleError.message);
    }
    await logAction(context as Ctx, "admin.account_created", id, { email: data.email, role: data.role ?? null });
    return { ok: true as const, userId: id };
  });

/** Grant or revoke a platform role by email — no need to hunt for the user id. */
export const adminSetRoleByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; role: string; grant: boolean }) => data)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as Ctx);
    const db = await admin();
    const email = data.email.trim().toLowerCase();

    const { data: profile } = await db.from("profiles").select("id").ilike("email", email).maybeSingle();
    let userId = (profile?.id as string | undefined) ?? null;
    if (!userId) {
      const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list?.users?.find((u: any) => (u.email ?? "").toLowerCase() === email)?.id ?? null;
    }
    if (!userId) throw new Error(`No account found for ${email}`);

    if (data.grant) {
      const { error } = await db.from("user_roles").insert({ user_id: userId, role: data.role as AppRole });
      if (error && !`${error.message}`.includes("duplicate")) throw new Error(error.message);
    } else {
      if (data.role === "super_admin" && userId === (context as Ctx).userId) {
        throw new Error("You cannot remove your own super admin role");
      }
      const { error } = await db.from("user_roles").delete().eq("user_id", userId).eq("role", data.role as AppRole);
      if (error) throw new Error(error.message);
    }
    await logAction(context as Ctx, data.grant ? "admin.role_granted" : "admin.role_revoked", userId, { email, role: data.role });
    return { ok: true as const, userId };
  });

/** Permanently remove a sign-in account. Company records are not deleted. */
export const adminDeleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as Ctx);
    if (data.userId === (context as Ctx).userId) throw new Error("You cannot delete your own account");
    const db = await admin();
    const { error } = await db.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAction(context as Ctx, "admin.account_deleted", data.userId, {});
    return { ok: true as const };
  });
