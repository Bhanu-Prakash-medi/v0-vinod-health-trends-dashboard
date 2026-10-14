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
      <div className="flex items-center gap-2 pr-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            disabled ? "bg-[#f4f6f8] text-[#c2cad4]" : "bg-[#eef4fd] text-[#156ddc]"
          }`}
          aria-hidden="true"
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
        <h3
          className={`line-clamp-2 min-w-0 text-[13px] font-semibold leading-tight tracking-tight ${
            disabled ? "text-[#b3bdc8]" : "text-[#16202b]"
          }`}
        >
          {name.replace(/\//g, "/\u200B")}
        </h3>
      </div>
      {interactive && (
        <ArrowUpRight
          className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[#c7ced6] transition-colors duration-200 group-hover:text-[#156ddc]"
          strokeWidth={2}
          aria-hidden="true"
        />
      )}

      {!disabled && total ? (
        <p className="mt-2 text-[11px] leading-tight tabular-nums text-[#8a96a3]">
          {inRange} of {total} in range
        </p>
      ) : null}

      <div className="mt-auto pt-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${
            disabled
              ? "bg-[#f4f6f8] text-[#9aa5b1]"
              : needsAttention
                ? "bg-[#fdf0ee] text-[#c0392b]"
                : "bg-[#ecf6ee] text-[#2d7a36]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              disabled ? "bg-[#c2cad4]" : needsAttention ? "bg-[#e5483c]" : "bg-[#3f9d46]"
            }`}
            aria-hidden="true"
          />
          {statusText}
        </span>
      </div>
    </>
  )

  const base =
    "group relative flex h-full flex-col rounded-2xl border border-[#edf0f3] bg-card p-3 text-left"

  if (!interactive) return <div className={base}>{content}</div>

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${base} cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-[#dfe5ec] hover:shadow-[0_10px_30px_-16px_rgba(16,24,40,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc] focus-visible:ring-offset-2`}
      aria-label={`${name}: ${statusText}${total ? `, ${inRange} of ${total} in normal range` : ""}. View details`}
    >
      {content}
    </button>
  )
}
