"use client"

import { TrendingUp, ChevronRight } from "lucide-react"
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts"
import TrendCardHeader from "@/components/trend-card-header"
import { getTrendData, hasValidRange } from "@/lib/health-utils"
import { trackHealthTrendsEvent } from "@/lib/snowplow"
import { getParameterPriority } from "@/lib/parameterPriority"
import {
  getParameterBand,
  getParameterBandInfo,
  getParameterReferenceLines,
  getParameterNormalRange,
  getParameterPointColor,
} from "@/lib/parameter-bands"

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

    // Map the FULL sorted list (not just the first 3) so that single-point or
    // range-less metrics can be filtered out below before we pick the top 3.
    // Slicing to 3 first let single-reading abnormal params (e.g. HDL/LDL with
    // one measurement) occupy all slots and then get dropped, hiding the many
    // valid multi-point trends further down the list.
    displayedTrends = sortedTrends.map((item: any) => {
      const dataPoints = item.data_points || []

      // Sort data chronologically first to find the latest and previous values
      const sortedData = [...dataPoints]
        .map((dp: any) => ({
          timestamp: parseDate(dp.date).getTime(),
          dateStr: dp.date,
          value: dp.value,
        }))
        .sort((a, b) => a.timestamp - b.timestamp)

      // Latest value is the last item after sorting chronologically
      const currentValue = sortedData.length > 0 ? sortedData[sortedData.length - 1].value : 0
      const previousValue = sortedData.length > 1 ? sortedData[sortedData.length - 2].value : currentValue

      const unit = dataPoints.length > 0 ? dataPoints[0].unit || "" : ""

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

  // A trend is only meaningful with more than one data point over time. Drop any
  // metric that has a single reading so we never render a "trend" with one point.
  // Also drop any metric that has no normal/reference range so parameters
  // without a range never appear here (consistent with every other section).
  displayedTrends = displayedTrends
    .filter((trend) => Array.isArray(trend.data) && trend.data.length > 1 && hasValidRange(trend.range))
    // Preview shows at most 3 trends; pick them AFTER filtering so we surface
    // the top valid multi-point trends rather than dropped single-point ones.
    .slice(0, 3)

  // If nothing has more than one data point, hide the Health Trends section.
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
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#156ddc] text-primary-foreground shadow-[0_6px_16px_-6px_rgba(21,109,220,0.6)]">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="truncate text-base font-semibold leading-tight text-[#1d2733]">Health Trends</h2>
            <p className="text-pretty text-xs leading-snug text-[#7d8a98]">How your key markers moved</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            trackHealthTrendsEvent("Trends Graphs - See All", vasbenefId)
            onViewAll?.()
          }}
          className="flex shrink-0 items-center gap-0.5 rounded-full border border-[#dbe6f5] bg-card px-3 py-1.5 text-xs font-semibold text-[#156ddc] transition-colors hover:bg-[#eef4fd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40"
        >
          See all
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </header>

      <div className="flex flex-col gap-3">
        {displayedTrends.map((trend, trendIndex) => {
          const rangeData = parseRange(trend.range)
          const gender = patientData?.patient_info?.gender

          // Custom band for the 7 listed parameters (color + granular label).
          const band = getParameterBand(trend.name, Number.parseFloat(String(trend.current)), gender)

          // Multi-range (custom-band) parameter? If so, use the clinical bands
          // for the reference lines, the displayed range text, and per-point
          // colors — instead of the raw lab range string, which is wrong for
          // these (e.g. HbA1c healthy is ≤5.6, not "4.0-5.6").
          const isBandParam = !!getParameterBandInfo(trend.name, gender)
          const bandRefLines = isBandParam ? getParameterReferenceLines(trend.name, gender) : null
          const displayRange = (isBandParam ? getParameterNormalRange(trend.name, gender) : null) || trend.range
          const referenceColor = "#2f9a48"

          // Color for a single reading: band color for band params, else
          // green/red based on whether the value sits inside the numeric range.
          const colorForValue = (value: number): string => {
            if (isBandParam) {
              const c = getParameterPointColor(trend.name, value, gender)
              if (c) return c
            }
            if (rangeData?.type === "range" && rangeData.min != null && rangeData.max != null) {
              return value >= rangeData.min && value <= rangeData.max ? "#2f9a48" : "#d93026"
            }
            if (rangeData?.type === "max" && rangeData.max != null) {
              return value <= rangeData.max ? "#2f9a48" : "#d93026"
            }
            if (rangeData?.type === "min" && rangeData.min != null) {
              return value >= rangeData.min ? "#2f9a48" : "#d93026"
            }
            return trend.status === "normal" ? "#2f9a48" : "#d93026"
          }

          // Build an x-axis gradient so the line color transitions through each
          // point's range color (reflecting how the reading moved between bands).
          // Include the row index so the SVG gradient id is unique even when two
          // trends happen to share the same parameter name (which would also
          // otherwise trigger a duplicate React key below).
          const gradientId = `trend-grad-${String(trend.name).replace(/[^a-zA-Z0-9]/g, "-")}-${trendIndex}`
          const nPoints = trend.data.length
          const gradientStops = trend.data.map((d: any, i: number) => ({
            offset: nPoints > 1 ? (i / (nPoints - 1)) * 100 : 0,
            color: colorForValue(Number.parseFloat(String(d.value))),
          }))
          const lineColor = colorForValue(Number.parseFloat(String(trend.current)))
          // Badge status derived from the SAME range check that colors the value
          // and chart points, so the badge never contradicts the line color.
          const currentIsNormal = colorForValue(Number.parseFloat(String(trend.current))) === "#2f9a48"

          return (
            <article
              key={`${trend.name}-${trendIndex}`}
              className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-[#e8edf3] bg-card p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)]"
            >
              <TrendCardHeader
                name={trend.name}
                gender={patientData?.patient_info?.gender}
                current={trend.current}
                unit={trend.unit}
                displayRange={displayRange}
                accent={band?.color ?? lineColor}
                label={band?.shortLabel ?? (currentIsNormal ? "Normal" : "Out of range")}
                changePercent={trend.changePercent}
                readings={trend.data.length}
              />

              {trend.data && trend.data.length > 0 && (
                <div className="-mx-1 h-36 w-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trend.data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                          {gradientStops.map((s, i) => (
                            <stop key={i} offset={`${s.offset}%`} stopColor={s.color} />
                          ))}
                        </linearGradient>
                        <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
                          <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#eef2f6" vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        tick={{ fontSize: 10, fill: "#98a3b0" }}
                        axisLine={false}
                        tickLine={false}
                        dy={6}
                        padding={{ left: 16, right: 16 }}
                        tickFormatter={formatDate}
                        scale="time"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#98a3b0" }}
                        axisLine={false}
                        tickLine={false}
                        domain={["auto", "auto"]}
                        tickFormatter={(value) => Number(value).toFixed(value >= 100 ? 0 : 1)}
                        width={40}
                      />
                      {!bandRefLines && rangeData?.type === "range" && (
                        <ReferenceArea y1={rangeData.min} y2={rangeData.max} fill="#22b864" fillOpacity={0.06} />
                      )}
                      <Area type="monotone" dataKey="value" stroke="none" fill={`url(#${gradientId}-fill)`} />
                      {bandRefLines ? (
                        // Multi-range parameter: reference lines at the clinical
                        // healthy-band bounds (direction-aware).
                        bandRefLines.map((line) => (
                          <ReferenceLine
                            key={`${line.label}-${line.value}`}
                            y={line.value}
                            stroke={referenceColor}
                            strokeDasharray="4 4"
                            strokeWidth={1}
                          />
                        ))
                      ) : (
                        <>
                          {rangeData?.type === "range" && (
                            <>
                              <ReferenceLine
                                y={rangeData.min}
                                stroke={referenceColor}
                                strokeDasharray="4 4" strokeOpacity={0.55}
                                strokeWidth={1}
                              />
                              <ReferenceLine
                                y={rangeData.max}
                                stroke={referenceColor}
                                strokeDasharray="4 4" strokeOpacity={0.55}
                                strokeWidth={1}
                              />
                            </>
                          )}
                          {rangeData?.type === "max" && rangeData.max && (
                            <ReferenceLine
                              y={rangeData.max}
                              stroke={referenceColor}
                              strokeDasharray="4 4" strokeOpacity={0.55}
                              strokeWidth={1}
                            />
                          )}
                          {rangeData?.type === "min" && rangeData.min && (
                            <ReferenceLine
                              y={rangeData.min}
                              stroke={referenceColor}
                              strokeDasharray="4 4" strokeOpacity={0.55}
                              strokeWidth={1}
                            />
                          )}
                        </>
                      )}
                      <Tooltip
                        cursor={{ stroke: "#d7dee7", strokeWidth: 1 }}
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "none",
                          borderRadius: "12px",
                          boxShadow: "0 8px 24px -8px rgba(16,24,40,0.25)",
                          fontSize: "12px",
                          padding: "8px 12px",
                        }}
                        labelStyle={{ color: "#98a3b0", fontSize: "11px" }}
                        formatter={(value: number) => [`${value} ${trend.unit}`, trend.name]}
                        labelFormatter={(timestamp) => formatDate(timestamp as number)}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={`url(#${gradientId})`}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        dot={(props: any) => {
                          const { cx, cy, payload, index } = props
                          const c = colorForValue(Number.parseFloat(String(payload.value)))
                          const isLatest = index === trend.data.length - 1
                          return (
                            <g key={`dot-${index}`}>
                              {isLatest && <circle cx={cx} cy={cy} r={8} fill={c} fillOpacity={0.16} />}
                              <circle cx={cx} cy={cy} r={isLatest ? 4.5 : 3.5} fill={c} stroke="#fff" strokeWidth={2} />
                            </g>
                          )
                        }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff", fill: lineColor }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
