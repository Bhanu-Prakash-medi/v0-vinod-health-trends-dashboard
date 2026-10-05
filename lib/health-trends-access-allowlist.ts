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
 * Whether the current user may access the full app.
 *
 * - Any pmEntityId other than RESTRICTED_PM_ENTITY_ID => always allowed.
 * - RESTRICTED_PM_ENTITY_ID => the server resolves the user's email from their
 *   access token and checks it against the allowlist, returning only
 *   `{ allowed }`. The allowlist itself never reaches the browser. Any failure
 *   denies access (fail closed).
 */
export async function checkAppAccess(
  pmEntityId: string | number | null | undefined,
  accessToken: string | null | undefined,
): Promise<boolean> {
  const pm = String(pmEntityId ?? "").trim()
  if (pm !== RESTRICTED_PM_ENTITY_ID) {
    return true
  }
  if (!accessToken) return false

  try {
    const res = await fetch("/api/health/tcs-allowlist", {
      cache: "no-store",
      headers: { accesstoken: accessToken },
    })
    if (!res.ok) return false
    const data = await res.json()
    return data?.allowed === true
  } catch {
    return false
  }
}
