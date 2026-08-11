"use client"

import { useState } from "react"
import { ArrowLeft, Search, X, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ApiHealthReport } from "@/lib/api"
import { calculateDynamicPosition } from "@/lib/calculateDynamicPosition"
import { sortByCommonKnowledge } from "@/lib/parameterPriority"
import BiomarkerInfoButton from "@/components/biomarker-info-button"

export default function AllParametersPage({
  patientData,
  onBack,
}: { patientData: ApiHealthReport; onBack: () => void }) {
  const [searchQuery, setSearchQuery] = useState("")

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
    .filter((param) => param.position !== null) // Filter out malformed ranges

  // Order commonly known parameters first for non-medical users
  const sortedParameters = sortByCommonKnowledge(allParameters)

  // Fuzzy, case-insensitive matching. A parameter matches when the typed text
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
  const filteredParameters = normalizedQuery
    ? sortedParameters.filter((param) => {
        const name = (param.name || "").toLowerCase()
        return name.includes(normalizedQuery) || isSubsequence(normalizedQuery, name)
      })
    : sortedParameters

  return (
    <div className="min-h-screen bg-[#f7f9fa]">
      <div className="mx-auto max-w-[420px] bg-white sm:my-8 sm:rounded-2xl sm:shadow-lg">
        <div className="sticky top-0 z-10 rounded-t-2xl border-b border-[#e5e7eb] bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
              <ArrowLeft className="h-5 w-5 text-[#2e3742]" />
            </Button>
            <h1 className="text-lg font-semibold text-[#2e3742]">
              All Parameters <span className="text-[#9dabbd]">({allParameters.length})</span>
            </h1>
          </div>

          {/* Parameter search */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9dabbd]" />
            <input
              type="text"
              inputMode="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parameters (e.g. cholesterol, HbA1c)"
              aria-label="Search parameters"
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
        {filteredParameters.map((param, index) => (
          <Card key={index} className="overflow-hidden border border-[#f0f3f5] py-0">
            <div className="p-4 pb-3">
              <div className="flex items-start justify-between">
                <div className="flex flex-1 items-center gap-2">
                  <h3 className="text-sm font-medium text-[#2e3742]">{param.name}</h3>
                  <BiomarkerInfoButton name={param.name} />
                </div>

                <div
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    param.status === "normal" ? "bg-[#edf7ee] text-[#459f49]" : "bg-[#fef0f0] text-[#de3d31]"
                  }`}
                >
                  {param.status === "normal" ? "Normal" : "Abnormal"}
                </div>
              </div>
            </div>

            <div className="border-t border-[#f0f3f5]" />

            <div className="flex items-center justify-between p-4">
              <div>
                <p
                  className={`text-xs font-medium ${param.status === "abnormal" ? "text-[#de3d31]" : "text-[#459f49]"}`}
                >
                  {param.currentValue}
                </p>
                <p className="mt-0.5 text-[10px] text-[#9dabbd]">{param.date}</p>
              </div>

              <div className="w-[140px]">
                {/* Scale bar + marker wrapper */}
                <div className="relative h-4">
                  <div className="flex h-3 overflow-hidden rounded mt-0.5">
                    <div className="w-1/3 bg-[#faa9a3]" />
                    <div className="w-1/3 bg-[#addaaf]" />
                    <div className="w-1/3 bg-[#faa9a3]" />
                  </div>

                  <div className="absolute left-1/3 top-0 h-4 w-[1px] border-l border-dashed border-white" />
                  <div className="absolute left-2/3 top-0 h-4 w-[1px] border-l border-dashed border-white" />

                  <div
                    className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                      param.status === "abnormal" ? "border-[#de3d31]" : "border-[#459f49]"
                    } bg-white shadow-sm`}
                    style={{ left: `${param.position}%`, top: "12px" }}
                  />
                </div>

                {/* Normal Range text */}
                <div className="mt-2 text-center text-[9px] text-[#9dabbd]">Normal Range: {param.range}</div>
              </div>
            </div>
          </Card>
        ))}

        {filteredParameters.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#eaf2fe] to-[#e6f7ee]">
              <SearchX className="h-9 w-9 text-[#156ddc]" />
            </div>
            <h3 className="text-base font-semibold text-[#2e3742]">No parameters found</h3>
            <p className="mt-1.5 max-w-[260px] text-pretty text-sm leading-relaxed text-[#9dabbd]">
              We couldn&apos;t find any parameters matching{" "}
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
    </div>
  )
}
