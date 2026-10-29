import { type NextRequest, NextResponse } from "next/server"
import { HEALTHTRENDS_BACKEND_URL } from "@/lib/config/api-environment"

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 20000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

// Proxies POST /health/update-bmi so the browser avoids CORS. Forwards the
// accesstoken header and a validated { vasBenefId, dob, height, weight } body.
export async function POST(request: NextRequest) {
  const accessToken = request.headers.get("accesstoken")
  if (!accessToken) {
    return NextResponse.json({ error: "accesstoken required" }, { status: 401 })
  }

  let body: { vasBenefId?: unknown; dob?: unknown; height?: unknown; weight?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const vasBenefId = Number(body.vasBenefId)
  const height = Number(body.height)
  const weight = Number(body.weight)
  const dob = typeof body.dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dob) ? body.dob : "1900-01-01"

  if (!Number.isFinite(vasBenefId) || vasBenefId <= 0) {
    return NextResponse.json({ error: "vasBenefId required" }, { status: 400 })
  }
  if (!Number.isFinite(height) || height <= 0 || height > 300 || !Number.isFinite(weight) || weight <= 0 || weight > 500) {
    return NextResponse.json({ error: "Valid height and weight required" }, { status: 400 })
  }

  try {
    const response = await fetchWithTimeout(`${HEALTHTRENDS_BACKEND_URL}/health/update-bmi`, {
      method: "POST",
      headers: { accesstoken: accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ vasBenefId, dob, height, weight }),
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
