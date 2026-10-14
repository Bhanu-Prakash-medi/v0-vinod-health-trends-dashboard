"use client"

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import BiomarkerInfoButton from "@/components/biomarker-info-button"

interface TrendCardHeaderProps {
  name: string
  gender?: string
  current: number | string
  unit?: string
  displayRange?: string
  accent: string
  label: string
  changePercent: number
  readings: number
}

export default function TrendCardHeader({
  name,
  gender,
  current,
  unit,
  displayRange,
  accent,
  label,
  changePercent,
  readings,
}: TrendCardHeaderProps) {
  const isStable = !Number.isFinite(changePercent) || Math.abs(changePercent) < 1
  const DeltaIcon = isStable ? Minus : changePercent > 0 ? ArrowUpRight : ArrowDownRight
  const deltaText = isStable ? "Stable" : `${Math.abs(changePercent).toFixed(1)}%`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1 pt-0.5">
          <h3 className="text-pretty text-sm font-semibold leading-snug text-[#1d2733]">{name}</h3>
          <BiomarkerInfoButton name={name} gender={gender} />
        </div>
        <span
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ color: accent, backgroundColor: `${accent}14`, boxShadow: `inset 0 0 0 1px ${accent}26` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />
          {label}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="text-xl font-semibold leading-none tracking-tight tabular-nums text-[#121a24]">
            {current}
          </span>
          {unit && <span className="truncate text-xs font-medium text-[#7d8a98]">{unit}</span>}
        </div>
        <span
          className="flex shrink-0 items-center gap-0.5 rounded-md bg-[#f2f5f9] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#3d4957]"
          aria-label={isStable ? "Stable since last reading" : `${deltaText} ${changePercent > 0 ? "higher" : "lower"} than last reading`}
        >
          <DeltaIcon className="h-3 w-3" aria-hidden="true" />
          {deltaText}
          <span className="font-medium text-[#98a3b0]">vs last</span>
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-[#98a3b0]">
          <span className="font-semibold tabular-nums text-[#3d4957]">{readings}</span> readings
        </span>
        {displayRange && (
          <span className="truncate text-[#98a3b0]">
            Normal <span className="font-semibold tabular-nums text-[#3d4957]">{displayRange}</span>
          </span>
        )}
      </div>
    </div>
  )
}
