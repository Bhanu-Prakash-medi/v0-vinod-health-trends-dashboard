import CountUp from "@/components/count-up"

interface SummaryOverviewProps {
  inRange: number
  total: number
  flagged: number
  areas: number
}

const RADIUS = 30
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function SummaryOverview({ inRange, total, flagged, areas }: SummaryOverviewProps) {
  const ratio = total > 0 ? inRange / total : 0
  const percent = Math.round(ratio * 100)

  return (
    <div className="mb-4 flex items-center gap-4 rounded-2xl border border-[#edf0f3] bg-card p-4">
      {/* span (not div) so the premium-theme `.mb-4 > div > svg` icon-chip rule doesn't paint a tile behind the ring */}
      <span
        className="relative block h-[76px] w-[76px] shrink-0"
        role="img"
        aria-label={`${percent}% of parameters in normal range`}
      >
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="38" cy="38" r={RADIUS} fill="none" stroke="#fbe3e0" strokeWidth="6" />
          <circle
            cx="38"
            cy="38"
            r={RADIUS}
            fill="none"
            stroke="#3f9d46"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base font-semibold tabular-nums tracking-tight text-[#16202b]">
          <CountUp value={`${percent}%`} />
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[#8a96a3]">Parameters in range</p>
        <p className="mt-0.5 text-2xl font-semibold leading-tight tabular-nums tracking-tight text-[#16202b]">
          <CountUp value={String(inRange)} />
          <span className="text-base font-medium text-[#a3adb8]"> / {total}</span>
        </p>
        {flagged > 0 ? (
          <p className="mt-1 text-xs text-[#5f6b78]">
            <span className="font-semibold text-[#c0392b]">{flagged} flagged</span> across {areas}{" "}
            {areas === 1 ? "area" : "areas"}
          </p>
        ) : (
          <p className="mt-1 text-xs font-medium text-[#2d7a36]">Everything looks normal</p>
        )}
      </div>
    </div>
  )
}
