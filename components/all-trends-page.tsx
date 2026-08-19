"use client"

import { ArrowLeft, TrendingUp, TrendingDown, Minus, Calendar, FileText, ChevronRight, Search, X, SearchX } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { getTrendData, hasValidRange } from "@/lib/health-utils"
import type { ApiHealthReport } from "@/lib/api"
import { getParameterPriority } from "@/lib/parameterPriority"
import BiomarkerInfoButton from "@/components/biomarker-info-button"
import { getParameterBand } from "@/lib/parameter-bands"

// Helper function to parse dates from various formats
const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date()

  // Try DD-MM-YYYY format
  if (dateStr.includes("-") && dateStr.split("-")[0].length <= 2) {
    const [day, month, year] = dateStr.split("-")
    return new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
  }

  // Try YYYY-MM-DD format or other ISO formats
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

  return new Date()
}

// Helper function to format date for display
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear().toString().slice(-2)
  return `${day}-${month}-${year}`
}

// Normalize various date string formats to a comparable YYYY-MM-DD key
const normalizeDateKey = (dateStr: string): string | null => {
  if (!dateStr) return null
  const cleaned = dateStr.trim().replace(/\//g, "-")
  const parts = cleaned.split("-")
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const [y, m, d] = parts
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
    }
    const [d, m, y] = parts
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  const dt = new Date(dateStr)
  if (!isNaN(dt.getTime())) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
  }
  return null
}

