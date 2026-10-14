import { type NextRequest, NextResponse } from "next/server"

const MAX_PARAMETERS = 300

type IncomingParam = { unit?: unknown; value?: unknown; status?: unknown; metric_name?: unknown; normal_range?: unknown }

function str(v: unknown, max = 200): string {
  return typeof v === "string" || typeof v === "number" ? String(v).slice(0, max) : ""
}

// Proxies the recommendations API. The client sends the latest report; this
// route strips it down to the fields the API needs so nothing extra leaks.
export async function POST(request: NextRequest) {
  const accessToken = request.headers.get("accesstoken")
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiUrl = process.env.RECOMMENDATIONS_API_URL
  const apiAuth = process.env.RECOMMENDATIONS_API_AUTH
  if (!apiUrl) {
    return NextResponse.json({ error: "Recommendations API is not configured" }, { status: 503 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const src = body?.reportDetails
  const rawParams: IncomingParam[] = Array.isArray(src?.parameters) ? src.parameters.slice(0, MAX_PARAMETERS) : []
  const parameters = rawParams
    .map((p) => ({
      unit: str(p?.unit, 40),
      value: typeof p?.value === "number" ? p.value : str(p?.value, 60),
      status: str(p?.status, 30),
      metric_name: str(p?.metric_name, 120),
      normal_range: str(p?.normal_range, 80),
    }))
    .filter((p) => p.metric_name && p.value !== "")

  if (parameters.length === 0) {
    return NextResponse.json({ error: "No parameters to analyze" }, { status: 400 })
  }

  const idNum = Number(src?.id)
  const reportDetails = {
    id: Number.isFinite(idNum) ? idNum : str(src?.id, 40),
    status: str(src?.status, 30),
    report_data: {
      mbUserId: str(src?.report_data?.mbUserId, 40),
      rVasBenefId: str(src?.report_data?.rVasBenefId, 40),
      fullfilmentDate: str(src?.report_data?.fullfilmentDate, 40),
    },
    parameters,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiAuth ? { Authorization: apiAuth } : {}),
      },
      body: JSON.stringify({ reportDetails }),
      signal: controller.signal,
    })
    const text = await response.text()
    try {
      return NextResponse.json(JSON.parse(text), { status: response.status })
    } catch {
      return NextResponse.json({ error: "Invalid response from recommendations API" }, { status: 502 })
    }
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError"
    return NextResponse.json(
      { error: isAbort ? "Request timeout" : "Failed to fetch recommendations" },
      { status: isAbort ? 504 : 500 },
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
