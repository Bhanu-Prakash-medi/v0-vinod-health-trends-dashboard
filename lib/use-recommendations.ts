"use client"

import useSWR from "swr"
import { useMemo } from "react"
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Bean,
  Bone,
  Brain,
  Droplet,
  FlaskConical,
  Flame,
  HeartPulse,
  Stethoscope,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react"
import type { ApiHealthReport } from "@/lib/api"
import { DEBUG_ACCESS_TOKEN, getAccessTokenFromCookie } from "@/lib/api"
import { fetchRecommendations, type RecParameter } from "@/lib/recommendations-api"
import { FALLBACK_RECOMMENDATIONS } from "@/lib/fallback-recommendations"

export function paramKey(p: RecParameter) {
  return p.id || p.parameter
}

export function useRecommendations(patientData: ApiHealthReport | null | undefined) {
  const source = patientData?.recommendationSource
  const accessToken = useMemo(() => getAccessTokenFromCookie() || DEBUG_ACCESS_TOKEN || "", [])

  const swrKey =
    source && accessToken
      ? ["recommendations", source.id, source.report_data.rVasBenefId, source.report_data.fullfilmentDate]
      : null

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    () =>
      fetchRecommendations(accessToken, source!).catch((err) => {
        console.error("Recommendations API failed, showing fallback:", err)
        return FALLBACK_RECOMMENDATIONS
      }),
    {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  })

  const priority = useMemo(() => (data?.top_recommendations || []).slice(0, 4), [data])

  const allParams = useMemo(() => {
    const seen = new Set<string>()
    const list: RecParameter[] = []
    for (const organ of data?.organs || []) {
      for (const p of organ.parameters || []) {
        const key = paramKey(p)
        if (seen.has(key)) continue
        seen.add(key)
        list.push({ ...p, organ: p.organ || organ.organ })
      }
    }
    return list
  }, [data])

  return {
    enabled: Boolean(swrKey),
    reportDate: source?.report_data.fullfilmentDate,
    data,
    error,
    isLoading,
    retry: () => mutate(),
    priority,
    allParams,
  }
}

export function organIcon(organ = ""): LucideIcon {
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

export function statusTone(status = "") {
  const s = status.toLowerCase()
  if (s === "high") return { label: "High", Icon: ArrowUp, pill: "bg-[#fdecec] text-[#c93838]", dot: "bg-[#c93838]" }
  if (s === "low") return { label: "Low", Icon: ArrowDown, pill: "bg-[#fff4e5] text-[#b8650a]", dot: "bg-[#b8650a]" }
  return {
    label: status ? status[0].toUpperCase() + status.slice(1) : "",
    Icon: null,
    pill: "bg-[#f0f3f5] text-[#4d5c6f]",
    dot: "bg-[#9dabbd]",
  }
}

export function actionTip(p: RecParameter) {
  return (
    p.recommendations?.lifestyle?.[0]?.change ||
    p.recommendations?.diet?.include?.[0]?.food ||
    p.explanation?.what_it_means ||
    ""
  )
}

export function formatReportDate(date?: string) {
  if (!date) return ""
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function reasonFor(p: RecParameter) {
  return p.explanation?.your_result || p.explanation?.what_it_means || p.explanation?.why_it_happens || ""
}
