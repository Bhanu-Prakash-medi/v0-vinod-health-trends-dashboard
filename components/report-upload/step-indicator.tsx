import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = ["Choose file", "Details and upload", "Done"] as const

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Upload progress">
      {STEPS.map((label, index) => {
        const step = index + 1
        const isDone = step < current || current === 3
        const isCurrent = step === current
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={isCurrent ? "step" : undefined}>
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                isDone && "bg-[#156ddc] text-white",
                isCurrent && !isDone && "border-2 border-[#156ddc] text-[#156ddc]",
                !isDone && !isCurrent && "border border-[#dbe4ec] text-[#4d5c6f]",
              )}
            >
              {isDone ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : step}
            </span>
            <span
              className={cn(
                "truncate text-xs",
                isCurrent ? "font-semibold text-[#2e3742]" : "text-[#4d5c6f]",
              )}
            >
              {label}
            </span>
            {step < STEPS.length && <span className="hidden h-px flex-1 bg-[#dbe4ec] sm:block" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}
