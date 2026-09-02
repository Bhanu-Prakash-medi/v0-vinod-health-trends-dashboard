import { NextResponse } from "next/server"

const TCS_ALLOWLIST_URL = "https://n8n-public.medibuddy.in/webhook/health/fetchtcsallowlist"

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 8000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

// GET /api/health/tcs-allowlist
// Server-side proxy for the n8n webhook that returns the restricted-org
// (pmEntityId 1006639) email allowlist. Proxying here avoids browser CORS
// issues and lets us cap the upstream call with a timeout. The upstream
// response shape is: { pmentityid: number, allowlist: string[] }.
//
// The access gate is FAIL-CLOSED: if this route cannot return a valid
// allowlist array, callers must deny access. We therefore return a 502 with
// no `allowlist` field on any upstream failure so the client can't mistake a
// broken response for an empty allowlist.
export async function GET() {
  try {
    const upstream = await fetchWithTimeout(TCS_ALLOWLIST_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      // Cache the allowlist briefly to avoid hammering the webhook on every
      // page load while still picking up membership changes within minutes.
      next: { revalidate: 300 },
    })

    if (!upstream.ok) {
      return NextResponse.json({ error: "Upstream allowlist request failed" }, { status: 502 })
    }

    const data = await upstream.json()

    if (!Array.isArray(data?.allowlist)) {
      return NextResponse.json({ error: "Malformed allowlist response" }, { status: 502 })
    }

    const allowlist = (data.allowlist as unknown[]).filter((e): e is string => typeof e === "string")

    return NextResponse.json({ allowlist })
  } catch {
    return NextResponse.json({ error: "Unable to fetch allowlist" }, { status: 502 })
  }
}
