"use client"

import { Grid3x3, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ApiHealthReport } from "@/lib/api"
import { trackHealthTrendsEvent } from "@/lib/snowplow"

function calculateDynamicPosition(result: number, range: string): number | null {
  if (!range || range.trim() === "") {
    return null // Invalid range - filter out
  }

  // Case 2: Handle "<=max" or "<max" format (mirror of >=min)
  const lessThanMatch = range.match(/(<=?)\s*(\d+\.?\d*)/)
  if (lessThanMatch) {
    const operator = lessThanMatch[1]
    const max = Number.parseFloat(lessThanMatch[2])
    
    if (isNaN(max)) {
      return null // Malformed - filter out
    }
    
    const isNormal = operator === "<=" ? result <= max : result < max
    
    if (isNormal) {
      // Normal - position in green zone (33-67%)
      // Calculate position based on how far below max
      if (max === 0) {
        return 67 // End of green zone when max = 0
      }
      const deficit = max - result
      const percentBelowMax = (deficit / max) * 100
      return Math.max(33, 67 - (percentBelowMax / 100) * 34)
    } else {
      // Abnormal - position in right red zone (67-100%)
      // Calculate how far above the threshold
      if (max === 0) {
        return 95 // Far right if somehow above 0
      }
      const excess = result - max
      const percentOfMax = (excess / max) * 100
      return Math.min(95, 67 + (percentOfMax / 100) * 28)
    }
  }

  // Case 1 & Case 5: Handle ">=min" or ">min" format
  const greaterThanMatch = range.match(/(>=?)\s*(\d+\.?\d*)/)
  if (greaterThanMatch) {
    const operator = greaterThanMatch[1]
    const min = Number.parseFloat(greaterThanMatch[2])
    
    if (isNaN(min)) {
      return null // Malformed - filter out
    }
    
    const isNormal = operator === ">=" ? result >= min : result > min
    
    if (isNormal) {
      // Normal - position in green zone (33-67%)
      // Special case: when min = 0, position at start of green zone
      if (min === 0) {
        return 33
      }
      // Calculate position based on how much above min
      const excess = result - min
      const percentAboveMin = (excess / min) * 100
      return Math.min(67, 33 + (percentAboveMin / 100) * 34)
    } else {
      // Abnormal - position in left red zone (0-33%)
      // Special case: when min = 0, this shouldn't happen (0 >= 0 is normal)
      if (min === 0) {
        return 5 // Far left if somehow negative
      }
      const deficit = min - result
      const percentOfMin = (deficit / min) * 100
      // Position from left: 5% at 0 value, 33% at threshold
      return Math.max(5, 33 - (percentOfMin / 100) * 28)
    }
  }

  // Case 3: Handle "min-max" format (e.g., "30-100")
  const rangeMatch = range.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/)
  if (rangeMatch) {
    const min = Number.parseFloat(rangeMatch[1])
    const max = Number.parseFloat(rangeMatch[2])
    
    if (isNaN(min) || isNaN(max) || min > max) {
      return null // Malformed - filter out
    }
    
    if (result >= min && result <= max) {
      // Normal - position in green zone (33-67%)
      const rangeSpan = max - min
      const positionInRange = result - min
      const percentInRange = rangeSpan === 0 ? 0 : (positionInRange / rangeSpan) * 100
      return 33 + (percentInRange / 100) * 34
    } else if (result < min) {
      // Abnormal - position in left red zone (0-33%)
      const deficit = min - result
      const percentOfMin = min === 0 ? 0 : (deficit / min) * 100
      return Math.max(5, 33 - (percentOfMin / 100) * 28)
    } else {
      // Abnormal - position in right red zone (67-100%)
      const excess = result - max
      const percentOfMax = max === 0 ? 0 : (excess / max) * 100
      return Math.min(95, 67 + (percentOfMax / 100) * 28)
    }
  }

  return null // Case 4: Malformed range - filter out
}
  const greaterThanMatch = range.match(/(>=?)\s*(\d+\.?\d*)/)
  if (greaterThanMatch) {
    const operator = greaterThanMatch[1]
    const min = Number.parseFloat(greaterThanMatch[2])
    const isNormal = operator === ">=" ? result >= min : result > min
    
    if (isNormal) {
      // Normal - position in green zone (33-67%)
      // Special case: when min = 0, position at start of green zone
      if (min === 0) {
        return 33
      }
      // Calculate position based on how much above min
      const excess = result - min
      const percentAboveMin = (excess / min) * 100
      return Math.min(67, 33 + (percentAboveMin / 100) * 34)
    } else {
      // Abnormal - position in left red zone (0-33%)
      // Calculate how close to the threshold: closer to threshold = closer to 33%
      // Special case: when min = 0, this shouldn't happen (0 >= 0 is normal)
      if (min === 0) {
        return 5 // Far left if somehow negative
      }
      const deficit = min - result
      const percentOfMin = (deficit / min) * 100
      // Position from left: 5% at 0 value, 33% at threshold
      return Math.max(5, 33 - (percentOfMin / 100) * 28)
    }
  }

  return 50 // Default to center
}

