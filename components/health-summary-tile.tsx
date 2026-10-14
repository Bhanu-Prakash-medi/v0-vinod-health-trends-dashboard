"use client"

import { Check, ChevronRight, type LucideIcon } from "lucide-react"

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
  const inRangeShare = total && total > 0 ? Math.max(0, (total - outOfRange) / total) : needsAttention ? 0.5 : 1
  const interactive = !!onOpen && !disabled

  const tone = disabled
    ? { chip: "bg-[#f4f6f8] text-[#bcc6d1]", ring: "ring-[#eef1f4]" }
    : needsAttention
      ? { chip: "bg-[#fdf1f0] text-[#de3d31]", ring: "ring-[#f6dcd9]" }
      : { chip: "bg-[#eef6ef] text-[#459f49]", ring: "ring-[#dcebdd]" }

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${tone.chip} ${tone.ring}`}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="flex items-center gap-0.5">
          {total && !disabled ? (
            <span className="text-[11px] font-medium tabular-nums text-[#9dabbd]">
              {total - outOfRange}/{total}
            </span>
          ) : null}
          {interactive && (
            <ChevronRight
              className="h-4 w-4 shrink-0 text-[#c5ced8] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#7a8796]"
              aria-hidden="true"
            />
          )}
        </span>
      </div>

      <h3
        className={`mt-4 text-pretty text-[15px] font-semibold leading-snug tracking-tight ${
          disabled ? "text-[#bcc6d1]" : "text-[#1f2933]"
        }`}
      >
        {name}
      </h3>

      {!disabled && (
        <div className="mt-auto flex flex-col gap-2 pt-3">
          {needsAttention ? (
            <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-[#c8352a]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#de3d31]" aria-hidden="true" />
              {outOfRange} out of range
            </span>
          ) : (
            <span className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-[#3d8b41]">
              <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
              All in range
            </span>
          )}

          <div
            className="flex h-1 w-full overflow-hidden rounded-full bg-[#f6dcd9]"
            role="img"
            aria-label={
              total
                ? `${total - outOfRange} of ${total} parameters in range`
                : needsAttention
                  ? `${outOfRange} parameters out of range`
                  : "All parameters in range"
            }
          >
            <span
              className="h-full rounded-full bg-[#459f49] transition-[width] duration-700 ease-out"
              style={{ width: `${inRangeShare * 100}%` }}
            />
          </div>
        </div>
      )}
    </>
  )

  const base =
    "group relative flex h-full min-h-[148px] flex-col rounded-2xl border border-[#edf0f3] bg-card p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-4px_rgba(16,24,40,0.06)]"

  if (!interactive) return <div className={base}>{content}</div>

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${base} cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-[#dfe5eb] hover:shadow-[0_2px_4px_rgba(16,24,40,0.04),0_12px_24px_-8px_rgba(16,24,40,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc] focus-visible:ring-offset-2`}
      aria-label={`${name}: ${needsAttention ? `${outOfRange} out of range` : "all in range"}. View details`}
    >
      {content}
    </button>
  )
}
