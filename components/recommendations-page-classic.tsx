"use client"

import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, FlaskConical, Info, RefreshCw, Stethoscope, X, type LucideIcon } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { ApiHealthReport } from "@/lib/api"
import { isNativeAppPlatform } from "@/lib/api"
import { openExternalUrl } from "@/lib/open-external"
import { trackEvent } from "@/lib/analytics/posthog"
import type { RecFood, RecParameter } from "@/lib/recommendations-api"
import { formatReportDate, organIcon, paramKey, statusTone, useRecommendations } from "@/lib/use-recommendations"

type View = "priority" | "all"
type SectionId = "understand" | "lifestyle" | "diet" | "next"

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "understand", label: "About" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "diet", label: "Diet" },
  { id: "next", label: "Next steps" },
]

function labsUrl(native: boolean, packageId?: number) {
  if (packageId) return `https://www.medibuddy.in/labs/packages/${packageId}`
  return native ? "https://www.medibuddy.in/labsLandingPage" : "https://www.medibuddy.in/consumerLabs"
}
function consultUrl(native: boolean) {
  return native ? "https://www.medibuddy.in/ask" : "https://doctor.medibuddy.in/main.html#askDoctor"
}

function hasSection(p: RecParameter, id: SectionId) {
  const exp = p.explanation || {}
  const rec = p.recommendations || {}
  const next = p.next_steps || {}
  if (id === "understand") return Boolean(exp.what_it_is || exp.your_result || exp.why_it_happens || exp.what_it_means)
  if (id === "lifestyle") return (rec.lifestyle || []).length > 0
  if (id === "diet") return (rec.diet?.include || []).length + (rec.diet?.limit || []).length > 0
  return (
    (next.tests || []).length + (next.consult_doctor?.specialists || []).length + (next.other_tests || []).length > 0 ||
    Boolean(next.consult_doctor?.advice)
  )
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
  const available = selected ? SECTIONS.filter((s) => hasSection(selected, s.id)) : []
  const activeSection = available.some((s) => s.id === section) ? section : available[0]?.id
  const dateLabel = formatReportDate(reportDate)

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
  }

  const selectedIndex = selected ? items.findIndex((p) => paramKey(p) === paramKey(selected)) : -1
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const chipRow = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selected || !chipRow.current) return
    const chip = chipRow.current.querySelector<HTMLElement>(`[data-key="${CSS.escape(paramKey(selected))}"]`)
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [selected])

  const stepParam = (delta: number) => {
    const next = items[selectedIndex + delta]
    if (next) selectParam(next)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    stepParam(dx < 0 ? 1 : -1)
  }

  const selectSection = (id: SectionId) => {
    setSection(id)
    trackEvent("recommendations_click", { service: "section_select", section: id, parameter: selected?.parameter })
  }

  return (
    <div className="min-h-screen bg-[#f7f9fa]">
      <div className="mx-auto min-h-screen max-w-[420px] bg-[#f7f9fa] sm:my-8 sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:shadow-lg">
        <header className="sticky top-0 z-20 border-b border-[#eef1f4] bg-[#ffffff]">
          <div className="flex items-center gap-1 px-2 pt-2">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#2e3742] transition-colors hover:bg-[#f0f3f5]"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-semibold leading-tight text-[#2e3742]">Health Insights</h1>
              <p className="truncate text-xs text-[#9dabbd]">
                {dateLabel ? `From your ${dateLabel} report` : "From your latest report"}
              </p>
            </div>
          </div>

          {data && !isLoading && (
            <>
              <div className="mx-4 mt-3 flex rounded-xl bg-[#f0f3f5] p-1" role="tablist" aria-label="Recommendation type">
                <SegTab active={view === "priority"} onClick={() => switchView("priority")} label="Top priorities" count={priority.length} />
                <SegTab active={view === "all"} onClick={() => switchView("all")} label="All parameters" count={allParams.length} />
              </div>

              {items.length > 0 && (
                <div
                  ref={chipRow}
                  className="flex snap-x gap-2 overflow-x-auto overscroll-x-contain px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="listbox"
                  aria-label="Select a parameter"
                >
                  {items.map((p) => {
                    const active = selected && paramKey(selected) === paramKey(p)
                    const tone = statusTone(p.status)
                    return (
                      <button
                        key={paramKey(p)}
                        data-key={paramKey(p)}
                        type="button"
                        role="option"
                        aria-selected={Boolean(active)}
                        onClick={() => selectParam(p)}
                        className={`inline-flex h-8 shrink-0 snap-center items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
                          active
                            ? "border-[#156ddc] bg-[#156ddc] text-[#ffffff]"
                            : "border-[#e3e8ee] bg-[#ffffff] text-[#4d5c6f] hover:border-[#c9d3de]"
                        }`}
                      >
                        {!active && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />}
                        <span className="max-w-36 truncate">{p.parameter}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </header>

        <main className="flex flex-col gap-4 p-4 pb-8">
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
                  className="flex items-start gap-2 text-left"
                >
                  <span className={`flex-1 text-sm leading-relaxed text-[#4d5c6f] text-pretty ${summaryOpen ? "" : "line-clamp-2"}`}>
                    {data.overall_summary}
                  </span>
                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 text-[#9dabbd] transition-transform ${summaryOpen ? "rotate-180" : ""}`}
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
                  <article
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    className="touch-pan-y overflow-hidden rounded-2xl bg-[#ffffff] shadow-[0_1px_2px_rgba(46,55,66,0.06)]"
                  >
                    <ParameterHeader param={selected} />

                    {available.length > 1 && (
                      <div className="flex border-b border-[#eef1f4] px-2" role="tablist" aria-label="Recommendation details">
                        {available.map((s) => {
                          const active = s.id === activeSection
                          return (
                            <button
                              key={s.id}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              onClick={() => selectSection(s.id)}
                              className={`relative flex-1 py-3 text-xs font-semibold transition-colors ${
                                active ? "text-[#156ddc]" : "text-[#9dabbd] hover:text-[#4d5c6f]"
                              }`}
                            >
                              {s.label}
                              <span
                                className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full ${active ? "bg-[#156ddc]" : "bg-transparent"}`}
                                aria-hidden="true"
                              />
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {activeSection && (
                      <div className="p-4" role="tabpanel" key={`${paramKey(selected)}-${activeSection}`}>
                        <SectionContent
                          section={activeSection}
                          param={selected}
                          onBookTest={(name, packageId) => {
                            trackEvent("recommendations_click", { service: "Book Lab Test", test: name })
                            openExternalUrl(labsUrl(native, packageId))
                          }}
                          onConsult={(specialist, url) => {
                            trackEvent("recommendations_click", { service: "Online Consultation", specialist })
                            openExternalUrl(url || consultUrl(native))
                          }}
                        />
                      </div>
                    )}
                  </article>

                  {items.length > 1 && (
                    <div className="flex items-center justify-between px-1">
                      <button
                        type="button"
                        onClick={() => stepParam(-1)}
                        disabled={selectedIndex <= 0}
                        aria-label="Previous parameter"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffffff] text-[#4d5c6f] shadow-[0_1px_2px_rgba(46,55,66,0.08)] transition-opacity disabled:opacity-30"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="text-xs font-medium text-[#9dabbd]" aria-live="polite">
                        {`${selectedIndex + 1} of ${items.length} · swipe to switch`}
                      </span>
                      <button
                        type="button"
                        onClick={() => stepParam(1)}
                        disabled={selectedIndex >= items.length - 1}
                        aria-label="Next parameter"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffffff] text-[#4d5c6f] shadow-[0_1px_2px_rgba(46,55,66,0.08)] transition-opacity disabled:opacity-30"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
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
      </div>
    </div>
  )
}

function SegTab({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
        active ? "bg-[#ffffff] text-[#2e3742] shadow-[0_1px_2px_rgba(46,55,66,0.1)]" : "text-[#6b7a8c] hover:text-[#2e3742]"
      }`}
    >
      {label}
      <span className={`text-[11px] ${active ? "text-[#156ddc]" : "text-[#9dabbd]"}`}>{count}</span>
    </button>
  )
}

function ParameterHeader({ param }: { param: RecParameter }) {
  const Icon = organIcon(param.organ)
  const tone = statusTone(param.status)
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f2ff] text-[#156ddc]" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold text-[#2e3742]">{param.parameter}</h2>
        {param.normal_range && <p className="truncate text-xs text-[#9dabbd]">{`Normal range ${param.normal_range}`}</p>}
      </div>
      {(param.value || tone.label) && (
        <div className="flex shrink-0 flex-col items-end gap-1">
          {param.value && <span className="text-sm font-semibold text-[#2e3742]">{param.value}</span>}
          {tone.label && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.pill}`}>{tone.label}</span>
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
  onBookTest: (name: string, packageId?: number) => void
  onConsult: (specialist: string, url?: string) => void
}) {
  const exp = param.explanation || {}
  const rec = param.recommendations || {}

  if (section === "understand") {
    const rows = [
      { title: "What it is", text: exp.what_it_is },
      { title: "Your result", text: exp.your_result },
      { title: "Why it happens", text: exp.why_it_happens },
      { title: "What it means", text: exp.what_it_means },
    ].filter((r) => r.text)
    return (
      <dl className="flex flex-col divide-y divide-[#f0f3f5]">
        {rows.map((r) => (
          <div key={r.title} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
            <dt className="text-xs font-semibold text-[#156ddc]">{r.title}</dt>
            <dd className="text-sm leading-relaxed text-[#2e3742] text-pretty">{r.text}</dd>
          </div>
        ))}
      </dl>
    )
  }

  if (section === "lifestyle") {
    return (
      <div className="flex flex-col gap-4">
        <ol className="flex flex-col divide-y divide-[#f0f3f5]">
          {(rec.lifestyle || []).map((l, i) => (
            <li key={`${l.change}-${i}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8f2ff] text-[11px] font-semibold text-[#156ddc]"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-semibold leading-snug text-[#2e3742]">{l.change}</p>
                {l.how && <p className="text-sm leading-relaxed text-[#4d5c6f]">{l.how}</p>}
                {l.why && <p className="text-xs leading-relaxed text-[#9dabbd]">{l.why}</p>}
              </div>
            </li>
          ))}
        </ol>
        {rec.self_care_note && (
          <p className="rounded-xl bg-[#f7f9fa] px-3 py-2.5 text-xs leading-relaxed text-[#4d5c6f]">{rec.self_care_note}</p>
        )}
      </div>
    )
  }

  if (section === "diet") {
    const include = rec.diet?.include || []
    const limit = rec.diet?.limit || []
    return (
      <div className="flex flex-col gap-5">
        {include.length > 0 && <FoodList kind="include" items={include} />}
        {limit.length > 0 && <FoodList kind="limit" items={limit} />}
      </div>
    )
  }

  const next = param.next_steps || {}
  const tests = next.tests || []
  const specialists = next.consult_doctor?.specialists || []
  const specialistLinks = next.consult_doctor?.specialist_links || []
  const otherTests = next.other_tests || []
  return (
    <div className="flex flex-col gap-3">
      {next.consult_doctor?.advice && <p className="text-sm leading-relaxed text-[#4d5c6f]">{next.consult_doctor.advice}</p>}
      {(specialists.length > 0 || tests.length > 0) && (
        <div className="flex flex-col divide-y divide-[#f0f3f5] overflow-hidden rounded-xl border border-[#eef1f4]">
          {specialists.map((s) => (
            <CtaRow
              key={`doc-${s}`}
              icon={Stethoscope}
              label={s}
              action="Consult"
              onClick={() => onConsult(s, specialistLinks.find((l) => l.name === s)?.url)}
            />
          ))}
          {tests.map((t) => (
            <CtaRow
              key={`test-${t.name}`}
              icon={FlaskConical}
              label={t.name}
              description={t.purpose}
              action="Book test"
              onClick={() => onBookTest(t.name, t.package_ids?.[0])}
            />
          ))}
        </div>
      )}
      {otherTests.length > 0 && (
        <p className="text-xs leading-relaxed text-[#9dabbd]">
          <span className="font-semibold text-[#4d5c6f]">Also ask your doctor about: </span>
          {otherTests.join(", ")}
        </p>
      )}
    </div>
  )
}

function FoodList({ kind, items }: { kind: "include" | "limit"; items: RecFood[] }) {
  const isInclude = kind === "include"
  const MarkIcon = isInclude ? Check : X
  return (
    <section className="flex flex-col gap-2">
      <h3 className={`text-xs font-semibold ${isInclude ? "text-[#1f8a4c]" : "text-[#c93838]"}`}>
        {isInclude ? "Eat more" : "Limit or avoid"}
      </h3>
      <ul className="flex flex-col divide-y divide-[#f0f3f5]">
        {items.map((f, i) => (
          <li key={`${f.food}-${i}`} className="flex gap-2.5 py-2.5 first:pt-0 last:pb-0">
            <MarkIcon
              className={`mt-0.5 h-4 w-4 shrink-0 ${isInclude ? "text-[#1f8a4c]" : "text-[#c93838]"}`}
              strokeWidth={2.5}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#2e3742]">{f.food}</p>
              {(f.why || f.tip) && (
                <p className="mt-0.5 text-xs leading-relaxed text-[#6b7a8c]">{[f.why, f.tip].filter(Boolean).join(" ")}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CtaRow({
  icon: Icon,
  label,
  description,
  action,
  onClick,
}: {
  icon: LucideIcon
  label: string
  description?: string
  action: string
  onClick: () => void
}) {
  const [whyOpen, setWhyOpen] = useState(false)
  const whyId = useId()
  return (
    <div className="flex flex-col gap-2 bg-[#ffffff] px-3 py-3">
      <div className="flex w-full items-center gap-3">
        <Icon className="h-[18px] w-[18px] shrink-0 text-[#156ddc]" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span className="truncate text-sm font-medium text-[#2e3742]">{label}</span>
          {description && (
            <button
              type="button"
              onClick={() => setWhyOpen((o) => !o)}
              aria-expanded={whyOpen}
              aria-controls={whyId}
              aria-label={`Why ${label} is suggested`}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40 ${
                whyOpen ? "bg-[#e8f2ff] text-[#156ddc]" : "text-[#9dabbd] hover:text-[#156ddc]"
              }`}
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </span>
        <button
          type="button"
          onClick={onClick}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1 py-1 text-xs font-semibold text-[#156ddc] transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40"
        >
          {action}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      {description && whyOpen && (
        <p id={whyId} className="ml-[30px] rounded-lg bg-[#f7f9fa] px-3 py-2 text-xs leading-relaxed text-[#4d5c6f]">
          <span className="font-semibold text-[#2e3742]">Why this test: </span>
          {description}
        </p>
      )}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading recommendations</span>
      <div className="h-10 animate-pulse rounded-xl bg-[#ffffff]" />
      <div className="h-64 animate-pulse rounded-2xl bg-[#ffffff]" />
    </div>
  )
}
