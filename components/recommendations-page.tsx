"use client"

import {
  ArrowLeft,
  Ban,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Footprints,
  Gauge,
  HandHeart,
  Info,
  Lightbulb,
  RefreshCw,
  Salad,
  SearchCheck,
  Stethoscope,
  X,
  type LucideIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import type { ApiHealthReport } from "@/lib/api"
import { isNativeAppPlatform } from "@/lib/api"
import { openExternalUrl } from "@/lib/open-external"
import { trackEvent } from "@/lib/analytics/posthog"
import type { RecFood, RecParameter } from "@/lib/recommendations-api"
import { formatReportDate, organIcon, paramKey, statusTone, useRecommendations } from "@/lib/use-recommendations"

type View = "priority" | "all"
type SectionId = "understand" | "lifestyle" | "diet" | "next"

const SECTIONS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: "understand", label: "Understand", icon: BookOpen },
  { id: "lifestyle", label: "Lifestyle", icon: Footprints },
  { id: "diet", label: "Diet", icon: Salad },
  { id: "next", label: "Next steps", icon: Stethoscope },
]

function labsUrl(native: boolean) {
  return native ? "https://www.medibuddy.in/labsLandingPage" : "https://www.medibuddy.in/consumerLabs"
}
function consultUrl(native: boolean) {
  return native ? "https://www.medibuddy.in/ask" : "https://doctor.medibuddy.in/main.html#askDoctor"
}

