"use client"

import { useEffect, useRef, useState } from "react"
import BiomarkerInfoButton from "@/components/biomarker-info-button"
import CountUp from "@/components/count-up"
import { calculateDynamicPosition } from "@/lib/calculateDynamicPosition"
import { getParameterBand, getParameterBandScale, getParameterNormalRange } from "@/lib/parameter-bands"
import { formatParamDisplay } from "@/lib/format-param-value"
import type { CollectedParameter } from "@/lib/collect-parameters"

const NORMAL = "#2f9e5b"
const ABNORMAL = "#d6453a"
const DEFAULT_SEGMENTS = [
  { color: "#f3b4ad", widthPct: 33.33, label: "Low" },
  { color: "#4fb877", widthPct: 33.34, label: "Normal" },
  { color: "#f3b4ad", widthPct: 33.33, label: "High" },
]

interface ParameterCardProps {
  param: CollectedParameter
  date?: string
  gender?: string | null
}

export default function ParameterCard({ param, date, gender }: ParameterCardProps) {
  const band = getParameterBand(param.name, param.value, gender)
  const bandScale = getParameterBandScale(param.name, param.value, gender)
  const accent = band?.color ?? (param.status === "normal" ? NORMAL : ABNORMAL)
  const label = band?.shortLabel ?? (param.status === "normal" ? "Normal" : "Out of range")
  const segments = bandScale?.segments ?? DEFAULT_SEGMENTS
  const markerPct = bandScale?.markerPct ?? calculateDynamicPosition(param.value, param.range) ?? 50

  const normalRange = getParameterNormalRange(param.name, gender) ?? param.range
  const display = formatParamDisplay(param.name, param.value, param.unit, normalRange)

  const ref = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <article
      ref={ref}
      className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-[#e8edf3] bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1 pt-0.5">
          <h3 className="text-pretty text-sm font-semibold leading-snug text-[#1d2733]">{param.name}</h3>
          <BiomarkerInfoButton name={param.name} gender={gender ?? undefined} />
        </div>
        <span
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ color: accent, backgroundColor: `${accent}14`, boxShadow: `inset 0 0 0 1px ${accent}26` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />
          {label}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <CountUp
          value={display.value}
          className="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-[#121a24]"
        />
        {display.unit && <span className="truncate text-xs font-medium text-[#7d8a98]">{display.unit}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative h-4" role="img" aria-label={`${label}. Normal range ${display.range}`}>
          <div className="absolute inset-x-0 top-1/2 flex h-1.5 -translate-y-1/2 gap-0.5">
            {segments.map((seg, i) => (
              <span
                key={i}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${seg.widthPct}%`, backgroundColor: seg.color, opacity: 0.9 }}
              />
            ))}
          </div>
          <span
            className="absolute top-1/2 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-card shadow-[0_2px_6px_rgba(16,24,40,0.25)] transition-[left] duration-1000 ease-out motion-reduce:transition-none"
            style={{ left: `${revealed ? Math.min(97, Math.max(3, markerPct)) : 3}%` }}
            aria-hidden="true"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px]">
          <span className="text-[#98a3b0]">{date}</span>
          <span className="truncate text-[#98a3b0]">
            Normal <span className="font-semibold tabular-nums text-[#3d4957]">{display.range}</span>
          </span>
        </div>
      </div>
    </article>
  )
}
