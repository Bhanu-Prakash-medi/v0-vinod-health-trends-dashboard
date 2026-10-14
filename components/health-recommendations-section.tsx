"use client"

import {
  Sparkles,
  Info,
  FlaskConical,
  Stethoscope,
  HeartPulse,
  Droplet,
  Bone,
  Sun,
  Wind,
  Brain,
  Bean,
  Activity,
  Flame,
  BookOpen,
  Gauge,
  SearchCheck,
  Lightbulb,
  Footprints,
  Leaf,
  Ban,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Target,
  LayoutGrid,
  RefreshCw,
  HandHeart,
  type LucideIcon,
} from "lucide-react"
import useSWR from "swr"
import { useMemo, useState } from "react"
import type { ApiHealthReport } from "@/lib/api"
import { DEBUG_ACCESS_TOKEN, getAccessTokenFromCookie, isNativeAppPlatform } from "@/lib/api"
import { openExternalUrl } from "@/lib/open-external"
import { trackEvent } from "@/lib/analytics/posthog"
import { fetchRecommendations, type RecParameter } from "@/lib/recommendations-api"

interface HealthRecommendationsSectionProps {
  patientData: ApiHealthReport
}

type View = "priority" | "all"

function organIcon(organ = ""): LucideIcon {
  const o = organ.toLowerCase()
  if (o.includes("heart") || o.includes("cardi") || o.includes("lipid")) return HeartPulse
  if (o.includes("blood") || o.includes("haem") || o.includes("hem")) return Droplet
  if (o.includes("bone") || o.includes("calcium")) return Bone
  if (o.includes("vitamin")) return Sun
  if (o.includes("lung") || o.includes("respir")) return Wind
  if (o.includes("brain") || o.includes("nerv")) return Brain
  if (o.includes("kidney") || o.includes("renal")) return Bean
  if (o.includes("liver")) return FlaskConical
  if (o.includes("diabet") || o.includes("sugar") || o.includes("metab")) return Flame
  if (o.includes("thyroid") || o.includes("hormon")) return Activity
  return Stethoscope
}

function statusTone(status = "") {
  const s = status.toLowerCase()
  if (s === "high") return { label: "High", Icon: ArrowUp, cls: "bg-[#fdecec] text-[#c93838]" }
  if (s === "low") return { label: "Low", Icon: ArrowDown, cls: "bg-[#fff4e5] text-[#b8650a]" }
  return { label: status ? status[0].toUpperCase() + status.slice(1) : "", Icon: null, cls: "bg-[#f0f3f5] text-[#4d5c6f]" }
}

function urgencyLabel(u = "") {
  return u ? `${u[0].toUpperCase()}${u.slice(1)} priority` : ""
}

function labsUrl(native: boolean) {
  return native ? "https://www.medibuddy.in/labsLandingPage" : "https://www.medibuddy.in/consumerLabs"
}
function consultUrl(native: boolean) {
  return native ? "https://www.medibuddy.in/ask" : "https://doctor.medibuddy.in/main.html#askDoctor"
}

