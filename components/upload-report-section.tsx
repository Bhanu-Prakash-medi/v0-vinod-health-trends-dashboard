"use client"

import { useState } from "react"
import { FilePlus2 } from "lucide-react"
import { useDesign } from "@/lib/design-context"
import { PremiumUploadCard } from "@/components/report-upload/premium-upload-card"
import { UploadReportDialog } from "@/components/report-upload/upload-report-dialog"

export default function UploadReportSection() {
  const [open, setOpen] = useState(false)
  const { design } = useDesign()
  const premium = design === "premium"

  return (
    <>
      {premium ? (
        <PremiumUploadCard onUpload={() => setOpen(true)} />
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
            onClick={() => setOpen(true)}
            className="w-full rounded-full bg-[#156ddc] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
          >
            Upload report
          </button>
        </div>
      )}

      <UploadReportDialog open={open} onOpenChange={setOpen} premium={premium} />
    </>
  )
}
