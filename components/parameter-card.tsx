"use client"

import { useEffect, useRef, useState } from "react"
import BiomarkerInfoButton from "@/components/biomarker-info-button"
import CountUp from "@/components/count-up"
import { calculateDynamicPosition } from "@/lib/calculateDynamicPosition"
import { getParameterBand, getParameterBandScale, getParameterNormalRange } from "@/lib/parameter-bands"
import { formatParamDisplay } from "@/lib/format-param-value"
import type { CollectedParameter } from "@/lib/collect-parameters"

const NORMAL = "#1f9d55"
const ABNORMAL = "#e5484d"
const DEFAULT_SEGMENTS = [
  { color: "#f0605d", widthPct: 33.33, label: "Low" },
  { color: "#22b864", widthPct: 33.34, label: "Normal" },
  { color: "#f0605d", widthPct: 33.33, label: "High" },
]

interface ParameterCardProps {
  param: CollectedParameter
  date?: string
  gender?: string | null
  compact?: boolean
}

export default function ParameterCard({ param, date, gender, compact = false }: ParameterCardProps) {
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
      className={`relative flex flex-col overflow-hidden rounded-2xl border border-[#e8edf3] bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)] ${
        compact ? "gap-2.5 px-3.5 py-3" : "gap-3 p-3.5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1 pt-0.5">
          <h3
            className={`text-pretty font-semibold leading-snug text-[#1d2733] ${compact ? "text-[13px]" : "text-sm"}`}
          >
            {param.name}
          </h3>
          <BiomarkerInfoButton name={param.name} gender={gender ?? undefined} />
        </div>
        <span
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ color: accent, backgroundColor: `${accent}14`, boxShadow: `inset 0 0 0 1px ${accent}26` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />
          {label}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <CountUp
          value={display.value}
          className={`font-semibold leading-none tracking-tight tabular-nums text-[#121a24] ${
            compact ? "text-lg" : "text-xl"
          }`}
        />
        {display.unit && (
          <span className={`truncate font-medium text-[#7d8a98] ${compact ? "text-[11px]" : "text-xs"}`}>
            {display.unit}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative h-5" role="img" aria-label={`${label}. Normal range ${display.range}`}>
          <div className="absolute inset-x-0 top-1/2 flex h-2 -translate-y-1/2 gap-[3px]">
            {segments.map((seg, i) => (
              <span
                key={i}
                className="h-full rounded-full"
                style={{
                  width: `${seg.widthPct}%`,
                  backgroundImage: `linear-gradient(180deg, ${seg.color}, ${seg.color}d9)`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 3px ${seg.color}40`,
                }}
              />
            ))}
          </div>
          <span
            className="absolute top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-card transition-[left] duration-1000 ease-out motion-reduce:transition-none"
            style={{
              left: `${revealed ? Math.min(97, Math.max(3, markerPct)) : 3}%`,
              boxShadow: `0 0 0 4px ${accent}2e, 0 3px 8px rgba(16,24,40,0.28)`,
            }}
            aria-hidden="true"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
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
