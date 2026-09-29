"use client"

import { useState } from "react"
import {
  Activity,
  Apple,
  ArrowUpRight,
  Ban,
  Bean,
  Beef,
  Bike,
  Brain,
  Candy,
  Carrot,
  ChevronDown,
  Citrus,
  Clock,
  Coffee,
  Cookie,
  CupSoda,
  Droplet,
  Egg,
  Fish,
  Flower2,
  Footprints,
  GlassWater,
  HeartPulse,
  Leaf,
  Milk,
  Minus,
  Moon,
  Nut,
  Plus,
  Repeat,
  Salad,
  Sprout,
  Stethoscope,
  Sun,
  TrendingUp,
  Wheat,
  Wind,
  Wine,
  type LucideIcon,
} from "lucide-react"
import type { DetailedRecommendation, ServiceKey } from "@/lib/recommendations"

export interface ServiceLink {
  label: string
  url: string
  icon: React.ReactNode
}

interface RecommendationCardProps {
  rec: DetailedRecommendation
  compact?: boolean
  serviceLinks?: Record<ServiceKey, ServiceLink>
  onServiceClick?: (service: ServiceLink) => void
}

const typeMeta: Record<DetailedRecommendation["type"], { icon: LucideIcon; badge: string; tile: string }> = {
  Diet: { icon: Salad, badge: "bg-[#edf7ee] text-[#459f49]", tile: "bg-[#edf7ee] text-[#459f49]" },
  Lifestyle: { icon: Footprints, badge: "bg-[#e8f2ff] text-[#156ddc]", tile: "bg-[#e8f2ff] text-[#156ddc]" },
  Checkup: { icon: Stethoscope, badge: "bg-[#f0f3f5] text-[#2e3742]", tile: "bg-[#f0f3f5] text-[#2e3742]" },
}

// Keyword → icon lookup for food and activity labels; first match wins.
const foodIcons: [RegExp, LucideIcon][] = [
  [/alcohol|wine/i, Wine],
  [/coffee|tea|caffeine/i, Coffee],
  [/sugar|sweet|candy/i, Candy],
  [/drink|soda/i, CupSoda],
  [/snack|junk|fried|processed|packaged/i, Cookie],
  [/meat|beef/i, Beef],
  [/fish/i, Fish],
  [/egg/i, Egg],
  [/milk|yogurt|curd|butter|ghee/i, Milk],
  [/nut|almond|seed/i, Nut],
  [/lentil|chickpea|chana|rajma|dal|bean|soy/i, Bean],
  [/oat|grain|millet|rice|carb|wheat/i, Wheat],
  [/citrus|orange|lemon/i, Citrus],
  [/apple|fruit/i, Apple],
  [/carrot|beet|cucumber|cauliflower/i, Carrot],
  [/water/i, Droplet],
  [/salt|pickle/i, Ban],
  [/spinach|green|vegetable|leaf/i, Leaf],
  [/garlic|mushroom|oil/i, Sprout],
]

const activityIcons: [RegExp, LucideIcon][] = [
  [/cycl|bike/i, Bike],
  [/sun/i, Sun],
  [/yoga/i, Flower2],
  [/sleep/i, Moon],
  [/water|hydrat|glass/i, GlassWater],
  [/stair/i, TrendingUp],
  [/breath|stretch/i, Wind],
  [/bp|pressure/i, HeartPulse],
  [/stress/i, Brain],
  [/walk/i, Footprints],
]

function pickIcon(label: string, map: [RegExp, LucideIcon][], fallback: LucideIcon) {
  return map.find(([re]) => re.test(label))?.[1] ?? fallback
}

