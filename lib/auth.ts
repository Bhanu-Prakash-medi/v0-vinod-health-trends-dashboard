import { DEBUG_ACCESS_TOKEN, getAccessTokenFromCookie } from "@/lib/api"

/**
 * Access token for the Health Trends backend. Reads `localStorage.accesstoken`
 * first; until that is wired up, falls back to the dashboard's existing
 * `redirect` cookie and debug token so uploads work in the preview.
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    const stored = window.localStorage.getItem("accesstoken")
    if (stored) return stored
  } catch {
    // localStorage can throw in privacy modes / sandboxed iframes.
  }
  return getAccessTokenFromCookie() || DEBUG_ACCESS_TOKEN
}

export const UNAUTHORIZED_EVENT = "healthtrends:unauthorized"

/** Called whenever the backend answers 401. Listen for UNAUTHORIZED_EVENT to redirect to sign-in. */
export function onUnauthorized(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
}
