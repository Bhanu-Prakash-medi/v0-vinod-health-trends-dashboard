"use client"

import { useState } from "react"
import { ArrowUpRight, Clock, Repeat, Check, X } from "lucide-react"
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

const typeStyles: Record<DetailedRecommendation["type"], string> = {
  Diet: "bg-[#8a2c4f] text-[#ffffff]",
  Lifestyle: "bg-[#8a2c4f] text-[#ffffff]",
  Checkup: "bg-[#2e3742] text-[#ffffff]",
}

export default function RecommendationCard({ rec, compact, serviceLinks, onServiceClick }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [foodTab, setFoodTab] = useState<"add" | "cut">("add")
  const foods = foodTab === "add" ? rec.addMore : rec.cutOut
  const hasFoods = (rec.addMore?.length || 0) + (rec.cutOut?.length || 0) > 0

  return (
    <article className="overflow-hidden rounded-2xl border border-[#f0f3f5] bg-[#ffffff] shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[#f0f3f5] p-4">
        <span className={`w-fit rounded-md px-2 py-0.5 text-[11px] font-semibold ${typeStyles[rec.type]}`}>
          {rec.type}
        </span>
        <h3 className="text-pretty text-sm font-semibold leading-snug text-[#2e3742]">{rec.title}</h3>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {rec.parameters.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Linked parameters">
            {rec.parameters.map((p) => (
              <li
                key={p.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#f0f3f5] bg-[#f8fafb] px-2.5 py-1 text-[11px] text-[#2e3742]"
              >
                <span className="h-2 w-2 rounded-sm bg-[#e5484d]" aria-hidden="true" />
                {p.name}
                {p.value && <span className="text-[#5a6977]">{`· ${p.value}${p.unit ? ` ${p.unit}` : ""}`}</span>}
              </li>
            ))}
          </ul>
        )}

        <div>
          <p className={`text-xs leading-relaxed text-[#5a6977] ${expanded ? "" : "line-clamp-3"}`}>
            {rec.description}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs font-semibold text-[#2e3742] hover:underline"
          >
            {expanded ? "Read less" : "Read more"}
          </button>
        </div>

        {!compact && hasFoods && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 rounded-full border border-[#f0f3f5] p-1" role="tablist">
              {(["add", "cut"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={foodTab === t}
                  onClick={() => setFoodTab(t)}
                  className={`rounded-full py-1.5 text-xs font-semibold transition-colors ${
                    foodTab === t ? "bg-[#2e3742] text-[#ffffff]" : "text-[#5a6977]"
                  }`}
                >
                  {t === "add" ? "Add More" : "Cut Out"}
                </button>
              ))}
            </div>
            <ul className="flex flex-wrap gap-2">
              {(foods || []).map((f) => (
                <li
                  key={f}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs ${
                    foodTab === "add" ? "bg-[#eaf7ef] text-[#1f7a45]" : "bg-[#fdeeee] text-[#b4232a]"
                  }`}
                >
                  {foodTab === "add" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(rec.frequency || rec.duration) && (
          <dl className="grid grid-cols-2 gap-3">
            {rec.frequency && (
              <div>
                <dt className="flex items-center gap-1 text-[11px] text-[#9dabbd]">
                  <Repeat className="h-3 w-3" /> Frequency
                </dt>
                <dd className="text-sm font-semibold text-[#2e3742]">{rec.frequency}</dd>
              </div>
            )}
            {rec.duration && (
              <div>
                <dt className="flex items-center gap-1 text-[11px] text-[#9dabbd]">
                  <Clock className="h-3 w-3" /> Duration
                </dt>
                <dd className="text-sm font-semibold text-[#2e3742]">{rec.duration}</dd>
              </div>
            )}
          </dl>
        )}

        {!compact && rec.activities && rec.activities.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {rec.activities.map((a) => (
              <li key={a} className="rounded-lg bg-[#f2f8ff] px-2.5 py-1.5 text-xs text-[#156ddc]">
                {a}
              </li>
            ))}
          </ul>
        )}

        {!compact && serviceLinks && rec.services && rec.services.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-[#f0f3f5] pt-3">
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d5e6fb] bg-[#f2f8ff] px-3 py-1.5 text-xs font-medium text-[#156ddc] transition-colors hover:bg-[#e3f0ff]"
                >
                  {service.icon}
                  {service.label}
                  <ArrowUpRight className="h-3 w-3 opacity-70" />
                </a>
              )
            })}
          </div>
        )}
      </div>
    </article>
  )
}
