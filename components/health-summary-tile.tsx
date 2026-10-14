"use client"

import { ArrowUpRight, Check, type LucideIcon } from "lucide-react"

interface HealthSummaryTileProps {
  name: string
  icon: LucideIcon
  outOfRange: number
  total?: number
  disabled?: boolean
  onOpen?: () => void
}

const RING_SIZE = 52
const RING_STROKE = 3.5
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

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
  const inRangeShare = total && total > 0 ? inRange / total : needsAttention ? 0.5 : 1
  const interactive = !!onOpen && !disabled

  const tone = disabled
    ? {
        ring: "#e6eaef",
        track: "#f1f3f6",
        iconBg: "bg-[#f6f7f9]",
        icon: "text-[#bcc6d1]",
        surface: "bg-card",
        border: "border-[#edf0f3]",
      }
    : needsAttention
      ? {
          ring: "#e5483c",
          track: "#fbe3e1",
          iconBg: "bg-[#fff5f4]",
          icon: "text-[#d23f33]",
          surface: "bg-[linear-gradient(180deg,#fff8f7_0%,#ffffff_55%)]",
          border: "border-[#f6e1de]",
        }
      : {
          ring: "#3f9d46",
          track: "#dff0e0",
          iconBg: "bg-[#f3faf3]",
          icon: "text-[#3a8f40]",
          surface: "bg-[linear-gradient(180deg,#f6fbf6_0%,#ffffff_55%)]",
          border: "border-[#e2efe3]",
        }

  const dashOffset = RING_CIRCUMFERENCE * (1 - inRangeShare)

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="relative flex shrink-0 items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="absolute inset-0 -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={tone.track}
              strokeWidth={RING_STROKE}
            />
            {!disabled && (
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={tone.ring}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                className="transition-[stroke-dashoffset] duration-700 ease-out"
              />
            )}
          </svg>
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgba(16,24,40,0.04)] ${tone.iconBg} ${tone.icon}`}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
        </span>

        {!disabled &&
          (needsAttention ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#e5483c] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary-foreground shadow-[0_2px_6px_-2px_rgba(229,72,60,0.55)]">
              {outOfRange} flagged
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#e7f4e8] px-2 py-0.5 text-[11px] font-semibold text-[#2f7d35]">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              Normal
            </span>
          ))}
      </div>

      <h3
        className={`mt-4 text-pretty text-[15px] font-semibold leading-snug tracking-tight ${
          disabled ? "text-[#bcc6d1]" : "text-[#1f2933]"
        }`}
      >
        {name}
      </h3>

      {!disabled && (
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="flex flex-col">
            {total ? (
              <>
                <span className="text-lg font-semibold leading-none tabular-nums tracking-tight text-[#1f2933]">
                  {inRange}
                  <span className="text-sm font-medium text-[#a3afbd]">/{total}</span>
                </span>
                <span className="mt-1 text-[11px] font-medium text-[#8693a3]">in normal range</span>
              </>
            ) : (
              <span className={`text-xs font-semibold ${needsAttention ? "text-[#c8352a]" : "text-[#2f7d35]"}`}>
                {needsAttention ? `${outOfRange} out of range` : "All in range"}
              </span>
            )}
          </p>

          {interactive && (
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e6eaef] bg-card text-[#7a8796] transition-all duration-200 group-hover:border-[#1f2933] group-hover:bg-[#1f2933] group-hover:text-primary-foreground"
              aria-hidden="true"
            >
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
          )}
        </div>
      )}
    </>
  )

  const base = `group relative flex h-full min-h-[164px] flex-col overflow-hidden rounded-[20px] border p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_20px_-10px_rgba(16,24,40,0.10)] ${tone.surface} ${tone.border}`

  if (!interactive) return <div className={base}>{content}</div>

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${base} cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(16,24,40,0.05),0_18px_32px_-14px_rgba(16,24,40,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc] focus-visible:ring-offset-2`}
      aria-label={`${name}: ${
        needsAttention ? `${outOfRange} out of range` : "all in range"
      }${total ? `, ${inRange} of ${total} in normal range` : ""}. View details`}
    >
      {content}
    </button>
  )
}
