"use client"

import { useMemo, useState } from "react"
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react"
import type { ApiHealthReport } from "@/lib/api"
import { isNativeAppPlatform } from "@/lib/api"
import { openExternalUrl } from "@/lib/open-external"
import { trackClick } from "@/lib/analytics/posthog"
import { formatReportDate, paramKey, useRecommendations } from "@/lib/use-recommendations"
import { ParameterCard, consultUrl, labsUrl } from "./recommendations-page-premium"

interface HealthRecommendationsSectionProps {
  patientData: ApiHealthReport
  onSeeAll?: (paramId?: string) => void
}

const PREVIEW_COUNT = 3

export default function HealthRecommendationsSection({ patientData, onSeeAll }: HealthRecommendationsSectionProps) {
  const { enabled, reportDate, data, error, isLoading, retry, priority } = useRecommendations(patientData)
  const native = useMemo(() => isNativeAppPlatform(), [])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!enabled) return null
  if (data && !isLoading && priority.length === 0) return null

  const dateLabel = formatReportDate(reportDate)
  const preview = priority.slice(0, PREVIEW_COUNT)
  const count = priority.length

  return (
    <section aria-labelledby="recommendations-heading" className="flex flex-col gap-3">
      <div className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#0d3f96_0%,#082a66_45%,#061b44_100%)] px-4 py-4 shadow-[0_12px_30px_-14px_rgba(6,27,68,0.6)] sm:px-5">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background:repeating-linear-gradient(115deg,#fff_0_1px,transparent_1px_9px)]"
          aria-hidden="true"
        />
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ffffff]/10 text-[#bfe8ff] ring-1 ring-[#ffffff]/20"
            aria-hidden="true"
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7fd1ff]">Health insights</span>
            <h2 id="recommendations-heading" className="text-balance text-base font-bold leading-tight text-[#ffffff] sm:text-lg">
              {data && count > 0
                ? `${count} ${count === 1 ? "parameter needs" : "parameters need"} attention`
                : "Your health recommendations"}
            </h2>
            <p className="truncate text-xs text-[#ffffff]/70">
              {dateLabel ? `From your ${dateLabel} report` : "From your latest report"}
            </p>
          </div>
        </div>
      </div>

      {isLoading && <PreviewSkeleton />}

      {error && !isLoading && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#ffffff] p-4">
          <p className="text-sm text-[#4d5c6f]">{"Couldn't load your recommendations."}</p>
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
            {preview.map((p, i) => {
              const key = paramKey(p)
              return (
                <li
                  key={key}
                  className="animate-[ht-rise_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <ParameterCard
                    param={p}
                    expanded={expandedId === key}
                    onToggle={() => setExpandedId((cur) => (cur === key ? null : key))}
                    onBookTest={(name, packageId) => {
                      trackClick("health_recommendation_test_click", { test_name: name })
                      openExternalUrl(labsUrl(native, packageId))
                    }}
                    onConsult={(specialist, url) => {
                      trackClick("health_recommendation_consult_click", { consult_type: specialist })
                      openExternalUrl(url || consultUrl(native))
                    }}
                  />
                </li>
              )
            })}
          </ul>

          {typeof onSeeAll === "function" && count > PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => onSeeAll()}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0d3f96_0%,#071f4d_100%)] px-4 py-3.5 text-sm font-semibold text-[#ffffff] shadow-[0_10px_24px_-12px_rgba(7,31,77,0.7)] transition-shadow hover:shadow-[0_14px_28px_-12px_rgba(7,31,77,0.85)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40 focus-visible:ring-offset-2"
            >
              {`View all ${count} parameters`}
              <ArrowRight className="h-4 w-4 text-[#7fd1ff] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </section>
  )
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your recommendations</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-4 rounded-3xl border border-[#dbe5f3] bg-[#ffffff] p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-2xl bg-[#eef1f4]" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-[#eef1f4]" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-[#eef1f4]" />
            </div>
          </div>
          <div className="h-16 w-full animate-pulse rounded-2xl bg-[#eef1f4]" />
        </div>
      ))}
    </div>
  )
}
