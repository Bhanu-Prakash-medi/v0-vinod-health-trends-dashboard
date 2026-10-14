"use client"

import {
  ArrowLeft,
  Ban,
  BookOpen,
  Check,
  ChevronRight,
  FlaskConical,
  Footprints,
  Gauge,
  HandHeart,
  Info,
  LayoutGrid,
  Leaf,
  Lightbulb,
  RefreshCw,
  SearchCheck,
  Sparkles,
  Stethoscope,
  Target,
  X,
  type LucideIcon,
} from "lucide-react"
import { useMemo, useRef, useState } from "react"
import type { ApiHealthReport } from "@/lib/api"
import { isNativeAppPlatform } from "@/lib/api"
import { openExternalUrl } from "@/lib/open-external"
import { trackEvent } from "@/lib/analytics/posthog"
import type { RecFood, RecParameter } from "@/lib/recommendations-api"
import { organIcon, paramKey, statusTone, useRecommendations } from "@/lib/use-recommendations"

type View = "priority" | "all"

function labsUrl(native: boolean) {
  return native ? "https://www.medibuddy.in/labsLandingPage" : "https://www.medibuddy.in/consumerLabs"
}
function consultUrl(native: boolean) {
  return native ? "https://www.medibuddy.in/ask" : "https://doctor.medibuddy.in/main.html#askDoctor"
}

