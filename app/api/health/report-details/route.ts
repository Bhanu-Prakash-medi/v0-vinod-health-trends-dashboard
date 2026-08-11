import { type NextRequest, NextResponse } from "next/server"

const HEALTHTRENDS_BACKEND = "https://healthtrends-backend.medibuddy.in"

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

// Proxies the new Health Trends backend report-details endpoint
// (POST /health/reports { mbUserId, requestId }). This returns a fully analyzed
// report (patient_card, parameters, health_summary) synchronously, replacing the
// old n8n report-analysis + fetchreports polling pipeline.
export async function POST(request: NextRequest) {
  const accessToken = request.headers.get("accesstoken")

  let body: { mbUserId?: string | number; requestId?: string | number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { mbUserId, requestId } = body || {}
  if (mbUserId === undefined || mbUserId === null || requestId === undefined || requestId === null) {
    return NextResponse.json({ error: "mbUserId and requestId are required" }, { status: 400 })
  }

  try {
    const response = await fetchWithTimeout(`${HEALTHTRENDS_BACKEND}/health/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward the token when present; the endpoint is account-scoped by mbUserId.
        ...(accessToken ? { accesstoken: accessToken } : {}),
      },
      body: JSON.stringify({ mbUserId: Number(mbUserId), requestId: Number(requestId) }),
    })

    const text = await response.text()

    let data
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: "Invalid response from API", details: text }, { status: 502 })
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError"
    return NextResponse.json(
      { error: isAbort ? "Request timeout" : error instanceof Error ? error.message : "Internal server error" },
      { status: isAbort ? 504 : 500 },
    )
  }
}
