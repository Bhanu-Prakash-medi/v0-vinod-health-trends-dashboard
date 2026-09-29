"use client"

import {
  Sparkles,
  Info,
  Pill,
  FlaskConical,
  Video,
  Building2,
  ArrowLeft,
  ChevronRight,
  Target,
  ListChecks,
  Salad,
  type LucideIcon,
} from "lucide-react"
import type { ApiHealthReport } from "@/lib/api"
import { isNativeAppPlatform } from "@/lib/api"
import { openExternalUrl } from "@/lib/open-external"
import { trackEvent } from "@/lib/analytics/posthog"
import { buildRecommendations, topFocus, type ServiceKey } from "@/lib/recommendations"
import RecommendationCard, { type ServiceLink } from "@/components/recommendation-card"
import { useEffect, useMemo, useState } from "react"

interface HealthRecommendationsSectionProps {
  patientData: ApiHealthReport
}

// MediBuddy service deep links mapped to each recommendation type.
//
// In the native-app WebViews (platform cookie IOS_mv / android_mv) we keep the
// existing in-app deep links. On the web (any other platform) Labs and Online
// Consultation redirect to their web destinations instead; Meds and Clinic are
// unchanged on both.
function getServiceLinks(nativeApp: boolean): Record<ServiceKey, ServiceLink> {
  return {
    meds: {
      label: "Order Medicines",
      url: "https://www.medibuddy.in/order-medicines",
      icon: <Pill className="h-3.5 w-3.5" />,
    },
    labs: {
      label: "Book Lab Test",
      url: nativeApp ? "https://www.medibuddy.in/labsLandingPage" : "https://www.medibuddy.in/consumerLabs",
      icon: <FlaskConical className="h-3.5 w-3.5" />,
    },
    online: {
      label: "Online Consultation",
      url: nativeApp ? "https://www.medibuddy.in/ask" : "https://doctor.medibuddy.in/main.html#askDoctor",
      icon: <Video className="h-3.5 w-3.5" />,
    },
    clinic: {
      label: "In-Clinic Consultation",
      url: "https://www.medibuddy.in/doctor-consultations/landing",
      icon: <Building2 className="h-3.5 w-3.5" />,
    },
  }
}

type Tab = "top" | "full" | "diet"
const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "top", label: "Top Focus", icon: Target },
  { key: "full", label: "Full Protocol", icon: ListChecks },
  { key: "diet", label: "Diet and Lifestyle", icon: Salad },
]

export default function HealthRecommendationsSection({ patientData }: HealthRecommendationsSectionProps) {
  const recommendations = useMemo(() => buildRecommendations(patientData), [patientData])
  const focused = useMemo(() => topFocus(recommendations), [recommendations])
  const latestDate = patientData?.latestReportDate || patientData?.lab_reports?.[0]?.report_date || ""
  const patientName = patientData?.patient_info?.name || ""
  // Resolve service links once per mount based on the platform cookie.
  const serviceLinks = useMemo(() => getServiceLinks(isNativeAppPlatform()), [])
  const [detailOpen, setDetailOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("top")

  useEffect(() => {
    if (!detailOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDetailOpen(false)
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [detailOpen])

  if (recommendations.length === 0) return null

  const preview = focused.slice(0, 2)
  const tabItems =
    tab === "top" ? focused : tab === "diet" ? recommendations.filter((r) => r.type !== "Checkup") : recommendations

  const handleServiceClick = (service: ServiceLink) => {
    // `service.label` is a fixed catalog value, not anything from the report.
    trackEvent("recommendations_click", { service: service.label })
    openExternalUrl(service.url)
  }

  const openDetail = () => {
    setTab("top")
    setDetailOpen(true)
    trackEvent("recommendations_click", { service: "View detailed recommendations" })
  }

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-[#000000]" />
        <div>
          <h2 className="text-base font-semibold text-[#2e3742]">Recommendations</h2>
          <p className="text-xs text-[#9dabbd]">
            {latestDate ? `Based on your report from ${latestDate}` : "Based on your latest report"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {preview.map((rec) => (
          <RecommendationCard key={rec.id} rec={rec} compact />
        ))}
      </div>

      <button
        type="button"
        onClick={openDetail}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#e8f2ff] bg-[#e8f2ff] py-3 text-sm font-semibold text-[#156ddc] transition-colors hover:border-[#156ddc] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
      >
        <ListChecks className="h-4 w-4" aria-hidden="true" />
        View detailed recommendations
        <span className="text-xs font-medium text-[#4d5c6f]">{`(${recommendations.length})`}</span>
        <ChevronRight className="h-4 w-4" />
      </button>

      {detailOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rec-detail-title"
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#f7f9fa]"
        >
          <div className="mx-auto flex w-full max-w-2xl flex-col">
            <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#f0f3f5] bg-[#ffffff] px-4 py-4">
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                aria-label="Back"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0f3f5] text-[#2e3742] transition-colors hover:bg-[#e5e7eb]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f2ff] text-[#156ddc]" aria-hidden="true">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 id="rec-detail-title" className="text-base font-semibold text-[#2e3742]">
                  Recommendations
                </h2>
                {patientName && <p className="truncate text-xs text-[#4d5c6f]">{`for ${patientName}`}</p>}
              </div>
            </header>

            <div className="flex flex-col gap-4 px-4 pb-8 pt-2">
              <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Recommendation views">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.key}
                    onClick={() => setTab(t.key)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors ${
                      tab === t.key
                        ? "border-[#156ddc] bg-[#156ddc] text-[#ffffff]"
                        : "border-[#e5e7eb] bg-[#ffffff] text-[#2e3742]"
                    }`}
                  >
                    <t.icon className="h-4 w-4" aria-hidden="true" />
                    {t.label}
                  </button>
                ))}
              </div>

              {tabItems.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  serviceLinks={serviceLinks}
                  onServiceClick={handleServiceClick}
                />
              ))}

              <div className="flex items-start gap-2 rounded-xl border border-[#f0f3f5] bg-[#ffffff] p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#156ddc]" />
                <p className="text-[11px] leading-relaxed text-[#4d5c6f]">
                  These recommendations are AI-generated based on your report and may not be fully accurate. Please
                  consult a qualified doctor before acting on any suggestion.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
