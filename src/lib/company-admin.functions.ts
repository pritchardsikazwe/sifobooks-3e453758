/**
 * Replacing a company's administrator email.
 *
 * The administrator email IS the company owner identity, so a replacement
 * transfers `companies.user_id` and the `owner` membership row to the account
 * behind the new email, and strips owner/admin membership from the previous
 * administrator. No accounting, inventory, POS, payroll, subscription, branch
 * or settings record is touched, and the company itself is never recreated.
 *
 * Authorisation is decided in the database (`can_manage_company`) using the
 * authenticated caller — the browser-supplied company id is only a lookup key.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidEmail, normaliseEmail } from "@/lib/company-admin";

type Ctx = { supabase: any; userId: string };

async function assertCanManage(context: Ctx, companyId: string) {
  const { data, error } = await context.supabase.rpc("can_manage_company", {
    _company: companyId,
    _user: context.userId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden — only this company's owner or administrator may do this");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function emailOf(db: any, userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data: prof } = await db.from("profiles").select("email").eq("id", userId).maybeSingle();
  if (prof?.email) return String(prof.email).toLowerCase();
  const { data } = await db.auth.admin.getUserById(userId);
  return data?.user?.email ? String(data.user.email).toLowerCase() : null;
}

async function findUserByEmail(db: any, email: string): Promise<string | null> {
  const { data: prof } = await db.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (prof?.id) return prof.id as string;
  for (let page = 1; page <= 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const users = data?.users ?? [];
    const hit = users.find((u: any) => (u.email ?? "").toLowerCase() === email);
    if (hit) return hit.id as string;
    if (users.length < 200) break;
  }
  return null;
}

export type CompanyAdministrator = {
  companyId: string;
  companyName: string;
  adminUserId: string | null;
  adminEmail: string | null;
  adminName: string | null;
  /** The company's public contact email, which may differ from the admin email. */
  contactEmail: string | null;
  pendingClaim: boolean;
  canManage: true;
};

/** Who is the current administrator of this company? */
export const getCompanyAdministrator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { companyId: string }) => data)
  .handler(async ({ data, context }): Promise<CompanyAdministrator> => {
    await assertCanManage(context as Ctx, data.companyId);
    const db = await admin();
    const { data: company, error } = await db
      .from("companies")
      .select("id, name, user_id, email")
      .eq("id", data.companyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!company) throw new Error("Company not found");

    const adminUserId = (company.user_id as string | null) ?? null;
    const adminEmail = await emailOf(db, adminUserId);
    let adminName: string | null = null;
    let pendingClaim = false;
    if (adminUserId) {
      const { data: prof } = await db.from("profiles").select("full_name").eq("id", adminUserId).maybeSingle();
      adminName = (prof?.full_name as string) ?? null;
      const { data: authUser } = await db.auth.admin.getUserById(adminUserId);
      pendingClaim = !authUser?.user?.last_sign_in_at;
    }

    return {
      companyId: company.id,
      companyName: company.name,
      adminUserId,
      adminEmail,
      adminName,
      contactEmail: (company.email as string | null) ?? null,
      pendingClaim,
      canManage: true,
    };
  });

export type AdminReplacementResult = {
  ok: true;
  newAdminEmail: string;
  newAdminUserId: string;
  invited: boolean;
  previousAdminEmail: string | null;
  selfHandover: boolean;
};

/**
 * Replace the company administrator email. The new email becomes the sole
 * administrator identity; the previous one keeps no owner/admin reference.
 */
export const replaceCompanyAdministratorEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { companyId: string; newEmail: string; confirmCompanyName: string }) => data)
  .handler(async ({ data, context }): Promise<AdminReplacementResult> => {
    const ctx = context as Ctx;
    const companyId = data.companyId;
    const newEmail = normaliseEmail(data.newEmail);
    if (!isValidEmail(newEmail)) throw new Error("Enter a valid email address");

    await assertCanManage(ctx, companyId);
    const db = await admin();

    const { data: company, error: cErr } = await db
      .from("companies")
      .select("id, name, user_id, email, status")
      .eq("id", companyId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!company) throw new Error("Company not found");
    if ((company.status ?? "active") !== "active") {
      throw new Error("This company is archived — restore it before changing the administrator");
    }
    if ((data.confirmCompanyName ?? "").trim() !== String(company.name).trim()) {
      throw new Error("Type the company name exactly to confirm the replacement");
    }

    const oldUserId = (company.user_id as string | null) ?? null;
    const oldEmail = await emailOf(db, oldUserId);
    if (oldEmail && oldEmail === newEmail) throw new Error("That is already the current administrator email");

    // Resolve, or securely invite, the incoming administrator.
    let newUserId = await findUserByEmail(db, newEmail);
    let invited = false;
    if (!newUserId) {
      const { data: inviteData, error: inviteError } = await db.auth.admin.inviteUserByEmail(newEmail);
      if (inviteError) throw new Error(`Could not invite ${newEmail}: ${inviteError.message}`);
      newUserId = inviteData?.user?.id ?? null;
      invited = true;
      if (!newUserId) throw new Error("Invitation could not be created");
    }
    if (newUserId === oldUserId) throw new Error("That account is already the administrator");

    const log = async (action: string, details: Record<string, unknown>) => {
      await db.from("audit_logs").insert({
        user_id: ctx.userId,
        action,
        entity_type: "company",
        entity_id: companyId,
        details: {
          company_name: company.name,
          previous_admin_email: oldEmail,
          previous_admin_user_id: oldUserId,
          new_admin_email: newEmail,
          new_admin_user_id: newUserId,
          invited,
          ...details,
        } as never,
      });
    };

    try {
      // 1. Company owner identity.
      const { error: ownErr } = await db.from("companies").update({ user_id: newUserId }).eq("id", companyId);
      if (ownErr) throw new Error(ownErr.message);

      // 2. Owner membership for the new administrator.
      const { data: existingMember } = await db
        .from("company_members")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", newUserId)
        .maybeSingle();
      if (existingMember?.id) {
        const { error } = await db
          .from("company_members")
          .update({ role: "owner", invited_email: newEmail })
          .eq("id", existingMember.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db.from("company_members").insert({
          company_id: companyId,
          user_id: newUserId,
          role: "owner",
          created_by: ctx.userId,
          invited_email: newEmail,
        });
        if (error) throw new Error(error.message);
      }

      // 3. The old administrator keeps no owner/admin reference at all.
      if (oldUserId) {
        const { error } = await db
          .from("company_members")
          .delete()
          .eq("company_id", companyId)
          .eq("user_id", oldUserId)
          .in("role", ["owner", "admin"]);
        if (error) throw new Error(error.message);
        await db.from("company_members").update({ invited_email: null }).eq("company_id", companyId).eq("user_id", oldUserId);
        await db.from("profiles").update({ active_company_id: null }).eq("id", oldUserId).eq("active_company_id", companyId);
      }

      // 4. Stale contact email that pointed at the old administrator.
      if (company.email && String(company.email).toLowerCase() === (oldEmail ?? "")) {
        await db.from("companies").update({ email: newEmail }).eq("id", companyId);
      }
    } catch (e: any) {
      // Roll the owner identity back so the company is never left headless.
      if (oldUserId) await db.from("companies").update({ user_id: oldUserId }).eq("id", companyId);
      await log("company.admin_email_change_failed", { result: "failed", error: e?.message ?? String(e) });
      throw new Error(e?.message ?? "Administrator replacement failed and was rolled back");
    }

    await log("company.admin_email_changed", { result: "success" });

    return {
      ok: true,
      newAdminEmail: newEmail,
      newAdminUserId: newUserId,
      invited,
      previousAdminEmail: oldEmail,
      selfHandover: oldUserId === ctx.userId,
    };
  });
