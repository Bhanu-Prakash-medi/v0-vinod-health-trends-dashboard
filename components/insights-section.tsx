import { Activity } from "lucide-react"
import Musculature3DModel from "@/components/musculature-3d-model"
import ReportProblemButton from "@/components/report-problem-button"

interface InsightsSectionProps {
  patientData: any
  vasbenefId?: string | number
}

export default function InsightsSection({ patientData, vasbenefId }: InsightsSectionProps) {
  return (
    <section>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-[#000000]" />
          <h2 className="text-base font-semibold text-[#2e3742]">Digital Twin</h2>
        </div>
        <ReportProblemButton section="Digital Twin" vasbenefId={vasbenefId} />
      </div>

      <div className="space-y-4">
        <Musculature3DModel patientData={patientData} vasbenefId={vasbenefId} />
      </div>
    </section>
  )
}
