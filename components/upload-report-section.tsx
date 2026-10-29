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
  partneredCount?: number
}

function UploadedReportsStatus({
  uploadedCount,
  processingCount,
  partneredCount,
}: Required<UploadReportSectionProps>) {
  if (uploadedCount === 0 && partneredCount === 0) return null
  return (
    <div className="ht-rise ht-status-border rounded-2xl p-px shadow-[0_14px_32px_-18px_rgba(21,109,220,0.55)]">
      <div
        role="status"
        aria-live="polite"
        className="relative isolate flex flex-col gap-3 overflow-hidden rounded-[15px] bg-[#ffffff] px-4 py-3.5 text-sm text-[#4d5c6f]"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(#156ddc_1px,transparent_1px),linear-gradient(90deg,#156ddc_1px,transparent_1px)] [background-size:14px_14px]"
        />
        <span
          aria-hidden="true"
          className="ht-status-sweep pointer-events-none absolute inset-y-0 left-0 -z-10 w-full bg-[linear-gradient(100deg,transparent_30%,rgba(21,109,220,0.10)_50%,transparent_70%)]"
        />

        {partneredCount > 0 && (
          <div className="ht-rise flex items-center gap-3" style={{ animationDelay: "120ms" }}>
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#156ddc]/50" />
              <span className="relative h-2 w-2 rounded-full bg-[#156ddc]" />
            </span>
            <span>
              <span className="ht-pop inline-block font-bold tabular-nums text-[#2e3742]">{partneredCount}</span>{" "}
              MediBuddy partnered {partneredCount === 1 ? "report" : "reports"}
            </span>
          </div>
        )}

        {uploadedCount > 0 && (
          <div className="ht-rise flex items-center justify-between gap-3" style={{ animationDelay: "240ms" }}>
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="relative h-2 w-2 rounded-full bg-[#5fb3ff]" />
              </span>
              <span>
                <span className="ht-pop inline-block font-bold tabular-nums text-[#2e3742]">{uploadedCount}</span>{" "}
                {uploadedCount === 1 ? "report" : "reports"} uploaded
              </span>
            </div>
            {processingCount > 0 && (
              <span className="ht-glow relative flex items-center gap-1.5 overflow-hidden rounded-full bg-[#fff4e0] px-3 py-1 text-xs font-semibold text-[#a05a00] ring-1 ring-inset ring-[#f0961e]/30">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span className="tabular-nums">{processingCount}</span> processing
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
                  <span className="ht-progress-bar block h-full w-2/5 rounded-full bg-[#f0961e]" />
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function UploadReportSection({
  uploadedCount = 0,
  processingCount = 0,
  partneredCount = 0,
}: UploadReportSectionProps) {
  const [open, setOpen] = useState(false)
  const { design } = useDesign()
  const premium = design === "premium"
  const openUpload = () => {
    trackClick("upload_report_button")
    setOpen(true)
  }
  const status = (
    <UploadedReportsStatus
      uploadedCount={uploadedCount}
      processingCount={processingCount}
      partneredCount={partneredCount}
    />
  )

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
