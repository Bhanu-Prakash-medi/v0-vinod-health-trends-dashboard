import { type NextRequest, NextResponse } from "next/server"
import { RISK_BANDS, getRiskLevel, getBenchmarkForBand } from "@/lib/health-score-benchmarks"

// The overall-risk-score endpoint currently lives on the staging backend only
// (prod returns 404). The same access token is valid on both hosts.
const HEALTHSCORE_BACKEND = "https://healthtrends-backend.mbstg.in"

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

interface RiskScoreEntry {
  requestId: number
  appointmentDate: string | null
  overallRiskScore: number | null
  found: boolean
}

// Proxies POST /healthscore/overall-risk-score { requestIds } and turns the raw
// per-report risk scores (0-1) into a single 0-10 score for the latest report,
// enriched server-side with the matched age/gender benchmark and risk level.
// The benchmark table itself stays server-only; only the matched band leaves.
export async function POST(request: NextRequest) {
  const accessToken = request.headers.get("accesstoken")

  let body: { requestIds?: (number | string)[]; gender?: string; age?: number | string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { requestIds, gender, age } = body || {}
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    return NextResponse.json({ error: "requestIds is required" }, { status: 400 })
  }

  const numericIds = requestIds.map(Number).filter((n) => Number.isFinite(n))
  if (numericIds.length === 0) {
    return NextResponse.json({ error: "requestIds must contain numbers" }, { status: 400 })
  }

  try {
    const response = await fetchWithTimeout(`${HEALTHSCORE_BACKEND}/healthscore/overall-risk-score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { accesstoken: accessToken } : {}),
      },
      body: JSON.stringify({ requestIds: numericIds }),
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

    const list: RiskScoreEntry[] = Array.isArray(data) ? (data as RiskScoreEntry[]) : []
    // Keep only reports that actually produced a score.
    const scored = list.filter((r) => r && r.found && r.overallRiskScore != null)

    const ageNum = age != null ? Number(age) : undefined
    const benchmark = getBenchmarkForBand(gender, Number.isFinite(ageNum) ? ageNum : undefined)

    if (scored.length === 0) {
      return NextResponse.json({ score: null, benchmark, riskBands: RISK_BANDS }, { status: 200 })
    }

    // Use the most recent report by appointmentDate (fallback to input order).
    scored.sort(
      (a, b) => new Date(b.appointmentDate || 0).getTime() - new Date(a.appointmentDate || 0).getTime(),
    )
    const latest = scored[0]
    const rawScore = Number(latest.overallRiskScore)
    // Scale the 0-1 risk score to 0-10 WITHOUT rounding — show the exact value.
    // parseFloat(toFixed(6)) only strips floating-point multiplication noise
    // (e.g. 0.9950000000001 -> 0.995); it does not round meaningful digits.
    const score = Number.parseFloat((rawScore * 10).toFixed(6))

    return NextResponse.json(
      {
        score,
        rawScore,
        appointmentDate: latest.appointmentDate,
        riskLevel: getRiskLevel(score),
        benchmark,
        riskBands: RISK_BANDS,
        reportsScored: scored.length,
      },
      { status: 200 },
    )
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError"
    return NextResponse.json(
      { error: isAbort ? "Request timeout" : error instanceof Error ? error.message : "Internal server error" },
      { status: isAbort ? 504 : 500 },
    )
  }
}
