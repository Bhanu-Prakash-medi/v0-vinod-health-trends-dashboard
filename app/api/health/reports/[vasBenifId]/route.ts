import { type NextRequest, NextResponse } from "next/server"

const HEALTHTRENDS_BACKEND = "https://healthtrends-backend.medibuddy.in"

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 20000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

// Proxies the new Health Trends backend per-beneficiary reports endpoint.
// Forwards the accesstoken header and the vasBenifId path segment.
export async function GET(request: NextRequest, { params }: { params: Promise<{ vasBenifId: string }> }) {
  const { vasBenifId } = await params
  const accessToken = request.headers.get("accesstoken")

  if (!accessToken) {
    return NextResponse.json({ error: "Access token required" }, { status: 401 })
  }

  if (!vasBenifId) {
    return NextResponse.json({ error: "vasBenifId required" }, { status: 400 })
  }

  try {
    const response = await fetchWithTimeout(`${HEALTHTRENDS_BACKEND}/beneficiary/${vasBenifId}/reports`, {
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
