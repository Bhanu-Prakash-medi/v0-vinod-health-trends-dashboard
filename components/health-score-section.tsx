"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { Activity, PieChart, Ruler, BarChart3, TrendingDown, TrendingUp, Minus } from "lucide-react"

interface HealthScoreSectionProps {
  patientData: any
  vasbenefId?: string | number
  requestIds?: (string | number)[]
  accessToken?: string | null
}

const GAUGE_MAX = 10

// ---- Risk score helpers (0-10, LOWER = better / lower risk) ----
// Color scheme: 0 = green (No Risk), Low = yellow, Moderate = orange, High = red.
const RISK_GREEN = "#16a34a"
const RISK_YELLOW = "#eab308"
const RISK_ORANGE = "#f97316"
const RISK_RED = "#dc2626"

// Continuous visual zones on the 0-10 ring/scale: Low 0-3.33 (yellow),
// Moderate 3.33-6.66 (orange), High 6.66-10 (red). A score of exactly 0 is
// "No Risk" and colored green via riskColor().
const RISK_ZONES = [
  { from: 0, to: 3.33, color: RISK_YELLOW },
  { from: 3.33, to: 6.66, color: RISK_ORANGE },
  { from: 6.66, to: 10, color: RISK_RED },
]

function riskColor(score: number) {
  if (score <= 0) return RISK_GREEN
  if (score <= 3.33) return RISK_YELLOW
  if (score <= 6.66) return RISK_ORANGE
  return RISK_RED
}

// Show the score to one decimal place, TRUNCATED (not rounded) so a value like
// 0.995798 renders as "0.9" rather than "1.0".
function formatScore(n: number) {
  return (Math.trunc(n * 10) / 10).toFixed(1)
}

