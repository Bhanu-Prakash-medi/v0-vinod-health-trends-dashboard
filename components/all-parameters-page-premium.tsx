"use client"

import { useState } from "react"
import { ArrowLeft, Search, X, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ApiHealthReport } from "@/lib/api"
import { sortByCommonKnowledge } from "@/lib/parameterPriority"
import { collectParameters } from "@/lib/collect-parameters"
import ParameterCard from "@/components/parameter-card"

// A parameter matches when the typed text is a substring OR an ordered
// subsequence of its name, so skipped letters still work ("thrxin" -> "Thyroxine").
const isSubsequence = (query: string, target: string) => {
  let qi = 0
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) qi++
  }
  return qi === query.length
}

export default function AllParametersPage({
  patientData,
  onBack,
}: { patientData: ApiHealthReport; onBack: () => void }) {
  const [searchQuery, setSearchQuery] = useState("")

  const latestLabReport = patientData.lab_reports?.find((report) => report.tag?.toLowerCase().includes("latest"))
  const gender = patientData?.patient_info?.gender
  const parameters = sortByCommonKnowledge(
    collectParameters(latestLabReport?.parameters, patientData?.health_summary, gender),
  )

  if (parameters.length === 0) return null

  const flagged = parameters.filter((p) => p.status === "abnormal").length
  const date = latestLabReport?.report_date || ""
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filtered = normalizedQuery
    ? parameters.filter((p) => {
        const name = p.name.toLowerCase()
        return name.includes(normalizedQuery) || isSubsequence(normalizedQuery, name)
      })
    : parameters

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <div className="mx-auto max-w-[420px] bg-[#f4f6f9] sm:my-8 sm:rounded-2xl sm:shadow-lg">
        <div className="sticky top-0 z-10 border-b border-[#e8edf3] bg-card/95 px-4 pb-3 pt-3 backdrop-blur sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-9 w-9 rounded-full p-0" aria-label="Back">
              <ArrowLeft className="h-5 w-5 text-[#1d2733]" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base font-semibold leading-tight text-[#1d2733]">All Parameters</h1>
              <p className="text-xs text-[#7d8a98]">
                <span className="font-semibold tabular-nums text-[#1d2733]">{parameters.length}</span> tested
                {flagged > 0 && (
                  <>
                    {" · "}
                    <span className="font-semibold tabular-nums text-[#d6453a]">{flagged}</span> flagged
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a3b0]" />
            <input
              type="text"
              inputMode="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search e.g. cholesterol"
              aria-label="Search parameters"
              className="w-full rounded-xl border border-[#e8edf3] bg-[#f4f6f9] py-2.5 pl-9 pr-9 text-sm text-[#1d2733] placeholder:text-[#98a3b0] focus:border-[#156ddc] focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#156ddc]/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#98a3b0] transition-colors hover:bg-[#eef1f4] hover:text-[#1d2733]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 p-3">
          {filtered.map((param) => (
            <ParameterCard key={param.name} param={param} date={date} gender={gender} compact />
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#eaf2fe]">
                <SearchX className="h-9 w-9 text-[#156ddc]" />
              </div>
              <h3 className="text-base font-semibold text-[#1d2733]">No parameters found</h3>
              <p className="mt-1.5 max-w-[260px] text-pretty text-sm leading-relaxed text-[#98a3b0]">
                We couldn&apos;t find any parameters matching{" "}
                <span className="font-medium text-[#3d4957]">&ldquo;{searchQuery.trim()}&rdquo;</span>. Try a different
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