export default function RecommendationCard({ rec, compact, serviceLinks, onServiceClick }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [foodTab, setFoodTab] = useState<"add" | "cut">("add")
  const foods = foodTab === "add" ? rec.addMore : rec.cutOut
  const hasFoods = (rec.addMore?.length || 0) + (rec.cutOut?.length || 0) > 0
  const meta = typeMeta[rec.type]
  const TypeIcon = meta.icon

  return (
    <article className="overflow-hidden rounded-2xl border border-[#f0f3f5] bg-[#ffffff] shadow-sm">
      <div className="flex items-start gap-3 border-b border-[#f0f3f5] p-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.tile}`} aria-hidden="true">
          <TypeIcon className="h-5 w-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}
          >
            {rec.type}
          </span>
          <h3 className="text-pretty text-sm font-semibold leading-snug text-[#2e3742]">{rec.title}</h3>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {rec.parameters.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#9dabbd]">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              Linked parameters
            </p>
            <ul className="flex flex-wrap gap-2" aria-label="Linked parameters">
              {rec.parameters.map((p) => (
                <li
                  key={p.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#f0f3f5] bg-[#f7f9fa] px-2.5 py-1 text-[11px] text-[#2e3742]"
                >
                  <span className="h-2 w-2 rounded-full bg-[#de3d31]" aria-hidden="true" />
                  {p.name}
                  {p.value && <span className="text-[#4d5c6f]">{`· ${p.value}${p.unit ? ` ${p.unit}` : ""}`}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className={`text-xs leading-relaxed text-[#4d5c6f] ${expanded ? "" : "line-clamp-3"}`}>
            {rec.description}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-[#156ddc] hover:underline"
          >
            {expanded ? "Read less" : "Read more"}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {!compact && hasFoods && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 rounded-full border border-[#f0f3f5] bg-[#f7f9fa] p-1" role="tablist">
              {(["add", "cut"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={foodTab === t}
                  onClick={() => setFoodTab(t)}
                  className={`inline-flex items-center justify-center gap-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${
                    foodTab === t ? "bg-[#2e3742] text-[#ffffff]" : "text-[#4d5c6f]"
                  }`}
                >
                  {t === "add" ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  {t === "add" ? "Add More" : "Cut Out"}
                </button>
              ))}
            </div>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {(foods || []).map((f) => {
                const FoodIcon = pickIcon(f, foodIcons, foodTab === "add" ? Leaf : Ban)
                const isAdd = foodTab === "add"
                return (
                  <li key={f} className="flex flex-col items-center gap-1.5 text-center">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${
                        isAdd ? "bg-[#edf7ee] text-[#459f49]" : "bg-[#fef0f0] text-[#de3d31]"
                      }`}
                      aria-hidden="true"
                    >
                      <FoodIcon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] leading-tight text-[#2e3742]">{f}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {(rec.frequency || rec.duration) && (
          <dl className="grid grid-cols-2 gap-2">
            {rec.frequency && (
              <div className="flex items-center gap-2 rounded-xl bg-[#f7f9fa] p-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f2ff] text-[#156ddc]">
                  <Repeat className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-[11px] text-[#9dabbd]">Frequency</dt>
                  <dd className="text-sm font-semibold text-[#2e3742]">{rec.frequency}</dd>
                </div>
              </div>
            )}
            {rec.duration && (
              <div className="flex items-center gap-2 rounded-xl bg-[#f7f9fa] p-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f2ff] text-[#156ddc]">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-[11px] text-[#9dabbd]">Duration</dt>
                  <dd className="text-sm font-semibold text-[#2e3742]">{rec.duration}</dd>
                </div>
              </div>
            )}
          </dl>
        )}

        {!compact && rec.activities && rec.activities.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {rec.activities.map((a) => {
              const ActivityIcon = pickIcon(a, activityIcons, Activity)
              return (
                <li key={a} className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f2ff] text-[#156ddc]"
                    aria-hidden="true"
                  >
                    <ActivityIcon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] leading-tight text-[#2e3742]">{a}</span>
                </li>
              )
            })}
          </ul>
        )}

        {!compact && serviceLinks && rec.services && rec.services.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-[#f0f3f5] pt-3">
            <p className="text-[11px] font-medium text-[#9dabbd]">Take the next step</p>
            <div className="flex flex-wrap gap-2">
              {rec.services.map((key) => {
                const service = serviceLinks[key]
                return (
                  <a
                    key={key}
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault()
                      onServiceClick?.(service)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#e8f2ff] bg-[#e8f2ff] px-3 py-1.5 text-xs font-medium text-[#156ddc] transition-colors hover:border-[#156ddc]"
                  >
                    {service.icon}
                    {service.label}
                    <ArrowUpRight className="h-3 w-3 opacity-70" />
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
