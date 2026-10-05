import { NextResponse } from "next/server"

const TCS_ALLOWLIST_URL = "https://n8n-public.medibuddy.in/webhook/health/fetchtcsallowlist"
const MAX_EMAILS = 5
const MAX_EMAIL_LENGTH = 254

function normalizeEmail(email: string): string {
  let value = email.replace(/[\u200B-\u200D\uFEFF]/g, "").trim()
  const angle = value.match(/<([^>]+)>/)
  if (angle) value = angle[1].trim()
  const token = value.match(/[^\s<>,;"']+@[^\s<>,;"']+/)
  if (token) value = token[0]
  return value.trim().toLowerCase()
}

async function fetchAllowedEmailSet(): Promise<Set<string> | null> {
  const webhookAuth = process.env.N8N_WEBHOOK_AUTH
  if (!webhookAuth) {
    console.error("[access-check] N8N_WEBHOOK_AUTH is not set; denying access")
    return null
  }
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)
  try {
    const upstream = await fetch(TCS_ALLOWLIST_URL, {
      method: "GET",
      headers: { Accept: "application/json", "x-healthverse": webhookAuth },
      signal: controller.signal,
      next: { revalidate: 300 },
    })
    if (!upstream.ok) return null
    const data = await upstream.json()
    if (!Array.isArray(data?.allowlist)) return null
    return new Set(
      (data.allowlist as unknown[]).filter((e): e is string => typeof e === "string").map(normalizeEmail),
    )
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

// POST /api/health/access-check  body: { email: string }
// Checks the user's email(s) against the restricted-org allowlist on the
// server and returns only { allowed }. The allowlist itself never leaves the
// server. Fails closed: any upstream problem returns allowed: false.
export async function POST(request: Request) {
  let rawEmail: unknown
  try {
    rawEmail = (await request.json())?.email
  } catch {
    return NextResponse.json({ allowed: false }, { status: 400 })
  }

  if (typeof rawEmail !== "string" || rawEmail.length === 0 || rawEmail.length > MAX_EMAIL_LENGTH * MAX_EMAILS) {
    return NextResponse.json({ allowed: false }, { status: 400 })
  }

  const emails = rawEmail
    .split(/[,;]+/)
    .map(normalizeEmail)
    .filter((e) => e.length > 0 && e.length <= MAX_EMAIL_LENGTH)
    .slice(0, MAX_EMAILS)

  if (emails.length === 0) {
    return NextResponse.json({ allowed: false }, { status: 400 })
  }

  const allowedSet = await fetchAllowedEmailSet()
  if (!allowedSet) {
    return NextResponse.json({ allowed: false }, { status: 502, headers: { "Cache-Control": "no-store" } })
  }

  return NextResponse.json(
    { allowed: emails.some((e) => allowedSet.has(e)) },
    { headers: { "Cache-Control": "no-store" } },
  )
}