export default function AllParametersSection({
  patientData,
  onViewAll,
  vasbenefId,
}: { patientData: ApiHealthReport; onViewAll?: () => void; vasbenefId?: string | number }) {
  const latestLabReport = patientData.lab_reports?.find((report) => report.tag?.toLowerCase().includes("latest"))
  const healthSummaryFromApi = patientData?.health_summary || []

  // Helper function to get all parameters from health_summary
  const getAllHealthSummaryParams = (): any[] => {
    const params: any[] = []
    const seenNames = new Set<string>()
    
    for (const category of healthSummaryFromApi) {
      const categoryParams = category.parameters || []
      for (const param of categoryParams) {
        const paramName = (param.name || param.metric_name || "").toLowerCase()
        if (paramName && !seenNames.has(paramName)) {
          seenNames.add(paramName)
          params.push({
            metric_name: param.name || param.metric_name,
            value: param.result || param.value,
            unit: param.units || param.unit || "",
            normal_range: param.range || param.normal_range || "",
            status: param.status || "normal",
          })
        }
      }
    }
    return params
  }

  // Merge parameters from trends API with health_summary parameters
  const mergeParameters = (trendsParams: any[]): any[] => {
    const healthParams = getAllHealthSummaryParams()
    const merged: any[] = [...trendsParams]
    const seenNames = new Set<string>()
    
    // Track existing parameter names from trends
    for (const param of trendsParams) {
      const paramName = (param.metric_name || param.name || "").toLowerCase()
      if (paramName) seenNames.add(paramName)
    }
    
    // Add health_summary parameters that don't exist in trends
    for (const param of healthParams) {
      const paramName = (param.metric_name || param.name || "").toLowerCase()
      if (paramName && !seenNames.has(paramName)) {
        seenNames.add(paramName)
        merged.push(param)
      }
    }
    
    return merged
  }

  const trendsParams = latestLabReport?.parameters || []
  const parametersArray = mergeParameters(trendsParams)

  if (parametersArray.length === 0) {
    return null
  }

  const allParameters = parametersArray
    .map((param: any) => {
      const metricName = param.metric_name || param.name || "Unknown"
      const result = Number.parseFloat(param.value || param.result || "0") || 0
      const range = param.normal_range || param.range || ""
      const units = param.unit || param.units || ""
      const apiStatus = (param.status || "").toLowerCase()
      const status = apiStatus === "abnormal" || apiStatus === "high" || apiStatus === "low" ? "abnormal" : "normal"
      const dynamicPosition = calculateDynamicPosition(result, range)

      // Debug: log parameter position calculation
      console.log(`[v0] Parameter: "${metricName}" | Value: ${result} ${units} | Range: ${range} | Status: ${status} | Position: ${dynamicPosition}%`)

      return {
        name: metricName,
        status,
        currentValue: `${result} ${units}`.trim(),
        date: latestLabReport?.report_date || "",
        range,
        position: dynamicPosition,
        result,
      }
    })
    .filter((param) => param.position !== null) // Case 4: Filter out malformed ranges

  const displayedParameters = allParameters.slice(0, 3)

  return (
    <section>
      {/* Disclaimer */}
      <p className="mb-4 text-muted-foreground text-center italic tracking-wider text-[10px] font-light">
        This is an AI-generated report and may not be fully accurate. Please consult a qualified doctor for medical or clinical advice.
      </p>

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-6 w-6 text-[#000000]" />
          <h2 className="text-base font-semibold text-[#2e3742]">
            All Parameters <span className="text-[#9dabbd]">({allParameters.length})</span>
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            trackHealthTrendsEvent("All Parameters - See All", vasbenefId)
            onViewAll?.()
          }}
          className="flex items-center gap-1 text-xs font-medium text-[#156ddc] hover:bg-transparent hover:text-[#156ddc]/80"
        >
          See All
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Parameter Cards */}
      <div className="space-y-3">
        {displayedParameters.map((param, index) => (
          <Card key={index} className="overflow-hidden border border-[#f0f3f5] py-0">
            <div className="p-4 pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-[#2e3742]">{param.name}</h3>
                </div>

                {/* Status Tag - matching trends section style */}
                <div
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    param.status === "normal" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                  }`}
                >
                  {param.status === "normal" ? "Normal" : "Abnormal"}
                </div>
              </div>
            </div>

            <div className="border-t border-[#f0f3f5]" />

            {/* Data Section */}
            <div className="flex items-center justify-between p-4">
              <div>
                <p className={`text-xs font-medium ${param.status === "abnormal" ? "text-red-600" : "text-green-600"}`}>
                  {param.currentValue}
                </p>
                <p className="mt-0.5 text-[10px] text-[#9dabbd]">{param.date}</p>
              </div>

              {/* Visual Scale */}
              <div className="relative w-[140px]">
                {/* Scale bar */}
                <div className="flex overflow-hidden rounded gap-0 justify-between items-center h-3">
                  <div className="w-1/3 bg-[#faa9a3] h-3" />
                  <div className="w-1/3 bg-[#addaaf] h-3" />
                  <div className="w-1/3 bg-[#faa9a3] h-3" />
                </div>

                {/* Separators */}
                <div className="absolute left-1/3 top-0 h-6 w-[1px] border-l border-dashed border-white" />
                <div className="absolute left-2/3 top-0 h-6 w-[1px] border-l border-dashed border-white" />

                {/* Indicator - now with dynamic position */}
                <div
                  className={`absolute left-0 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 text-left py-0 px-0 mx-0 my-0 mr-0 ${
                    param.status === "abnormal" ? "border-red-600" : "border-green-600"
                  } bg-white shadow-sm`}
                  style={{ left: `${param.position}%` }}
                />

                <div className="text-center text-[9px] text-[#9dabbd] mt-1">Normal Range: {param.range}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
