"use client"

import { ArrowRight, ChevronRight, RefreshCw, Sparkles } from "lucide-react"
import type { ApiHealthReport } from "@/lib/api"
import type { RecParameter } from "@/lib/recommendations-api"
import { formatReportDate, organIcon, paramKey, useRecommendations } from "@/lib/use-recommendations"

interface HealthRecommendationsSectionProps {
  patientData: ApiHealthReport
  onSeeAll?: (paramId?: string) => void
}

const PREVIEW_COUNT = 3

function statusTone(status = "") {
  const s = status.toLowerCase()
  if (s === "high") return { tile: "bg-[#ff6b6b]/15 text-[#ff9b9b] ring-[#ff6b6b]/30", pill: "bg-[#ff6b6b]/15 text-[#ffb3b3]", dot: "bg-[#ff6b6b]" }
  if (s === "low") return { tile: "bg-[#ffb547]/15 text-[#ffc977] ring-[#ffb547]/30", pill: "bg-[#ffb547]/15 text-[#ffd699]", dot: "bg-[#ffb547]" }
  return { tile: "bg-[#5aa9ff]/15 text-[#9ccbff] ring-[#5aa9ff]/30", pill: "bg-[#5aa9ff]/15 text-[#b8daff]", dot: "bg-[#5aa9ff]" }
}

function statusLabel(status = "") {
  return status ? status[0].toUpperCase() + status.slice(1).toLowerCase() : ""
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
      <h2 className="text-balance text-lg font-bold leading-tight text-[#2e3742]">Your health at a glance</h2>

      <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#0d3f96_0%,#082a66_45%,#061b44_100%)] shadow-[0_18px_40px_-16px_rgba(6,27,68,0.7)] ring-1 ring-[#ffffff]/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(115deg,#fff_0_1px,transparent_1px_9px)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)]"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ffffff]/10 text-[#ffffff] ring-1 ring-[#ffffff]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
              aria-hidden="true"
            >
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="recommendations-heading" className="text-base font-bold leading-tight text-[#ffffff] sm:text-lg">
                Health Insights
              </h3>
              <p className="truncate text-xs text-[#ffffff]/75 sm:text-sm">
                {dateLabel ? `From your report on ${dateLabel}` : "From your latest report"}
              </p>
            </div>
            {data && count > 0 && (
              <span className="shrink-0 rounded-full bg-[#ffffff]/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-[#ffffff] ring-1 ring-[#ffffff]/20">
                {count} to review
              </span>
            )}
          </div>

          {isLoading && <PreviewSkeleton />}

          {error && !isLoading && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#ffffff]/5 p-3 ring-1 ring-[#ffffff]/10">
              <p className="text-sm text-[#ffffff]/85">{"Couldn't load your health insights."}</p>
              <button
                type="button"
                onClick={retry}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#ffffff] px-3 py-1.5 text-xs font-semibold text-[#0d3f96] transition-opacity hover:opacity-90"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Retry
              </button>
            </div>
          )}

          {data && !isLoading && count > 0 && (
            <>
              <ul className="flex flex-col gap-2">
                {preview.map((p) => (
                  <li key={paramKey(p)}>
                    <InsightRow param={p} onClick={() => openRecommendations(paramKey(p))} />
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => openRecommendations()}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ffffff] px-4 py-3.5 text-sm font-bold text-[#0d3f96] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)] transition-colors hover:bg-[#e8f2ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffffff]/60 sm:text-base"
              >
                {`See all ${count} ${count === 1 ? "insight" : "insights"}`}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function InsightRow({ param, onClick }: { param: RecParameter; onClick: () => void }) {
  const Icon = organIcon(param.organ)
  const label = statusLabel(param.status)
  const tone = statusTone(param.status)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl bg-[#ffffff]/[0.06] p-3 text-left ring-1 ring-[#ffffff]/10 backdrop-blur-sm transition-colors hover:bg-[#ffffff]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffffff]/50"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${tone.tile}`}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-[#ffffff] sm:text-base">{param.parameter}</span>
        <span className="flex min-w-0 items-center gap-2">
          {label && (
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.pill}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
              {label}
            </span>
          )}
          {param.value && (
            <span className="truncate text-xs font-medium tabular-nums text-[#ffffff]/80">{param.value}</span>
          )}
        </span>
      </span>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-[#ffffff]/70 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </button>
  )
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your health insights</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl bg-[#ffffff]/[0.06] p-3 ring-1 ring-[#ffffff]/10">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-[#ffffff]/10" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-[#ffffff]/15" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-[#ffffff]/10" />
          </div>
        </div>
      ))}
      <div className="mt-2 h-12 w-full animate-pulse rounded-2xl bg-[#ffffff]/15" />
    </div>
  )
}