export default function AllTrendsPage({
  onBack,
  patientData,
  onViewReport,
}: {
  onBack: () => void
  patientData: ApiHealthReport
  onViewReport?: (date: string) => void
}) {
  const [selectedPoint, setSelectedPoint] = useState<{
    name: string
    dateStr: string
    value: number
    unit: string
    range: string
    status: "normal" | "abnormal"
    reportName: string | null
    reportDate: string | null
  } | null>(null)

  const [searchQuery, setSearchQuery] = useState("")

  const labReports = (patientData as any)?.lab_reports || []

  // Find the lab report whose date matches the given data-point date
  const findReportForDate = (dateStr: string): { name: string | null; date: string } | null => {
    const key = normalizeDateKey(dateStr)
    if (!key) return null
    for (const lr of labReports) {
      const reportDate = lr.report_date || lr.date || ""
      if (normalizeDateKey(reportDate) === key) {
        const names = Array.isArray(lr.report_name) ? lr.report_name : lr.report_name ? [lr.report_name] : []
        return { name: names[0] || lr.lab_name || "Lab Report", date: reportDate }
      }
    }
    return null
  }

  const trendAnalysisFromApi = patientData?.trend_analysis || []

  let allTrends: any[] = []

  if (trendAnalysisFromApi.length > 0) {
    // Sort: abnormal/out-of-range trends come first
    const sortedTrendAnalysis = [...trendAnalysisFromApi].sort((a: any, b: any) => {
      const aIsAbnormal = a.status?.toLowerCase() !== "normal" && a.status?.toLowerCase() !== "in range"
      const bIsAbnormal = b.status?.toLowerCase() !== "normal" && b.status?.toLowerCase() !== "in range"
      if (aIsAbnormal && !bIsAbnormal) return -1
      if (!aIsAbnormal && bIsAbnormal) return 1
      // Then order commonly known parameters first for non-medical users
      return getParameterPriority(a.metric_name) - getParameterPriority(b.metric_name)
    })

    // Use API trend_analysis data
    allTrends = sortedTrendAnalysis.map((item: any) => {
      const dataPoints = item.data_points || item.trends || []
      const unitFromDataPoints = dataPoints.length > 0 ? dataPoints[0].unit || "" : ""

      const sortedData = [...dataPoints]
        .map((dp: any) => ({
          timestamp: parseDate(dp.date || dp.test_date).getTime(),
          dateStr: dp.date || dp.test_date,
          value: dp.value,
        }))
        .sort((a, b) => a.timestamp - b.timestamp)

      return {
        name: item.metric_name,
        current: item.current_value,
        previous: item.previous_value,
        unit: unitFromDataPoints || item.unit || "",
        range: item.normal_range,
        change: item.current_value - item.previous_value,
        changePercent: item.previous_value
          ? ((item.current_value - item.previous_value) / item.previous_value) * 100
          : 0,
        status:
          item.status?.toLowerCase() === "normal" || item.status?.toLowerCase() === "in range" ? "normal" : "abnormal",
        trend: item.trend,
        data: sortedData,
      }
    })
  } else {
    // Fallback to old logic
    allTrends = getTrendData(patientData)
  }

  // Only keep parameters that form a real trend: more than one data point over
  // time (a single reading is not a trend) AND a numeric reference range.
  // Text-only ranges (e.g. "Normal", "Negative") are excluded from this section.
  allTrends = allTrends.filter(
    (trend: any) => Array.isArray(trend.data) && trend.data.length > 1 && hasValidRange(trend.range),
  )

  const parseRange = (rangeStr: string) => {
    if (!rangeStr) return null
    if (rangeStr.includes("-")) {
      const [min, max] = rangeStr.split("-").map((s) => Number.parseFloat(s.trim()))
      return { min, max, type: "range" }
    } else if (rangeStr.startsWith("<")) {
      const max = Number.parseFloat(rangeStr.replace("<", "").trim())
      return { max, type: "max" }
    } else if (rangeStr.startsWith(">")) {
      const min = Number.parseFloat(rangeStr.replace(">", "").trim())
      return { min, type: "min" }
    }
    return null
  }

  // Fuzzy, case-insensitive matching. A biomarker matches when the typed text
  // is either a direct substring OR an ordered subsequence of its name, so
  // partial/skipped letters still work (e.g. "thrxin" -> "Thyroxine").
  const isSubsequence = (query: string, target: string) => {
    let qi = 0
    for (let ti = 0; ti < target.length && qi < query.length; ti++) {
      if (target[ti] === query[qi]) qi++
    }
    return qi === query.length
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredTrends = normalizedQuery
    ? allTrends.filter((trend) => {
        const name = (trend.name || "").toLowerCase()
        return name.includes(normalizedQuery) || isSubsequence(normalizedQuery, name)
      })
    : allTrends

  return (
    <div className="min-h-screen bg-[#f7f9fa]">
      <div className="mx-auto max-w-[420px] bg-white sm:my-8 sm:rounded-2xl sm:shadow-lg">
        <div className="sticky top-0 z-10 rounded-t-2xl border-b border-[#e5e7eb] bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
              <ArrowLeft className="h-5 w-5 text-[#2e3742]" />
            </Button>
            <h1 className="text-lg font-semibold text-[#2e3742]">
              All Health Trends <span className="text-[#9dabbd]">({allTrends.length})</span>
            </h1>
          </div>

          {/* Biomarker search */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9dabbd]" />
            <input
              type="text"
              inputMode="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search biomarkers (e.g. cholesterol, HbA1c)"
              aria-label="Search biomarkers"
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f7f9fa] py-2.5 pl-9 pr-9 text-sm text-[#2e3742] placeholder:text-[#9dabbd] focus:border-[#156ddc] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#156ddc]/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#9dabbd] transition-colors hover:bg-[#eef1f4] hover:text-[#2e3742]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 p-4">
        {filteredTrends.map((trend) => {
          const isImproving = trend.change < 0 && trend.status === "abnormal"
          const isWorsening = trend.change > 0 && trend.status === "abnormal"
          const isStable = Math.abs(trend.changePercent) < 5
          const rangeData = parseRange(trend.range)

          const band = getParameterBand(
            trend.name,
            Number.parseFloat(String(trend.current)),
            patientData?.patient_info?.gender,
          )

          const lineColor = band ? band.color : trend.status === "normal" ? "#2f9a48" : "#d93026"
          const referenceColor = "#2f9a48"

          const getPointStatus = (value: number): "normal" | "abnormal" => {
            if (!rangeData) return trend.status
            if (rangeData.type === "range" && rangeData.min != null && rangeData.max != null) {
              return value >= rangeData.min && value <= rangeData.max ? "normal" : "abnormal"
            }
            if (rangeData.type === "max" && rangeData.max != null) {
              return value <= rangeData.max ? "normal" : "abnormal"
            }
            if (rangeData.type === "min" && rangeData.min != null) {
              return value >= rangeData.min ? "normal" : "abnormal"
            }
            return "normal"
          }

          const handleChartClick = (state: any) => {
            const point = state?.activePayload?.[0]?.payload
            if (!point || point.value == null) return
            const dateStr = point.dateStr || formatDate(point.timestamp)
            const matchedReport = findReportForDate(dateStr)
            setSelectedPoint({
              name: trend.name,
              dateStr,
              value: point.value,
              unit: trend.unit,
              range: trend.range,
              status: getPointStatus(point.value),
              reportName: matchedReport?.name ?? null,
              reportDate: matchedReport?.date ?? null,
            })
          }

          return (
            <Card key={trend.name} className="border border-[#f0f3f5] p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-[#2e3742]">{trend.name}</h3>
                    <BiomarkerInfoButton name={trend.name} gender={patientData?.patient_info?.gender} />
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        isImproving ? "bg-green-50" : isWorsening ? "bg-red-50" : isStable ? "bg-gray-50" : "bg-gray-50"
                      }`}
                    >
                      {isImproving ? (
                        <TrendingDown className="h-3.5 w-3.5 text-green-600" />
                      ) : isWorsening ? (
                        <TrendingUp className="h-3.5 w-3.5 text-red-600" />
                      ) : isStable ? (
                        <Minus className="h-3.5 w-3.5 text-gray-600" />
                      ) : trend.change > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-blue-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-lg font-bold ${band ? "" : "text-[#2e3742]"}`}
                      style={band ? { color: band.color } : undefined}
                    >
                      {trend.current} {trend.unit}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#9dabbd]">Range: {trend.range}</p>
                </div>
                {band ? (
                  <div
                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ color: band.color, backgroundColor: `${band.color}1A` }}
                  >
                    {band.shortLabel}
                  </div>
                ) : (
                  <div
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      trend.status === "normal" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {trend.status === "normal" ? "Normal" : "Abnormal"}
                  </div>
                )}
              </div>

              {trend.data && trend.data.length > 0 && (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trend.data}
                      margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                      onClick={handleChartClick}
                      style={{ cursor: "pointer" }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickLine={{ stroke: "#e5e7eb" }}
                        dy={10}
                        padding={{ left: 30, right: 30 }}
                        tickFormatter={formatDate}
                        scale="time"
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickLine={{ stroke: "#e5e7eb" }}
                        domain={["auto", "auto"]}
                        tickFormatter={(value) => value.toFixed(1)}
                        width={45}
                      />
                      {rangeData?.type === "range" && (
                        <>
                          <ReferenceLine
                            y={rangeData.min}
                            stroke={referenceColor}
                            strokeDasharray="5 5"
                            strokeWidth={1}
                            label={{ value: "Min", position: "right", fill: referenceColor, fontSize: 10 }}
                          />
                          <ReferenceLine
                            y={rangeData.max}
                            stroke={referenceColor}
                            strokeDasharray="5 5"
                            strokeWidth={1}
                            label={{ value: "Normal Limit", position: "right", fill: referenceColor, fontSize: 10 }}
                          />
                        </>
                      )}
                      {rangeData?.type === "max" && rangeData.max && (
                        <ReferenceLine
                          y={rangeData.max}
                          stroke={referenceColor}
                          strokeDasharray="5 5"
                          strokeWidth={1}
                          label={{ value: "Max", position: "right", fill: referenceColor, fontSize: 10 }}
                        />
                      )}
                      {rangeData?.type === "min" && rangeData.min && (
                        <ReferenceLine
                          y={rangeData.min}
                          stroke={referenceColor}
                          strokeDasharray="5 5"
                          strokeWidth={1}
                          label={{ value: "Min", position: "right", fill: referenceColor, fontSize: 10 }}
                        />
                      )}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "12px",
                          padding: "8px 12px",
                        }}
                        formatter={(value: number) => [`${value} ${trend.unit}`, trend.name]}
                        labelFormatter={(timestamp) => formatDate(timestamp as number)}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={lineColor}
                        strokeWidth={3}
                        dot={{
                          fill: "#fff",
                          stroke: lineColor,
                          strokeWidth: 3,
                          r: 6,
                        }}
                        activeDot={{ r: 8, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="mt-1 text-center text-[10px] text-[#9dabbd]">
                    Tap a point to view that date&apos;s reading
                  </p>
                </div>
              )}
            </Card>
          )
        })}

        {filteredTrends.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#eaf2fe] to-[#e6f7ee]">
              <SearchX className="h-9 w-9 text-[#156ddc]" />
            </div>
            <h3 className="text-base font-semibold text-[#2e3742]">No biomarkers found</h3>
            <p className="mt-1.5 max-w-[260px] text-pretty text-sm leading-relaxed text-[#9dabbd]">
              We couldn&apos;t find any trends matching{" "}
              <span className="font-medium text-[#4d5c6f]">&ldquo;{searchQuery.trim()}&rdquo;</span>. Try a different
              name like cholesterol, glucose, or vitamin.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="mt-5 rounded-full border-[#156ddc] text-[#156ddc] hover:bg-[#eaf2fe] hover:text-[#156ddc]"
            >
              Clear search
            </Button>
          </div>
        )}
        </div>
      </div>

      <Dialog open={!!selectedPoint} onOpenChange={(open) => !open && setSelectedPoint(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[340px] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-[#f0f3f5] px-4 py-3">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-semibold text-[#2e3742]">{selectedPoint?.name}</DialogTitle>
              <BiomarkerInfoButton name={selectedPoint?.name} gender={patientData?.patient_info?.gender} />
            </div>
          </DialogHeader>
          {selectedPoint && (() => {
            const pointBand = getParameterBand(
              selectedPoint.name,
              Number.parseFloat(String(selectedPoint.value)),
              patientData?.patient_info?.gender,
            )
            return (
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2 text-sm text-[#4d5c6f]">
                <Calendar className="h-4 w-4 text-[#9dabbd]" />
                {selectedPoint.dateStr}
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#f0f3f5] bg-[#fafbfc] p-3">
                <div className="min-w-0">
                  <p className="text-xs text-[#9dabbd]">Reading</p>
                  <p
                    className={`break-words text-xl font-bold ${
                      pointBand ? "" : selectedPoint.status === "abnormal" ? "text-[#de3d31]" : "text-[#459f49]"
                    }`}
                    style={pointBand ? { color: pointBand.color } : undefined}
                  >
                    {selectedPoint.value} {selectedPoint.unit}
                  </p>
                </div>
                {pointBand ? (
                  <span
                    className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ color: pointBand.color, backgroundColor: `${pointBand.color}1A` }}
                  >
                    {pointBand.shortLabel}
                  </span>
                ) : (
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                      selectedPoint.status === "abnormal" ? "bg-[#fef0f0] text-[#de3d31]" : "bg-[#edf7ee] text-[#459f49]"
                    }`}
                  >
                    {selectedPoint.status === "abnormal" ? "Abnormal" : "Normal"}
                  </span>
                )}
              </div>
              {selectedPoint.range && (
                <p className="text-xs text-[#9dabbd]">Normal range: {selectedPoint.range}</p>
              )}

              {selectedPoint.reportName ? (
                <div className="mt-1 rounded-lg border border-[#f0f3f5] bg-[#fafbfc] p-3">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#9dabbd]">From report</p>
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#156ddc]" />
                    <p className="min-w-0 break-words text-sm font-medium text-[#2e3742]">
                      {selectedPoint.reportName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedPoint.reportDate || selectedPoint.dateStr
                      setSelectedPoint(null)
                      onViewReport?.(target)
                    }}
                    className="mt-2 flex items-center gap-0.5 text-xs font-medium text-[#156ddc] transition-opacity hover:opacity-80"
                  >
                    View report
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#9dabbd]">No matching report found for this date.</p>
              )}
            </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
