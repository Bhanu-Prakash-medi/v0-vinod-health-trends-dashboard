"use client"

import { useId, useRef, useState } from "react"
import { AlertCircle, Loader2, UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileDropZoneProps {
  isValidating: boolean
  error: string | null
  onFile: (file: File) => void
}

export function FileDropZone({ isValidating, error, onFile }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputId = useId()
  const errorId = useId()

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0 || isValidating) return
    onFile(files[0])
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!isValidating) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          pick(e.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
          isDragging ? "border-[#156ddc] bg-[#e8f2ff]" : "border-[#dbe4ec] bg-[#f7f9fa]",
          error && "border-red-300",
        )}
      >
        {isValidating ? (
          <div className="flex flex-col items-center gap-2" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-[#156ddc]" aria-hidden="true" />
            <p className="text-sm font-medium text-[#2e3742]">Checking file...</p>
          </div>
        ) : (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f2ff]">
              <UploadCloud className="h-5 w-5 text-[#156ddc]" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-[#2e3742]">Drag and drop your report here</p>
              <p className="text-xs text-[#4d5c6f]">One PDF, up to 10 MB</p>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-describedby={error ? errorId : undefined}
              className="rounded-full border border-[#156ddc] px-4 py-2 text-sm font-semibold text-[#156ddc] transition-colors hover:bg-[#e8f2ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40"
            >
              Choose PDF
            </button>
          </>
        )}
        <label htmlFor={inputId} className="sr-only">
          Choose a PDF report
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files)
            e.target.value = ""
          }}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
