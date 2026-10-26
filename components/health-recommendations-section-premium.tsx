"use client"

import { ArrowRight, ChevronRight, Lightbulb, RefreshCw, Sparkles } from "lucide-react"
import type { ApiHealthReport } from "@/lib/api"
import type { RecParameter } from "@/lib/recommendations-api"
import { formatReportDate, organIcon, paramKey, useRecommendations } from "@/lib/use-recommendations"

interface HealthRecommendationsSectionProps {
  patientData: ApiHealthReport
  onSeeAll?: (paramId?: string) => void
}

const PREVIEW_COUNT = 3

function tileTone(status = "") {
  const s = status.toLowerCase()
  if (s === "high") return "bg-[#fdecec] text-[#c93838]"
  if (s === "low") return "bg-[#fff4e5] text-[#b8650a]"
  return "bg-[#eef4fd] text-[#156ddc]"
}

function chipTone(status = "") {
  const s = status.toLowerCase()
  if (s === "high") return "bg-[#fdecec] text-[#c93838]"
  if (s === "low") return "bg-[#fff4e5] text-[#b8650a]"
  return "bg-[#eef4fd] text-[#156ddc]"
}

function statusLabel(status = "") {
  return status ? status[0].toUpperCase() + status.slice(1).toLowerCase() : ""
}

function topAdvice(param: RecParameter) {
  const lifestyle = param.recommendations?.lifestyle?.[0]?.change
  if (lifestyle) return lifestyle
  const food = param.recommendations?.diet?.include?.[0]?.food
  if (food) return `Add ${food} to your diet`
  const limit = param.recommendations?.diet?.limit?.[0]?.food
  if (limit) return `Cut down on ${limit}`
  return param.next_steps?.consult_doctor?.advice ?? ""
}

export default function HealthRecommendationsSection({ patientData, onSeeAll }: HealthRecommendationsSectionProps) {
  const { enabled, reportDate, data, error, isLoading, retry, priority } = useRecommendations(patientData)
  const openRecommendations = (paramId?: string) => {
    if (typeof onSeeAll === "function") onSeeAll(paramId)
  }

  if (!enabled) return null
  if (data && !isLoading && priority.length === 0) return null

  const dateLabel = formatReportDate(reportDate)
  const preview = priority.slice(0, PREVIEW_COUNT)
  const count = priority.length

  return (
    <section aria-labelledby="recommendations-heading" className="flex flex-col gap-3">
      <h2 className="text-balance text-lg font-bold leading-tight text-[#2e3742]">Recommended for you</h2>

      <div className="overflow-hidden rounded-3xl border border-[#e6ebf1] bg-[#ffffff] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)]">
        <div className="flex items-center gap-3 border-b border-[#dbe6f5] bg-[#eef4fd] px-4 py-4 sm:px-5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#156ddc] text-[#ffffff] shadow-[0_6px_16px_-6px_rgba(21,109,220,0.6)]"
            aria-hidden="true"
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#156ddc]">
              Personalised action plan
            </span>
            <h3 id="recommendations-heading" className="text-base font-bold leading-tight text-[#2e3742] sm:text-lg">
              {data && count > 0
                ? `${count} ${count === 1 ? "step" : "steps"} to improve your health`
                : "Your health recommendations"}
            </h3>
            <p className="truncate text-xs text-[#6b7685]">
              {dateLabel ? `Based on your report from ${dateLabel}` : "Based on your latest report"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 sm:p-5">
          {isLoading && <PreviewSkeleton />}

          {error && !isLoading && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[#6b7685]">{"Couldn't load your recommendations."}</p>
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

          {data && !isLoading && count > 0 && (
            <>
              <ul className="flex flex-col gap-3">
                {preview.map((p) => (
                  <li key={paramKey(p)}>
                    <RecommendationRow param={p} onClick={() => openRecommendations(paramKey(p))} />
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => openRecommendations()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#156ddc] px-4 py-3.5 text-sm font-semibold text-[#ffffff] shadow-[0_6px_16px_-6px_rgba(21,109,220,0.6)] transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40 focus-visible:ring-offset-2 sm:text-base"
              >
                {`View all ${count} ${count === 1 ? "recommendation" : "recommendations"}`}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function RecommendationRow({ param, onClick }: { param: RecParameter; onClick: () => void }) {
  const Icon = organIcon(param.organ)
  const label = statusLabel(param.status)
  const advice = topAdvice(param)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-3 rounded-2xl border border-[#eef1f4] bg-[#f7f9fb] p-3 text-left transition-colors hover:border-[#dbe6f5] hover:bg-[#eef4fd] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40"
    >
      <span className="flex w-full items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tileTone(param.status)}`}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-semibold text-[#2e3742] sm:text-base">{param.parameter}</span>
          {(label || param.value) && (
            <span className="flex items-center gap-2 text-xs text-[#6b7685]">
              {label && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chipTone(param.status)}`}>
                  {label}
                </span>
              )}
              {param.value && <span className="truncate">{param.value}</span>}
            </span>
          )}
        </span>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-[#9aa4b2] transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>

      {advice && (
        <span className="flex items-start gap-2 rounded-xl bg-[#ffffff] px-3 py-2.5 text-sm leading-relaxed text-[#2e3742] ring-1 ring-[#eef1f4]">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#156ddc]" aria-hidden="true" />
          <span className="line-clamp-2 text-pretty">
            <span className="font-semibold text-[#156ddc]">Try: </span>
            {advice}
          </span>
        </span>
      )}
    </button>
  )
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your recommendations</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl bg-[#f7f9fb] p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-[#eef1f4]" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-3.5 w-1/2 animate-pulse rounded bg-[#eef1f4]" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-[#eef1f4]" />
            </div>
          </div>
          <div className="h-9 w-full animate-pulse rounded-xl bg-[#eef1f4]" />
        </div>
      ))}
      <div className="h-12 w-full animate-pulse rounded-2xl bg-[#eef1f4]" />
    </div>
  )
}