function sectionCounts(p: RecParameter): Record<SectionId, number> {
  const exp = p.explanation || {}
  const rec = p.recommendations || {}
  const next = p.next_steps || {}
  return {
    understand: [exp.what_it_is, exp.your_result, exp.why_it_happens, exp.what_it_means].filter(Boolean).length,
    lifestyle: (rec.lifestyle || []).length,
    diet: (rec.diet?.include || []).length + (rec.diet?.limit || []).length,
    next:
      (next.tests || []).length +
      (next.consult_doctor?.specialists || []).length +
      ((next.other_tests || []).length > 0 ? 1 : 0),
  }
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

  const [view, setView] = useState<View>(() => {
    if (!initialParamId) return "priority"
    return priority.some((p) => paramKey(p) === initialParamId) || priority.length === 0 ? "priority" : "all"
  })
  const [selectedId, setSelectedId] = useState<string | null>(initialParamId ?? null)
  const [section, setSection] = useState<SectionId>("understand")
  const [summaryOpen, setSummaryOpen] = useState(false)

  const items = view === "priority" ? priority : allParams
  const selected = items.find((p) => paramKey(p) === selectedId) || items[0]
  const counts = selected ? sectionCounts(selected) : null
  const available = counts ? SECTIONS.filter((s) => counts[s.id] > 0) : []
  const activeSection = available.some((s) => s.id === section) ? section : available[0]?.id
  const dateLabel = formatReportDate(reportDate)

  const resetScroll = () => window.scrollTo({ top: 0, behavior: "smooth" })

  const switchView = (v: View) => {
    if (v === view) return
    setView(v)
    setSelectedId(null)
    setSection("understand")
    trackEvent("recommendations_click", { service: v === "priority" ? "Top Focus Areas" : "All Parameters" })
  }

  const selectParam = (p: RecParameter) => {
    setSelectedId(paramKey(p))
    setSection("understand")
    trackEvent("recommendations_click", { service: "parameter_select", parameter: p.parameter })
    resetScroll()
  }

  const selectSection = (id: SectionId) => {
    setSection(id)
    trackEvent("recommendations_click", { service: "section_select", section: id, parameter: selected?.parameter })
    resetScroll()
  }

  const showNav = Boolean(data && !isLoading && selected && available.length > 1)

  return (
    <div className="min-h-screen bg-[#f7f9fa]">
      <div className="mx-auto min-h-screen max-w-[420px] bg-[#f7f9fa] sm:my-8 sm:min-h-0 sm:rounded-2xl sm:shadow-lg">
        <header className="sticky top-0 z-20 bg-[#ffffff] shadow-[0_1px_0_#eef1f4]">
          <div className="flex items-center gap-2 px-3 pt-3 pb-2">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#2e3742] transition-colors hover:bg-[#f0f3f5]"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-semibold leading-tight text-[#2e3742]">Your Action Plan</h1>
              <p className="truncate text-xs text-[#9dabbd]">
                {dateLabel ? `Personalised from your ${dateLabel} report` : "Personalised from your latest report"}
              </p>
            </div>
          </div>

          {data && !isLoading && (
            <>
              <div className="flex px-4" role="tablist" aria-label="Recommendation type">
                <UnderlineTab
                  active={view === "priority"}
                  onClick={() => switchView("priority")}
                  label="Top priorities"
                  count={priority.length}
                />
                <UnderlineTab
                  active={view === "all"}
                  onClick={() => switchView("all")}
                  label="All parameters"
                  count={allParams.length}
                />
              </div>

              {items.length > 0 && (
                <div
                  className="flex gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? "bg-[#e8f2ff] text-[#156ddc] ring-1 ring-inset ring-[#156ddc]/40"
                            : "bg-[#f3f5f7] text-[#4d5c6f] hover:text-[#2e3742]"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
                        <span className="max-w-36 truncate">{p.parameter}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </header>

        <main className={`flex flex-col gap-3 p-4 ${showNav ? "pb-28" : "pb-8"}`}>
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
                <button
                  type="button"
                  onClick={() => setSummaryOpen((o) => !o)}
                  aria-expanded={summaryOpen}
                  className="flex items-start gap-2.5 rounded-2xl bg-[#e8f2ff] p-3 text-left"
                >
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#156ddc]" aria-hidden="true" />
                  <span
                    className={`flex-1 text-xs leading-relaxed text-[#2e3742] text-pretty ${summaryOpen ? "" : "line-clamp-2"}`}
                  >
                    {data.overall_summary}
                  </span>
                  <ChevronDown
                    className={`mt-0.5 h-4 w-4 shrink-0 text-[#156ddc] transition-transform ${summaryOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              )}

              {items.length === 0 ? (
                <p className="rounded-2xl bg-[#ffffff] p-6 text-center text-sm text-[#4d5c6f]">
                  No recommendations available for this report.
                </p>
              ) : (
                selected && (
                  <>
                    <ParameterHeader param={selected} />
                    {activeSection && (
                      <SectionContent
                        key={`${paramKey(selected)}-${activeSection}`}
                        section={activeSection}
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
                )
              )}

              <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-[#9dabbd]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {data.disclaimer ||
                  "These recommendations are generated from your report and may not be fully accurate. Please consult a qualified doctor before acting on any suggestion."}
              </p>
            </>
          )}
        </main>

        {showNav && counts && activeSection && (
          <nav
            aria-label="Recommendation sections"
            className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[420px] bg-[#ffffff] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(46,55,66,0.08)]"
          >
            <ul className="flex">
              {available.map((s) => {
                const active = s.id === activeSection
                return (
                  <li key={s.id} className="flex flex-1">
                    <button
                      type="button"
                      onClick={() => selectSection(s.id)}
                      aria-current={active ? "page" : undefined}
                      className="flex w-full flex-col items-center gap-0.5 rounded-xl py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
                    >
                      <span
                        className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                          active ? "bg-[#e8f2ff] text-[#156ddc]" : "text-[#9dabbd]"
                        }`}
                      >
                        <s.icon className="h-5 w-5" aria-hidden="true" />
                        <span
                          className={`absolute -top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                            active ? "bg-[#156ddc] text-[#ffffff]" : "bg-[#eef1f4] text-[#4d5c6f]"
                          }`}
                        >
                          {counts[s.id]}
                        </span>
                      </span>
                      <span className={`text-[11px] font-semibold ${active ? "text-[#156ddc]" : "text-[#4d5c6f]"}`}>
                        {s.label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}
      </div>
    </div>
  )
}

function UnderlineTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors ${
        active ? "text-[#156ddc]" : "text-[#9dabbd] hover:text-[#4d5c6f]"
      }`}
    >
      {label}
      <span
        className={`rounded-md px-1.5 text-[11px] leading-5 ${active ? "bg-[#e8f2ff] text-[#156ddc]" : "bg-[#f3f5f7] text-[#9dabbd]"}`}
      >
        {count}
      </span>
      <span
        className={`absolute inset-x-6 bottom-0 h-0.5 rounded-full transition-colors ${active ? "bg-[#156ddc]" : "bg-transparent"}`}
        aria-hidden="true"
      />
    </button>
  )
}

function ParameterHeader({ param }: { param: RecParameter }) {
  const Icon = organIcon(param.organ)
  const tone = statusTone(param.status)
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#ffffff] p-3">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ff] text-[#156ddc]"
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 className="truncate text-base font-semibold text-[#2e3742]">{param.parameter}</h2>
        <p className="truncate text-xs text-[#9dabbd]">
          {[param.organ, param.normal_range && `Normal ${param.normal_range}`].filter(Boolean).join(" · ")}
        </p>
      </div>
      {(param.value || tone.label) && (
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {param.value && <span className="text-sm font-bold text-[#2e3742]">{param.value}</span>}
          {tone.label && (
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tone.pill}`}>
              {tone.Icon && <tone.Icon className="h-3 w-3" aria-hidden="true" />}
              {tone.label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function SectionContent({
  section,
  param,
  onBookTest,
  onConsult,
}: {
  section: SectionId
  param: RecParameter
  onBookTest: (name: string) => void
  onConsult: (specialist: string) => void
}) {
  const exp = param.explanation || {}
  const rec = param.recommendations || {}

  if (section === "understand") {
    const rows = [
      { key: "what", title: "What it is", text: exp.what_it_is, icon: BookOpen },
      { key: "result", title: "Your result", text: exp.your_result, icon: Gauge },
      { key: "why", title: "Why it happens", text: exp.why_it_happens, icon: SearchCheck },
      { key: "means", title: "What it means", text: exp.what_it_means, icon: Lightbulb },
    ].filter((r) => r.text)
    return (
      <Panel>
        <ul className="flex flex-col gap-3.5">
          {rows.map((r) => (
            <li key={r.key} className="flex gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e8f2ff] text-[#156ddc]"
                aria-hidden="true"
              >
                <r.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#9dabbd]">{r.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-[#2e3742]">{r.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    )
  }

  if (section === "lifestyle") {
    return (
      <div className="flex flex-col gap-2">
        {(rec.lifestyle || []).map((l, i) => (
          <Panel key={`${l.change}-${i}`}>
            <div className="flex gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e9f7ef] text-[#1f8a4c]"
                aria-hidden="true"
              >
                <Footprints className="h-4 w-4" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-semibold text-[#2e3742]">{l.change}</p>
                {l.why && <p className="text-xs leading-relaxed text-[#4d5c6f]">{l.why}</p>}
                {l.how && (
                  <p className="mt-1 flex gap-1.5 rounded-lg bg-[#f7f9fa] px-2.5 py-2 text-xs leading-relaxed text-[#2e3742]">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#156ddc]" aria-hidden="true" />
                    <span>{l.how}</span>
                  </p>
                )}
              </div>
            </div>
          </Panel>
        ))}
        {rec.self_care_note && (
          <p className="flex gap-2 rounded-2xl bg-[#e8f2ff] p-3 text-xs leading-relaxed text-[#2e3742]">
            <HandHeart className="mt-0.5 h-4 w-4 shrink-0 text-[#156ddc]" aria-hidden="true" />
            {rec.self_care_note}
          </p>
        )}
      </div>
    )
  }

  if (section === "diet") {
    const include = rec.diet?.include || []
    const limit = rec.diet?.limit || []
    return (
      <div className="flex flex-col gap-2">
        {include.length > 0 && <FoodList kind="include" items={include} />}
        {limit.length > 0 && <FoodList kind="limit" items={limit} />}
      </div>
    )
  }

  const next = param.next_steps || {}
  const tests = next.tests || []
  const specialists = next.consult_doctor?.specialists || []
  const otherTests = next.other_tests || []
  return (
    <div className="flex flex-col gap-2">
      {next.consult_doctor?.advice && (
        <p className="px-1 text-sm leading-relaxed text-[#4d5c6f]">{next.consult_doctor.advice}</p>
      )}
      {specialists.map((s) => (
        <CtaButton key={`doc-${s}`} icon={Stethoscope} label={s} sub="Consult online" primary onClick={() => onConsult(s)} />
      ))}
      {tests.map((t) => (
        <CtaButton key={`test-${t.name}`} icon={FlaskConical} label={t.name} sub="Book lab test" onClick={() => onBookTest(t.name)} />
      ))}
      {otherTests.length > 0 && (
        <p className="px-1 pt-1 text-xs leading-relaxed text-[#4d5c6f]">
          <span className="font-semibold text-[#2e3742]">Also ask your doctor about: </span>
          {otherTests.join(", ")}
        </p>
      )}
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl bg-[#ffffff] p-3.5">{children}</section>
}

function FoodList({ kind, items }: { kind: "include" | "limit"; items: RecFood[] }) {
  const isInclude = kind === "include"
  const MarkIcon = isInclude ? Check : X
  return (
    <Panel>
      <p
        className={`mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
          isInclude ? "text-[#1f8a4c]" : "text-[#c93838]"
        }`}
      >
        {isInclude ? <Salad className="h-4 w-4" aria-hidden="true" /> : <Ban className="h-4 w-4" aria-hidden="true" />}
        {isInclude ? "Add to your plate" : "Limit or avoid"}
      </p>
      <ul className="flex flex-col gap-2.5">
        {items.map((f, i) => (
          <li key={`${f.food}-${i}`} className="flex gap-2.5">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                isInclude ? "bg-[#e9f7ef] text-[#1f8a4c]" : "bg-[#fdecec] text-[#c93838]"
              }`}
              aria-hidden="true"
            >
              <MarkIcon className="h-3 w-3" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#2e3742]">{f.food}</p>
              {(f.why || f.tip) && (
                <p className="mt-0.5 text-xs leading-relaxed text-[#4d5c6f]">{[f.why, f.tip].filter(Boolean).join(" ")}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
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
      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30 ${
        primary ? "bg-[#156ddc] text-[#ffffff] hover:opacity-90" : "bg-[#ffffff] text-[#2e3742] hover:bg-[#eef2f6]"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
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
      <div className="h-16 animate-pulse rounded-2xl bg-[#ffffff]" />
      <div className="h-48 animate-pulse rounded-2xl bg-[#ffffff]" />
    </div>
  )
}
