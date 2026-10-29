"use client"

import { useState } from "react"
import { FilePlus2, Loader2 } from "lucide-react"
import { useDesign } from "@/lib/design-context"
import { trackClick } from "@/lib/analytics/posthog"
import { PremiumUploadCard } from "@/components/report-upload/premium-upload-card"
import { UploadReportDialog } from "@/components/report-upload/upload-report-dialog"

interface UploadReportSectionProps {
  uploadedCount?: number
  processingCount?: number
}

function UploadedReportsStatus({ uploadedCount, processingCount }: Required<UploadReportSectionProps>) {
  if (uploadedCount === 0) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-3 rounded-xl bg-[#f5f8fb] px-3 py-2.5 text-xs text-[#4d5c6f]"
    >
      <span>
        <span className="font-bold text-[#2e3742]">{uploadedCount}</span>{" "}
        {uploadedCount === 1 ? "report" : "reports"} uploaded
      </span>
      {processingCount > 0 && (
        <span className="flex items-center gap-1.5 rounded-full bg-[#fff4e0] px-2.5 py-1 font-semibold text-[#a05a00]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {processingCount} processing
        </span>
      )}
    </div>
  )
}

export default function UploadReportSection({ uploadedCount = 0, processingCount = 0 }: UploadReportSectionProps) {
  const [open, setOpen] = useState(false)
  const { design } = useDesign()
  const premium = design === "premium"
  const openUpload = () => {
    trackClick("upload_report_button")
    setOpen(true)
  }
  const status = <UploadedReportsStatus uploadedCount={uploadedCount} processingCount={processingCount} />

  return (
    <>
      {premium ? (
        <div className="flex flex-col gap-3">
          <PremiumUploadCard onUpload={openUpload} />
          {status}
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-[#f0f3f5] bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8f2ff]">
              <FilePlus2 className="h-5 w-5 text-[#156ddc]" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-[#2e3742]">Have a new lab report?</h3>
              <p className="mt-0.5 text-xs text-[#4d5c6f]">
                Upload a PDF and we&apos;ll digitise it into your health records.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openUpload}
            className="w-full rounded-full bg-[#156ddc] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
          >
            Upload report
          </button>
          {status}
        </div>
      )}

      <UploadReportDialog open={open} onOpenChange={setOpen} premium={premium} />
    </>
  )
}
