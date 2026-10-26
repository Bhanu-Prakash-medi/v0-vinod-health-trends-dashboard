import { CheckCircle2, Info } from "lucide-react"
import type { SaveFileResponse } from "@/lib/api"

export function UploadSuccess({ result, onDone }: { result: SaveFileResponse; onDone: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
        <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-bold text-[#2e3742]">Uploaded successfully</h3>
        <p className="text-pretty text-sm leading-relaxed text-[#4d5c6f]">
          Please revisit after 60 minutes for your digitised report.
        </p>
        <p className="text-xs text-[#4d5c6f]">
          Reports currently being processed: {result.processingCount} of {result.limit}
        </p>
      </div>
      {result.queued && (
        <div className="flex items-start gap-2 rounded-xl bg-[#e8f2ff] p-3 text-left text-sm leading-relaxed text-[#2e3742]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#156ddc]" aria-hidden="true" />
          <p>
            You already have {result.limit} reports being processed. This one is saved and will start automatically
            when a slot frees up.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={onDone}
        autoFocus
        className="w-full rounded-full bg-[#156ddc] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40"
      >
        Done
      </button>
    </div>
  )
}
