/**
 * App-level access gate.
 *
 * For one specific organisation (pmEntityId 1006639) the entire Health Trends
 * app is restricted to an explicit email allowlist: only those users see the
 * app; everyone else from that org sees a "feature coming soon" screen. Users
 * from ANY OTHER pmEntityId are unrestricted and always see the full app.
 *
 * The allowlist is fetched at runtime from an API (proxied via
 * /api/health/tcs-allowlist) rather than hardcoded here, so membership can be
 * changed without a code deploy. The gate is FAIL-CLOSED: if the allowlist
 * cannot be fetched, restricted-org users are denied access.
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
 * Fetch the restricted-org allowlist from the internal proxy route.
 * Returns a normalized Set of emails on success, or `null` on ANY failure
 * (network error, non-OK status, malformed body) so callers can fail closed.
 */
async function fetchAllowedEmailSet(): Promise<Set<string> | null> {
  try {
    const res = await fetch("/api/health/tcs-allowlist", { cache: "no-store" })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data?.allowlist)) return null
    return new Set((data.allowlist as unknown[]).filter((e): e is string => typeof e === "string").map(normalizeEmail))
  } catch {
    return null
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

  const allowedEmailSet = await fetchAllowedEmailSet()
  if (!allowedEmailSet) {
    // Fail closed: no valid allowlist => no access for the restricted org.
    return false
  }
  return normalizeEmailList(email).some((e) => allowedEmailSet.has(e))
}
