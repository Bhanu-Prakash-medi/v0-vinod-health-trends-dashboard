"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity } from "lucide-react"
import ReportProblemButton from "@/components/report-problem-button"

interface HealthScoreSectionProps {
  patientData: any
  vasbenefId?: string | number
}

const GAUGE_MIN = 0
const GAUGE_MAX = 10

// Gauge geometry (semicircle).
const CX = 130
const CY = 130
const R = 100
const STROKE = 18

// Colored zones across the 0-10 range (load-bearing health colors).
const ZONES = [
  { from: 0, to: 4, color: "#dc2626" }, // red-600 — needs attention
  { from: 4, to: 7, color: "#f59e0b" }, // amber-500 — fair
  { from: 7, to: 10, color: "#16a34a" }, // green-600 — good
]

// Convert a score (0-10) to a point on the semicircle. Score 0 is the far
// left (180deg), score 10 is the far right (0deg), score 5 is the top.
function pointFor(score: number, radius: number) {
  const angleDeg = 180 - (score / GAUGE_MAX) * 180
  const angleRad = (angleDeg * Math.PI) / 180
  return {
    x: CX + radius * Math.cos(angleRad),
    y: CY - radius * Math.sin(angleRad),
  }
}

function arcPath(fromScore: number, toScore: number, radius: number) {
  const start = pointFor(fromScore, radius)
  const end = pointFor(toScore, radius)
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`
}

function scoreMeta(score: number) {
  if (score >= 9) return { label: "Excellent", color: "#16a34a" }
  if (score >= 7) return { label: "Good", color: "#16a34a" }
  if (score >= 4) return { label: "Fair", color: "#f59e0b" }
  return { label: "Needs attention", color: "#dc2626" }
}

export default function HealthScoreSection({ patientData, vasbenefId }: HealthScoreSectionProps) {
  // Derive a 0-10 score from the ratio of in-range to total biomarkers across
  // all health-summary categories. Duplicate biomarker names are collapsed so
  // overlapping categories don't skew the ratio.
  const { score, total, normal } = useMemo(() => {
    const summary = patientData?.health_summary || []
    const seen = new Map<string, boolean>() // name -> isAbnormal

    for (const category of summary) {
      for (const param of category?.parameters || []) {
        const name = (param?.name || param?.metric_name || "").toString().toLowerCase().trim()
        if (!name) continue
        const status = (param?.status || param?.Status || "").toString().toLowerCase()
        const isAbnormal = status !== "" && status !== "normal" && status !== "within normal limits"
        // Keep the worst status seen for a given biomarker.
        if (!seen.has(name) || isAbnormal) seen.set(name, isAbnormal)
      }
    }

    const totalCount = seen.size
    const normalCount = [...seen.values()].filter((abnormal) => !abnormal).length
    const computed = totalCount > 0 ? (normalCount / totalCount) * GAUGE_MAX : null

    return {
      score: computed == null ? null : Math.round(computed * 10) / 10,
      total: totalCount,
      normal: normalCount,
    }
  }, [patientData])

  // Animate the needle from 0 to the computed score on mount / change.
  const [displayScore, setDisplayScore] = useState(0)
  useEffect(() => {
    if (score == null) return
    let frame: number
    const start = performance.now()
    const duration = 900
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplayScore(score * eased)
      if (t < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score])

  if (score == null) return null

  const meta = scoreMeta(score)
  const needle = pointFor(displayScore, R - STROKE - 6)

  return (
    <section aria-label="Health score" className="rounded-2xl border border-[#f0f3f5] bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#156ddc]" />
          <h2 className="text-base font-semibold text-[#2e3742]">Health Score</h2>
        </div>
        <ReportProblemButton section="Health Score" vasbenefId={vasbenefId} />
      </div>

      <div className="flex flex-col items-center">
        <svg
          viewBox="0 0 260 160"
          className="h-auto w-full max-w-[280px]"
          role="img"
          aria-label={`Health score ${score} out of 10, ${meta.label}`}
        >
          {/* Track */}
          <path
            d={arcPath(GAUGE_MIN, GAUGE_MAX, R)}
            fill="none"
            stroke="#eef1f4"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />

          {/* Colored zones */}
          {ZONES.map((zone) => (
            <path
              key={`${zone.from}-${zone.to}`}
              d={arcPath(zone.from, zone.to, R)}
              fill="none"
              stroke={zone.color}
              strokeWidth={STROKE}
            />
          ))}

          {/* Scale ticks (0, 5, 10) */}
          {[0, 5, 10].map((tick) => {
            const p = pointFor(tick, R - STROKE - 16)
            return (
              <text
                key={tick}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[#9dabbd] text-[11px] font-medium"
              >
                {tick}
              </text>
            )
          })}

          {/* Needle */}
          <line
            x1={CX}
            y1={CY}
            x2={needle.x}
            y2={needle.y}
            stroke="#2e3742"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY} r={8} fill="#2e3742" />
          <circle cx={CX} cy={CY} r={3} fill="#ffffff" />
        </svg>

        {/* Score readout */}
        <div className="-mt-4 flex flex-col items-center">
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold leading-none text-[#2e3742]">{score.toFixed(1)}</span>
            <span className="mb-0.5 text-sm font-medium text-[#9dabbd]">/ 10</span>
          </div>
          <span
            className="mt-1 rounded-pill px-2.5 py-0.5 text-xs font-semibold"
            style={{ color: meta.color, backgroundColor: `${meta.color}1a` }}
          >
            {meta.label}
          </span>
          <p className="mt-2 text-center text-xs text-[#9dabbd]">
            {normal} of {total} biomarkers within normal range
          </p>
        </div>
      </div>
    </section>
  )
}
