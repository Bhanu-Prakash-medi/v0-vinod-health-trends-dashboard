/**
 * App-level access gate.
 *
 * For one specific organisation (pmEntityId 1006639) the entire Health Trends
 * app is restricted to an explicit email allowlist: only those users see the
 * app; everyone else from that org sees a "feature coming soon" screen. Users
 * from ANY OTHER pmEntityId are unrestricted and always see the full app.
 *
 * The allowlist is checked on the server (/api/health/access-check), which
 * returns only { allowed } so the email list is never exposed to browsers.
 * The gate is FAIL-CLOSED: if the check fails, restricted-org users are
 * denied access.
 *
 * The email is matched against the profile API's `employee_email`
 * (case-insensitive, whitespace-trimmed).
 */

/** The single organisation that is gated by the email allowlist. */
export const RESTRICTED_PM_ENTITY_ID = "1006639"

/**
 * Normalize an email for comparison. This is intentionally defensive because
 * the profile API value may arrive with surrounding whitespace, mixed case,
 * zero-width/invisible unicode characters, or wrapped as a display name
 * ("Full Name <user@tcs.com>"). We strip invisible characters, extract the
 * actual address token when present, then trim + lowercase.
 */
function normalizeEmail(email: string | null | undefined): string {
  if (!email) return ""
  // Remove zero-width and BOM characters that can sneak in from copy/paste
  // or upstream systems and silently break an otherwise-correct match.
  let value = String(email).replace(/[\u200B-\u200D\uFEFF]/g, "").trim()
  // If wrapped like "Name <user@tcs.com>", pull out the address inside <>.
  const angle = value.match(/<([^>]+)>/)
  if (angle) value = angle[1].trim()
  // Otherwise, extract the first email-looking token if there is extra text.
  const token = value.match(/[^\s<>,;"']+@[^\s<>,;"']+/)
  if (token) value = token[0]
  return value.trim().toLowerCase()
}

/**
 * A profile can carry MULTIPLE emails in a single string, separated by comma
 * (or semicolon/space) — e.g. "work@tcs.com,personal@gmail.com". Split those
 * apart and normalize each so we can match against any of them.
 */
function normalizeEmailList(email: string | null | undefined): string[] {
  if (!email) return []
  return String(email)
    .split(/[,;]+/)
    .map((part) => normalizeEmail(part))
    .filter(Boolean)
}

/**
 * Ask the server whether any of the given emails is on the restricted-org
 * allowlist. The allowlist itself is never sent to the browser. Returns false
 * on ANY failure so callers fail closed.
 */
async function isEmailAllowedOnServer(emails: string[]): Promise<boolean> {
  if (emails.length === 0) return false
  try {
    const res = await fetch("/api/health/access-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emails.join(",") }),
      cache: "no-store",
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.allowed === true
  } catch {
    return false
  }
}

/**
 * Whether the current user may access the full app.
 *
 * - Any pmEntityId other than RESTRICTED_PM_ENTITY_ID => always allowed.
 * - RESTRICTED_PM_ENTITY_ID => allowed only if ANY of the profile's emails is
 *   on the API allowlist. If the allowlist cannot be fetched, access is DENIED
 *   (fail closed).
 */
export async function checkAppAccess(
  pmEntityId: string | number | null | undefined,
  email: string | null | undefined,
): Promise<boolean> {
  const pm = String(pmEntityId ?? "").trim()
  if (pm !== RESTRICTED_PM_ENTITY_ID) {
    return true
  }

  return isEmailAllowedOnServer(normalizeEmailList(email))
}
