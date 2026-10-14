"use client"

import {
  Apple,
  ArrowLeft,
  Ban,
  Banana,
  Bean,
  Beef,
  BookOpen,
  Candy,
  Carrot,
  Check,
  Cherry,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Citrus,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Droplets,
  Drumstick,
  Egg,
  EggFried,
  Fish,
  FlaskConical,
  Grape,
  IceCream,
  Info,
  Leaf,
  Lightbulb,
  Milk,
  Nut,
  Pizza,
  Popcorn,
  RefreshCw,
  Salad,
  Sandwich,
  Soup,
  Sprout,
  Stethoscope,
  Wheat,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
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

function labsUrl(native: boolean) {
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
    <div
      className="min-h-screen bg-[#f7f9fa] tracking-[-0.01em] [font-feature-settings:'tnum','ss01'] [&_button]:font-[inherit]"
      style={{ fontFamily: "var(--font-insights), system-ui, sans-serif" }}
    >
      <div className="mx-auto min-h-screen max-w-[420px] bg-[#f7f9fa] sm:my-8 sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:shadow-lg">
        <header className="sticky top-0 z-20 bg-[#156ddc] pb-1">
          <div className="flex items-center gap-1 px-2 pt-2">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#ffffff] transition-colors hover:bg-[#ffffff]/15"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[17px] font-bold leading-tight tracking-tight text-[#ffffff]">Health Insights</h1>
              <p className="truncate text-[11px] font-medium text-[#e8f2ff]/80">
                {dateLabel ? `From your ${dateLabel} report` : "From your latest report"}
              </p>
            </div>
          </div>

          {data && !isLoading && (
            <>
              <div className="mx-4 mt-3 flex rounded-full bg-[#ffffff]/15 p-0.5" role="tablist" aria-label="Recommendation type">
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
                        className={`inline-flex h-8 shrink-0 snap-center items-center gap-1.5 rounded-full border px-3 text-[12px] transition-colors ${
                          active
                            ? "border-[#ffffff] bg-[#ffffff] font-bold text-[#156ddc] shadow-[0_2px_6px_rgba(10,40,90,0.18)]"
                            : "border-[#ffffff]/30 bg-[#ffffff]/10 font-semibold text-[#ffffff] hover:bg-[#ffffff]/20"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? tone.dot : "bg-[#ffffff]/70"}`}
                          aria-hidden="true"
                        />
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
                  <span className={`flex-1 text-[13px] leading-relaxed text-[#4d5c6f] text-pretty ${summaryOpen ? "" : "line-clamp-2"}`}>
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
                    className="touch-pan-y overflow-hidden rounded-3xl border border-[#eef1f4] bg-[#ffffff] shadow-[0_8px_24px_-12px_rgba(21,109,220,0.12)]"
                  >
                    <ParameterHeader param={selected} />

                    {available.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto border-b border-[#eef1f4] px-5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Recommendation details">
                        {available.map((s) => {
                          const active = s.id === activeSection
                          return (
                            <button
                              key={s.id}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              onClick={() => selectSection(s.id)}
                              className={`h-8 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30 ${
                                active
                                  ? "border-[#156ddc] bg-[#156ddc] text-[#ffffff] shadow-[0_2px_6px_rgba(21,109,220,0.25)]"
                                  : "border-[#dde5ee] bg-[#ffffff] text-[#4d5c6f] hover:border-[#156ddc]/40 hover:text-[#156ddc]"
                              }`}
                            >
                              {s.label}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {activeSection && (
                      <div className="px-5 pb-5 pt-4" role="tabpanel" key={`${paramKey(selected)}-${activeSection}`}>
                        <SectionContent
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
                        className="inline-flex h-9 items-center gap-1 rounded-full border border-[#dde5ee] bg-[#ffffff] pl-2.5 pr-3.5 text-[12px] font-semibold text-[#156ddc] shadow-[0_1px_2px_rgba(46,55,66,0.06)] transition-colors hover:border-[#156ddc]/40 disabled:border-[#eef1f4] disabled:text-[#c3ccd7] disabled:shadow-none"
                      >
                        <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                        Previous
                      </button>
                      <span className="text-[12px] font-semibold tabular-nums text-[#4d5c6f]" aria-live="polite">
                        {selectedIndex + 1}
                        <span className="font-medium text-[#9dabbd]">{` of ${items.length}`}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => stepParam(1)}
                        disabled={selectedIndex >= items.length - 1}
                        aria-label="Next parameter"
                        className="inline-flex h-9 items-center gap-1 rounded-full bg-[#156ddc] pl-3.5 pr-2.5 text-[12px] font-semibold text-[#ffffff] shadow-[0_2px_8px_rgba(21,109,220,0.3)] transition-opacity hover:opacity-90 disabled:bg-[#eef1f4] disabled:text-[#c3ccd7] disabled:shadow-none"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
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
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] transition-colors ${
        active ? "bg-[#ffffff] font-bold text-[#156ddc] shadow-[0_2px_6px_rgba(10,40,90,0.18)]" : "font-semibold text-[#ffffff]/85 hover:text-[#ffffff]"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-[10px] font-bold tabular-nums ${active ? "bg-[#e8f2ff] text-[#156ddc]" : "bg-[#ffffff]/15 text-[#ffffff]"}`}
      >
        {count}
      </span>
    </button>
  )
}

function ParameterHeader({ param }: { param: RecParameter }) {
  const Icon = organIcon(param.organ)
  const tone = statusTone(param.status)
  return (
    <div className="flex flex-col gap-4 px-5 pb-4 pt-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ff] text-[#156ddc]" aria-hidden="true">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <h2 className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-[#2e3742] text-pretty">{param.parameter}</h2>
        {tone.label && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone.pill}`}>
            {tone.label}
          </span>
        )}
      </div>
      {(param.value || param.normal_range) && (
        <div className="flex items-end justify-between gap-3 border-t border-[#f0f3f5] pt-4">
          {param.value && (
            <p className="text-[24px] font-extrabold leading-none tracking-tight text-[#2e3742] tabular-nums">{param.value}</p>
          )}
          {param.normal_range && (
            <p className="text-right text-[11px] leading-relaxed text-[#9dabbd]">
              <span className="block text-[10px] font-semibold uppercase tracking-wider">Normal</span>
              <span className="font-semibold text-[#4d5c6f] tabular-nums">{param.normal_range}</span>
            </p>
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
    const rows: { title: string; text?: string; icon: LucideIcon }[] = [
      { title: "What it is", text: exp.what_it_is, icon: BookOpen },
      { title: "Why it happens", text: exp.why_it_happens, icon: Lightbulb },
    ].filter((r) => r.text)
    return (
      <dl className="flex flex-col divide-y divide-[#f0f3f5]">
        {rows.map(({ title, text, icon: Icon }) => (
          <div key={title} className="flex flex-col gap-1.5 py-3.5 first:pt-0 last:pb-0">
            <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#156ddc]">
              <Icon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
              {title}
            </dt>
            <dd className="text-[13px] leading-relaxed text-[#4d5c6f] text-pretty">{text}</dd>
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
                className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8f2ff] text-[10px] font-bold tabular-nums text-[#156ddc]"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-[13px] font-bold leading-snug text-[#2e3742]">{l.change}</p>
                {l.how && <p className="text-[13px] leading-relaxed text-[#4d5c6f]">{l.how}</p>}
                {l.why && <p className="text-[11px] leading-relaxed text-[#9dabbd]">{l.why}</p>}
              </div>
            </li>
          ))}
        </ol>
        {rec.self_care_note && (
          <p className="rounded-2xl bg-[#f7f9fa] px-3.5 py-3 text-[12px] leading-relaxed text-[#4d5c6f]">{rec.self_care_note}</p>
        )}
      </div>
    )
  }

  if (section === "diet") {
    return <DietSection key={paramKey(param)} include={rec.diet?.include || []} limit={rec.diet?.limit || []} />
  }

  const next = param.next_steps || {}
  const tests = next.tests || []
  const specialists = next.consult_doctor?.specialists || []
  const otherTests = next.other_tests || []
  return (
    <div className="flex flex-col gap-2">
      {next.consult_doctor?.advice && <p className="text-[13px] leading-relaxed text-[#4d5c6f]">{next.consult_doctor.advice}</p>}
      {(specialists.length > 0 || tests.length > 0) && (
        <div className="flex flex-col divide-y divide-[#f0f3f5]">
          {specialists.map((s) => (
            <CtaRow key={`doc-${s}`} icon={Stethoscope} label={s} action="Consult" onClick={() => onConsult(s)} />
          ))}
          {tests.map((t) => (
            <CtaRow key={`test-${t.name}`} icon={FlaskConical} label={t.name} action="Book test" onClick={() => onBookTest(t.name)} />
          ))}
        </div>
      )}
      {otherTests.length > 0 && (
        <p className="mt-2 rounded-2xl bg-[#f7f9fa] px-3.5 py-3 text-[12px] leading-relaxed text-[#4d5c6f]">
          <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wider text-[#9dabbd]">Also ask your doctor about</span>
          {otherTests.join(", ")}
        </p>
      )}
    </div>
  )
}

const FOOD_ICON_RULES: [RegExp, LucideIcon][] = [
  [/oat|wheat|millet|ragi|jowar|bajra|grain|rice|roti|chapati|bread|barley|quinoa|poha/i, Wheat],
  [/dal|lentil|bean|rajma|chana|chickpea|legume|soy|pulse|sprout/i, Bean],
  [/nut|almond|walnut|cashew|peanut|seed|flax|chia/i, Nut],
  [/fish|salmon|sardine|mackerel|tuna|seafood|prawn/i, Fish],
  [/fried egg/i, EggFried],
  [/egg/i, Egg],
  [/milk|curd|yogurt|yoghurt|paneer|dairy|buttermilk|cheese|ghee|butter/i, Milk],
  [/chicken|poultry|drumstick/i, Drumstick],
  [/meat|mutton|beef|pork|red meat|sausage|bacon/i, Beef],
  [/guava|banana/i, Banana],
  [/orange|lemon|citrus|amla|lime/i, Citrus],
  [/grape|berr/i, Grape],
  [/cherry|pomegranate/i, Cherry],
  [/apple|fruit|papaya|pear/i, Apple],
  [/carrot|beet|root/i, Carrot],
  [/spinach|leaf|leafy|green|methi|palak|kale|vegetable|veggie|gourd|broccoli/i, Leaf],
  [/salad|cucumber/i, Salad],
  [/soup|stew/i, Soup],
  [/water|hydrat|coconut water/i, Droplets],
  [/tea|coffee|caffeine/i, Coffee],
  [/soda|cola|soft drink|juice|sugary drink|beverage/i, CupSoda],
  [/alcohol|wine|beer|liquor/i, Wine],
  [/sweet|sugar|candy|mithai|dessert|jaggery|chocolate/i, Candy],
  [/ice cream/i, IceCream],
  [/biscuit|cookie|cake|bakery|pastry|maida/i, Cookie],
  [/croissant|bakery/i, Croissant],
  [/pizza|fast food|junk/i, Pizza],
  [/sandwich|burger/i, Sandwich],
  [/chips|namkeen|snack|popcorn|fried|pakora|samosa/i, Popcorn],
  [/salt|pickle|papad|processed/i, Ban],
]

function foodIcon(name: string, isInclude: boolean): LucideIcon {
  const hit = FOOD_ICON_RULES.find(([re]) => re.test(name))
  return hit ? hit[1] : isInclude ? Sprout : Ban
}

function DietSection({ include, limit }: { include: RecFood[]; limit: RecFood[] }) {
  const [view, setView] = useState<"include" | "limit">(include.length > 0 ? "include" : "limit")
  const isInclude = view === "include"
  const items = isInclude ? include : limit

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Diet guidance" className="grid grid-cols-2 gap-0.5 rounded-full bg-[#f2f5f8] p-0.5">
        {(
          [
            { id: "include", label: "Eat more", count: include.length, icon: Check, on: "bg-[#ffffff] text-[#156ddc] shadow-[0_1px_2px_rgba(46,55,66,0.1)]" },
            { id: "limit", label: "Limit", count: limit.length, icon: X, on: "bg-[#ffffff] text-[#c93838] shadow-[0_1px_2px_rgba(46,55,66,0.1)]" },
          ] as const
        ).map((t) => {
          const active = view === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={t.count === 0}
              onClick={() => setView(t.id)}
              className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30 disabled:opacity-40 ${
                active ? t.on : "text-[#9dabbd] hover:text-[#4d5c6f]"
              }`}
            >
              <t.icon className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
              {t.label}
              <span className="text-[10px] tabular-nums opacity-70">{t.count}</span>
            </button>
          )
        })}
      </div>

      <ul role="tabpanel" className="flex flex-col divide-y divide-[#f0f3f5]">
        {items.map((f, i) => {
          const Icon = foodIcon(f.food, isInclude)
          return (
            <li key={`${view}-${f.food}-${i}`} className="flex gap-3 py-3 first:pt-1 last:pb-0">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isInclude ? "bg-[#e8f2ff] text-[#156ddc]" : "bg-[#fdf1f1] text-[#c93838]"
                }`}
                aria-hidden="true"
              >
                <Icon className="h-4 w-4" strokeWidth={1.6} />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-[13px] font-bold text-[#2e3742]">{f.food}</p>
                {f.why && <p className="text-[12px] leading-relaxed text-[#4d5c6f]">{f.why}</p>}
                {f.tip && (
                  <p className={`text-[11px] leading-relaxed ${isInclude ? "text-[#156ddc]" : "text-[#c93838]"}`}>{f.tip}</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function CtaRow({
  icon: Icon,
  label,
  action,
  onClick,
}: {
  icon: LucideIcon
  label: string
  action: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 py-3 text-left focus:outline-none"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ff]" aria-hidden="true">
        <Icon className="h-4 w-4 text-[#156ddc]" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-[#2e3742] line-clamp-2">{label}</span>
      <span className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-[#156ddc] pl-3 pr-2 text-[12px] font-bold text-[#ffffff] shadow-[0_2px_6px_rgba(21,109,220,0.28)] transition-opacity group-hover:opacity-90">
        {action}
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
      </span>
    </button>
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
