import { CheckCircle2, FileText } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface SelectedFileCardProps {
  file: File
  progress: number
  uploaded: boolean
  showProgress: boolean
  disabled: boolean
  onRemove: () => void
}

export function SelectedFileCard({ file, progress, uploaded, showProgress, disabled, onRemove }: SelectedFileCardProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#f0f3f5] bg-[#f7f9fa] p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
          <FileText className="h-4 w-4 text-[#156ddc]" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-[#2e3742]">{file.name}</span>
          <span className="text-xs text-[#4d5c6f]">{formatFileSize(file.size)}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove or choose another file"
          className="shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold text-[#156ddc] hover:bg-[#e8f2ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40 disabled:opacity-50"
        >
          <span className="sm:hidden">Change</span>
          <span className="hidden sm:inline">Remove / choose another</span>
        </button>
      </div>
      {showProgress && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1 font-medium text-[#2e3742]">
              {uploaded ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
                  Uploaded
                </>
              ) : (
                "Uploading..."
              )}
            </span>
            <span className="tabular-nums text-[#4d5c6f]">{progress}%</span>
          </div>
          <Progress value={progress} aria-label="Upload progress" className="h-1.5 bg-[#dbe4ec] [&>div]:bg-[#156ddc]" />
        </div>
      )}
    </div>
  )
}
