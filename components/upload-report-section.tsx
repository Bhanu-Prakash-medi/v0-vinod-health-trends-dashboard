"use client"

import { useCallback, useId, useRef, useState } from "react"
import { UploadCloud, FileText, CheckCircle2, XCircle, Loader2, X } from "lucide-react"
import { validatePdfFileMeta, MAX_PDF_BYTES } from "@/lib/pdf-validation"

type UploadStatus = "scanning" | "valid" | "rejected"

interface UploadedFile {
  id: string
  name: string
  size: number
  status: UploadStatus
  reason?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Lets a user upload a health report and gates it behind strict PDF
 * validation: a fast client-side pre-check (extension/MIME/size) followed by
 * an authoritative server-side check of the raw bytes (magic-byte signature
 * plus a scan for embedded-JavaScript / auto-run / script-injection
 * primitives). Rejected files are never treated as valid, and — since no
 * storage backend is wired up yet — accepted files are only marked
 * "Validated"; nothing is persisted or sent anywhere else.
 */
export default function UploadReportSection() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  const processFile = useCallback(async (file: File) => {
    const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`

    setFiles((prev) => [...prev, { id, name: file.name, size: file.size, status: "scanning" }])

    // Fast client-side pre-check first: catches obviously-wrong files (wrong
    // extension/type, empty, oversized) without a network round trip.
    const preCheck = validatePdfFileMeta(file)
    if (!preCheck.valid) {
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "rejected", reason: preCheck.reason } : f)))
      return
    }

    // Authoritative check: send the raw bytes to the server, which verifies
    // the PDF signature and scans for malicious content. The client check
    // above is convenience only — this is the real gate.
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/health/reports/validate", { method: "POST", body: formData })
      const result: { valid: boolean; reason?: string } = await response.json()

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? result.valid
              ? { ...f, status: "valid" }
              : { ...f, status: "rejected", reason: result.reason || "File failed validation." }
            : f,
        ),
      )
    } catch {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "rejected", reason: "Could not verify this file right now. Please try again." }
            : f,
        ),
      )
    }
  }, [])

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      Array.from(fileList).forEach((file) => processFile(file))
    },
    [processFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  return (
    <div className="rounded-2xl bg-white p-4 border border-[#f0f3f5]">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-[#2e3742]">Upload Report</h3>
        <p className="mt-0.5 text-xs text-[#4d5c6f]">Add a lab report as a PDF. Max {formatBytes(MAX_PDF_BYTES)}.</p>
      </div>

      <label htmlFor={inputId} className="sr-only">
        Upload health report PDF
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30 ${
          isDragging ? "border-[#156ddc] bg-[#e8f2ff]" : "border-[#dbe4ec] bg-[#f7f9fa] hover:bg-[#eef2f5]"
        }`}
      >
        <UploadCloud className="h-6 w-6 text-[#156ddc]" aria-hidden="true" />
        <p className="text-xs font-medium text-[#2e3742]">
          <span className="text-[#156ddc]">Click to upload</span> or drag and drop
        </p>
        <p className="text-[10px] text-[#4d5c6f]">PDF only</p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {files.map((f) => (
            <li
              key={f.id}
              className={`flex items-start gap-2 rounded-lg border p-2.5 ${
                f.status === "rejected" ? "border-red-200 bg-red-50" : "border-[#f0f3f5] bg-[#f7f9fa]"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {f.status === "scanning" && <Loader2 className="h-4 w-4 animate-spin text-[#4d5c6f]" />}
                {f.status === "valid" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {f.status === "rejected" && <XCircle className="h-4 w-4 text-red-600" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-[#4d5c6f]" />
                  <span className="truncate text-xs font-medium text-[#2e3742]">{f.name}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-[#4d5c6f]">
                  {formatBytes(f.size)}
                  {f.status === "scanning" && " · Scanning for malicious content…"}
                  {f.status === "valid" && " · Validated"}
                </p>
                {f.status === "rejected" && f.reason && (
                  <p className="mt-0.5 text-[10px] font-medium text-red-700">{f.reason}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeFile(f.id)}
                aria-label={`Remove ${f.name}`}
                className="shrink-0 rounded p-0.5 text-[#4d5c6f] hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
