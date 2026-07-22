"use client"

import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { getTrendData } from "@/lib/health-utils"
import type { ApiHealthReport } from "@/lib/api"
import { getParameterPriority } from "@/lib/parameterPriority"

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

export default function AllTrendsPage({ onBack, patientData }: { onBack: () => void; patientData: ApiHealthReport }) {
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

  return (
    <div className="min-h-screen bg-[#f7f9fa]">
      <div className="sticky top-0 z-10 border-b border-[#e5e7eb] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
            <ArrowLeft className="h-5 w-5 text-[#2e3742]" />
          </Button>
          <h1 className="text-lg font-semibold text-[#2e3742]">
            All Health Trends <span className="text-[#9dabbd]">({allTrends.length})</span>
          </h1>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {allTrends.map((trend) => {
          const isImproving = trend.change < 0 && trend.status === "abnormal"
          const isWorsening = trend.change > 0 && trend.status === "abnormal"
          const isStable = Math.abs(trend.changePercent) < 5
          const rangeData = parseRange(trend.range)

          const lineColor = trend.status === "normal" ? "#2f9a48" : "#d93026"
          const referenceColor = "#2f9a48"

          return (
            <Card key={trend.name} className="border border-[#f0f3f5] p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-[#2e3742]">{trend.name}</h3>
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
                    <span className="text-lg font-bold text-[#2e3742]">
                      {trend.current} {trend.unit}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#9dabbd]">Range: {trend.range}</p>
                </div>
                <div
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    trend.status === "normal" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                  }`}
                >
                  {trend.status === "normal" ? "Normal" : "Abnormal"}
                </div>
              </div>

              {trend.data && trend.data.length > 0 && (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend.data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
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
                            label={{ value: "Max", position: "right", fill: referenceColor, fontSize: 10 }}
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
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
