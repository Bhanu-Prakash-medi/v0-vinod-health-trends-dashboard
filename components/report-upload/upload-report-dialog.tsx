"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { setMockScenario, type MockScenario } from "@/lib/api"
import { USE_MOCKS } from "@/lib/constants"
import { FileDropZone } from "./file-drop-zone"
import { ReportDetailsForm } from "./report-details-form"
import { SelectedFileCard } from "./selected-file-card"
import { StepIndicator } from "./step-indicator"
import { UploadErrorAlert } from "./upload-error-alert"
import { UploadSuccess } from "./upload-success"
import { useReportUpload } from "./use-report-upload"
import { trackClick } from "@/lib/analytics/posthog"

const MOCK_SCENARIOS: { value: MockScenario; label: string }[] = [
  { value: "success", label: "Success" },
  { value: "queued", label: "Queued" },
  { value: "badRequest", label: "400 on save" },
  { value: "unauthorized", label: "401" },
  { value: "serverError", label: "500 on save" },
  { value: "expiredUrl", label: "Expired URL" },
]

function progressAnnouncement(progress: number, uploaded: boolean) {
  if (uploaded) return "Upload complete."
  return `Uploading, ${Math.floor(progress / 25) * 25} percent.`
}

interface UploadReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  premium?: boolean
  onUploaded?: () => void
}

export function UploadReportDialog({ open, onOpenChange, premium, onUploaded }: UploadReportDialogProps) {
  const { state, selectFile, submit, retry, reset } = useReportUpload()
  const [mockScenario, setScenario] = useState<MockScenario>("success")
  const { phase, file, fileError, progress, uploaded, error, result } = state
  const onUploadedRef = useRef(onUploaded)
  onUploadedRef.current = onUploaded

  useEffect(() => {
    if (phase === "success" && result) onUploadedRef.current?.()
  }, [phase, result])

  const close = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const hasFile = !!file && phase !== "validating"
  const step: 1 | 2 | 3 = phase === "success" ? 3 : hasFile ? 2 : 1

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] grid-cols-[minmax(0,1fr)] gap-5 overflow-x-hidden overflow-y-auto bg-white p-4 sm:w-full sm:max-w-md sm:p-6 [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle className="text-[#2e3742]">Upload report</DialogTitle>
          <DialogDescription className="text-[#4d5c6f]">
            Add a PDF lab report so we can digitise it for you.
          </DialogDescription>
        </DialogHeader>

        {USE_MOCKS && (
          <label className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-[#dbe4ec] px-3 py-2 text-xs text-[#4d5c6f]">
            Mock scenario
            <select
              value={mockScenario}
              onChange={(e) => {
                const value = e.target.value as MockScenario
                setScenario(value)
                setMockScenario(value)
              }}
              className="rounded border border-[#dbe4ec] bg-white px-2 py-1 text-xs text-[#2e3742]"
            >
              {MOCK_SCENARIOS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <StepIndicator current={step} />

        <p className="sr-only" aria-live="polite">
          {phase === "uploading" || (uploaded && phase === "readyToSubmit") ? progressAnnouncement(progress, uploaded) : ""}
        </p>

        {phase === "success" && result ? (
          <UploadSuccess result={result} onDone={() => close(false)} premium={premium} />
        ) : !hasFile ? (
          <FileDropZone isValidating={phase === "validating"} error={fileError} onFile={selectFile} />
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            <SelectedFileCard
              file={file}
              progress={progress}
              uploaded={uploaded}
              showProgress
              disabled={phase === "saving"}
              onRemove={reset}
              premium={premium}
            />
            {error && <UploadErrorAlert error={error} onRetry={retry} />}
            <ReportDetailsForm
              key={`${file.name}-${file.size}-${file.lastModified}`}
              fileName={file.name}
              canSubmit={uploaded}
              isUploading={!uploaded && phase === "uploading"}
              isSaving={phase === "saving"}
              onSubmit={(...args: Parameters<typeof submit>) => {
                trackClick("report_submit")
                return submit(...args)
              }}
              premium={premium}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