// Format the report date (e.g. "22 Jul 2026") so the user knows which report
// the score is based on. Returns null when the date is missing/invalid.
function formatReportDate(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

interface RiskScoreResponse {
  score: number | null
  rawScore?: number
  appointmentDate?: string | null
  riskLevel?: string
  benchmark?: { band: string; avgScore: number } | null
  reportsScored?: number
}

async function fetchHealthScore(
  requestIds: (string | number)[],
  accessToken: string,
  gender?: string,
  age?: number,
): Promise<RiskScoreResponse> {
  const res = await fetch("/api/health/healthscore", {
    method: "POST",
    headers: { "Content-Type": "application/json", accesstoken: accessToken },
    body: JSON.stringify({ requestIds, gender, age }),
  })
  if (!res.ok) throw new Error(`Health score request failed: ${res.status}`)
  return res.json()
}

type ViewStyle = "donut" | "scale" | "graph"

const VIEW_OPTIONS: { id: ViewStyle; label: string; Icon: typeof PieChart }[] = [
  { id: "scale", label: "Scale", Icon: Ruler },
  { id: "donut", label: "Donut", Icon: PieChart },
  { id: "graph", label: "Graph", Icon: BarChart3 },
]

// Polar point on a full circle (0deg = 3 o'clock, clockwise positive in SVG y-down).
function polarPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

// Arc path along a full-circle donut between two 0-10 scores (12 o'clock = 0, clockwise).
function donutArc(cx: number, cy: number, r: number, fromScore: number, toScore: number) {
  const a1 = -90 + (fromScore / GAUGE_MAX) * 360
  const a2 = -90 + (toScore / GAUGE_MAX) * 360
  const start = polarPoint(cx, cy, r, a1)
  const end = polarPoint(cx, cy, r, a2)
  const largeArc = a2 - a1 > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

export default function HealthScoreSection({
  patientData,
  vasbenefId,
  requestIds,
  accessToken,
}: HealthScoreSectionProps) {
  const gender: string | undefined = patientData?.patient_info?.gender
  const age: number | undefined = patientData?.patient_info?.age

  // ---- Risk score from the overall-risk-score API ----
  const idsKey = requestIds && requestIds.length ? requestIds.join(",") : ""
  const riskEnabled = !!(accessToken && idsKey)
  const { data: riskData, isLoading: riskLoading } = useSWR(
    riskEnabled ? ["healthscore", String(vasbenefId), idsKey, gender ?? "", age ?? ""] : null,
    () => fetchHealthScore(requestIds as (string | number)[], accessToken as string, gender, age),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  const hasRisk = !!riskData && riskData.score != null
  const riskScore = hasRisk ? (riskData!.score as number) : null
  const benchmark = riskData?.benchmark ?? null

  const [view, setView] = useState<ViewStyle>("scale")

  // Animate the active score from 0 on mount / change.
  const activeScore = hasRisk ? (riskScore as number) : 0
  const [displayScore, setDisplayScore] = useState(0)
  const animRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    const target = activeScore
    const start = performance.now()
    const duration = 900
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayScore(target * eased)
      if (t < 1) animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [activeScore])

  const header = (
    <div className="mb-3 flex items-center gap-2">
      <Activity className="h-5 w-5 text-[#156ddc]" />
      <h2 className="text-base font-semibold text-[#2e3742]">Health Score</h2>
    </div>
  )

  // Loading state while the risk score resolves.
  if (riskEnabled && riskLoading && !riskData) {
    return (
      <section aria-label="Health score" className="rounded-2xl border border-[#f0f3f5] bg-white p-4">
        {header}
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e5eaf0] border-t-[#156ddc]" />
        </div>
      </section>
    )
  }

  // ---- Primary: risk-based UI with view styles + benchmark ----
  if (hasRisk) {
    const score = riskScore as number
    const color = riskColor(score)
    const label = riskData!.riskLevel || "—"
    const reportDate = formatReportDate(riskData!.appointmentDate)
    const diff = benchmark ? Math.round((score - benchmark.avgScore) * 100) / 100 : null
    // The risk zone the user currently falls in — highlighted in the donut & graph.
    const activeZoneIndex = RISK_ZONES.findIndex(
      (z, i) => score >= z.from && (score < z.to || i === RISK_ZONES.length - 1),
    )
    // The zone the MediBuddy average falls in.
    const avgZoneIndex = benchmark
      ? RISK_ZONES.findIndex((z, i) => benchmark.avgScore >= z.from && (benchmark.avgScore < z.to || i === RISK_ZONES.length - 1))
      : -1

    return (
      <section aria-label="Health risk score" className="rounded-2xl border border-[#f0f3f5] bg-white p-4">
        {header}

        {/* Report date + view style toggle */}
        <div className="mb-4 flex items-center justify-between gap-2">
          {reportDate ? (
            <p className="text-xs text-[#9dabbd]">
              Based on your report from <span className="font-medium text-[#4d5c6f]">{reportDate}</span>
            </p>
          ) : (
            <span />
          )}
          <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#f0f3f5] p-0.5" role="tablist" aria-label="Chart style">
            {VIEW_OPTIONS.map(({ id, label: vLabel, Icon }) => {
              const active = view === id
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  aria-label={`${vLabel} view`}
                  onClick={() => setView(id)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    active ? "bg-white text-[#156ddc] shadow-sm" : "text-[#9dabbd] hover:text-[#4d5c6f]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{vLabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ---- DONUT ---- */}
        {view === "donut" && (
          <div className="flex flex-col items-center">
            <svg viewBox="-40 -34 340 288" className="h-auto w-full max-w-[280px]" role="img" aria-label={`Risk score ${score} out of 10, ${label}. MediBuddy average ${benchmark ? benchmark.avgScore : "unavailable"}.`}>
              {/* Colored risk zones (green / yellow / red) forming the ring.
                  The zone the user currently falls in is highlighted (thicker,
                  full opacity); the rest are dimmed. */}
              {RISK_ZONES.map((z, i) => {
                const isActive = i === activeZoneIndex
                return (
                  <path
                    key={z.from}
                    d={donutArc(110, 110, 88, z.from, z.to)}
                    fill="none"
                    stroke={z.color}
                    strokeWidth={isActive ? 20 : 14}
                    opacity={isActive ? 1 : 0.25}
                  />
                )
              })}

              {/* Benchmark ("Avg") marker on the ring with score label */}
              {benchmark &&
                (() => {
                  const a = -90 + (benchmark.avgScore / GAUGE_MAX) * 360
                  const inner = polarPoint(110, 110, 74, a)
                  const outer = polarPoint(110, 110, 102, a)
                  const lbl = polarPoint(110, 110, 116, a)
                  const anchor = lbl.x > 112 ? "start" : lbl.x < 108 ? "end" : "middle"
                  return (
                    <>
                      <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#2e3742" strokeWidth="3" strokeLinecap="round" />
                      <text x={lbl.x} y={lbl.y} textAnchor={anchor} dominantBaseline="middle" className="fill-[#4d5c6f] text-[11px] font-semibold">
                        Avg {benchmark.avgScore}
                      </text>
                    </>
                  )
                })()}

              {/* "You" score marker on the ring — high-contrast so it stands out on any zone */}
              {(() => {
                const a = -90 + (displayScore / GAUGE_MAX) * 360
                const p = polarPoint(110, 110, 88, a)
                const lbl = polarPoint(110, 110, 122, a)
                const anchor = lbl.x > 112 ? "start" : lbl.x < 108 ? "end" : "middle"
                return (
                  <>
                    {/* white halo + dark core */}
                    <circle cx={p.x} cy={p.y} r="10" fill="#ffffff" />
                    <circle cx={p.x} cy={p.y} r="7" fill="#2e3742" />
                    <circle cx={p.x} cy={p.y} r="3" fill="#ffffff" />
                    <text x={lbl.x} y={lbl.y} textAnchor={anchor} dominantBaseline="middle" className="fill-[#2e3742] text-[11px] font-bold">
                      You {formatScore(score)}
                    </text>
                  </>
                )
              })()}

              {/* Center readout (overall score) */}
              <text x="110" y="100" textAnchor="middle" className="fill-[#2e3742] text-[40px] font-bold">
                {formatScore(score)}
              </text>
              <text x="110" y="122" textAnchor="middle" className="fill-[#9dabbd] text-[13px] font-medium">
                out of 10
              </text>
            </svg>
            {/* Legend */}
            <div className="mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] font-medium text-[#4d5c6f]">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-[#2e3742] bg-white" />
                You {formatScore(score)}
              </span>
              {benchmark && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-[#4d5c6f]">
                  <span className="h-2.5 w-0.5 bg-[#2e3742]" />
                  MediBuddy avg {benchmark.avgScore}
                </span>
              )}
            </div>
            <span className="mt-2 rounded-pill px-2.5 py-0.5 text-xs font-semibold" style={{ color, backgroundColor: `${color}1a` }}>
              {label}
            </span>
          </div>
        )}

        {/* ---- LINEAR SCALE ---- */}
        {view === "scale" && (
          <div className="px-1 pt-2">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-3xl font-bold leading-none text-[#2e3742]">{formatScore(score)}</span>
              <span className="rounded-pill px-2.5 py-0.5 text-xs font-semibold" style={{ color, backgroundColor: `${color}1a` }}>
                {label}
              </span>
            </div>
            <div className="relative pt-6 pb-1">
              {/* User marker */}
              <div
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${(displayScore / GAUGE_MAX) * 100}%` }}
              >
                <span className="rounded bg-[#2e3742] px-1.5 py-0.5 text-[10px] font-semibold text-white">You</span>
                <div className="h-0 w-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#2e3742]" />
              </div>
              {/* Zones */}
              <div className="flex h-3.5 w-full overflow-hidden rounded-full">
                {RISK_ZONES.map((z) => (
                  <div key={z.from} style={{ width: `${((z.to - z.from) / GAUGE_MAX) * 100}%`, backgroundColor: z.color }} />
                ))}
              </div>
              {/* Benchmark marker */}
              {benchmark && (
                <div
                  className="absolute -translate-x-1/2"
                  style={{ left: `${(benchmark.avgScore / GAUGE_MAX) * 100}%`, top: "1.5rem" }}
                >
                  <div className="mx-auto h-5 w-0.5 bg-[#2e3742]" />
                  <span className="mt-0.5 block whitespace-nowrap text-[9px] font-medium text-[#4d5c6f]">Avg</span>
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-between text-[10px] font-medium text-[#9dabbd]">
              {[0, 2, 4, 6, 8, 10].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* ---- GRAPH (bar comparison) ---- */}
        {view === "graph" && (
          <div className="space-y-4 px-1 pt-2">
            {/* You */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-[#2e3742]">You</span>
                <span className="font-semibold" style={{ color }}>
                  {formatScore(score)} / 10
                </span>
              </div>
              <div className="relative h-6 w-full overflow-hidden rounded-md">
                {/* Green/yellow/red zone track — active zone highlighted */}
                <div className="absolute inset-0 flex">
                  {RISK_ZONES.map((z, i) => (
                    <div
                      key={z.from}
                      style={{
                        width: `${((z.to - z.from) / GAUGE_MAX) * 100}%`,
                        backgroundColor: z.color,
                        opacity: i === activeZoneIndex ? 0.45 : 0.12,
                      }}
                    />
                  ))}
                </div>
                {/* Filled portion in the risk color */}
                <div
                  className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-300"
                  style={{ width: `${(displayScore / GAUGE_MAX) * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
            {/* MediBuddy benchmark */}
            {benchmark && (
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-[#4d5c6f]">MediBuddy avg</span>
                  <span className="font-semibold text-[#4d5c6f]">{benchmark.avgScore.toFixed(2)} / 10</span>
                </div>
                <div className="relative h-6 w-full overflow-hidden rounded-md">
                  <div className="absolute inset-0 flex">
                    {RISK_ZONES.map((z, i) => (
                      <div
                        key={z.from}
                        style={{
                          width: `${((z.to - z.from) / GAUGE_MAX) * 100}%`,
                          backgroundColor: z.color,
                          opacity: i === avgZoneIndex ? 0.45 : 0.12,
                        }}
                      />
                    ))}
                  </div>
                  <div
                    className="absolute inset-y-0 left-0 rounded-md"
                    style={{ width: `${(benchmark.avgScore / GAUGE_MAX) * 100}%`, backgroundColor: riskColor(benchmark.avgScore) }}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-between text-[10px] font-medium text-[#9dabbd]">
              {[0, 2, 4, 6, 8, 10].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* ---- Benchmark comparison + guidance (shared) ---- */}
        <div className="mt-4 rounded-xl bg-[#f7f9fb] p-3">
          {benchmark && diff != null ? (
            <div className="flex items-start gap-2">
              {diff < 0 ? (
                <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" />
              ) : diff > 0 ? (
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[#dc2626]" />
              ) : (
                <Minus className="mt-0.5 h-4 w-4 shrink-0 text-[#9dabbd]" />
              )}
              <p className="text-xs leading-relaxed text-[#4d5c6f]">
                {diff < 0 ? (
                  <>
                    You&apos;re <span className="font-semibold text-[#16a34a]">{Math.abs(diff).toFixed(2)} pts below</span> the
                    MediBuddy average for <span className="font-medium">{benchmark.band}</span> ({benchmark.avgScore.toFixed(2)}/10) — lower
                    risk than most in your group.
                  </>
                ) : diff > 0 ? (
                  <>
                    You&apos;re <span className="font-semibold text-[#dc2626]">{diff.toFixed(2)} pts above</span> the MediBuddy
                    average for <span className="font-medium">{benchmark.band}</span> ({benchmark.avgScore.toFixed(2)}/10) — higher risk
                    than most in your group.
                  </>
                ) : (
                  <>
                    You&apos;re right at the MediBuddy average for <span className="font-medium">{benchmark.band}</span> (
                    {benchmark.avgScore.toFixed(2)}/10).
                  </>
                )}
              </p>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-[#4d5c6f]">
              Your overall health risk score across your reports. A lower score means lower health risk.
            </p>
          )}
          <p className="mt-1.5 pl-6 text-[10px] text-[#9dabbd]">Lower score = lower health risk (0 best, 10 highest risk).</p>
        </div>
      </section>
    )
  }

  // No API risk score available for this beneficiary — hide the section entirely.
  return null
}
