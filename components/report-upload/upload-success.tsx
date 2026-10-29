import { CheckCircle2, Info } from "lucide-react"
import type { SaveFileResponse } from "@/lib/api"
import { cn } from "@/lib/utils"

function AnimatedCheck() {
  return (
    <span className="relative flex h-20 w-20 items-center justify-center" aria-hidden="true">
      <span className="ht-ripple absolute inset-0 rounded-full bg-[#156ddc]/20" />
      <span className="ht-ripple absolute inset-0 rounded-full bg-[#156ddc]/15 [animation-delay:400ms]" />
      <svg viewBox="0 0 52 52" className="relative h-16 w-16">
        <circle cx="26" cy="26" r="24" className="ht-draw-ring fill-[#156ddc] stroke-[#156ddc]" strokeWidth="3" />
        <path d="M15 27 l7 7 l15 -16" className="ht-draw-check fill-none stroke-white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export function UploadSuccess({
  result,
  onDone,
  premium,
}: {
  result: SaveFileResponse
  onDone: () => void
  premium?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {premium ? (
        <AnimatedCheck />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden="true" />
        </span>
      )}
      <div className={cn("flex flex-col gap-1.5", premium && "ht-rise [animation-delay:500ms]")}>
        <h3 className={cn("text-lg font-bold", premium ? "text-[#0b2a5b]" : "text-[#2e3742]")}>Uploaded successfully</h3>
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
        className={cn(
          "w-full rounded-full bg-[#156ddc] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40",
          premium && "ht-rise py-3 shadow-[0_8px_20px_-10px_rgb(21_109_220/0.8)] [animation-delay:650ms]",
        )}
      >
        Done
      </button>
    </div>
  )
}
