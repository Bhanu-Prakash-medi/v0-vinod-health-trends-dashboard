import { type NextRequest, NextResponse } from "next/server"

// The trends endpoint on the production Health Trends backend.
const TRENDS_BACKEND = "https://healthtrends-backend.medibuddy.in"

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

// Proxies POST /health/trends { mbUserId, vasBenefId }. The backend returns the
// pre-computed trend analysis for the beneficiary; this route just forwards the
// request with the access token and relays the raw response to the client,
// which normalizes it into the UI's TrendAnalysisItem shape.
export async function POST(request: NextRequest) {
  const accessToken = request.headers.get("accesstoken")

  let body: { mbUserId?: number | string; vasBenefId?: number | string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { mbUserId, vasBenefId } = body || {}
  if (mbUserId === undefined || mbUserId === null || mbUserId === "") {
    return NextResponse.json({ error: "mbUserId is required" }, { status: 400 })
  }
  if (vasBenefId === undefined || vasBenefId === null || vasBenefId === "") {
    return NextResponse.json({ error: "vasBenefId is required" }, { status: 400 })
  }

  // The backend expects mbUserId and vasBenefId as numbers, not strings.
  const mbUserIdNum = Number(mbUserId)
  const vasBenefIdNum = Number(vasBenefId)
  if (Number.isNaN(mbUserIdNum) || Number.isNaN(vasBenefIdNum)) {
    return NextResponse.json({ error: "mbUserId and vasBenefId must be numeric" }, { status: 400 })
  }

  try {
    const response = await fetchWithTimeout(`${TRENDS_BACKEND}/health/trends`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { accesstoken: accessToken } : {}),
      },
      body: JSON.stringify({ mbUserId: mbUserIdNum, vasBenefId: vasBenefIdNum }),
    })

    const text = await response.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: "Invalid response from API", details: text }, { status: 502 })
    }

    if (!response.ok) {
      return NextResponse.json({ error: "Upstream error", details: data }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError"
    return NextResponse.json(
      { error: isAbort ? "Request timeout" : error instanceof Error ? error.message : "Internal server error" },
      { status: isAbort ? 504 : 500 },
    )
  }
}