export default function RecommendationsPage({
  patientData,
  initialParamId,
  onBack,
}: {
  patientData: ApiHealthReport
  initialParamId?: string | null
  onBack: () => void
}) {
  const { reportDate, data, error, isLoading, retry, priority, allParams } = useRecommendations(patientData)
  const native = useMemo(() => isNativeAppPlatform(), [])
  const detailRef = useRef<HTMLDivElement>(null)

  const [view, setView] = useState<View>(() => {
    if (!initialParamId) return "priority"
    return priority.some((p) => paramKey(p) === initialParamId) || priority.length === 0 ? "priority" : "all"
  })
  const [selectedId, setSelectedId] = useState<string | null>(initialParamId ?? null)

  const items = view === "priority" ? priority : allParams
  const selected = items.find((p) => paramKey(p) === selectedId) || items[0]

  const switchView = (v: View) => {
    setView(v)
    setSelectedId(null)
    trackEvent("recommendations_click", { service: v === "priority" ? "Top Focus Areas" : "All Parameters" })
  }

  const selectParam = (p: RecParameter) => {
    setSelectedId(paramKey(p))
    trackEvent("recommendations_click", { service: "parameter_select", parameter: p.parameter })
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="min-h-screen bg-[#f7f9fa]">
      <div className="mx-auto min-h-screen max-w-[420px] bg-[#f7f9fa] sm:my-8 sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:shadow-lg">
        <div className="sticky top-0 z-20 border-b border-[#e5e7eb] bg-[#ffffff]">
          <div className="flex items-center gap-2 px-4 py-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#2e3742] transition-colors hover:bg-[#f0f3f5]"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-[#2e3742]">Recommendations</h1>
              <p className="truncate text-xs text-[#9dabbd]">
                {reportDate ? `Based on your report from ${reportDate}` : "Based on your latest report"}
              </p>
            </div>
          </div>

          {data && !isLoading && (
            <div className="flex flex-col gap-3 pb-3">
              <div className="flex gap-1 px-4" role="tablist" aria-label="Recommendation type">
                <SegTab
                  active={view === "priority"}
                  onClick={() => switchView("priority")}
                  icon={Target}
                  label="Top Focus Areas"
                  count={priority.length}
                />
                <SegTab
                  active={view === "all"}
                  onClick={() => switchView("all")}
                  icon={LayoutGrid}
                  label="All Parameters"
                  count={allParams.length}
                />
              </div>

              {items.length > 0 && (
                <div
                  className="flex snap-x gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="listbox"
                  aria-label="Select a parameter"
                >
                  {items.map((p) => {
                    const active = selected && paramKey(selected) === paramKey(p)
                    const tone = statusTone(p.status)
                    return (
                      <button
                        key={paramKey(p)}
                        type="button"
                        role="option"
                        aria-selected={Boolean(active)}
                        onClick={() => selectParam(p)}
                        className={`inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                          active
                            ? "border-[#156ddc] bg-[#156ddc] text-[#ffffff]"
                            : "border-[#e5e7eb] bg-[#ffffff] text-[#2e3742] hover:border-[#156ddc]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-[#ffffff]" : tone.dot}`}
                          aria-hidden="true"
                        />
                        <span className="max-w-40 truncate">{p.parameter}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div ref={detailRef} className="flex scroll-mt-40 flex-col gap-4 p-4">
          {isLoading && <PageSkeleton />}

          {error && !isLoading && (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#ffffff] p-6 text-center">
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

          {data && !isLoading && (
            <>
              {data.overall_summary && view === "priority" && (
                <div className="flex gap-3 rounded-2xl bg-[#e8f2ff] p-4">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#156ddc]" aria-hidden="true" />
                  <p className="text-sm leading-relaxed text-[#2e3742] text-pretty">{data.overall_summary}</p>
                </div>
              )}

              {items.length === 0 ? (
                <p className="rounded-2xl bg-[#ffffff] p-6 text-center text-sm text-[#4d5c6f]">
                  No recommendations available for this report.
                </p>
              ) : (
                selected && (
                  <ParameterDetail
                    key={paramKey(selected)}
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
                )
              )}

              <div className="flex items-start gap-2 px-1">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#9dabbd]" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-[#9dabbd]">
                  {data.disclaimer ||
                    "These recommendations are generated from your report and may not be fully accurate. Please consult a qualified doctor before acting on any suggestion."}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SegTab({
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
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-[#2e3742] text-[#ffffff]" : "bg-[#f0f3f5] text-[#4d5c6f] hover:text-[#2e3742]"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
      <span
        className={`rounded-full px-1.5 text-[11px] ${active ? "bg-[#ffffff]/20 text-[#ffffff]" : "bg-[#ffffff] text-[#4d5c6f]"}`}
      >
        {count}
      </span>
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
    <article className="flex flex-col gap-4" aria-label={param.parameter}>
      <div className="flex flex-col gap-4 rounded-2xl bg-[#ffffff] p-4">
        <div className="flex items-start gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#156ddc]"
            aria-hidden="true"
          >
            <Icon className="h-6 w-6" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-lg font-semibold leading-snug text-[#2e3742] text-balance">{param.parameter}</h2>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#4d5c6f]">
              {tone.label && (
                <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold ${tone.pill}`}>
                  {tone.Icon && <tone.Icon className="h-3 w-3" aria-hidden="true" />}
                  {tone.label}
                </span>
              )}
              {param.organ && <span>{param.organ}</span>}
              {param.urgency && (
                <span className="rounded-full bg-[#f0f3f5] px-2 py-0.5 capitalize">{`${param.urgency} priority`}</span>
              )}
            </div>
          </div>
        </div>

        {(param.value || param.normal_range) && (
          <dl className="grid grid-cols-2 gap-2">
            {param.value && (
              <div className="rounded-xl bg-[#f7f9fa] p-3">
                <dt className="text-xs text-[#9dabbd]">Your value</dt>
                <dd className={`mt-0.5 text-base font-semibold ${tone.pill.split(" ")[1]}`}>{param.value}</dd>
              </div>
            )}
            {param.normal_range && (
              <div className="rounded-xl bg-[#f7f9fa] p-3">
                <dt className="text-xs text-[#9dabbd]">Normal range</dt>
                <dd className="mt-0.5 text-base font-semibold text-[#2e3742]">{param.normal_range}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {explanationItems.length > 0 && (
        <Card title="Understanding your result" icon={BookOpen}>
          <ul className="flex flex-col">
            {explanationItems.map((item, i) => (
              <li key={item.key} className={`flex gap-3 py-3 ${i > 0 ? "border-t border-[#f0f3f5]" : "pt-0"} last:pb-0`}>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e8f2ff] text-[#156ddc]"
                  aria-hidden="true"
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#2e3742]">{item.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#4d5c6f]">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {lifestyle.length > 0 && (
        <Card title="Lifestyle changes" icon={Footprints}>
          <ul className="flex flex-col gap-2">
            {lifestyle.map((l, i) => (
              <li key={`${l.change}-${i}`} className="flex flex-col gap-1 rounded-xl bg-[#f7f9fa] p-3">
                <p className="text-sm font-semibold text-[#2e3742]">{l.change}</p>
                {l.why && <p className="text-sm leading-relaxed text-[#4d5c6f]">{l.why}</p>}
                {l.how && (
                  <p className="mt-1 flex gap-1.5 rounded-lg bg-[#ffffff] p-2 text-sm leading-relaxed text-[#2e3742]">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#156ddc]" aria-hidden="true" />
                    <span>{l.how}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(include.length > 0 || limit.length > 0) && (
        <Card title="Diet" icon={Leaf}>
          <div className="flex flex-col gap-4">
            {include.length > 0 && <FoodList kind="include" items={include} />}
            {limit.length > 0 && <FoodList kind="limit" items={limit} />}
          </div>
        </Card>
      )}

      {rec.self_care_note && (
        <p className="flex gap-2.5 rounded-2xl bg-[#e8f2ff] p-4 text-sm leading-relaxed text-[#2e3742]">
          <HandHeart className="mt-0.5 h-5 w-5 shrink-0 text-[#156ddc]" aria-hidden="true" />
          {rec.self_care_note}
        </p>
      )}

      {(tests.length > 0 || specialists.length > 0 || otherTests.length > 0) && (
        <Card title="Next steps" icon={ChevronRight}>
          <div className="flex flex-col gap-2">
            {next.consult_doctor?.advice && (
              <p className="text-sm leading-relaxed text-[#4d5c6f]">{next.consult_doctor.advice}</p>
            )}
            {specialists.map((s) => (
              <CtaButton
                key={`doc-${s}`}
                icon={Stethoscope}
                label={s}
                sub="Consult a doctor online"
                primary
                onClick={() => onConsult(s)}
              />
            ))}
            {tests.map((t) => (
              <CtaButton
                key={`test-${t.name}`}
                icon={FlaskConical}
                label={t.name}
                sub="Book lab test"
                onClick={() => onBookTest(t.name)}
              />
            ))}
            {otherTests.length > 0 && (
              <p className="pt-1 text-xs leading-relaxed text-[#4d5c6f]">
                <span className="font-semibold text-[#2e3742]">Also ask your doctor about: </span>
                {otherTests.join(", ")}
              </p>
            )}
          </div>
        </Card>
      )}
    </article>
  )
}

function Card({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-[#ffffff] p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#2e3742]">
        <Icon className="h-4 w-4 text-[#156ddc]" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  )
}

function FoodList({ kind, items }: { kind: "include" | "limit"; items: RecFood[] }) {
  const isInclude = kind === "include"
  const MarkIcon = isInclude ? Check : X
  return (
    <div className="flex flex-col gap-2">
      <p
        className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
          isInclude ? "text-[#1f8a4c]" : "text-[#c93838]"
        }`}
      >
        {isInclude ? <Leaf className="h-3.5 w-3.5" aria-hidden="true" /> : <Ban className="h-3.5 w-3.5" aria-hidden="true" />}
        {isInclude ? "Include" : "Limit or avoid"}
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((f, i) => (
          <li
            key={`${f.food}-${i}`}
            className={`flex gap-2.5 rounded-xl p-3 ${isInclude ? "bg-[#e9f7ef]" : "bg-[#fdecec]"}`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                isInclude ? "bg-[#1f8a4c] text-[#ffffff]" : "bg-[#c93838] text-[#ffffff]"
              }`}
              aria-hidden="true"
            >
              <MarkIcon className="h-3 w-3" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#2e3742]">{f.food}</p>
              {f.why && <p className="mt-0.5 text-xs leading-relaxed text-[#4d5c6f]">{f.why}</p>}
              {f.tip && <p className="mt-1 text-xs font-medium leading-relaxed text-[#2e3742]">{f.tip}</p>}
            </div>
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
      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30 ${
        primary ? "bg-[#156ddc] text-[#ffffff] hover:opacity-90" : "border border-[#e5e7eb] bg-[#ffffff] text-[#2e3742] hover:border-[#156ddc]"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          primary ? "bg-[#ffffff]/20 text-[#ffffff]" : "bg-[#e8f2ff] text-[#156ddc]"
        }`}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className={`block text-xs ${primary ? "text-[#ffffff]/80" : "text-[#4d5c6f]"}`}>{sub}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  )
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading recommendations</span>
      <div className="h-20 animate-pulse rounded-2xl bg-[#ffffff]" />
      <div className="h-40 animate-pulse rounded-2xl bg-[#ffffff]" />
      <div className="h-64 animate-pulse rounded-2xl bg-[#ffffff]" />
    </div>
  )
}