export default function HealthRecommendationsSection({ patientData }: HealthRecommendationsSectionProps) {
  const source = patientData?.recommendationSource
  const accessToken = useMemo(() => getAccessTokenFromCookie() || DEBUG_ACCESS_TOKEN || "", [])
  const native = useMemo(() => isNativeAppPlatform(), [])

  const swrKey =
    source && accessToken
      ? ["recommendations", source.id, source.report_data.rVasBenefId, source.report_data.fullfilmentDate]
      : null
  const { data, error, isLoading, mutate } = useSWR(swrKey, () => fetchRecommendations(accessToken, source!), {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  })

  const [view, setView] = useState<View>("priority")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const priority = useMemo(() => (data?.top_recommendations || []).slice(0, 4), [data])
  const allParams = useMemo(() => {
    const seen = new Set<string>()
    const list: RecParameter[] = []
    for (const organ of data?.organs || []) {
      for (const p of organ.parameters || []) {
        const key = p.id || p.parameter
        if (seen.has(key)) continue
        seen.add(key)
        list.push({ ...p, organ: p.organ || organ.organ })
      }
    }
    return list
  }, [data])

  if (!source || !accessToken) return null

  const items = view === "priority" ? priority : allParams
  const selected = items.find((p) => (p.id || p.parameter) === selectedId) || items[0]
  const reportDate = source.report_data.fullfilmentDate

  const switchView = (v: View) => {
    setView(v)
    setSelectedId(null)
    trackEvent("recommendations_click", { service: v === "priority" ? "Priority Focus" : "All Parameters" })
  }

  const selectParam = (p: RecParameter) => {
    setSelectedId(p.id || p.parameter)
    trackEvent("recommendations_click", { service: "parameter_select", parameter: p.parameter })
  }

  return (
    <section aria-labelledby="recommendations-heading">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ff] text-[#156ddc]" aria-hidden="true">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 id="recommendations-heading" className="text-base font-semibold text-[#2e3742]">
            Recommendations
          </h2>
          <p className="text-xs text-[#9dabbd]">
            {reportDate ? `Based on your report from ${reportDate}` : "Based on your latest report"}
          </p>
        </div>
      </div>

      {isLoading && <LoadingState />}

      {error && !isLoading && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#f0f3f5] bg-[#ffffff] p-6 text-center">
          <p className="text-sm text-[#4d5c6f]">{"We couldn't load your recommendations right now."}</p>
          <button
            type="button"
            onClick={() => mutate()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#156ddc] px-4 py-2 text-sm font-semibold text-[#ffffff] transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {data && !isLoading && (
        <div className="flex flex-col gap-4">
          {data.overall_summary && (
            <p className="rounded-2xl bg-[#e8f2ff] p-4 text-sm leading-relaxed text-[#2e3742] text-pretty">
              {data.overall_summary}
            </p>
          )}

          <div className="flex gap-2" role="tablist" aria-label="Recommendation type">
            <ViewTab
              active={view === "priority"}
              onClick={() => switchView("priority")}
              icon={Target}
              label="Priority Focus"
              count={priority.length}
            />
            <ViewTab
              active={view === "all"}
              onClick={() => switchView("all")}
              icon={LayoutGrid}
              label="All Parameters"
              count={allParams.length}
            />
          </div>

          {items.length === 0 ? (
            <p className="rounded-2xl border border-[#f0f3f5] bg-[#ffffff] p-6 text-center text-sm text-[#4d5c6f]">
              No recommendations available for this report.
            </p>
          ) : (
            <>
              <div
                className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="listbox"
                aria-label="Select a parameter"
              >
                {items.map((p) => {
                  const key = p.id || p.parameter
                  const active = selected && (selected.id || selected.parameter) === key
                  const Icon = organIcon(p.organ)
                  const tone = statusTone(p.status)
                  return (
                    <button
                      key={key}
                      type="button"
                      role="option"
                      aria-selected={Boolean(active)}
                      onClick={() => selectParam(p)}
                      className={`flex min-w-40 max-w-56 shrink-0 snap-start items-center gap-2.5 rounded-2xl border p-3 text-left transition-colors ${
                        active
                          ? "border-[#156ddc] bg-[#156ddc] text-[#ffffff]"
                          : "border-[#e5e7eb] bg-[#ffffff] text-[#2e3742] hover:border-[#156ddc]"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          active ? "bg-[#ffffff]/20 text-[#ffffff]" : "bg-[#e8f2ff] text-[#156ddc]"
                        }`}
                        aria-hidden="true"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{p.parameter}</span>
                        <span className={`flex items-center gap-1 text-xs ${active ? "text-[#ffffff]/80" : "text-[#4d5c6f]"}`}>
                          {tone.Icon && <tone.Icon className="h-3 w-3" aria-hidden="true" />}
                          <span className="truncate">{[tone.label, p.value].filter(Boolean).join(" · ")}</span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>

              {selected && (
                <ParameterDetail
                  param={selected}
                  onBookTest={(name) => {
                    trackEvent("recommendations_click", { service: "Book Lab Test", test: name })
                    openExternalUrl(labsUrl(native))
                  }}
                  onConsult={(specialist) => {
                    trackEvent("recommendations_click", { service: "Online Consultation", specialist })
                    openExternalUrl(consultUrl(native))
                  }}
                />
              )}
            </>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-[#f0f3f5] bg-[#ffffff] p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#156ddc]" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-[#4d5c6f]">
              {data.disclaimer ||
                "These recommendations are generated from your report and may not be fully accurate. Please consult a qualified doctor before acting on any suggestion."}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

function ViewTab({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: LucideIcon
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active ? "border-[#2e3742] bg-[#2e3742] text-[#ffffff]" : "border-[#e5e7eb] bg-[#ffffff] text-[#2e3742]"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
      <span className={`text-xs ${active ? "text-[#ffffff]/70" : "text-[#9dabbd]"}`}>{count}</span>
    </button>
  )
}

function ParameterDetail({
  param,
  onBookTest,
  onConsult,
}: {
  param: RecParameter
  onBookTest: (name: string) => void
  onConsult: (specialist: string) => void
}) {
  const Icon = organIcon(param.organ)
  const tone = statusTone(param.status)
  const exp = param.explanation || {}
  const rec = param.recommendations || {}
  const lifestyle = rec.lifestyle || []
  const include = rec.diet?.include || []
  const limit = rec.diet?.limit || []
  const next = param.next_steps || {}
  const tests = next.tests || []
  const specialists = next.consult_doctor?.specialists || []
  const otherTests = next.other_tests || []

  const explanationItems = [
    { key: "what", title: "What it is", text: exp.what_it_is, icon: BookOpen },
    { key: "result", title: "Your result", text: exp.your_result, icon: Gauge },
    { key: "why", title: "Why it happens", text: exp.why_it_happens, icon: SearchCheck },
    { key: "means", title: "What it means", text: exp.what_it_means, icon: Lightbulb },
  ].filter((i) => i.text)

  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-[#f0f3f5] bg-[#ffffff] p-4 md:p-5" aria-label={param.parameter}>
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#156ddc]" aria-hidden="true">
          <Icon className="h-6 w-6" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[#2e3742] text-balance">{param.parameter}</h3>
            {tone.label && (
              <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${tone.cls}`}>
                {tone.Icon && <tone.Icon className="h-3 w-3" aria-hidden="true" />}
                {tone.label}
              </span>
            )}
          </div>
          <p className="text-xs text-[#4d5c6f]">
            {[param.organ, urgencyLabel(param.urgency)].filter(Boolean).join(" · ")}
          </p>
          {(param.value || param.normal_range) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {param.value && (
                <span className="text-[#2e3742]">
                  <span className="text-[#9dabbd]">Your value </span>
                  <span className="font-semibold">{param.value}</span>
                </span>
              )}
              {param.normal_range && (
                <span className="text-[#2e3742]">
                  <span className="text-[#9dabbd]">Normal </span>
                  {param.normal_range}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {explanationItems.length > 0 && (
        <Block title="Understanding your result">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {explanationItems.map((item) => (
              <div key={item.key} className="flex gap-3 rounded-xl bg-[#f7f9fa] p-3">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#156ddc]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#4d5c6f]">{item.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#2e3742]">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      {lifestyle.length > 0 && (
        <Block title="Lifestyle changes">
          <ul className="flex flex-col gap-2">
            {lifestyle.map((l, i) => (
              <li key={`${l.change}-${i}`} className="flex gap-3 rounded-xl border border-[#f0f3f5] p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f2ff] text-[#156ddc]" aria-hidden="true">
                  <Footprints className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#2e3742]">{l.change}</p>
                  {l.why && <p className="mt-0.5 text-sm leading-relaxed text-[#4d5c6f]">{l.why}</p>}
                  {l.how && (
                    <p className="mt-1 text-sm leading-relaxed text-[#2e3742]">
                      <span className="font-medium text-[#156ddc]">How: </span>
                      {l.how}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {(include.length > 0 || limit.length > 0) && (
        <Block title="Diet">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {include.length > 0 && (
              <FoodList title="Include" icon={Leaf} accent="text-[#1f8a4c]" bg="bg-[#e9f7ef]" items={include} />
            )}
            {limit.length > 0 && (
              <FoodList title="Limit" icon={Ban} accent="text-[#c93838]" bg="bg-[#fdecec]" items={limit} />
            )}
          </div>
        </Block>
      )}

      {rec.self_care_note && (
        <p className="flex gap-2 rounded-xl bg-[#f7f9fa] p-3 text-sm leading-relaxed text-[#2e3742]">
          <HandHeart className="mt-0.5 h-4 w-4 shrink-0 text-[#156ddc]" aria-hidden="true" />
          {rec.self_care_note}
        </p>
      )}

      {(tests.length > 0 || specialists.length > 0 || otherTests.length > 0) && (
        <Block title="Next steps">
          {next.consult_doctor?.advice && <p className="text-sm text-[#4d5c6f]">{next.consult_doctor.advice}</p>}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {tests.map((t) => (
              <CtaButton
                key={`test-${t.name}`}
                icon={FlaskConical}
                label={t.name}
                sub="Book test"
                onClick={() => onBookTest(t.name)}
              />
            ))}
            {specialists.map((s) => (
              <CtaButton
                key={`doc-${s}`}
                icon={Stethoscope}
                label={s}
                sub="Consult a doctor"
                primary
                onClick={() => onConsult(s)}
              />
            ))}
          </div>
          {otherTests.length > 0 && (
            <p className="text-xs leading-relaxed text-[#4d5c6f]">
              <span className="font-semibold">Also ask your doctor about: </span>
              {otherTests.join(", ")}
            </p>
          )}
        </Block>
      )}
    </article>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h4 className="text-sm font-semibold text-[#2e3742]">{title}</h4>
      {children}
    </div>
  )
}

function FoodList({
  title,
  icon: Icon,
  accent,
  bg,
  items,
}: {
  title: string
  icon: LucideIcon
  accent: string
  bg: string
  items: Array<{ food: string; why?: string; tip?: string }>
}) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl p-3 ${bg}`}>
      <p className={`flex items-center gap-1.5 text-sm font-semibold ${accent}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {title}
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((f, i) => (
          <li key={`${f.food}-${i}`} className="rounded-lg bg-[#ffffff] p-2.5">
            <p className="text-sm font-semibold text-[#2e3742]">{f.food}</p>
            {f.why && <p className="mt-0.5 text-xs leading-relaxed text-[#4d5c6f]">{f.why}</p>}
            {f.tip && <p className={`mt-1 text-xs leading-relaxed ${accent}`}>{f.tip}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CtaButton({
  icon: Icon,
  label,
  sub,
  primary,
  onClick,
}: {
  icon: LucideIcon
  label: string
  sub: string
  primary?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30 sm:max-w-xs ${
        primary
          ? "border-[#156ddc] bg-[#156ddc] text-[#ffffff] hover:opacity-90"
          : "border-[#e8f2ff] bg-[#e8f2ff] text-[#2e3742] hover:border-[#156ddc]"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${primary ? "text-[#ffffff]" : "text-[#156ddc]"}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className={`block text-xs ${primary ? "text-[#ffffff]/80" : "text-[#4d5c6f]"}`}>{sub}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading recommendations</span>
      <div className="h-16 animate-pulse rounded-2xl bg-[#f0f3f5]" />
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 w-44 shrink-0 animate-pulse rounded-2xl bg-[#f0f3f5]" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-[#f0f3f5]" />
    </div>
  )
}
