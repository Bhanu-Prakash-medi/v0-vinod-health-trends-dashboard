/**
 * App-level access gate.
 *
 * For one specific organisation (pmEntityId 1006639) the entire Health Trends
 * app is restricted to an explicit email allowlist: only those users see the
 * app; everyone else from that org sees a "feature coming soon" screen. Users
 * from ANY OTHER pmEntityId are unrestricted and always see the full app.
 *
 * The email is matched against the profile API's `employee_email`
 * (case-insensitive, whitespace-trimmed).
 */

/** The single organisation that is gated by the email allowlist below. */
export const RESTRICTED_PM_ENTITY_ID = "1006639"

/**
 * Emails allowed to access the app within the restricted org. Populated from
 * the client-provided list. Keep all entries lowercase.
 *
 * NOTE: while this list is empty, ALL users from pmEntityId 1006639 will see
 * the "coming soon" screen. Add the provided emails here to grant access.
 */
const RESTRICTED_ORG_ALLOWED_EMAILS: string[] = [
  // TODO: paste the allowlisted emails for pmEntityId 1006639 here.
]

const allowedEmailSet = new Set(RESTRICTED_ORG_ALLOWED_EMAILS.map((e) => e.trim().toLowerCase()))

function normalizeEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase()
}

/**
 * Whether the current user may access the full app.
 *
 * - Any pmEntityId other than RESTRICTED_PM_ENTITY_ID => always allowed.
 * - RESTRICTED_PM_ENTITY_ID => allowed only if the email is on the allowlist.
 */
export function isAppAccessAllowed(pmEntityId: string | number | null | undefined, email: string | null | undefined): boolean {
  const pm = String(pmEntityId ?? "").trim()
  if (pm !== RESTRICTED_PM_ENTITY_ID) {
    return true
  }
  return allowedEmailSet.has(normalizeEmail(email))
}
