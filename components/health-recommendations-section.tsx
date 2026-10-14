"use client"

import { ChevronRight, ClipboardList, RefreshCw, Sparkle } from "lucide-react"
import type { ApiHealthReport } from "@/lib/api"
import type { RecParameter } from "@/lib/recommendations-api"
import {
  actionTip,
  formatReportDate,
  organIcon,
  paramKey,
  statusTone,
  useRecommendations,
} from "@/lib/use-recommendations"

interface HealthRecommendationsSectionProps {
  patientData: ApiHealthReport
  onSeeAll?: (paramId?: string) => void
}

export default function HealthRecommendationsSection({ patientData, onSeeAll }: HealthRecommendationsSectionProps) {
  const { enabled, reportDate, data, error, isLoading, retry, priority } = useRecommendations(patientData)
  const openRecommendations = (paramId?: string) => {
    if (typeof onSeeAll === "function") onSeeAll(paramId)
  }

  if (!enabled) return null
  if (data && !isLoading && priority.length === 0) return null

  const dateLabel = formatReportDate(reportDate)

  return (
    <section aria-labelledby="recommendations-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#156ddc] text-[#ffffff]"
            aria-hidden="true"
          >
            <ClipboardList className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="recommendations-heading" className="text-base font-semibold leading-tight text-[#2e3742]">
              Your Action Plan
            </h2>
            <p className="truncate text-xs text-[#9dabbd]">
              {data && priority.length > 0
                ? `${priority.length} things to work on${dateLabel ? ` · ${dateLabel}` : ""}`
                : dateLabel
                  ? `From your report on ${dateLabel}`
                  : "From your latest report"}
            </p>
          </div>
        </div>
        {data && priority.length > 0 && (
          <button
            type="button"
            onClick={() => openRecommendations()}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-semibold text-[#156ddc] transition-colors hover:bg-[#d6e8ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
          >
            See all
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {isLoading && <PreviewSkeleton />}

      {error && !isLoading && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f7f9fa] p-4">
          <p className="text-sm text-[#4d5c6f]">{"Couldn't load your action plan."}</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#156ddc] px-3 py-1.5 text-xs font-semibold text-[#ffffff] transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {data && !isLoading && priority.length > 0 && (
        <ul className="grid grid-cols-2 gap-2.5">
          {priority.map((p) => (
            <li key={paramKey(p)} className="flex">
              <PreviewCard param={p} onClick={() => openRecommendations(paramKey(p))} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PreviewCard({ param, onClick }: { param: RecParameter; onClick: () => void }) {
  const Icon = organIcon(param.organ)
  const tone = statusTone(param.status)
  const tip = actionTip(param)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-2xl bg-[#f7f9fa] p-3 text-left transition-colors hover:bg-[#eef2f6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ffffff] text-[#156ddc]"
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
        {tone.label && (
          <span
            className={`inline-flex min-w-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${tone.pill}`}
          >
            {tone.Icon && <tone.Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
            <span className="truncate">{param.value || tone.label}</span>
          </span>
        )}
      </span>
      <span className="line-clamp-1 text-sm font-semibold text-[#2e3742]">{param.parameter}</span>
      {tip && (
        <span className="flex gap-1 text-xs leading-snug text-[#4d5c6f]">
          <Sparkle className="mt-0.5 h-3 w-3 shrink-0 text-[#156ddc]" aria-hidden="true" />
          <span className="line-clamp-2">{tip}</span>
        </span>
      )}
    </button>
  )
}

function PreviewSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your action plan</span>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2 rounded-2xl bg-[#f7f9fa] p-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-[#e5e9ee]" />
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#e5e9ee]" />
          <div className="h-3 w-full animate-pulse rounded bg-[#e5e9ee]" />
        </div>
      ))}
    </div>
  )
}
