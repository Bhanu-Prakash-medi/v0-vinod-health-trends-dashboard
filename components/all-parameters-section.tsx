"use client"

import { ChevronRight, FlaskConical } from "lucide-react"
import type { ApiHealthReport } from "@/lib/api"
import { trackHealthTrendsEvent } from "@/lib/snowplow"
import { sortByCommonKnowledge } from "@/lib/parameterPriority"
import { collectParameters } from "@/lib/collect-parameters"
import ParameterCard from "@/components/parameter-card"
import CountUp from "@/components/count-up"

export default function AllParametersSection({
  patientData,
  onViewAll,
  vasbenefId,
}: { patientData: ApiHealthReport; onViewAll?: () => void; vasbenefId?: string | number }) {
  const latestLabReport = patientData.lab_reports?.find((report) => report.tag?.toLowerCase().includes("latest"))
  const gender = patientData?.patient_info?.gender
  const parameters = collectParameters(latestLabReport?.parameters, patientData?.health_summary, gender)

  if (parameters.length === 0) return null

  const flagged = parameters.filter((p) => p.status === "abnormal").length
  const displayed = sortByCommonKnowledge(parameters).slice(0, 3)
  const date = latestLabReport?.report_date || ""

  return (
    <section className="flex flex-col gap-4">
      <p className="text-muted-foreground text-center italic tracking-wider text-[10px] font-light">
        This is an AI-generated report and may not be fully accurate. Please consult a qualified doctor for medical or clinical advice.
      </p>

      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#156ddc] text-primary-foreground shadow-[0_6px_16px_-6px_rgba(21,109,220,0.6)]">
            <FlaskConical className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="whitespace-nowrap text-base font-semibold leading-tight text-[#1d2733]">All Parameters</h2>
            <p className="mt-0.5 whitespace-nowrap text-xs text-[#7d8a98]">
              <CountUp value={String(parameters.length)} className="font-semibold tabular-nums text-[#1d2733]" /> tested
              {flagged > 0 && (
                <>
                  {" · "}
                  <CountUp value={String(flagged)} className="font-semibold tabular-nums text-[#d6453a]" /> flagged
                </>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            trackHealthTrendsEvent("All Parameters - See All", vasbenefId)
            onViewAll?.()
          }}
          className="flex shrink-0 items-center gap-0.5 rounded-full border border-[#dbe6f5] bg-card px-3 py-1.5 text-xs font-semibold text-[#156ddc] transition-colors hover:bg-[#eef4fd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40"
        >
          See all
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </header>

      <div className="flex flex-col gap-3">
        {displayed.map((param) => (
          <ParameterCard key={param.name} param={param} date={date} gender={gender} />
        ))}
      </div>
    </section>
  )
}
