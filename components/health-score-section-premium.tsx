"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { Activity, PieChart, Ruler, BarChart3, TrendingDown, TrendingUp, Minus, Youtube, Globe, ChevronRight } from "lucide-react"
import { openExternalUrl } from "@/lib/open-external"
import { trackEvent } from "@/lib/analytics/posthog"

interface HealthScoreSectionProps {
  patientData: any
  vasbenefId?: string | number
  requestIds?: (string | number)[]
  accessToken?: string | null
  /** Reliable gender/age from the beneficiary record — used for the population
   *  benchmark. Falls back to patientData.patient_info when not provided. */
  gender?: string
  age?: number
  /** True while reports are still loading. Reports resolve progressively, but
   *  the score `requestIds` are only finalized once loading completes — so
   *  until then we must show the loading state, never the "no score" fallback. */
  reportsLoading?: boolean
}

const GAUGE_MAX = 10

// ---- Risk score helpers (0-10, LOWER = better / lower risk) ----
// Color scheme: Low = light green, Moderate = yellow, High = red.
const RISK_LIGHT_GREEN = "#22c55e"
const RISK_YELLOW = "#eab308"
const RISK_RED = "#dc2626"
const INK = "#2e3742"
const MUTED = "#6b7a8c"

// Continuous visual zones on the 0-10 ring/scale: Low 0-3.33 (light green),
// Moderate 3.33-6.66 (yellow), High 6.66-10 (red).
const RISK_ZONES = [
  { from: 0, to: 3.33, color: RISK_LIGHT_GREEN, name: "Low", range: "0 – 3.3" },
  { from: 3.33, to: 6.66, color: RISK_YELLOW, name: "Moderate", range: "3.3 – 6.7" },
  { from: 6.66, to: 10, color: RISK_RED, name: "High", range: "6.7 – 10" },
]

function riskColor(score: number) {
  if (score <= 3.33) return RISK_LIGHT_GREEN
  if (score <= 6.66) return RISK_YELLOW
  return RISK_RED
}

// One decimal, truncated rather than rounded (0.995798 -> "0.9") so a low score is
// never displayed as higher than it is. toPrecision(12) strips floating-point noise
// first so values like 2.3 (stored as 2.2999999...) don't truncate to 2.2.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatScore(n: number, _finalScore: number = n) {
  const truncated = Math.trunc(Number((n * 10).toPrecision(12))) / 10
  return truncated.toFixed(1)
}

// Format the report date (e.g. "22 Jul 2026") so the user knows which report
// the score is based on. Returns null when the date is missing/invalid.
function formatReportDate(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

const pct = (s: number) => (Math.min(GAUGE_MAX, Math.max(0, s)) / GAUGE_MAX) * 100
// Keeps floating labels inside the card while the marker itself stays exact.
const clampLabel = (p: number) => Math.min(86, Math.max(14, p))

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
  { id: "donut", label: "Gauge", Icon: PieChart },
  { id: "graph", label: "Compare", Icon: BarChart3 },
]

// ---- 270° gauge geometry (opens at the bottom) ----
const G_CX = 110
const G_CY = 108
const G_R = 82
const G_INNER_R = 62
const AVG_COLOR = "#64748b"
const G_START = 135
const G_SWEEP = 270

function polarPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

const scoreAngle = (s: number) => G_START + (Math.min(GAUGE_MAX, Math.max(0, s)) / GAUGE_MAX) * G_SWEEP

