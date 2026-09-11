/**
 * Company administrator identity — pure rules.
 *
 * The "administrator email" of a company is not a free-text contact field: it
 * is the email of the person who holds the company OWNER identity
 * (`companies.user_id` + the `owner` row in `company_members`). Replacing it
 * therefore means transferring that identity to another account.
 *
 * Everything in this module is pure so it can be unit-tested without touching
 * the database. All authorisation is re-checked server-side.
 */

export type AdminReplacementPlan = {
  /** Existing account that will become the administrator, when known. */
  newUserId: string | null;
  /** True when the new email has no account yet and must be invited. */
  invite: boolean;
};

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function isValidEmail(email: string): boolean {
  return EMAIL_RX.test(normaliseEmail(email));
}

/**
 * Validates a requested replacement. Returns an error message, or null when the
 * request is well-formed. This is a usability gate only.
 */
export function validateAdminReplacement(opts: {
  currentEmail: string | null;
  newEmail: string;
  confirmedEmail: string;
  acknowledged: boolean;
}): string | null {
  const next = normaliseEmail(opts.newEmail);
  if (!next) return "Enter the new administrator email address";
  if (!isValidEmail(next)) return "Enter a valid email address";
  if (normaliseEmail(opts.confirmedEmail) !== next) return "The two email addresses do not match";
  if (opts.currentEmail && normaliseEmail(opts.currentEmail) === next) {
    return "That is already the current administrator email";
  }
  if (!opts.acknowledged) return "Confirm that you understand the administrator is being replaced";
  return null;
}

export function canSubmitAdminReplacement(opts: {
  currentEmail: string | null;
  newEmail: string;
  confirmedEmail: string;
  acknowledged: boolean;
  authorised: boolean;
}): boolean {
  return opts.authorised && validateAdminReplacement(opts) === null;
}

/**
 * True when the person performing the change is handing their own
 * administrator access to somebody else — the screen warns about this.
 */
export function isSelfHandover(opts: { actorUserId: string; currentAdminUserId: string | null; isSuperAdmin: boolean }): boolean {
  return !opts.isSuperAdmin && !!opts.currentAdminUserId && opts.actorUserId === opts.currentAdminUserId;
}

/**
 * Membership rows that must no longer grant the OLD administrator company
 * administration once the identity has moved.
 */
export function staleAdminMemberships<T extends { user_id: string; role: string }>(
  rows: T[],
  oldUserId: string | null,
): T[] {
  if (!oldUserId) return [];
  return rows.filter((r) => r.user_id === oldUserId && (r.role === "owner" || r.role === "admin"));
}
