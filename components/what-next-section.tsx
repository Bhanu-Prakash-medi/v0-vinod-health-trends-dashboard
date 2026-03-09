"use client"

import { Stethoscope, FlaskConical, TrendingUp, CalendarCheck, ShieldCheck, ChevronRight } from "lucide-react"
import type { ApiHealthReport } from "@/lib/api"

interface Recommendation {
  id: string
  type: "consult" | "retest" | "monitor" | "checkup" | "healthy"
  title: string
  subtitle: string
  cta: string
  icon: React.ReactNode
  accentColor: string
  bgColor: string
  ctaColor: string
}

function parseReportDate(dateStr: string): Date | null {
  if (!dateStr) return null
  // Handle DD-MM-YYYY format
  const parts = dateStr.split("-")
  if (parts.length === 3) {
    const [day, month, year] = parts
    const d = new Date(`${year}-${month}-${day}`)
    if (!isNaN(d.getTime())) return d
  }
  // Fallback
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

function generateRecommendations(patientData: ApiHealthReport): Recommendation[] {
  const recommendations: Recommendation[] = []
  const healthSummary = patientData.health_summary || []
  const trendAnalysis = patientData.trend_analysis || []
  const labReports = patientData.lab_reports || []

  // 1. Check for abnormal categories -> Consult a Doctor
  const abnormalCategories: { name: string; count: number }[] = []
  for (const category of healthSummary) {
    const params = category.parameters || []
    const outOfRange = params.filter((p) => {
      const status = (p.status || "normal").toLowerCase()
      return status !== "normal" && status !== "in range" && status !== "in_range" && status !== "within normal limits"
    })
    if (outOfRange.length > 0) {
      abnormalCategories.push({
        name: category.category || "Unknown",
        count: outOfRange.length,
      })
    }
  }

  if (abnormalCategories.length > 0) {
    const totalAbnormal = abnormalCategories.reduce((sum, c) => sum + c.count, 0)
    const topCategories = abnormalCategories
      .sort((a, b) => b.count - a.count)
      .slice(0, 2)
      .map((c) => c.name)

    recommendations.push({
      id: "consult",
      type: "consult",
      title: "Consult a Doctor",
      subtitle: `${totalAbnormal} parameter${totalAbnormal > 1 ? "s" : ""} need${totalAbnormal === 1 ? "s" : ""} attention in ${topCategories.join(" & ")}`,
      cta: "Consult Now",
      icon: <Stethoscope className="h-5 w-5" />,
      accentColor: "border-l-[#dc2626]",
      bgColor: "bg-red-50",
      ctaColor: "text-[#dc2626]",
    })
  }

  // 2. Check if latest report is > 90 days old -> Retest
  let latestReportDate: Date | null = null
  if (labReports.length > 0) {
    const latestReport = labReports.find(
      (r) => r.tag?.toLowerCase().includes("latest")
    )
    if (latestReport) {
      latestReportDate = parseReportDate(latestReport.report_date || latestReport.date || "")
    }
  }
  if (!latestReportDate && patientData.reports?.length > 0) {
    latestReportDate = parseReportDate(
      patientData.reports[0]?.fullfilmentDate || patientData.reports[0]?.date || ""
    )
  }

  if (latestReportDate) {
    const daysSinceReport = Math.floor(
      (Date.now() - latestReportDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceReport > 90) {
      const months = Math.floor(daysSinceReport / 30)
      recommendations.push({
        id: "retest",
        type: "retest",
        title: "Time to Retest",
        subtitle: `Your last test was ${months} month${months > 1 ? "s" : ""} ago. Stay on top of your health.`,
        cta: "Book Test",
        icon: <FlaskConical className="h-5 w-5" />,
        accentColor: "border-l-[#d97706]",
        bgColor: "bg-amber-50",
        ctaColor: "text-[#d97706]",
      })
    }
  }

  // 3. Check for worsening trends -> Monitor
  const worseningTrends: string[] = []
  for (const trend of trendAnalysis) {
    const status = (trend.status || "").toLowerCase()
    const trendDir = (trend.trend || "").toLowerCase()
    if (
      (status === "abnormal" || status === "high" || status === "low") &&
      (trendDir === "increasing" || trendDir === "decreasing" || trendDir === "rising" || trendDir === "worsening")
    ) {
      worseningTrends.push(trend.metric_name || trend.name || "Unknown")
    }
  }

  if (worseningTrends.length > 0) {
    const topTrends = worseningTrends.slice(0, 2).join(" & ")
    recommendations.push({
      id: "monitor",
      type: "monitor",
      title: "Monitor Closely",
      subtitle: `${topTrends} ${worseningTrends.length > 1 ? "are" : "is"} trending in the wrong direction`,
      cta: "View Trend",
      icon: <TrendingUp className="h-5 w-5" />,
      accentColor: "border-l-[#156ddc]",
      bgColor: "bg-blue-50",
      ctaColor: "text-[#156ddc]",
    })
  }

  // 4. Always add "Book a Full Checkup" as last card (upsell)
  recommendations.push({
    id: "checkup",
    type: "checkup",
    title: "Book a Full Checkup",
    subtitle: "Stay proactive with a comprehensive health screening",
    cta: "Book Now",
    icon: <CalendarCheck className="h-5 w-5" />,
    accentColor: "border-l-[#8c176d]",
    bgColor: "bg-[#fef0fa]",
    ctaColor: "text-[#8c176d]",
  })

  // 5. If no issues found (only the checkup card), add a positive card at the start
  if (recommendations.length === 1) {
    recommendations.unshift({
      id: "healthy",
      type: "healthy",
      title: "Looking Good!",
      subtitle: "All parameters are in range. Keep up the healthy lifestyle.",
      cta: "View Summary",
      icon: <ShieldCheck className="h-5 w-5" />,
      accentColor: "border-l-[#16a34a]",
      bgColor: "bg-green-50",
      ctaColor: "text-[#16a34a]",
    })
  }

  return recommendations
}

export default function WhatNextSection({ patientData }: { patientData: ApiHealthReport }) {
  const recommendations = generateRecommendations(patientData)

  if (recommendations.length === 0) return null

  return (
    <section>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center">
          <svg className="h-5 w-5 text-[#000000]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#2e3742]">Recommended For You</h2>
          <p className="text-xs text-[#9dabbd]">Based on your latest reports</p>
        </div>
      </div>

      {/* Horizontally scrollable cards */}
      <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`flex min-w-[260px] max-w-[280px] snap-start flex-col justify-between rounded-xl border border-[#f0f3f5] border-l-4 ${rec.accentColor} p-4 shadow-sm`}
          >
            <div>
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${rec.bgColor}`}>
                <span className={rec.ctaColor}>{rec.icon}</span>
              </div>
              <h3 className="text-sm font-semibold text-[#2e3742]">{rec.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#5a6977]">{rec.subtitle}</p>
            </div>
            <button
              className={`mt-3 flex items-center gap-1 text-xs font-semibold ${rec.ctaColor}`}
            >
              {rec.cta}
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
