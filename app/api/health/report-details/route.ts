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

// Proxies the Health Trends backend report-details endpoint
// (POST /health/reports { vasBenefId, requestId }). This returns a fully analyzed
// report (patient_card, parameters, health_summary) synchronously, replacing the
// old n8n report-analysis + fetchreports polling pipeline.
//
// NOTE: The backend contract identifies the report by the beneficiary's
// `vasBenefId` (NOT the account `mbUserId`, which it now rejects). We still
// accept a legacy `mbUserId` field in the incoming body as a fallback so older
// callers don't break, but always forward `vasBenefId` upstream.
export async function POST(request: NextRequest) {
  const accessToken = request.headers.get("accesstoken")

  let body: { vasBenefId?: string | number; mbUserId?: string | number; requestId?: string | number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { vasBenefId, mbUserId, requestId } = body || {}
  const resolvedVasBenefId = vasBenefId ?? mbUserId
  if (
    resolvedVasBenefId === undefined ||
    resolvedVasBenefId === null ||
    resolvedVasBenefId === "" ||
    requestId === undefined ||
    requestId === null
  ) {
    return NextResponse.json({ error: "vasBenefId and requestId are required" }, { status: 400 })
  }

  try {
    const response = await fetchWithTimeout(`${HEALTHTRENDS_BACKEND}/health/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward the token when present; the endpoint is scoped by vasBenefId.
        ...(accessToken ? { accesstoken: accessToken } : {}),
      },
      body: JSON.stringify({ vasBenefId: Number(resolvedVasBenefId), requestId: Number(requestId) }),
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