function gaugeArc(r: number, fromScore: number, toScore: number) {
  const a1 = scoreAngle(fromScore)
  const a2 = scoreAngle(toScore)
  const start = polarPoint(G_CX, G_CY, r, a1)
  const end = polarPoint(G_CX, G_CY, r, a2)
  const largeArc = a2 - a1 > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

export default function HealthScoreSection({
  patientData,
  vasbenefId,
  requestIds,
  accessToken,
  gender: genderProp,
  age: ageProp,
  reportsLoading,
}: HealthScoreSectionProps) {
  // Prefer the reliable beneficiary gender/age; fall back to the loaded report.
  // Both feed the population benchmark (Avg marker), so a valid value here is
  // what makes the MediBuddy benchmark show up.
  const rawGender = genderProp || patientData?.patient_info?.gender
  const gender: string | undefined = rawGender && rawGender !== "Unknown" ? rawGender : undefined
  const age: number | undefined = ageProp || patientData?.patient_info?.age || undefined

  // ---- Risk score from the overall-risk-score API ----
  const idsKey = requestIds && requestIds.length ? requestIds.join(",") : ""
  const riskEnabled = !!(accessToken && idsKey)
  const { data: riskData, isLoading: riskLoading } = useSWR(
    riskEnabled ? ["healthscore", String(vasbenefId), idsKey, gender ?? "", age ?? ""] : null,
    () => fetchHealthScore(requestIds as (string | number)[], accessToken as string, gender, age),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      // Serve the cached score when returning to the dashboard instead of
      // re-hitting the health-score API. SWR's cache is module-level, so this
      // survives remounts; dedupingInterval also collapses concurrent calls.
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5 * 60 * 1000,
    },
  )

  const hasRisk = !!riskData && riskData.score != null
  const riskScore = hasRisk ? (riskData!.score as number) : null
  const benchmark = riskData?.benchmark ?? null

  const [view, setView] = useState<ViewStyle>("scale")

  // Animate the active score from 0. Replays on score change AND on view change
  // so each visualization (gauge / scale / compare) fills in when it's shown.
  const activeScore = hasRisk ? (riskScore as number) : 0
  const [displayScore, setDisplayScore] = useState(0)
  const animRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    const target = activeScore
    const start = performance.now()
    const duration = 900
    setDisplayScore(0)
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
  }, [activeScore, view])

  const renderHeader = () => (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef4fd]">
        <Activity className="h-5 w-5 text-[#156ddc]" />
      </span>
      <h2 className="min-w-0 text-[15px] font-semibold leading-tight text-[#2e3742]">Health Risk Score</h2>
    </div>
  )
  const header = <div className="mb-3">{renderHeader()}</div>

  const actionLinks = (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[#e6ebf1] bg-white">
      <button
        type="button"
        onClick={() => {
          trackEvent("youtube_video_click")
          openExternalUrl("https://www.youtube.com/watch?v=3ym3AjnVF9I")
        }}
        aria-label="Watch how your Health Risk Score is calculated"
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[#f7f9fb] active:bg-[#f0f3f5] focus:outline-none focus-visible:bg-[#f7f9fb]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef4fd]">
          <Youtube className="h-4 w-4 text-[#156ddc]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-[#2e3742]">How it&apos;s calculated</span>
          <span className="block truncate text-xs text-[#6b7a8c]">Watch a short explainer video</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#8a97a8]" aria-hidden="true" />
      </button>
      <div className="mx-3.5 h-px bg-[#eef1f4]" />
      <button
        type="button"
        onClick={() => {
          trackEvent("website_click")
          openExternalUrl("https://healthscorelabs.medibuddy.in")
        }}
        aria-label="Learn more on MediBuddy"
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[#f7f9fb] active:bg-[#f0f3f5] focus:outline-none focus-visible:bg-[#f7f9fb]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef4fd]">
          <Globe className="h-4 w-4 text-[#156ddc]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-[#2e3742]">Learn more</span>
          <span className="block truncate text-xs text-[#6b7a8c]">About MediBuddy Health Score Labs</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#8a97a8]" aria-hidden="true" />
      </button>
    </div>
  )

  // Show the loading state when EITHER:
  //  - the risk score is being fetched (SWR in-flight), OR
  //  - reports are still loading, so the score `requestIds` aren't finalized yet.
  // The second case prevents the "no score" fallback from flashing during the
  // window where reports have partially loaded but requestIds isn't set.
  if ((riskEnabled && riskLoading && !riskData) || (reportsLoading && !hasRisk)) {
    return (
      <section aria-label="Health score, loading" aria-busy="true" className="rounded-2xl border border-[#f0f3f5] bg-white p-4">
        {header}
        <p className="mb-4 text-xs text-[#9dabbd]">Fetching your latest health score…</p>
        <div className="flex flex-col items-center py-4">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-[10px] border-[#eef1f4]" />
            <div className="absolute inset-0 animate-spin rounded-full border-[10px] border-transparent border-t-[#156ddc]" />
            <div className="h-6 w-16 animate-pulse rounded bg-[#eef1f4]" />
          </div>
          <div className="mt-5 h-3 w-40 animate-pulse rounded bg-[#eef1f4]" />
          <div className="mt-2 h-3 w-28 animate-pulse rounded bg-[#f4f6f8]" />
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
    const diffColor = diff == null ? MUTED : diff < 0 ? "#16a34a" : diff > 0 ? RISK_RED : MUTED
    const activeZoneIndex = RISK_ZONES.findIndex(
      (z, i) => score >= z.from && (score < z.to || i === RISK_ZONES.length - 1),
    )
    // Eased 0 -> 1 progress derived from the animated displayScore, reused so the
    // benchmark markers grow in sync with the score.
    const progress = score > 0 ? Math.min(1, displayScore / score) : 1
    const displayAvg = benchmark ? benchmark.avgScore * progress : 0
    const youPct = pct(displayScore)
    const avgPct = pct(displayAvg)

    const labelPill = (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{ color, backgroundColor: `${color}1a` }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        {label}
      </span>
    )

    return (
      <section aria-label="Health risk score" className="rounded-2xl border border-[#e6ebf1] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)]">
        {renderHeader()}
        <div className="mb-5 mt-3 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs text-[#6b7a8c]">
            {reportDate ? (
              <>
                AHC report · <span className="font-semibold text-[#2e3742]">{reportDate}</span>
              </>
            ) : (
              "Based on your last AHC report"
            )}
          </p>
          <div className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-[#f0f3f5] p-0.5" role="tablist" aria-label="Chart style">
            {VIEW_OPTIONS.map(({ id, label: vLabel, Icon }) => {
              const active = view === id
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  aria-label={`${vLabel} view`}
                  onClick={() => setView(id)}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                    active ? "bg-white text-[#156ddc] shadow-sm" : "text-[#9dabbd] hover:text-[#4d5c6f]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              )
            })}
          </div>
        </div>

        {/* ---- GAUGE (270° arc) ---- */}
        {view === "donut" && (
          <div className="flex flex-col items-center">
            <svg
              viewBox="14 14 192 180"
              className="h-auto w-full max-w-[250px]"
              role="img"
              aria-label={`Your risk score ${formatScore(score)} out of 10, ${label}.${benchmark ? ` MediBuddy average ${benchmark.avgScore.toFixed(2)}.` : ""}`}
            >
              {/* Outer ring = YOU. Faint zone colours show Low / Moderate / High. */}
              {RISK_ZONES.map((z) => (
                <path
                  key={z.from}
                  d={gaugeArc(G_R, z.from + (z.from ? 0.08 : 0), z.to - (z.to < GAUGE_MAX ? 0.08 : 0))}
                  fill="none"
                  stroke={z.color}
                  strokeOpacity={0.16}
                  strokeWidth={14}
                  strokeLinecap="round"
                />
              ))}
              {displayScore > 0.02 && (
                <path d={gaugeArc(G_R, 0, displayScore)} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" />
              )}
              {(() => {
                const p = polarPoint(G_CX, G_CY, G_R, scoreAngle(displayScore))
                return <circle cx={p.x} cy={p.y} r={8} fill="#ffffff" stroke={color} strokeWidth={4} />
              })()}

              {/* Inner ring = MEDIBUDDY AVG */}
              {benchmark && (
                <>
                  <path d={gaugeArc(G_INNER_R, 0, GAUGE_MAX)} fill="none" stroke="#eef1f4" strokeWidth={8} strokeLinecap="round" />
                  {displayAvg > 0.02 && (
                    <path d={gaugeArc(G_INNER_R, 0, displayAvg)} fill="none" stroke={AVG_COLOR} strokeWidth={8} strokeLinecap="round" />
                  )}
                  {(() => {
                    const p = polarPoint(G_CX, G_CY, G_INNER_R, scoreAngle(displayAvg))
                    return <circle cx={p.x} cy={p.y} r={5.5} fill="#ffffff" stroke={AVG_COLOR} strokeWidth={3} />
                  })()}
                </>
              )}

              {/* Centre readout */}
              <text x={G_CX} y={G_CY + 8} textAnchor="middle" className="fill-[#2e3742] text-[38px] font-semibold tracking-tight">
                {formatScore(displayScore, score)}
              </text>
              <text x={G_CX} y={G_CY + 26} textAnchor="middle" className="fill-[#9dabbd] text-[11px] font-medium">
                Your score / 10
              </text>
              <text x={polarPoint(G_CX, G_CY, G_R, 135).x} y={G_CY + G_R * 0.707 + 22} textAnchor="middle" className="fill-[#b4c0cd] text-[10px] font-medium">
                0
              </text>
              <text x={polarPoint(G_CX, G_CY, G_R, 45).x} y={G_CY + G_R * 0.707 + 22} textAnchor="middle" className="fill-[#b4c0cd] text-[10px] font-medium">
                10
              </text>
            </svg>

            <div className="-mt-2">{labelPill}</div>

            {/* Ring legend */}
            <div className="mt-4 grid w-full grid-cols-2 gap-2">
              <div className="flex items-center gap-2.5 rounded-xl border border-[#eef1f4] px-3 py-2">
                <span className="h-3 w-3 shrink-0 rounded-full border-[3px] bg-white" style={{ borderColor: color }} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium leading-tight text-[#9dabbd]">You · outer ring</p>
                  <p className="text-sm font-semibold tabular-nums text-[#2e3742]">{formatScore(score)}</p>
                </div>
              </div>
              {benchmark && (
                <div className="flex items-center gap-2.5 rounded-xl border border-[#eef1f4] px-3 py-2">
                  <span className="h-3 w-3 shrink-0 rounded-full border-[3px] bg-white" style={{ borderColor: AVG_COLOR }} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium leading-tight text-[#9dabbd]">Avg · inner ring</p>
                    <p className="text-sm font-semibold tabular-nums text-[#4d5c6f]">{benchmark.avgScore.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- LINEAR SCALE ---- */}
        {view === "scale" && (
          <div>
            <div className="flex items-end justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-1">
                <span className="text-[32px] font-semibold leading-none tracking-tight tabular-nums text-[#2e3742] sm:text-[40px]">
                  {formatScore(displayScore, score)}
                </span>
                <span className="whitespace-nowrap text-sm font-medium text-[#6b7a8c]">/ 10</span>
              </div>
              <div className="shrink-0 whitespace-nowrap">{labelPill}</div>
            </div>

            {/* Track: YOU pinned above, AVG pinned below — labels never collide */}
            <div className="relative mb-12 mt-14 h-2.5">
              <span
                className="absolute bottom-full mb-3.5 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none text-white shadow-[0_2px_6px_rgba(16,24,40,0.15)]"
                style={{ left: `${clampLabel(youPct)}%`, backgroundColor: INK }}
              >
                You · {formatScore(score)}
              </span>
              <span
                className="absolute bottom-full mb-2.5 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45"
                style={{ left: `${youPct}%`, backgroundColor: INK }}
                aria-hidden="true"
              />

              <div className="flex h-full w-full gap-1">
                {RISK_ZONES.map((z, i) => (
                  <div
                    key={z.from}
                    className="h-full rounded-full"
                    style={{
                      width: `${((z.to - z.from) / GAUGE_MAX) * 100}%`,
                      backgroundColor: z.color,
                      opacity: i === activeZoneIndex ? 1 : 0.32,
                    }}
                  />
                ))}
              </div>

              {benchmark && (
                <>
                  <span
                    className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                    style={{ left: `${avgPct}%`, backgroundColor: AVG_COLOR }}
                    aria-hidden="true"
                  />
                  <span
                    className="absolute top-full mt-2.5 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-[#dfe5ec] bg-white"
                    style={{ left: `${avgPct}%` }}
                    aria-hidden="true"
                  />
                  <span
                    className="absolute top-full mt-2.5 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#dfe5ec] bg-white px-2.5 py-1 text-[11px] font-semibold leading-none"
                    style={{ left: `${clampLabel(avgPct)}%`, color: AVG_COLOR }}
                  >
                    Avg · {benchmark.avgScore.toFixed(2)}
                  </span>
                </>
              )}

              <span
                className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 bg-white shadow-[0_2px_8px_rgba(16,24,40,0.18)]"
                style={{ left: `${youPct}%`, borderColor: color }}
                aria-hidden="true"
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {RISK_ZONES.map((z, i) => {
                const active = i === activeZoneIndex
                return (
                  <div
                    key={z.name}
                    className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 ${
                      active ? "bg-[#f4f7fb] ring-1 ring-[#e6ebf1]" : ""
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: active ? INK : MUTED }}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: z.color }} aria-hidden="true" />
                      {z.name}
                    </span>
                    <span className="text-[11px] font-medium tabular-nums text-[#8a97a8]">{z.range}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ---- COMPARE (bars) ---- */}
        {view === "graph" && (
          <div className="pt-1">
            <div className="relative flex flex-col gap-5">
              {[
                { key: "you", name: "You", value: score, fillPct: youPct, fill: color, strong: true },
                ...(benchmark
                  ? [
                      {
                        key: "avg",
                        name: `Avg · ${benchmark.band}`,
                        value: benchmark.avgScore,
                        fillPct: avgPct,
                        fill: AVG_COLOR,
                        strong: false,
                      },
                    ]
                  : []),
              ].map((row) => (
                <div key={row.key}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className={`truncate text-xs ${row.strong ? "font-semibold text-[#2e3742]" : "font-medium text-[#4d5c6f]"}`}>
                      {row.name}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: row.strong ? INK : "#4d5c6f" }}>
                      {row.value.toFixed(2)}
                      <span className="text-[11px] font-medium text-[#9dabbd]"> / 10</span>
                    </span>
                  </div>
                  <div className="h-3.5 w-full overflow-hidden rounded-full bg-[#f0f3f5]">
                    <div className="h-full rounded-full" style={{ width: `${row.fillPct}%`, backgroundColor: row.fill }} />
                  </div>
                </div>
              ))}

              {/* Dashed avg reference line through both bars */}
              {benchmark && (
                <span
                  className="pointer-events-none absolute bottom-0 top-6 border-l-2 border-dashed border-[#2e3742]/40"
                  style={{ left: `${avgPct}%` }}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-medium text-[#b4c0cd]">
              {[0, 2, 4, 6, 8, 10].map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* ---- You vs Avg comparison (shared) ---- */}
        {benchmark && diff != null ? (
          <div className="mt-5 rounded-2xl border border-[#e6ebf1] bg-[#f7f9fc] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="whitespace-nowrap text-xs font-medium text-[#6b7a8c]">Your score</p>
                <p className="text-xl font-semibold tabular-nums text-[#2e3742]">{formatScore(score)}</p>
              </div>
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums"
                style={{ color: diffColor, backgroundColor: `${diffColor}1a` }}
              >
                {diff < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                ) : diff > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {diff > 0 ? "+" : diff < 0 ? "−" : ""}
                {Math.abs(diff).toFixed(2)} pts
              </span>
              <div className="min-w-0 text-right">
                <p className="whitespace-nowrap text-xs font-medium text-[#6b7a8c]">MediBuddy avg</p>
                <p className="text-xl font-semibold tabular-nums text-[#4d5c6f]">{benchmark.avgScore.toFixed(2)}</p>
              </div>
            </div>
            <p className="mt-3 border-t border-[#e6ebf1] pt-3 text-xs leading-relaxed text-[#4d5c6f]">
              {diff < 0 ? "Lower risk than the average for " : diff > 0 ? "Higher risk than the average for " : "Right at the average for "}
              <span className="whitespace-nowrap font-semibold text-[#2e3742]">{benchmark.band}</span>.{" "}
              <span className="text-[#6b7a8c]">Lower score = lower risk.</span>
            </p>
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-[#f7f9fc] p-3 text-xs leading-relaxed text-[#4d5c6f]">
            Your overall health risk score across your reports. A lower score means lower health risk (0 best, 10 highest).
          </p>
        )}

        {actionLinks}
      </section>
    )
  }

  // The score section is shown only when the health-score API succeeds with a score.
  return null
}
