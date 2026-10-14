"use client"

import { ArrowRight, ChevronRight, RefreshCw, ShieldCheck } from "lucide-react"
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
  return "bg-[#e8f2ff] text-[#156ddc]"
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

      <div className="flex flex-col gap-4 rounded-3xl bg-[#0b3c7d] p-4 shadow-[0_12px_32px_-12px_rgba(11,60,125,0.55)] sm:p-5">
        <div className="flex items-center gap-3 border-b border-[#ffffff]/10 pb-4">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ffffff]/10 text-[#ffffff]"
            aria-hidden="true"
          >
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 id="recommendations-heading" className="text-base font-semibold leading-tight text-[#ffffff] sm:text-lg">
              Health Insights
            </h3>
            <p className="truncate text-xs text-[#ffffff]/70 sm:text-sm">
              {data && count > 0
                ? `${count} ${count === 1 ? "thing" : "things"} to look after${dateLabel ? ` · ${dateLabel}` : ""}`
                : dateLabel
                  ? `From your report on ${dateLabel}`
                  : "From your latest report"}
            </p>
          </div>
        </div>

        {isLoading && <PreviewSkeleton />}

        {error && !isLoading && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[#ffffff]/80">{"Couldn't load your health insights."}</p>
            <button
              type="button"
              onClick={retry}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#ffffff] px-3 py-1.5 text-xs font-semibold text-[#0b3c7d] transition-opacity hover:opacity-90"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {data && !isLoading && count > 0 && (
          <>
            <ul className="-my-1 flex flex-col divide-y divide-[#ffffff]/10">
              {preview.map((p) => (
                <li key={paramKey(p)}>
                  <InsightRow param={p} onClick={() => openRecommendations(paramKey(p))} />
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => openRecommendations()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ffffff] px-4 py-3.5 text-sm font-semibold text-[#0b3c7d] transition-colors hover:bg-[#e8f2ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffffff]/60 sm:text-base"
            >
              {`See all ${count} ${count === 1 ? "insight" : "insights"}`}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </section>
  )
}

function InsightRow({ param, onClick }: { param: RecParameter; onClick: () => void }) {
  const Icon = organIcon(param.organ)
  const label = statusLabel(param.status)
  const detail = [label, param.value].filter(Boolean).join(" · ")

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffffff]/40"
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tileTone(param.status)}`}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-[#ffffff] sm:text-base">{param.parameter}</span>
        {detail && <span className="truncate text-xs text-[#ffffff]/70 sm:text-sm">{detail}</span>}
      </span>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-[#ffffff]/60 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </button>
  )
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your health insights</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-11 w-11 animate-pulse rounded-2xl bg-[#ffffff]/10" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-[#ffffff]/15" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-[#ffffff]/10" />
          </div>
        </div>
      ))}
      <div className="h-12 w-full animate-pulse rounded-2xl bg-[#ffffff]/15" />
    </div>
  )
}
