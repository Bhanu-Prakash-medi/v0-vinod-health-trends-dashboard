import { type NextRequest, NextResponse } from "next/server"
import { HEALTHTRENDS_BACKEND_URL, TCS_ALLOWLIST_WEBHOOK_URL } from "@/lib/config/api-environment"

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 8000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

function getCaseInsensitive(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== "object") return undefined
  const lower = key.toLowerCase()
  const match = Object.keys(obj).find((k) => k.toLowerCase() === lower)
  return match ? (obj as Record<string, unknown>)[match] : undefined
}

function normalizeEmail(email: string): string {
  let value = email.replace(/[\u200B-\u200D\uFEFF]/g, "").trim()
  const angle = value.match(/<([^>]+)>/)
  if (angle) value = angle[1].trim()
  const token = value.match(/[^\s<>,;"']+@[^\s<>,;"']+/)
  if (token) value = token[0]
  return value.trim().toLowerCase()
}

function splitEmails(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw) return []
  return raw.split(/[,;]+/).map(normalizeEmail).filter(Boolean)
}

/**
 * Resolves the caller's emails from the backend profile using their own
 * access token, so the email being checked can't be spoofed by the client.
 * Returns null when the token is invalid.
 */
async function getProfileEmails(accessToken: string): Promise<string[] | null> {
  const res = await fetchWithTimeout(
    `${HEALTHTRENDS_BACKEND_URL}/beneficiary/profile`,
    { method: "GET", headers: { accesstoken: accessToken }, cache: "no-store" },
    15000,
  )
  if (!res.ok) return null

  const data = await res.json()
  const root = Array.isArray(data) ? data[0] : data
  if (!root) return null

  const statusCode = getCaseInsensitive(getCaseInsensitive(root, "response"), "statuscode")
  if (statusCode === 401 || statusCode === "401") return null

  const emails = [
    ...splitEmails(getCaseInsensitive(root, "email")),
    ...splitEmails(getCaseInsensitive(root, "employee_email")),
  ]

  const beneficiaries = getCaseInsensitive(root, "beneficiaries")
  if (Array.isArray(beneficiaries)) {
    const self =
      beneficiaries.find((b) => String(getCaseInsensitive(b, "relation") ?? "").toLowerCase() === "self") ??
      beneficiaries[0]
    emails.push(...splitEmails(getCaseInsensitive(self, "primaryEmail")))
  }

  return emails
}

const TCS_ALLOWLIST_AUTH = process.env.TCS_ALLOWLIST_AUTH ?? "Healthtrends@12345yuiop"

function parseIsAllowed(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const v = value.trim().toLowerCase()
    if (v === "true") return true
    if (v === "false") return false
  }
  return null
}

/**
 * Asks the upstream webhook whether a single email is allowed.
 * Returns true/false on a definitive answer, null on any failure.
 */
async function checkEmailAllowed(email: string): Promise<boolean | null> {
  try {
    const res = await fetchWithTimeout(TCS_ALLOWLIST_WEBHOOK_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        healthtrends: TCS_ALLOWLIST_AUTH,
      },
      body: JSON.stringify({ email }),
      cache: "no-store",
    })
    if (!res.ok) return null

    const data = await res.json()
    const root = Array.isArray(data) ? data[0] : data
    return parseIsAllowed(getCaseInsensitive(root, "isAllowed"))
  } catch {
    return null
  }
}

// GET /api/health/tcs-allowlist
// Returns ONLY `{ allowed: boolean }` for the authenticated caller. The raw
// allowlist never leaves the server. Requires the user's `accesstoken` header;
// unauthenticated requests get 401. Fail-closed: any upstream failure => 502
// with no `allowed` field, which the client treats as "deny".
export async function GET(request: NextRequest) {
  const accessToken = request.headers.get("accesstoken")
  if (!accessToken) {
    return NextResponse.json({ error: "Access token required" }, { status: 401 })
  }

  try {
    const emails = await getProfileEmails(accessToken)
    if (!emails) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const uniqueEmails = [...new Set(emails)]
    if (uniqueEmails.length === 0) {
      return NextResponse.json({ allowed: false }, { headers: { "Cache-Control": "private, no-store" } })
    }

    const results = await Promise.all(uniqueEmails.map(checkEmailAllowed))
    if (results.includes(true)) {
      return NextResponse.json({ allowed: true }, { headers: { "Cache-Control": "private, no-store" } })
    }
    // Every lookup failed (no definitive answer) => fail closed with 502.
    if (results.every((r) => r === null)) {
      return NextResponse.json({ error: "Upstream allowlist request failed" }, { status: 502 })
    }

    return NextResponse.json({ allowed: false }, { headers: { "Cache-Control": "private, no-store" } })
  } catch {
    return NextResponse.json({ error: "Unable to verify access" }, { status: 502 })
  }
}
