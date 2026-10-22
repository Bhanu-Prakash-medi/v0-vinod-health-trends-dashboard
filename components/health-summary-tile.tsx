"use client"

import { ArrowUpRight, type LucideIcon } from "lucide-react"

interface HealthSummaryTileProps {
  name: string
  icon: LucideIcon
  outOfRange: number
  total?: number
  disabled?: boolean
  onOpen?: () => void
}

export default function HealthSummaryTile({
  name,
  icon: Icon,
  outOfRange,
  total,
  disabled = false,
  onOpen,
}: HealthSummaryTileProps) {
  const needsAttention = outOfRange > 0
  const inRange = total ? Math.max(0, total - outOfRange) : 0
  const interactive = !!onOpen && !disabled

  const statusText = disabled ? "No data" : needsAttention ? `${outOfRange} flagged` : "All normal"

  const content = (
    <>
      <div className="flex items-center gap-2.5 pr-4">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            disabled
              ? "bg-[#f1f4f7] text-[#b3bdc8]"
              : "bg-[#e6effc] text-[#156ddc] ring-1 ring-inset ring-[#156ddc]/10"
          }`}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <h3
          className={`line-clamp-2 min-w-0 text-sm font-semibold leading-tight tracking-tight ${
            disabled ? "text-[#a3adb8]" : "text-[#101828]"
          }`}
        >
          {name.replace(/\//g, "/\u200B")}
        </h3>
      </div>
      {interactive && (
        <span
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#f2f5f8] text-[#667585] transition-colors duration-200 group-hover:bg-[#156ddc] group-hover:text-primary-foreground"
          aria-hidden="true"
        >
          <ArrowUpRight className="h-3 w-3" strokeWidth={2.25} />
        </span>
      )}

      {!disabled && total ? (
        <p className="mt-2.5 text-xs leading-tight tabular-nums text-[#5b6776]">
          <span className="font-semibold text-[#1f2933]">{inRange}</span> of {total} in range
        </p>
      ) : null}

      <div className="mt-auto pt-2.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none tabular-nums ${
            disabled
              ? "bg-[#f1f4f7] text-[#8a96a3]"
              : needsAttention
                ? "bg-[#fdeceb] text-[#b42318] ring-1 ring-inset ring-[#b42318]/15"
                : "bg-[#e8f5eb] text-[#1d7a34] ring-1 ring-inset ring-[#1d7a34]/15"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              disabled ? "bg-[#c2cad4]" : needsAttention ? "bg-[#d92d20]" : "bg-[#2f9e47]"
            }`}
            aria-hidden="true"
          />
          {statusText}
        </span>
      </div>
    </>
  )

  const base =
    "group relative flex h-full flex-col rounded-2xl border border-[#e2e8ef] bg-card p-3.5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.05),0_6px_16px_-10px_rgba(16,24,40,0.14)]"

  if (!interactive) return <div className={base}>{content}</div>

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${base} cursor-pointer transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#c9d6e6] hover:shadow-[0_14px_30px_-14px_rgba(21,109,220,0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc] focus-visible:ring-offset-2`}
      aria-label={`${name}: ${statusText}${total ? `, ${inRange} of ${total} in normal range` : ""}. View details`}
    >
      {content}
    </button>
  )
}
