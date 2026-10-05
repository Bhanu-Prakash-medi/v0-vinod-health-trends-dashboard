import { type NextRequest, NextResponse } from "next/server"

const TCS_ALLOWLIST_URL = "https://n8n-public.medibuddy.in/webhook/health/fetchtcsallowlist"
const HEALTHTRENDS_BACKEND = "https://healthtrends-backend.medibuddy.in"

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
    `${HEALTHTRENDS_BACKEND}/beneficiary/profile`,
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

  const webhookAuth = process.env.HEALTHVERSE_WEBHOOK_AUTH
  if (!webhookAuth) {
    return NextResponse.json({ error: "Allowlist webhook auth is not configured" }, { status: 502 })
  }

  try {
    const emails = await getProfileEmails(accessToken)
    if (!emails) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const upstream = await fetchWithTimeout(TCS_ALLOWLIST_URL, {
      method: "GET",
      headers: { Accept: "application/json", "x-healthverse": webhookAuth },
      next: { revalidate: 300 },
    })

    if (!upstream.ok) {
      return NextResponse.json({ error: "Upstream allowlist request failed" }, { status: 502 })
    }

    const data = await upstream.json()
    if (!Array.isArray(data?.allowlist)) {
      return NextResponse.json({ error: "Malformed allowlist response" }, { status: 502 })
    }

    const allowed = new Set(
      (data.allowlist as unknown[]).filter((e): e is string => typeof e === "string").map(normalizeEmail),
    )

    return NextResponse.json(
      { allowed: emails.some((e) => allowed.has(e)) },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch {
    return NextResponse.json({ error: "Unable to verify access" }, { status: 502 })
  }
}
