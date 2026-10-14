"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"

interface HealthSummaryTileProps {
  name: string
  icon: LucideIcon
  outOfRange: number
  total?: number
  disabled?: boolean
  onOpen?: () => void
}

// Above this many parameters individual pips get too thin to read, so the
// tile falls back to a single proportional bar.
const MAX_PIPS = 14

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

  const statusText = disabled
    ? "No data"
    : needsAttention
      ? total
        ? `${outOfRange} of ${total} flagged`
        : `${outOfRange} flagged`
      : total
        ? `All ${total} normal`
        : "All normal"

  const iconTone = disabled
    ? "bg-[#f4f6f8] text-[#c2cad4]"
    : needsAttention
      ? "bg-[#fdeeec] text-[#d23f33]"
      : "bg-[#eaf5eb] text-[#2f8a37]"

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        {interactive && (
          <ChevronRight
            className="mt-1 h-4 w-4 text-[#c2cad4] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#1f2933]"
            strokeWidth={2.25}
            aria-hidden="true"
          />
        )}
      </div>

      <h3
        className={`mt-3.5 text-pretty text-[15px] font-semibold leading-snug tracking-tight ${
          disabled ? "text-[#b3bdc8]" : "text-[#16202b]"
        }`}
      >
        {name}
      </h3>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        {!disabled && total && total > 0 ? (
          total <= MAX_PIPS ? (
            <div className="flex h-1.5 gap-[3px]" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={`h-full flex-1 rounded-full ${i < outOfRange ? "bg-[#e5483c]" : "bg-[#3f9d46]"}`}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-1.5 gap-[3px]" aria-hidden="true">
              <span className="h-full rounded-full bg-[#e5483c]" style={{ flexGrow: outOfRange, flexBasis: 0 }} />
              <span className="h-full rounded-full bg-[#3f9d46]" style={{ flexGrow: inRange, flexBasis: 0 }} />
            </div>
          )
        ) : (
          <div className="h-1.5 rounded-full bg-[#eef1f4]" aria-hidden="true" />
        )}

        <p
          className={`text-xs font-semibold tabular-nums ${
            disabled ? "text-[#b3bdc8]" : needsAttention ? "text-[#c8352a]" : "text-[#2f7d35]"
          }`}
        >
          {statusText}
        </p>
      </div>
    </>
  )

  const base =
    "group relative flex h-full min-h-[156px] flex-col rounded-2xl border border-[#e9edf1] bg-card p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)]"

  if (!interactive) return <div className={base}>{content}</div>

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${base} cursor-pointer transition-all duration-200 hover:border-[#d7dde4] hover:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_24px_-12px_rgba(16,24,40,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc] focus-visible:ring-offset-2`}
      aria-label={`${name}: ${statusText}${total ? `, ${inRange} of ${total} in normal range` : ""}. View details`}
    >
      {content}
    </button>
  )
}
