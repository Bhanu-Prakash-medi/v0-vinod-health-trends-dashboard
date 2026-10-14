"use client"

import { ChevronRight, RefreshCw, Sparkles } from "lucide-react"
import type { ApiHealthReport } from "@/lib/api"
import type { RecParameter } from "@/lib/recommendations-api"
import { organIcon, paramKey, reasonFor, statusTone, useRecommendations } from "@/lib/use-recommendations"

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

  return (
    <section aria-labelledby="recommendations-heading" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ff] text-[#156ddc]"
            aria-hidden="true"
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="recommendations-heading" className="text-base font-semibold text-[#2e3742]">
              Top Focus Areas
            </h2>
            <p className="truncate text-xs text-[#9dabbd]">
              {reportDate ? `From your report on ${reportDate}` : "From your latest report"}
            </p>
          </div>
        </div>
        {data && priority.length > 0 && (
          <button
            type="button"
            onClick={() => openRecommendations()}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-sm font-semibold text-[#156ddc] transition-colors hover:bg-[#e8f2ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
          >
            See all
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {isLoading && <PreviewSkeleton />}

      {error && !isLoading && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#f0f3f5] bg-[#ffffff] p-5 text-center">
          <p className="text-sm text-[#4d5c6f]">{"We couldn't load your recommendations right now."}</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#156ddc] px-4 py-2 text-sm font-semibold text-[#ffffff] transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {data && !isLoading && priority.length > 0 && (
        <ul className="flex flex-col overflow-hidden rounded-2xl border border-[#f0f3f5] bg-[#ffffff]">
          {priority.map((p, i) => (
            <li key={paramKey(p)} className={i > 0 ? "border-t border-[#f0f3f5]" : undefined}>
              <PreviewRow param={p} onClick={() => openRecommendations(paramKey(p))} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PreviewRow({ param, onClick }: { param: RecParameter; onClick: () => void }) {
  const Icon = organIcon(param.organ)
  const tone = statusTone(param.status)
  const reason = reasonFor(param)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-[#f7f9fa] focus:outline-none focus-visible:bg-[#f7f9fa]"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ff] text-[#156ddc]"
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-[#2e3742]">{param.parameter}</span>
          {tone.label && (
            <span
              className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${tone.pill}`}
            >
              {tone.Icon && <tone.Icon className="h-3 w-3" aria-hidden="true" />}
              {param.value ? `${tone.label} · ${param.value}` : tone.label}
            </span>
          )}
        </span>
        {reason && <span className="line-clamp-2 text-xs leading-relaxed text-[#4d5c6f]">{reason}</span>}
      </span>
      <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-[#9dabbd]" aria-hidden="true" />
    </button>
  )
}

function PreviewSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-[#f0f3f5] bg-[#ffffff]"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading recommendations</span>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`flex gap-3 p-3.5 ${i > 0 ? "border-t border-[#f0f3f5]" : ""}`}>
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-[#f0f3f5]" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-[#f0f3f5]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[#f0f3f5]" />
          </div>
        </div>
      ))}
    </div>
  )
}
