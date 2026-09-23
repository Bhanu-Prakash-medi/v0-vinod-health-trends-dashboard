import { type NextRequest, NextResponse } from "next/server"

const HEALTHTRENDS_BACKEND = "https://healthtrends-backend.medibuddy.in"

// Fallback access token used when no `accesstoken` header is present (e.g. the
// v0 preview / local testing where the real `redirect` cookie is absent).
const DEBUG_ACCESS_TOKEN = "c7294db1972e4a809511445fbc91845c"

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 20000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

// Proxies the Health Trends backend BMI endpoint (GET /health/bmi/{vasBenefId})
// so the browser is not subject to CORS / mixed-content restrictions. Forwards
// the accesstoken header, falling back to the debug token when absent.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const accessToken = request.headers.get("accesstoken") || DEBUG_ACCESS_TOKEN

  if (!id) {
    return NextResponse.json({ error: "vasBenefId required" }, { status: 400 })
  }

  try {
    const response = await fetchWithTimeout(`${HEALTHTRENDS_BACKEND}/health/bmi/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { accesstoken: accessToken },
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
