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

// GET /api/health/consent?mbUserId=123
// Proxies the Health Trends backend GET /health/getconsent/{mbUserId}, which
// returns whether the user has already agreed to the health-data consent.
export async function GET(request: NextRequest) {
  const accessToken = request.headers.get("accesstoken")
  const mbUserId = request.nextUrl.searchParams.get("mbUserId")

  if (!mbUserId) {
    return NextResponse.json({ error: "mbUserId is required" }, { status: 400 })
  }

  try {
    const response = await fetchWithTimeout(
      `${HEALTHTRENDS_BACKEND}/health/getconsent/${encodeURIComponent(mbUserId)}`,
      {
        method: "GET",
        headers: {
          ...(accessToken ? { accesstoken: accessToken } : {}),
        },
      },
    )

    const text = await response.text()

    let data
    try {
      data = text ? JSON.parse(text) : null
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

// POST /api/health/consent
// Proxies the Health Trends backend POST /health/consent, submitting the user's
// agreement. Body: { mbUserId, pmEntityId, email, isAgreed, agreedDate }.
export async function POST(request: NextRequest) {
  const accessToken = request.headers.get("accesstoken")

  let body: {
    mbUserId?: string | number
    pmEntityId?: string | number
    email?: string
    isAgreed?: boolean
    agreedDate?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { mbUserId, pmEntityId, email, isAgreed, agreedDate } = body || {}
  if (mbUserId === undefined || mbUserId === null || mbUserId === "") {
    return NextResponse.json({ error: "mbUserId is required" }, { status: 400 })
  }

  try {
    const response = await fetchWithTimeout(`${HEALTHTRENDS_BACKEND}/health/consent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { accesstoken: accessToken } : {}),
      },
      body: JSON.stringify({
        mbUserId: Number(mbUserId),
        pmEntityId: pmEntityId != null && pmEntityId !== "" ? Number(pmEntityId) : null,
        email: email ?? "",
        isAgreed: isAgreed ?? true,
        agreedDate: agreedDate ?? null,
      }),
    })

    const text = await response.text()

    let data
    try {
      data = text ? JSON.parse(text) : { success: response.ok }
    } catch {
      // Some backends return a plain string body on success.
      data = { success: response.ok, message: text }
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
