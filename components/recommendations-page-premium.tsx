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
  Sparkles,
  Sprout,
  Stethoscope,
  Wheat,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { ApiHealthReport } from "@/lib/api"
import { isNativeAppPlatform } from "@/lib/api"
import { openExternalUrl } from "@/lib/open-external"
import { trackClick } from "@/lib/analytics/posthog"
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
const PROGRAMS_FORM_URL = "https://docs.google.com/forms/d/1tiJ7dyy-5aTUtwRDoH_SlRKQYAmdkH1EihtpTvjeHd4/viewform"
const RECOMMENDATIONS_DISCLAIMER = [
  "Recommended tests are for users whose last test was 3+ months ago. Ignore recently completed tests and consider an online consultation if recommended.",
  "These insights are based on general clinical patterns, not a diagnosis. Please consult a licensed doctor before making any changes to medication or treatment.",
]
function openProgramsForm() {
  trackClick("explore_more_programs_click")
  openExternalUrl(PROGRAMS_FORM_URL)
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
  const [expandedId, setExpandedId] = useState<string | null>(initialParamId ?? null)

  const items = view === "priority" ? priority : allParams
  const dateLabel = formatReportDate(reportDate)

  const switchView = (v: View) => {
    if (v === view) return
    setView(v)
    setExpandedId(null)
  }

  const toggleParam = (p: RecParameter) => {
    const key = paramKey(p)
    setExpandedId((cur) => (cur === key ? null : key))
  }

  return (
    <div className="min-h-screen bg-[#eef3fa] [&_button]:font-[inherit]">
      <div className="mx-auto min-h-screen max-w-[420px] bg-[#eef3fa] sm:my-8 sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:shadow-lg">
        <header className="sticky top-0 z-20 overflow-hidden rounded-b-[28px] bg-[linear-gradient(160deg,#0d3f96_0%,#082a66_45%,#061b44_100%)] pb-4 shadow-[0_12px_30px_-14px_rgba(6,27,68,0.6)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07] [background:repeating-linear-gradient(115deg,#fff_0_1px,transparent_1px_9px)]"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-1 px-2 pt-2">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#ffffff] transition-colors hover:bg-[#ffffff]/15"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[16px] font-semibold leading-tight tracking-tight text-[#ffffff]">Health Insights</h1>
              <p className="truncate text-[11px] font-light text-[#e8f2ff]/85">
                {dateLabel ? `From your ${dateLabel} report` : "From your latest report"}
              </p>
            </div>
          </div>

          {data && !isLoading && (
            <div
              className="relative mx-4 mt-3 flex rounded-full border border-[#ffffff]/10 bg-[#ffffff]/10 p-1"
              role="tablist"
              aria-label="Recommendation type"
            >
              <SegTab active={view === "priority"} onClick={() => switchView("priority")} label="Top priorities" count={priority.length} />
              <SegTab active={view === "all"} onClick={() => switchView("all")} label="All parameters" count={allParams.length} />
            </div>
          )}
        </header>

        <main className="flex flex-col gap-3 p-4 pb-8">
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
              {items.length === 0 ? (
                <p className="rounded-2xl bg-[#ffffff] p-6 text-center text-sm text-[#4d5c6f]">
                  No recommendations available for this report.
                </p>
              ) : (
                <ul className="flex flex-col gap-3" key={view}>
                  {items.map((p, i) => (
                    <li
                      key={paramKey(p)}
                      className="animate-[ht-rise_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
                      style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
                    >
                      <ParameterCard
                        param={p}
                        expanded={expandedId === paramKey(p)}
                        onToggle={() => toggleParam(p)}
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
                  ))}
                </ul>
              )}

              <p className="flex items-start gap-1.5 px-1 pt-1 text-[11px] leading-relaxed text-[#9dabbd]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="flex flex-col gap-1">
                  {RECOMMENDATIONS_DISCLAIMER.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </span>
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function ParameterCard({
  param,
  expanded,
  onToggle,
  onBookTest,
  onConsult,
}: {
  param: RecParameter
  expanded: boolean
  onToggle: () => void
  onBookTest: (name: string, packageId?: number) => void
  onConsult: (specialist: string, url?: string) => void
}) {
  const Icon = organIcon(param.organ)
  const tone = statusTone(param.status)
  const panelId = useId()
  const cardRef = useRef<HTMLElement>(null)
  const sections = SECTIONS.filter((s) => hasSection(param, s.id))

  useEffect(() => {
    if (!expanded || !cardRef.current) return
    const el = cardRef.current
    const t = window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 220)
    return () => window.clearTimeout(t)
  }, [expanded])

  return (
    <article
      ref={cardRef}
      className={`scroll-mt-32 overflow-hidden rounded-3xl border bg-[#ffffff] transition-[box-shadow,border-color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        expanded
          ? "border-[#0d3f96]/25 shadow-[0_24px_48px_-22px_rgba(13,63,150,0.55)]"
          : "border-[#dbe5f3] shadow-[0_8px_22px_-16px_rgba(13,63,150,0.4)] active:scale-[0.99]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="relative flex w-full items-center gap-3 px-4 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0d3f96]/30"
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-500 ${
            expanded
              ? "bg-[linear-gradient(160deg,#0d3f96,#082a66)] text-[#ffffff] shadow-[0_8px_18px_-6px_rgba(8,42,102,0.6)]"
              : "bg-[#eef3fa] text-[#0d3f96]"
          }`}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[15px] font-semibold leading-snug text-[#1b2431] text-pretty">{param.parameter}</span>
          <span className="flex items-center gap-2">
            {param.value && <span className="text-[13px] font-bold tabular-nums text-[#0d3f96]">{param.value}</span>}
            {tone.label && (
              <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${tone.pill}`}>
                {tone.label}
              </span>
            )}
          </span>
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            expanded ? "rotate-180 bg-[#0d3f96] text-[#ffffff]" : "bg-[#eef3fa] text-[#0d3f96]"
          }`}
          aria-hidden="true"
        >
          <ChevronDown className="h-4 w-4" strokeWidth={2.25} />
        </span>
      </button>

      <div
        id={panelId}
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        inert={!expanded}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-5 px-4 pb-5">
            <div className="h-px bg-[linear-gradient(90deg,transparent,#dbe5f3,transparent)]" aria-hidden="true" />

            {(param.value || param.normal_range) && (
              <div
                className={`relative flex items-end justify-between gap-3 overflow-hidden rounded-2xl bg-[linear-gradient(160deg,#0d3f96_0%,#082a66_60%,#061b44_100%)] px-4 py-4 ${
                  expanded ? "animate-[ht-rise_0.45s_cubic-bezier(0.22,1,0.36,1)_both]" : ""
                }`}
              >
                <span
                  className="pointer-events-none absolute inset-0 opacity-[0.08] [background:repeating-linear-gradient(115deg,#fff_0_1px,transparent_1px_9px)]"
                  aria-hidden="true"
                />
                {param.value && (
                  <p className="relative flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#e8f2ff]/75">Your value</span>
                    <span className="text-[26px] font-bold leading-none tracking-tight text-[#ffffff] tabular-nums">{param.value}</span>
                  </p>
                )}
                {param.normal_range && (
                  <p className="relative text-right text-[11px] leading-relaxed text-[#e8f2ff]/75">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider">Normal</span>
                    <span className="font-semibold text-[#ffffff] tabular-nums">{param.normal_range}</span>
                  </p>
                )}
              </div>
            )}

            {sections.map((s, i) => (
              <section
                key={s.id}
                aria-label={s.label}
                className={`flex flex-col gap-3 ${expanded ? "animate-[ht-rise_0.5s_cubic-bezier(0.22,1,0.36,1)_both]" : ""}`}
                style={{ animationDelay: `${(i + 1) * 80}ms` }}
              >
                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d3f96]">
                  <span className="h-3.5 w-1 rounded-full bg-[linear-gradient(180deg,#156ddc,#0d3f96)]" aria-hidden="true" />
                  {s.label}
                </h3>
                <div className="rounded-2xl border border-[#e6edf7] bg-[#f8fafd] p-4">
                  <SectionContent section={s.id} param={param} onBookTest={onBookTest} onConsult={onConsult} />
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </article>
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
        active ? "bg-[#ffffff] font-semibold text-[#0d3f96] shadow-[0_4px_14px_rgba(0,0,0,0.25)]" : "font-medium text-[#ffffff]/85 hover:text-[#ffffff]"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${active ? "bg-[#0d3f96] text-[#ffffff]" : "bg-[#ffffff]/15 text-[#ffffff]"}`}
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
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(160deg,#0d3f96,#082a66)] text-[#ffffff] shadow-[0_6px_14px_-4px_rgba(8,42,102,0.5)]"
          aria-hidden="true"
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <h2 className="min-w-0 flex-1 text-[16px] font-semibold leading-snug text-[#1b2431] text-pretty">{param.parameter}</h2>
        {tone.label && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tone.pill}`}>
            {tone.label}
          </span>
        )}
      </div>
      {(param.value || param.normal_range) && (
        <div className="flex items-end justify-between gap-3 rounded-2xl border border-[#dbe5f3] bg-[#f5f8fd] px-4 py-3.5">
          {param.value && (
            <p className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7a8d]">Your value</span>
              <span className="text-[26px] font-bold leading-none tracking-tight text-[#0d3f96] tabular-nums">{param.value}</span>
            </p>
          )}
          {param.normal_range && (
            <p className="text-right text-[11px] leading-relaxed text-[#6b7a8d]">
              <span className="block text-[10px] font-semibold uppercase tracking-wider">Normal</span>
              <span className="font-semibold text-[#1b2431] tabular-nums">{param.normal_range}</span>
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
  onBookTest: (name: string, packageId?: number) => void
  onConsult: (specialist: string, url?: string) => void
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
            <dt className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#0d3f96]">
              <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {title}
            </dt>
            <dd className="text-[13.5px] leading-relaxed text-[#2e3742] text-pretty">{text}</dd>
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
  const specialistLinks = next.consult_doctor?.specialist_links || []
  const otherTests = next.other_tests || []
  return (
    <div className="flex flex-col gap-2">
      {next.consult_doctor?.advice && <p className="text-[13px] leading-relaxed text-[#4d5c6f]">{next.consult_doctor.advice}</p>}
      <div className="flex flex-col divide-y divide-[#f0f3f5]">
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
          <CtaRow icon={Sparkles} label="Explore more programs" action="Explore" onClick={openProgramsForm} />
        </div>
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
    <div className="flex flex-col gap-2 py-3">
      <div className="flex w-full items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ff]" aria-hidden="true">
          <Icon className="h-4 w-4 text-[#156ddc]" strokeWidth={2} />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span className="text-[13px] font-semibold leading-snug text-[#2e3742] line-clamp-2">{label}</span>
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
              <Info className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
            </button>
          )}
        </span>
        <button
          type="button"
          onClick={onClick}
          className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-[linear-gradient(160deg,#0d3f96,#082a66)] pl-3 pr-2 text-[12px] font-bold text-[#ffffff] shadow-[0_6px_14px_-4px_rgba(8,42,102,0.5)] transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40"
        >
          {action}
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
      {description && whyOpen && (
        <p
          id={whyId}
          className="ml-12 rounded-xl border border-[#dbe8fb] bg-[#f4f8fe] px-3 py-2.5 text-[12px] leading-relaxed text-[#4d5c6f]"
        >
          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-[#156ddc]">Why this test</span>
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
