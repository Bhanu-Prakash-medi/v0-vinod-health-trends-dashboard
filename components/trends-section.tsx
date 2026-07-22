"use client"

import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { getTrendData } from "@/lib/health-utils"
import { trackHealthTrendsEvent } from "@/lib/snowplow"
import { getParameterPriority } from "@/lib/parameterPriority"

interface TrendsSectionProps {
  onViewAll?: () => void
  patientData: any
  vasbenefId?: string | number
}

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

export default function TrendsSection({ onViewAll, patientData, vasbenefId }: TrendsSectionProps) {
  const trendAnalysisFromApi = patientData?.trend_analysis || []

  let displayedTrends: any[] = []

  if (trendAnalysisFromApi.length > 0) {
    // Sort: abnormal/out-of-range trends come first
    const sortedTrends = [...trendAnalysisFromApi].sort((a: any, b: any) => {
      const aIsAbnormal = a.status?.toLowerCase() !== "normal" && a.status?.toLowerCase() !== "in range"
      const bIsAbnormal = b.status?.toLowerCase() !== "normal" && b.status?.toLowerCase() !== "in range"
      if (aIsAbnormal && !bIsAbnormal) return -1
      if (!aIsAbnormal && bIsAbnormal) return 1
      // Then order commonly known parameters first for non-medical users
      return getParameterPriority(a.metric_name) - getParameterPriority(b.metric_name)
    })

    displayedTrends = sortedTrends.slice(0, 3).map((item: any) => {
      const dataPoints = item.data_points || []

      const unit = dataPoints.length > 0 ? dataPoints[0].unit || "" : ""
      const currentValue = dataPoints.length > 0 ? dataPoints[0].value : 0
      const previousValue = dataPoints.length > 1 ? dataPoints[1].value : currentValue

      const sortedData = [...dataPoints]
        .map((dp: any) => ({
          timestamp: parseDate(dp.date).getTime(),
          dateStr: dp.date,
          value: dp.value,
        }))
        .sort((a, b) => a.timestamp - b.timestamp)

      return {
        name: item.metric_name,
        current: currentValue,
        previous: previousValue,
        unit: unit,
        range: item.normal_range,
        change: currentValue - previousValue,
        changePercent: previousValue ? ((currentValue - previousValue) / previousValue) * 100 : 0,
        status:
          item.status?.toLowerCase() === "normal" || item.status?.toLowerCase() === "in range" ? "normal" : "abnormal",
        trend: item.trend,
        data: sortedData,
      }
    })
  } else {
    // Fallback to old logic
    const allTrends = getTrendData(patientData)
    displayedTrends = allTrends.slice(0, 3)
  }

  if (displayedTrends.length === 0) {
    return null
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
    <section>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-[#000000]" />
          <h2 className="text-base font-semibold text-[#2e3742]">Health Trends</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            trackHealthTrendsEvent("Trends Graphs - See All", vasbenefId)
            onViewAll?.()
          }}
          className="flex items-center gap-1 text-xs font-medium text-[#156ddc] hover:bg-transparent hover:text-[#156ddc]/80"
        >
          See All
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Trend Cards - Original Design */}
      <div className="space-y-3">
        {displayedTrends.map((trend) => {
          const isImproving = trend.change < 0 && trend.status === "abnormal"
          const isWorsening = trend.change > 0 && trend.status === "abnormal"
          const isStable = Math.abs(trend.changePercent) < 5
          const rangeData = parseRange(trend.range)

          const lineColor = trend.status === "normal" ? "#2f9a48" : "#d93026"
          const referenceColor = "#2f9a48"

          return (
            <Card key={trend.name} className="border border-[#f0f3f5] p-4 shadow-sm transition-shadow hover:shadow-md">
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
                  <p className="mt-0.5 text-xs text-[#9dabbd]">Normal Range: {trend.range}</p>
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
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend.data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickLine={{ stroke: "#e5e7eb" }}
                        dy={10}
                        padding={{ left: 20, right: 20 }}
                        tickFormatter={formatDate}
                        scale="time"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickLine={{ stroke: "#e5e7eb" }}
                        domain={["auto", "auto"]}
                        tickFormatter={(value) => value.toFixed(1)}
                        width={40}
                      />
                      {rangeData?.type === "range" && (
                        <>
                          <ReferenceLine
                            y={rangeData.min}
                            stroke={referenceColor}
                            strokeDasharray="5 5"
                            strokeWidth={1}
                          />
                          <ReferenceLine
                            y={rangeData.max}
                            stroke={referenceColor}
                            strokeDasharray="5 5"
                            strokeWidth={1}
                          />
                        </>
                      )}
                      {rangeData?.type === "max" && rangeData.max && (
                        <ReferenceLine
                          y={rangeData.max}
                          stroke={referenceColor}
                          strokeDasharray="5 5"
                          strokeWidth={1}
                        />
                      )}
                      {rangeData?.type === "min" && rangeData.min && (
                        <ReferenceLine
                          y={rangeData.min}
                          stroke={referenceColor}
                          strokeDasharray="5 5"
                          strokeWidth={1}
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
                        strokeWidth={2}
                        dot={{
                          fill: "#fff",
                          stroke: lineColor,
                          strokeWidth: 2,
                          r: 4,
                        }}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </section>
  )
}
